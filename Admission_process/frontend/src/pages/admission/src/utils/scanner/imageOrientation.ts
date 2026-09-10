/**
 * imageOrientation.ts
 *
 * Utilities to read EXIF metadata, normalize image pixel buffers into upright orientation,
 * perform two-stage document text-layout orientation detection (0°, 90°, 180°, 270°),
 * and physically rotate source canvas buffers while accurately transforming quadrilateral coordinates.
 */

export interface Point {
    x: number;
    y: number;
}

export interface OrientationScores {
    0: number;
    90: number;
    180: number;
    270: number;
}

export interface OrientationAnalysisResult {
    rotation: 0 | 90 | 180 | 270;
    confidence: number;
    scores: OrientationScores;
    method: string;
}

export interface NormalizedImageResult {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    orientation: number;
    autoRotatedDegrees: number;
    analysis: OrientationAnalysisResult;
}

/**
 * Read the EXIF Orientation tag (0x0112) from a JPEG APP1 segment.
 * Returns 1 (normal) for non-JPEG files or when EXIF tag is absent.
 */
export async function readExifOrientation(file: File | Blob): Promise<number> {
    try {
        const buffer = await file.slice(0, 65536).arrayBuffer();
        const view = new DataView(buffer);

        // Check for JPEG SOI marker FF D8
        if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) {
            return 1;
        }

        let offset = 2;
        while (offset + 4 < view.byteLength) {
            const marker = view.getUint16(offset, false);
            const segLen = view.getUint16(offset + 2, false);

            if (marker === 0xFFE1 && offset + 10 < view.byteLength) {
                // "Exif\0\0" header (0x45786966 0x0000)
                const exifHeader = view.getUint32(offset + 4, false);
                const exifNull = view.getUint16(offset + 8, false);

                if (exifHeader === 0x45786966 && exifNull === 0x0000) {
                    const tiffBase = offset + 10;
                    const byteOrder = view.getUint16(tiffBase, false);
                    const isLittleEndian = byteOrder === 0x4949; // 'II'

                    const ifdOffset = view.getUint32(tiffBase + 4, isLittleEndian);
                    if (tiffBase + ifdOffset + 2 > view.byteLength) return 1;

                    const numEntries = view.getUint16(tiffBase + ifdOffset, isLittleEndian);
                    for (let i = 0; i < numEntries; i++) {
                        const entryOffset = tiffBase + ifdOffset + 2 + i * 12;
                        if (entryOffset + 12 > view.byteLength) break;
                        const tag = view.getUint16(entryOffset, isLittleEndian);
                        if (tag === 0x0112) {
                            return view.getUint16(entryOffset + 8, isLittleEndian);
                        }
                    }
                }
                break;
            }

            if (marker === 0xFFDA) break; // Start of Scan (SOS)
            if (segLen < 2) break;
            offset += 2 + segLen;
        }
    } catch (_) {
        // Fallback gracefully on parsing error
    }
    return 1;
}

/**
 * Loads an image from a File or Blob into an HTMLImageElement.
 */
export function loadImageElement(fileOrBlob: File | Blob | string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let objectUrl = '';
        if (typeof fileOrBlob === 'string') {
            img.src = fileOrBlob;
        } else {
            objectUrl = URL.createObjectURL(fileOrBlob);
            img.src = objectUrl;
        }

        img.onload = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image. The file may be corrupt or an unsupported format.'));
        };
    });
}

/**
 * Creates a physically normalized HTML5 Canvas with the correct upright EXIF orientation applied,
 * followed by automatic content-based document orientation analysis and physical pixel rotation.
 */
export async function normalizeImageOrientation(
    file: File | Blob,
    docType?: string
): Promise<NormalizedImageResult> {
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    const orientation = isJpeg ? await readExifOrientation(file) : 1;
    const img = await loadImageElement(file);

    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;

    // 1. Apply EXIF transformation to base canvas
    const exifCanvas = document.createElement('canvas');
    const ctx = exifCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to obtain 2D canvas context');

    if (orientation >= 5 && orientation <= 8) {
        exifCanvas.width = sh;
        exifCanvas.height = sw;
    } else {
        exifCanvas.width = sw;
        exifCanvas.height = sh;
    }

    ctx.save();
    switch (orientation) {
        case 2: // flip horizontal
            ctx.transform(-1, 0, 0, 1, sw, 0);
            break;
        case 3: // rotate 180°
            ctx.transform(-1, 0, 0, -1, sw, sh);
            break;
        case 4: // flip vertical
            ctx.transform(1, 0, 0, -1, 0, sh);
            break;
        case 5: // transpose
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
        case 6: // rotate 90° CW
            ctx.transform(0, 1, -1, 0, sh, 0);
            break;
        case 7: // transverse
            ctx.transform(0, -1, -1, 0, sh, sw);
            break;
        case 8: // rotate 90° CCW
            ctx.transform(0, -1, 1, 0, 0, sw);
            break;
        default: // 1 = normal
            break;
    }

    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // 2. Content-Based Two-Stage Document Orientation Analysis
    const orientationAnalysis = analyzeDocumentContentOrientation(exifCanvas, docType);
    let finalCanvas = exifCanvas;
    let autoRotatedDegrees = 0;

    if (orientationAnalysis.rotation !== 0) {
        finalCanvas = rotateCanvasByDegrees(exifCanvas, orientationAnalysis.rotation);
        autoRotatedDegrees = orientationAnalysis.rotation;
    }

    // 3. Debug logging tracing the entire pipeline
    console.log('[SmartScanner Debug] EXIF orientation:', orientation);
    console.log('[SmartScanner Debug] Original dimensions:', `${sw}x${sh}`);
    console.log('[SmartScanner Debug] Normalized dimensions:', `${exifCanvas.width}x${exifCanvas.height}`);
    console.log('[SmartScanner Debug] Orientation scores:', orientationAnalysis.scores);
    console.log('[SmartScanner Debug] Final selected angle:', orientationAnalysis.rotation, `(Method: ${orientationAnalysis.method})`);
    console.log('[SmartScanner Debug] Final canvas dimensions after physical rotation:', `${finalCanvas.width}x${finalCanvas.height}`);

    return {
        canvas: finalCanvas,
        width: finalCanvas.width,
        height: finalCanvas.height,
        orientation,
        autoRotatedDegrees,
        analysis: orientationAnalysis,
    };
}

/**
 * Two-stage lightweight client-side document orientation analysis:
 * Stage 1: Detect whether text lines run horizontally (0°/180°) or vertically (90°/270°).
 * Stage 2: Disambiguate direction using header mass and baseline ink distribution.
 */
export function analyzeDocumentContentOrientation(
    canvas: HTMLCanvasElement,
    docType?: string
): OrientationAnalysisResult {
    const w = canvas.width;
    const h = canvas.height;

    // ── Document-Type Rules ──
    if (docType === 'photo') {
        if (w > h * 1.15) {
            return {
                rotation: 90,
                confidence: 0.95,
                scores: { 0: 0.2, 90: 0.95, 180: 0.1, 270: 0.4 },
                method: 'Passport Photo Portrait Constraint',
            };
        }
        return {
            rotation: 0,
            confidence: 1.0,
            scores: { 0: 1.0, 90: 0.2, 180: 0.1, 270: 0.2 },
            method: 'Passport Photo Default',
        };
    }

    if (docType === 'signature') {
        if (h > w * 1.15) {
            return {
                rotation: 90,
                confidence: 0.95,
                scores: { 0: 0.2, 90: 0.95, 180: 0.1, 270: 0.4 },
                method: 'Signature Landscape Constraint',
            };
        }
        return {
            rotation: 0,
            confidence: 1.0,
            scores: { 0: 1.0, 90: 0.2, 180: 0.1, 270: 0.2 },
            method: 'Signature Default',
        };
    }

    // ── Downscale thumbnail for sub-10ms content analysis ──
    const thumbMax = 380;
    const scale = Math.min(thumbMax / w, thumbMax / h, 1.0);
    const tw = Math.max(32, Math.round(w * scale));
    const th = Math.max(32, Math.round(h * scale));

    const tCanvas = document.createElement('canvas');
    tCanvas.width = tw;
    tCanvas.height = th;
    const tCtx = tCanvas.getContext('2d', { willReadFrequently: true });

    if (!tCtx) {
        return {
            rotation: 0,
            confidence: 0,
            scores: { 0: 1, 90: 0, 180: 0, 270: 0 },
            method: 'Context Fallback',
        };
    }

    tCtx.drawImage(canvas, 0, 0, tw, th);
    const imgData = tCtx.getImageData(0, 0, tw, th);
    const d = imgData.data;

    // Convert to grayscale
    const gray = new Uint8ClampedArray(tw * th);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        gray[p] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    }

    // Compute Directional Gradients (Gx, Gy)
    const gxSum = new Float64Array(tw);
    const gySum = new Float64Array(th);
    let totalGx = 0;
    let totalGy = 0;

    // Ink density in the 4 quadrants (for Stage 2)
    let leftInk = 0;
    let rightInk = 0;
    let topInk = 0;
    let bottomInk = 0;

    for (let y = 1; y < th - 1; y++) {
        const yOff = y * tw;
        for (let x = 1; x < tw - 1; x++) {
            const idx = yOff + x;
            const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
            const gy = Math.abs(gray[idx + tw] - gray[idx - tw]);

            gxSum[x] += gx;
            gySum[y] += gy;
            totalGx += gx;
            totalGy += gy;

            const isDark = gray[idx] < 140;
            if (isDark) {
                if (x < tw * 0.35) leftInk++;
                if (x > tw * 0.65) rightInk++;
                if (y < th * 0.35) topInk++;
                if (y > th * 0.70) bottomInk++;
            }
        }
    }

    // ── STAGE 1: Horizontal vs Vertical Text-Line Periodicity ──
    // Horizontal text lines produce high variance in horizontal row projection (Gy variations)
    // Vertical text lines (sideways) produce high variance in vertical col projection (Gx variations)
    const varRowDiffs = computeProjectionOscillation(gySum);
    const varColDiffs = computeProjectionOscillation(gxSum);

    // Smearing analysis (horizontal connected components vs vertical connected components)
    const { horizComponents, vertComponents } = analyzeSmearingComponents(gray, tw, th);

    // Stage 1 Horizontal vs Vertical Score
    // When text is horizontal: varRowDiffs > varColDiffs, horizComponents < vertComponents (characters merge horizontally), totalGy >= totalGx
    const horizTextScore =
        0.40 * (varRowDiffs / (varColDiffs + 1e-4)) +
        0.35 * (vertComponents / (horizComponents + 1e-4)) +
        0.25 * (totalGy / (totalGx + 1e-4));

    const vertTextScore =
        0.40 * (varColDiffs / (varRowDiffs + 1e-4)) +
        0.35 * (horizComponents / (vertComponents + 1e-4)) +
        0.25 * (totalGx / (totalGy + 1e-4));

    const isSideways = vertTextScore > horizTextScore * 1.05 || (w > h * 1.25 && vertTextScore > horizTextScore * 0.85);

    // ── STAGE 2: Disambiguate Direction ──
    const scores: OrientationScores = { 0: 0, 90: 0, 180: 0, 270: 0 };

    if (isSideways) {
        // Text is vertical, so we must rotate either 90° CW or 270° CW (90° CCW)
        // In 90° CW rotation: original Right margin becomes Top header
        // In 270° CW rotation: original Left margin becomes Top header
        const rightHeaderScore = (rightInk + 1) / (leftInk + 1);
        const leftHeaderScore = (leftInk + 1) / (rightInk + 1);

        scores[90] = vertTextScore * 1.5 + rightHeaderScore * 0.8;
        scores[270] = vertTextScore * 1.5 + leftHeaderScore * 0.8;
        scores[0] = horizTextScore * 0.4;
        scores[180] = horizTextScore * 0.3;

        let selectedRotation: 90 | 270 = 90;
        if (leftInk > rightInk * 1.15) {
            selectedRotation = 270;
        } else {
            selectedRotation = 90;
        }

        const confidence = Math.min(0.98, Math.max(0.75, vertTextScore / (horizTextScore + 1e-4) * 0.5));

        return {
            rotation: selectedRotation,
            confidence,
            scores,
            method: `Sideways Text (Selected ${selectedRotation}°: rightInk=${rightInk}, leftInk=${leftInk})`,
        };
    } else {
        // Text is horizontal (0° or 180°)
        const topHeaderScore = (topInk + 1) / (bottomInk + 1);
        const bottomHeaderScore = (bottomInk + 1) / (topInk + 1);

        scores[0] = horizTextScore * 1.5 + topHeaderScore * 0.8;
        scores[180] = horizTextScore * 1.5 + bottomHeaderScore * 0.8;
        scores[90] = vertTextScore * 0.4;
        scores[270] = vertTextScore * 0.3;

        // Inverted check (only if bottom ink is overwhelmingly denser than top ink)
        if (bottomInk > topInk * 1.6) {
            return {
                rotation: 180,
                confidence: 0.82,
                scores,
                method: 'Inverted Horizontal Text',
            };
        }

        return {
            rotation: 0,
            confidence: Math.min(0.99, Math.max(0.80, horizTextScore / (vertTextScore + 1e-4) * 0.6)),
            scores,
            method: 'Upright Horizontal Text',
        };
    }
}

/**
 * Measures the high-frequency oscillation of adjacent projection differences (peaks and valleys).
 */
function computeProjectionOscillation(proj: Float64Array): number {
    let diffSqSum = 0;
    const n = proj.length;
    if (n <= 1) return 0;

    let mean = 0;
    for (let i = 0; i < n; i++) mean += proj[i];
    mean /= n;
    if (mean === 0) return 0;

    for (let i = 1; i < n; i++) {
        const diff = proj[i] - proj[i - 1];
        diffSqSum += diff * diff;
    }

    return diffSqSum / (n * mean * mean);
}

/**
 * Counts horizontal vs vertical smeared connected components.
 * When text is horizontal, horizontal smearing merges letters into few wide lines (horizComponents << vertComponents).
 */
function analyzeSmearingComponents(
    gray: Uint8ClampedArray,
    w: number,
    h: number
): { horizComponents: number; vertComponents: number } {
    // 1. Binary threshold
    const bin = new Uint8ClampedArray(w * h);
    for (let i = 0; i < gray.length; i++) {
        bin[i] = gray[i] < 150 ? 1 : 0;
    }

    // 2. Horizontal Smear (1x7 window)
    const horizSmear = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
        const yOff = y * w;
        for (let x = 3; x < w - 3; x++) {
            let hit = 0;
            for (let dx = -3; dx <= 3; dx++) {
                if (bin[yOff + x + dx] === 1) {
                    hit = 1;
                    break;
                }
            }
            horizSmear[yOff + x] = hit;
        }
    }

    // 3. Vertical Smear (7x1 window)
    const vertSmear = new Uint8ClampedArray(w * h);
    for (let y = 3; y < h - 3; y++) {
        for (let x = 0; x < w; x++) {
            let hit = 0;
            for (let dy = -3; dy <= 3; dy++) {
                if (bin[(y + dy) * w + x] === 1) {
                    hit = 1;
                    break;
                }
            }
            vertSmear[y * w + x] = hit;
        }
    }

    const horizComponents = countConnectedComponents(horizSmear, w, h);
    const vertComponents = countConnectedComponents(vertSmear, w, h);

    return {
        horizComponents: Math.max(1, horizComponents),
        vertComponents: Math.max(1, vertComponents),
    };
}

/**
 * Fast grid-based connected component counter.
 */
function countConnectedComponents(binaryMap: Uint8ClampedArray, w: number, h: number): number {
    const visited = new Uint8ClampedArray(w * h);
    let count = 0;

    for (let y = 2; y < h - 2; y += 2) {
        const yOff = y * w;
        for (let x = 2; x < w - 2; x += 2) {
            const idx = yOff + x;
            if (binaryMap[idx] === 1 && !visited[idx]) {
                count++;
                // Breadth flood fill small area
                const queue = [idx];
                visited[idx] = 1;
                let steps = 0;

                while (queue.length > 0 && steps < 120) {
                    const curr = queue.pop()!;
                    steps++;
                    const cy = Math.floor(curr / w);
                    const cx = curr % w;

                    const neighbors = [curr - 1, curr + 1, curr - w, curr + w];
                    for (const n of neighbors) {
                        if (n >= 0 && n < w * h && binaryMap[n] === 1 && !visited[n]) {
                            visited[n] = 1;
                            queue.push(n);
                        }
                    }
                }
            }
        }
    }
    return count;
}

/**
 * Physically rotates a canvas by 0, 90, 180, or 270 degrees and creates a new physical canvas buffer.
 */
export function rotateCanvasByDegrees(canvas: HTMLCanvasElement, degrees: 0 | 90 | 180 | 270): HTMLCanvasElement {
    if (degrees === 0) return canvas;

    const oldW = canvas.width;
    const oldH = canvas.height;

    const newCanvas = document.createElement('canvas');
    if (degrees === 90 || degrees === 270) {
        newCanvas.width = oldH;
        newCanvas.height = oldW;
    } else {
        newCanvas.width = oldW;
        newCanvas.height = oldH;
    }

    const ctx = newCanvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.save();
    if (degrees === 90) {
        ctx.translate(oldH, 0);
        ctx.rotate(Math.PI / 2);
    } else if (degrees === 180) {
        ctx.translate(oldW, oldH);
        ctx.rotate(Math.PI);
    } else if (degrees === 270) {
        ctx.translate(0, oldW);
        ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();

    return newCanvas;
}

/**
 * Rotates a canvas by 90 degrees clockwise (CW) or counter-clockwise (CCW)
 * and accurately remaps the 4 quadrilateral corner points.
 */
export function rotateCanvasWithPoints(
    sourceCanvas: HTMLCanvasElement,
    points: [Point, Point, Point, Point],
    direction: 'cw' | 'ccw'
): { canvas: HTMLCanvasElement; points: [Point, Point, Point, Point] } {
    const oldW = sourceCanvas.width;
    const oldH = sourceCanvas.height;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = oldH;
    newCanvas.height = oldW;
    const ctx = newCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.save();
    if (direction === 'cw') {
        // 90 deg clockwise
        ctx.translate(oldH, 0);
        ctx.rotate(Math.PI / 2);
    } else {
        // 90 deg counter-clockwise
        ctx.translate(0, oldW);
        ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.restore();

    // Remap the points
    const transformedPoints: Point[] = points.map((p) => {
        if (direction === 'cw') {
            return {
                x: oldH - p.y,
                y: p.x,
            };
        } else {
            return {
                x: p.y,
                y: oldW - p.x,
            };
        }
    });

    // Re-order to Top-Left, Top-Right, Bottom-Right, Bottom-Left
    const reordered = orderPoints(transformedPoints);

    return {
        canvas: newCanvas,
        points: reordered,
    };
}

/**
 * Orders 4 points clockwise: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 * Uses standard sum (x+y) and difference (x-y) geometry.
 */
export function orderPoints(pts: Point[]): [Point, Point, Point, Point] {
    if (pts.length !== 4) {
        throw new Error('orderPoints requires exactly 4 points');
    }

    const points = pts.map((p) => ({ x: p.x, y: p.y }));

    // 1. Sum of coordinates (x + y):
    //    Top-Left (TL) has the smallest sum
    //    Bottom-Right (BR) has the largest sum
    let tl = points[0];
    let br = points[0];
    let minSum = points[0].x + points[0].y;
    let maxSum = minSum;

    for (let i = 1; i < 4; i++) {
        const sum = points[i].x + points[i].y;
        if (sum < minSum) {
            minSum = sum;
            tl = points[i];
        }
        if (sum > maxSum) {
            maxSum = sum;
            br = points[i];
        }
    }

    // 2. Difference of coordinates (x - y):
    //    Top-Right (TR) has the largest difference (x - y)
    //    Bottom-Left (BL) has the smallest difference (x - y)
    const remaining = points.filter((p) => p !== tl && p !== br);
    let tr: Point;
    let bl: Point;

    if (remaining.length === 2) {
        const diff0 = remaining[0].x - remaining[0].y;
        const diff1 = remaining[1].x - remaining[1].y;
        if (diff0 > diff1) {
            tr = remaining[0];
            bl = remaining[1];
        } else {
            tr = remaining[1];
            bl = remaining[0];
        }
    } else {
        // Fallback for edge cases with identical sums
        const sortedY = [...points].sort((a, b) => a.y - b.y);
        const top = sortedY.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottom = sortedY.slice(2, 4).sort((a, b) => a.x - b.x);
        tl = top[0];
        tr = top[1];
        br = bottom[1];
        bl = bottom[0];
    }

    return [tl, tr, br, bl];
}
