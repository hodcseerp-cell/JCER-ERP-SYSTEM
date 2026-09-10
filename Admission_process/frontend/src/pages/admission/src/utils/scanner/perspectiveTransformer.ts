/**
 * perspectiveTransformer.ts
 *
 * High-performance hardware-accelerated perspective correction (Homography Warper)
 * transforms skewed document images into flatbed-like rectangular scans using
 * Canvas 2D triangular mesh subdivision with mathematically exact 2D affine mappings.
 */

import { Point, orderPoints } from './imageOrientation';

export type ScannerFilterType = 'original' | 'enhance' | 'bw';

export interface TransformOptions {
    maxDimension?: number;
    filter?: ScannerFilterType;
}

const DEFAULT_MAX_DIM = 2200;
const DEBUG_SCANNER = false;

/**
 * Warps a 4-point quadrilateral from a source canvas into a rectangular straightened canvas.
 */
export function warpPerspective(
    sourceCanvas: HTMLCanvasElement,
    rawPoints: [Point, Point, Point, Point],
    options: TransformOptions = {}
): HTMLCanvasElement {
    const maxDim = options.maxDimension || DEFAULT_MAX_DIM;
    const filter = options.filter || 'original';

    // 1. Ensure all crop points are clamped within source canvas bounds
    const clampedPoints: [Point, Point, Point, Point] = [
        { x: Math.min(sourceCanvas.width, Math.max(0, rawPoints[0].x)), y: Math.min(sourceCanvas.height, Math.max(0, rawPoints[0].y)) },
        { x: Math.min(sourceCanvas.width, Math.max(0, rawPoints[1].x)), y: Math.min(sourceCanvas.height, Math.max(0, rawPoints[1].y)) },
        { x: Math.min(sourceCanvas.width, Math.max(0, rawPoints[2].x)), y: Math.min(sourceCanvas.height, Math.max(0, rawPoints[2].y)) },
        { x: Math.min(sourceCanvas.width, Math.max(0, rawPoints[3].x)), y: Math.min(sourceCanvas.height, Math.max(0, rawPoints[3].y)) },
    ];

    const [tl, tr, br, bl] = orderPoints(clampedPoints);

    // 2. Calculate ideal destination dimensions based on edge lengths
    const topWidth = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const bottomWidth = Math.hypot(br.x - bl.x, br.y - bl.y);
    const leftHeight = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const rightHeight = Math.hypot(br.x - tr.x, br.y - tr.y);

    let targetW = Math.round(Math.max(topWidth, bottomWidth));
    let targetH = Math.round(Math.max(leftHeight, rightHeight));

    // Safe minimum dimensions
    const MIN_DIM = 100;
    targetW = Math.max(MIN_DIM, targetW);
    targetH = Math.max(MIN_DIM, targetH);

    // Scale to max dimension ceiling if necessary (prevents mobile memory overflow)
    const longestSide = Math.max(targetW, targetH);
    if (longestSide > maxDim) {
        const ratio = maxDim / longestSide;
        targetW = Math.round(targetW * ratio);
        targetH = Math.round(targetH * ratio);
    }

    if (DEBUG_SCANNER) {
        console.log('[Perspective Debug]', {
            sourceCanvas: { width: sourceCanvas.width, height: sourceCanvas.height },
            cropPoints: [tl, tr, br, bl],
            topWidth,
            bottomWidth,
            leftHeight,
            rightHeight,
            outputWidth: targetW,
            outputHeight: targetH,
        });
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext('2d', { alpha: false });
    if (!outCtx) throw new Error('Failed to create output canvas context');

    // Fill with neutral background first
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, targetW, targetH);

    // 3. Compute 3x3 Projective Homography Matrix mapping Destination (u, v) -> Source (x, y)
    const H = getPerspectiveTransformMatrix(
        [
            { x: 0, y: 0 },
            { x: targetW, y: 0 },
            { x: targetW, y: targetH },
            { x: 0, y: targetH },
        ],
        [tl, tr, br, bl]
    );

    // 4. Pure Direct Homography Pixel Warping with Bilinear Interpolation
    // (Completely eliminates triangle mesh subdivision, clip paths, and anti-aliasing diagonal/grid seams)
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) throw new Error('Failed to get source canvas context');

    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const srcImgData = srcCtx.getImageData(0, 0, srcW, srcH);
    const srcData = srcImgData.data;

    outCtx.save();
    outCtx.clearRect(0, 0, targetW, targetH);

    const outImgData = outCtx.createImageData(targetW, targetH);
    const outData = outImgData.data;

    const maxSrcX = srcW - 1.001;
    const maxSrcY = srcH - 1.001;

    for (let v = 0; v < targetH; v++) {
        const rowOffset = v * targetW * 4;
        const hx0 = H[1] * v + H[2];
        const hy0 = H[4] * v + H[5];
        const hw0 = H[7] * v + 1.0;

        for (let u = 0; u < targetW; u++) {
            const hw = H[6] * u + hw0;
            const invW = 1.0 / (Math.abs(hw) > 1e-9 ? hw : 1e-9);
            const rawX = (H[0] * u + hx0) * invW;
            const rawY = (H[3] * u + hy0) * invW;

            // Clamp source sample coordinates
            const sx = rawX < 0 ? 0 : rawX > maxSrcX ? maxSrcX : rawX;
            const sy = rawY < 0 ? 0 : rawY > maxSrcY ? maxSrcY : rawY;

            const x0 = sx | 0;
            const y0 = sy | 0;
            const x1 = x0 + 1 < srcW ? x0 + 1 : x0;
            const y1 = y0 + 1 < srcH ? y0 + 1 : y0;

            const fx = sx - x0;
            const fy = sy - y0;
            const w00 = (1 - fx) * (1 - fy);
            const w10 = fx * (1 - fy);
            const w01 = (1 - fx) * fy;
            const w11 = fx * fy;

            const idx00 = (y0 * srcW + x0) * 4;
            const idx10 = (y0 * srcW + x1) * 4;
            const idx01 = (y1 * srcW + x0) * 4;
            const idx11 = (y1 * srcW + x1) * 4;

            const dstIdx = rowOffset + u * 4;

            outData[dstIdx] = (w00 * srcData[idx00] + w10 * srcData[idx10] + w01 * srcData[idx01] + w11 * srcData[idx11]) | 0;
            outData[dstIdx + 1] = (w00 * srcData[idx00 + 1] + w10 * srcData[idx10 + 1] + w01 * srcData[idx01 + 1] + w11 * srcData[idx11 + 1]) | 0;
            outData[dstIdx + 2] = (w00 * srcData[idx00 + 2] + w10 * srcData[idx10 + 2] + w01 * srcData[idx01 + 2] + w11 * srcData[idx11 + 2]) | 0;
            outData[dstIdx + 3] = 255;
        }
    }

    outCtx.putImageData(outImgData, 0, 0);
    outCtx.restore();

    // 5. Validate warped output canvas - if transparent or predominantly blank, fall back to crop
    if (!validateWarpedCanvas(outCanvas)) {
        console.warn('[Perspective Warning] Mesh warp output validation failed. Using safe bounding-box fallback.');
        const fallback = fallbackBoundingBoxCrop(sourceCanvas, [tl, tr, br, bl]);
        if (filter === 'enhance') {
            const ctx = fallback.getContext('2d');
            if (ctx) applyAutoEnhance(ctx, fallback.width, fallback.height);
        } else if (filter === 'bw') {
            const ctx = fallback.getContext('2d');
            if (ctx) applyMonochromeFilter(ctx, fallback.width, fallback.height);
        }
        return fallback;
    }

    // 6. Apply optional post-processing enhancement filter if requested
    if (filter === 'enhance') {
        applyAutoEnhance(outCtx, targetW, targetH);
    } else if (filter === 'bw') {
        applyMonochromeFilter(outCtx, targetW, targetH);
    }

    return outCanvas;
}

/**
 * Validates that the warped canvas has actual document content.
 */
function validateWarpedCanvas(canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const w = canvas.width;
    const h = canvas.height;
    if (w < 20 || h < 20) return false;

    try {
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const sampleStep = Math.max(1, Math.floor(data.length / (4 * 300))); // Sample 300 points
        let validPixels = 0;
        let totalSampled = 0;

        for (let i = 0; i < data.length; i += 4 * sampleStep) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            totalSampled++;
            if (a > 30 && (r + g + b) > 15) {
                validPixels++;
            }
        }

        return (validPixels / Math.max(1, totalSampled)) >= 0.15;
    } catch {
        return true;
    }
}

/**
 * Safe fallback bounding box crop.
 */
function fallbackBoundingBoxCrop(
    sourceCanvas: HTMLCanvasElement,
    points: [Point, Point, Point, Point]
): HTMLCanvasElement {
    const minX = Math.max(0, Math.floor(Math.min(points[0].x, points[1].x, points[2].x, points[3].x)));
    const maxX = Math.min(sourceCanvas.width, Math.ceil(Math.max(points[0].x, points[1].x, points[2].x, points[3].x)));
    const minY = Math.max(0, Math.floor(Math.min(points[0].y, points[1].y, points[2].y, points[3].y)));
    const maxY = Math.min(sourceCanvas.height, Math.ceil(Math.max(points[0].y, points[1].y, points[2].y, points[3].y)));

    const cropW = Math.max(64, maxX - minX);
    const cropH = Math.max(64, maxY - minY);

    const out = document.createElement('canvas');
    out.width = cropW;
    out.height = cropH;
    const ctx = out.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cropW, cropH);
        ctx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    }
    return out;
}

/**
 * Calculates 3x3 Projective Homography Matrix mapping 4 source points to 4 destination points.
 */
function getPerspectiveTransformMatrix(
    src: [Point, Point, Point, Point],
    dst: [Point, Point, Point, Point]
): number[] {
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < 4; i++) {
        const sx = src[i].x;
        const sy = src[i].y;
        const dx = dst[i].x;
        const dy = dst[i].y;

        A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
        b.push(dx);

        A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
        b.push(dy);
    }

    const h = solveLinearSystem8x8(A, b);
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];
}

/**
 * Solves an 8x8 linear system using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem8x8(A: number[][], b: number[]): number[] {
    const n = 8;
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
                maxRow = k;
            }
        }
        // Swap
        const tmp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tmp;

        const pivot = M[i][i];
        if (Math.abs(pivot) < 1e-10) continue;

        for (let j = i; j <= n; j++) {
            M[i][j] /= pivot;
        }

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = M[k][i];
                for (let j = i; j <= n; j++) {
                    M[k][j] -= factor * M[i][j];
                }
            }
        }
    }

    return M.map((row) => row[n]);
}

/**
 * Auto Enhance: Contrast stretching + subtle sharpening.
 */
function applyAutoEnhance(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    let minLum = 255;
    let maxLum = 0;
    for (let i = 0; i < d.length; i += 16) {
        const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
    }

    const range = Math.max(1, maxLum - minLum);
    const scale = 255 / range;

    for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, Math.max(0, (d[i] - minLum) * scale));
        d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - minLum) * scale));
        d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - minLum) * scale));
    }

    ctx.putImageData(imgData, 0, 0);
}

/**
 * Monochrome / B&W document scan filter.
 */
function applyMonochromeFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
        const val = lum > 140 ? Math.min(255, lum * 1.15) : Math.max(0, lum * 0.85);
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
}

/**
 * Converts a Canvas to a File object.
 */
export function canvasToFile(
    canvas: HTMLCanvasElement,
    filename: string,
    mimeType = 'image/jpeg',
    quality = 0.90
): Promise<File> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas to Blob conversion failed'));
                    return;
                }
                const file = new File([blob], filename, {
                    type: mimeType,
                    lastModified: Date.now(),
                });
                resolve(file);
            },
            mimeType,
            quality
        );
    });
}

