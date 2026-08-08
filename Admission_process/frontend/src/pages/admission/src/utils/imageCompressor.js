/**
 * imageCompressor.js
 *
 * Production-grade client-side image compression for JCER Admission Portal.
 *
 * Supports  : JPG / JPEG / PNG only.
 * No support : PDF, WebP, SVG, BMP, or any other format.
 *
 * Features:
 *  - EXIF orientation correction (no more sideways mobile photos)
 *  - Adaptive quality: starts at 88%, reduces only when needed
 *  - Per-document compression profiles with individual size targets
 *  - Minimum-resolution validation (rejects tiny/blurry scans)
 *  - Returns { file, originalSize, compressedSize, compressionPercent }
 *  - Never upscales small images
 *  - Preserves text readability over aggressive size reduction
 */

// ─── Accepted Types ────────────────────────────────────────────────────────
const ACCEPTED_TYPES      = ['image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export { ACCEPTED_TYPES };

// ─── Compression Profiles ──────────────────────────────────────────────────
const PROFILES = {
    photo: {
        label:            'Passport Photo',
        maxWidth:         800,
        maxHeight:        1000,
        startQuality:     0.88,
        minQuality:       0.60,
        targetMaxBytes:   500  * 1024,         // 500 KB target
        absoluteMaxBytes: 700  * 1024,         // 700 KB hard ceiling
        minLongestSide:   300,
    },
    signature: {
        label:            'Signature',
        maxWidth:         900,
        maxHeight:        600,
        startQuality:     0.88,
        minQuality:       0.62,
        targetMaxBytes:   300  * 1024,         // 300 KB target
        absoluteMaxBytes: 450  * 1024,         // 450 KB hard ceiling
        minLongestSide:   150,
    },
    document: {
        label:            'Document',
        maxWidth:         2000,
        maxHeight:        2800,
        startQuality:     0.88,
        minQuality:       0.68,
        targetMaxBytes:   1.5  * 1024 * 1024,  // 1.5 MB target (readability first)
        absoluteMaxBytes: 2.0  * 1024 * 1024,  // 2.0 MB hard ceiling
        minLongestSide:   400,
    },
};

// Map docId → profile key
const DOC_PROFILE_MAP = {
    photo:                     'photo',
    signature:                 'signature',
    sslcMarkscard:             'document',
    pucMarkscard:              'document',
    diplomaSemester5Marksheet: 'document',
    diplomaSemester6Marksheet: 'document',
    aadhaar:                   'document',
    cetScoreCard:              'document',
    casteCertificate:          'document',
    incomeCertificate:         'document',
    studyCertificate:          'document',
    feesPaidReceipt:           'document',
};

export { PROFILES, DOC_PROFILE_MAP };

// ─── Type Validation ───────────────────────────────────────────────────────

/**
 * Validate file type using both MIME type AND file extension.
 * Does NOT rely on the filename extension alone.
 *
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileType(file) {
    const rawExt = (file.name || '').split('.').pop() || '';
    const ext    = '.' + rawExt.toLowerCase();
    const mime   = (file.type || '').toLowerCase();

    const mimeOk = ACCEPTED_TYPES.includes(mime);
    const extOk  = ACCEPTED_EXTENSIONS.includes(ext);

    if (!mimeOk || !extOk) {
        return {
            valid: false,
            error: 'Unsupported file type. Please upload JPG or PNG images only. PDF and other formats are not accepted.',
        };
    }
    return { valid: true };
}

/** Backward-compatibility alias used by existing code */
export const validateImageType = validateFileType;

// ─── EXIF Orientation ─────────────────────────────────────────────────────

/**
 * Read the EXIF Orientation tag (0x0112) from a JPEG APP1 segment.
 * Returns 1 (no rotation needed) for non-JPEG files or when EXIF is absent.
 *
 * @param {File} file
 * @returns {Promise<number>} 1–8
 */
async function readExifOrientation(file) {
    try {
        const buffer = await file.slice(0, 65536).arrayBuffer();
        const view   = new DataView(buffer);

        // Must begin with JPEG SOI marker FF D8
        if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) return 1;

        let offset = 2;
        while (offset + 4 < view.byteLength) {
            const marker = view.getUint16(offset, false);
            const segLen = view.getUint16(offset + 2, false);

            if (marker === 0xFFE1 && offset + 10 < view.byteLength) {
                // "Exif\0\0" header = 45 78 69 66 00 00
                const exifHeader = view.getUint32(offset + 4, false);
                const exifNull   = view.getUint16(offset + 8, false);

                if (exifHeader === 0x45786966 && exifNull === 0x0000) {
                    const tiffBase  = offset + 10;
                    const byteOrder = view.getUint16(tiffBase, false);
                    const le        = byteOrder === 0x4949; // 'II' = little-endian

                    const ifdOffset  = view.getUint32(tiffBase + 4, le);
                    if (tiffBase + ifdOffset + 2 > view.byteLength) return 1;

                    const numEntries = view.getUint16(tiffBase + ifdOffset, le);
                    for (let i = 0; i < numEntries; i++) {
                        const entryOff = tiffBase + ifdOffset + 2 + i * 12;
                        if (entryOff + 12 > view.byteLength) break;
                        const tag = view.getUint16(entryOff, le);
                        if (tag === 0x0112) {                           // Orientation tag
                            return view.getUint16(entryOff + 8, le);
                        }
                    }
                }
                break;
            }

            if (marker === 0xFFDA) break; // SOS — image data starts, stop scanning
            if (segLen < 2) break;
            offset += 2 + segLen;
        }
    } catch (_) { /* ignore */ }
    return 1;
}

/**
 * Apply the EXIF orientation transform to a canvas before drawing.
 * Orientations 5–8 rotate 90°/270° and swap canvas width/height.
 *
 * @param {HTMLCanvasElement}        canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement}         img
 * @param {number}                   orientation  1–8
 */
function applyExifOrientation(canvas, ctx, img, orientation) {
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;

    if (orientation >= 5 && orientation <= 8) {
        canvas.width  = sh;
        canvas.height = sw;
    } else {
        canvas.width  = sw;
        canvas.height = sh;
    }

    switch (orientation) {
        case 2: ctx.transform(-1, 0,  0,  1,  sw, 0);  break; // flip horizontal
        case 3: ctx.transform(-1, 0,  0, -1,  sw, sh); break; // rotate 180°
        case 4: ctx.transform( 1, 0,  0, -1,  0,  sh); break; // flip vertical
        case 5: ctx.transform( 0, 1,  1,  0,  0,   0); break; // transpose
        case 6: ctx.transform( 0, 1, -1,  0,  sh,  0); break; // rotate 90° CW
        case 7: ctx.transform( 0,-1, -1,  0,  sh, sw); break; // transverse
        case 8: ctx.transform( 0,-1,  1,  0,  0,  sw); break; // rotate 90° CCW
        default: break;                                          // 1 = normal
    }

    ctx.drawImage(img, 0, 0);
}

// ─── Canvas Helpers ────────────────────────────────────────────────────────

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        const url = URL.createObjectURL(file);
        img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image. The file may be corrupted or invalid.')); };
        img.src = url;
    });
}

/** Scale dimensions to fit within maxW×maxH. Never upscales. */
function scaleDimensions(w, h, maxW, maxH) {
    if (w <= maxW && h <= maxH) return { w, h };
    const ratio = Math.min(maxW / w, maxH / h);
    return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

function canvasToBlob(canvas, quality) {
    return new Promise((resolve) =>
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    );
}

// ─── Main Compression Function ─────────────────────────────────────────────

/**
 * Compress an image file for a specific document slot.
 *
 * Pipeline:
 *  1. Validate MIME + extension
 *  2. Load image
 *  3. Check minimum resolution
 *  4. Read EXIF orientation (JPEG only)
 *  5. Draw orientation-corrected image to canvas
 *  6. Scale down to profile dimensions (never upscale)
 *  7. Adaptive quality loop — reduce only until target is met
 *  8. Return File + compression metadata
 *
 * @param {File}   file   Original file selected by the user (up to 10 MB)
 * @param {string} docId  Key from DOC_PROFILE_MAP (e.g. 'sslcMarkscard')
 * @returns {Promise<{ file: File, originalSize: number, compressedSize: number, compressionPercent: number }>}
 */
export async function compressDocumentImage(file, docId) {
    const profileKey   = DOC_PROFILE_MAP[docId] || 'document';
    const profile      = PROFILES[profileKey];
    const originalSize = file.size;

    // 1. Type validation
    const typeCheck = validateFileType(file);
    if (!typeCheck.valid) throw new Error(typeCheck.error);

    // 2. Load image
    const img = await loadImage(file);
    const naturalW    = img.naturalWidth;
    const naturalH    = img.naturalHeight;
    const longestSide = Math.max(naturalW, naturalH);

    // 3. Minimum resolution guard
    if (longestSide < profile.minLongestSide) {
        throw new Error(
            `Image resolution is too low (${naturalW}×${naturalH} px). ` +
            `Please upload a clearer photo or scan. ` +
            `Minimum longest side required: ${profile.minLongestSide} px.`
        );
    }

    // 4. EXIF orientation (JPEG only)
    const isJpeg      = file.type === 'image/jpeg' || file.type === 'image/jpg';
    const orientation = isJpeg ? await readExifOrientation(file) : 1;

    // 5. Draw with orientation correction onto source canvas
    const srcCanvas = document.createElement('canvas');
    const srcCtx    = srcCanvas.getContext('2d');
    applyExifOrientation(srcCanvas, srcCtx, img, orientation);

    // Corrected dimensions (may be transposed for orientations 5–8)
    const correctedW = srcCanvas.width;
    const correctedH = srcCanvas.height;

    // 6. Scale down to profile maximum (never upscale)
    const { w: targetW, h: targetH } = scaleDimensions(
        correctedW, correctedH, profile.maxWidth, profile.maxHeight
    );

    const outCanvas    = document.createElement('canvas');
    outCanvas.width    = targetW;
    outCanvas.height   = targetH;
    const outCtx       = outCanvas.getContext('2d');
    outCtx.drawImage(srcCanvas, 0, 0, targetW, targetH);

    // 7. Adaptive quality loop
    //
    // If the image is already within the target size and dimensions,
    // use a high-quality encode to avoid double-compression artifacts.
    // Otherwise, step quality down gradually until the target is met.
    let quality = profile.startQuality;
    if (originalSize > 5 * 1024 * 1024) {
        quality = 0.72; // Start lower for huge files to save iterations
    } else if (originalSize > 3 * 1024 * 1024) {
        quality = 0.80;
    }

    let blob    = await canvasToBlob(outCanvas, quality);

    if (
        originalSize <= profile.targetMaxBytes &&
        correctedW   <= profile.maxWidth        &&
        correctedH   <= profile.maxHeight
    ) {
        // Already small — only encode to apply EXIF correction; use high quality
        const hqBlob = await canvasToBlob(outCanvas, 0.92);
        blob = hqBlob.size <= originalSize ? hqBlob : blob;
    } else {
        // Reduce quality until we reach the target (using larger steps of 0.08 for speed)
        while (blob.size > profile.targetMaxBytes && quality > profile.minQuality) {
            quality = Math.round((quality - 0.08) * 100) / 100;
            blob    = await canvasToBlob(outCanvas, quality);
        }

        // Secondary pass against absolute ceiling (larger steps of 0.06 for speed)
        if (blob.size > profile.absoluteMaxBytes) {
            while (blob.size > profile.absoluteMaxBytes && quality > 0.40) {
                quality = Math.round((quality - 0.06) * 100) / 100;
                blob    = await canvasToBlob(outCanvas, quality);
            }
        }
    }

    // 8. Return output File + metadata
    const baseName = (file.name || 'document').replace(/\.[^.]+$/, '');
    const outFile  = new File([blob], `${baseName}.jpg`, {
        type:         'image/jpeg',
        lastModified: Date.now(),
    });

    return {
        file:               outFile,
        originalSize,
        compressedSize:     blob.size,
        compressionPercent: Math.max(0, Math.round((1 - blob.size / originalSize) * 100)),
    };
}
