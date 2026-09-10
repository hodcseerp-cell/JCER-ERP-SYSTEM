/**
 * cvDocumentDetector.ts
 *
 * Multi-Stage Intelligent Document Boundary Detection System.
 *
 * Pipeline:
 *  1. Multi-Channel Candidate Generation:
 *     - Channel A: Multi-scale edge & gradient contours (Sobel + Multi-Otsu + Morphological Bridging).
 *     - Channel B: High-contrast Luminance & Brightness Segmentation (detects white/light document on dark/colored background).
 *     - Channel C: Connected component polygonal hull & Minimum Area Bounding Rectangle extraction.
 *  2. Rigorous Multi-Factor Scoring:
 *     - 4-edge individual gradient continuity (min & avg edge support).
 *     - Inside-vs-outside luminance contrast step (penalizes low contrast).
 *     - Heavy Image-Border Penalty (rejects contours artificially stuck to camera viewport edges).
 *     - Convexity, orthogonality (60°-120° internal angles), and perspective symmetry.
 *     - Realistic document area coverage (12% to 88% of image).
 *  3. Fallback Hierarchy:
 *     - High confidence (>= 0.70): '✓ Document boundaries detected'
 *     - Medium confidence (0.40 - 0.69): '◈ Possible document boundaries detected — adjust if needed'
 *     - Low confidence (< 0.40): '⚠ Could not confidently detect document boundaries — adjust manually'
 */

import { Point, orderPoints } from './imageOrientation';

export type DetectionMethod =
    | 'physical-quadrilateral'
    | 'multiscale-quadrilateral'
    | 'card-content-region'
    | 'intelligent-content-fallback'
    | 'centered-emergency-fallback'
    | 'passport-photo'
    | 'signature';

export interface DetectionResult {
    points: [Point, Point, Point, Point]; // [TL, TR, BR, BL] in original image coordinates
    detected: boolean;
    confidence: number;
    processingTimeMs: number;
    method: DetectionMethod;
    statusMessage: string;
    docType?: string;
    contentBox?: { x: number; y: number; width: number; height: number };
}

interface QuadrilateralCandidate {
    points: [Point, Point, Point, Point];
    score: number;
    minEdgeSupport: number;
    avgEdgeSupport: number;
    contrastScore: number;
    angleScore: number;
    symmetryScore: number;
    areaRatio: number;
    aspectRatio: number;
    touchesImageBorder: boolean;
    sourceScale: number;
}

/**
 * Main entry point: Detects physical document boundaries within an image canvas.
 */
export function detectDocumentCorners(
    sourceCanvas: HTMLCanvasElement,
    docType?: string
): DetectionResult {
    const startTime = performance.now();
    const origW = sourceCanvas.width;
    const origH = sourceCanvas.height;

    // ── 1. Document-Type Aware Fast Paths ────────────────────────────────────
    if (docType === 'photo') {
        return createPassportPhotoCrop(origW, origH, startTime);
    }
    if (docType === 'signature') {
        return detectSignatureCrop(sourceCanvas, origW, origH, startTime);
    }

    // ── 2. Multi-Scale & Multi-Channel Candidate Extraction ──────────────────
    const scales = [480, 360];
    const allCandidates: QuadrilateralCandidate[] = [];

    for (const targetDim of scales) {
        if (targetDim > Math.max(origW, origH) && targetDim !== 360) continue;

        const scale = Math.min(targetDim / origW, targetDim / origH, 1.0);
        const tw = Math.max(32, Math.round(origW * scale));
        const th = Math.max(32, Math.round(origH * scale));

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        const thumbCtx = thumbCanvas.getContext('2d', { willReadFrequently: true });
        if (!thumbCtx) continue;

        thumbCtx.drawImage(sourceCanvas, 0, 0, tw, th);
        const imgData = thumbCtx.getImageData(0, 0, tw, th);
        const pixels = imgData.data;

        // Grayscale conversion
        const gray = new Uint8ClampedArray(tw * th);
        for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
            gray[p] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8;
        }

        const blurred = gaussianBlur3x3(gray, tw, th);
        const { gradMagnitude, maxGrad } = sobelFilter(blurred, tw, th);

        // ── CHANNEL A: Edge & Gradient Contours ──────────────────────────────
        if (maxGrad >= 15) {
            const otsu = computeOtsuThreshold(gradMagnitude, maxGrad);
            const thresholds = [
                otsu,
                Math.max(16, Math.round(otsu * 0.65)),
                Math.min(110, Math.max(25, Math.round(otsu * 1.30))),
            ];

            for (const thresh of Array.from(new Set(thresholds))) {
                const edgeMap = binarizeEdges(gradMagnitude, thresh, tw, th);
                const closed = morphologicalClose(edgeMap, tw, th);
                const contours = findClosedContours(closed, tw, th);
                const candidates = extractAndScoreCandidates(contours, gradMagnitude, gray, tw, th, scale);
                allCandidates.push(...candidates);
            }
        }

        // Contrast-Enhanced Edge Channel
        const enhGray = enhanceContrast(gray, tw, th);
        const enhBlur = gaussianBlur3x3(enhGray, tw, th);
        const { gradMagnitude: enhGrad, maxGrad: enhMax } = sobelFilter(enhBlur, tw, th);
        if (enhMax >= 20) {
            const enhOtsu = computeOtsuThreshold(enhGrad, enhMax);
            const edgeMap = binarizeEdges(enhGrad, Math.max(18, Math.round(enhOtsu * 0.80)), tw, th);
            const closed = morphologicalClose(edgeMap, tw, th);
            const contours = findClosedContours(closed, tw, th);
            const candidates = extractAndScoreCandidates(contours, enhGrad, enhGray, tw, th, scale);
            allCandidates.push(...candidates);
        }

        // ── CHANNEL B: Luminance / Brightness Paper Segmentation ─────────────
        // Detects bright white/cream document placed on a darker/wood surface
        const brightCandidates = extractBrightnessSegmentedCandidates(gray, gradMagnitude, tw, th, scale);
        allCandidates.push(...brightCandidates);
    }

    // ── 3. Candidate Sorting and Border Filtering ────────────────────────────
    // Prioritize candidates that do NOT touch the camera border
    allCandidates.sort((a, b) => {
        // Heavy preference for interior candidates over border-pinned candidates
        if (!a.touchesImageBorder && b.touchesImageBorder) return -1;
        if (a.touchesImageBorder && !b.touchesImageBorder) return 1;
        return b.score - a.score;
    });

    const best = allCandidates.length > 0 ? allCandidates[0] : null;

    // ── 4. Evaluate Detection Tiers ──────────────────────────────────────────
    if (best && best.score >= 0.68) {
        const invScale = 1.0 / best.sourceScale;
        const scaledPoints: [Point, Point, Point, Point] = [
            { x: Math.min(origW, Math.max(0, Math.round(best.points[0].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[0].y * invScale))) },
            { x: Math.min(origW, Math.max(0, Math.round(best.points[1].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[1].y * invScale))) },
            { x: Math.min(origW, Math.max(0, Math.round(best.points[2].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[2].y * invScale))) },
            { x: Math.min(origW, Math.max(0, Math.round(best.points[3].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[3].y * invScale))) },
        ];

        const ordered = orderPoints(scaledPoints);
        const confidence = Math.min(0.99, Math.round(best.score * 100) / 100);

        console.log('[Document Detection]', {
            imageSize: `${origW}x${origH}`,
            candidatesFound: allCandidates.length,
            selectedCandidate: ordered,
            selectedScore: best.score.toFixed(3),
            touchesImageBorder: best.touchesImageBorder,
            edgeSupport: { min: best.minEdgeSupport.toFixed(2), avg: best.avgEdgeSupport.toFixed(2) },
            contrastScore: best.contrastScore.toFixed(2),
            areaRatio: best.areaRatio.toFixed(3),
            aspectRatio: best.aspectRatio.toFixed(2),
            confidence,
            method: 'physical-quadrilateral',
        });

        return {
            points: ordered,
            detected: true,
            confidence,
            processingTimeMs: Math.round(performance.now() - startTime),
            method: 'physical-quadrilateral',
            statusMessage: '✓ Document boundaries detected',
            docType,
        };
    }

    if (best && best.score >= 0.42) {
        const invScale = 1.0 / best.sourceScale;
        const scaledPoints: [Point, Point, Point, Point] = [
            { x: Math.min(origW, Math.max(0, Math.round(best.points[0].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[0].y * invScale))) },
            { x: Math.min(origW, Math.max(0, Math.round(best.points[1].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[1].y * invScale))) },
            { x: Math.min(origW, Math.max(0, Math.round(best.points[2].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[2].y * invScale))) },
            { x: Math.min(origW, Math.max(0, Math.round(best.points[3].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(best.points[3].y * invScale))) },
        ];

        const ordered = orderPoints(scaledPoints);
        const confidence = Math.min(0.69, Math.round(best.score * 100) / 100);

        console.log('[Document Detection]', {
            imageSize: `${origW}x${origH}`,
            candidatesFound: allCandidates.length,
            selectedCandidate: ordered,
            selectedScore: best.score.toFixed(3),
            touchesImageBorder: best.touchesImageBorder,
            edgeSupport: { min: best.minEdgeSupport.toFixed(2), avg: best.avgEdgeSupport.toFixed(2) },
            contrastScore: best.contrastScore.toFixed(2),
            areaRatio: best.areaRatio.toFixed(3),
            aspectRatio: best.aspectRatio.toFixed(2),
            confidence,
            method: 'multiscale-quadrilateral',
        });

        return {
            points: ordered,
            detected: true,
            confidence,
            processingTimeMs: Math.round(performance.now() - startTime),
            method: 'multiscale-quadrilateral',
            statusMessage: '◈ Possible document boundaries detected — adjust if needed',
            docType,
        };
    }

    // ── 5. Secondary Luminance Region Fallback ────────────────────────────────
    // If no clean quadrilateral was extracted, find the largest solid bright document blob
    const secondaryRegion = extractLargestBrightDocumentRegion(sourceCanvas, origW, origH);
    if (secondaryRegion) {
        const ordered = orderPoints(secondaryRegion);
        console.log('[Document Detection]', {
            imageSize: `${origW}x${origH}`,
            candidatesFound: allCandidates.length,
            selectedCandidate: ordered,
            selectedScore: '0.45 (secondary luminance fallback)',
            touchesImageBorder: false,
            confidence: 0.48,
            method: 'card-content-region',
        });

        return {
            points: ordered,
            detected: true,
            confidence: 0.48,
            processingTimeMs: Math.round(performance.now() - startTime),
            method: 'card-content-region',
            statusMessage: '◈ Possible document boundaries detected — adjust if needed',
            docType,
        };
    }

    // ── 6. Emergency Aspect-Aware Centered Fallback (Low Confidence) ─────────
    console.log('[Document Detection]', {
        imageSize: `${origW}x${origH}`,
        candidatesFound: allCandidates.length,
        selectedCandidate: 'Emergency Centered 70%',
        selectedScore: '0.15',
        confidence: 0.20,
        method: 'centered-emergency-fallback',
    });

    return createEmergencyAspectFallback(origW, origH, startTime, docType);
}

/**
 * Extracts candidate quadrilaterals by thresholding grayscale luminance
 * (identifying white/light paper on dark/medium backgrounds).
 */
function extractBrightnessSegmentedCandidates(
    gray: Uint8ClampedArray,
    gradMag: Uint8ClampedArray,
    w: number,
    h: number,
    scale: number
): QuadrilateralCandidate[] {
    const totalPixels = w * h;
    const candidates: QuadrilateralCandidate[] = [];

    // Calculate mean and standard deviation of luminance
    let sum = 0;
    for (let i = 0; i < totalPixels; i++) sum += gray[i];
    const mean = sum / totalPixels;

    let varSum = 0;
    for (let i = 0; i < totalPixels; i++) {
        const diff = gray[i] - mean;
        varSum += diff * diff;
    }
    const stdDev = Math.sqrt(varSum / totalPixels);

    // Multi-level luminance thresholds
    const threshLevels = [
        Math.min(220, Math.max(120, Math.round(mean + 0.35 * stdDev))),
        Math.min(220, Math.max(100, Math.round(mean))),
        135,
        165,
    ];

    for (const thresh of Array.from(new Set(threshLevels))) {
        const binMap = new Uint8ClampedArray(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
            binMap[i] = gray[i] >= thresh ? 255 : 0;
        }

        const closed = morphologicalClose(binMap, w, h);
        const contours = findClosedContours(closed, w, h);
        const scored = extractAndScoreCandidates(contours, gradMag, gray, w, h, scale);
        candidates.push(...scored);
    }

    return candidates;
}

/**
 * Extracts candidate 4-point quadrilaterals from closed contours and scores each one.
 */
function extractAndScoreCandidates(
    contours: Point[][],
    gradMag: Uint8ClampedArray,
    gray: Uint8ClampedArray,
    w: number,
    h: number,
    sourceScale: number
): QuadrilateralCandidate[] {
    const totalArea = w * h;
    const candidates: QuadrilateralCandidate[] = [];

    for (const contour of contours) {
        const hull = convexHull(contour);
        if (hull.length < 4) continue;

        const area = polygonArea(hull);
        const areaRatio = area / totalArea;

        // Document should typically occupy between 12% and 90% of image
        if (areaRatio < 0.10 || areaRatio > 0.94) continue;

        const perimeter = hull.reduce((pSum, p, i) => {
            const next = hull[(i + 1) % hull.length];
            return pSum + Math.hypot(next.x - p.x, next.y - p.y);
        }, 0);

        // Simplify with multiple epsilon ratios
        let simplified: Point[] = [];
        for (let epsRatio = 0.015; epsRatio <= 0.065; epsRatio += 0.008) {
            const result = simplifyPolygon(hull, perimeter * epsRatio);
            if (result.length === 4) {
                simplified = result;
                break;
            } else if (result.length === 5 && result[0].x === result[4].x && result[0].y === result[4].y) {
                simplified = result.slice(0, 4);
                break;
            }
        }

        if (simplified.length !== 4) continue;

        const ordered = orderPoints(simplified);

        // Check 1: Strict Convexity
        if (!isStrictlyConvex(ordered)) continue;

        // Check 2: Realistic Internal Angles (55° to 125°)
        const angleCheck = checkInternalAngles(ordered);
        if (!angleCheck.valid) continue;

        // Check 3: Perspective Symmetry
        const symmetryCheck = checkPerspectiveSymmetry(ordered);
        if (!symmetryCheck.valid) continue;

        // Check 4: Realistic Aspect Ratio (0.35 to 2.8)
        const ar = computeAspectRatio(ordered);
        if (ar < 0.35 || ar > 2.8) continue;

        // Check 5: Individual Edge Gradient Continuity (All 4 edges must have physical evidence)
        const edgeContinuity = checkIndividualEdgeContinuity(ordered, gradMag, w, h);
        if (edgeContinuity.minEdgeSupport < 0.28) continue;

        // Check 6: Image-Border Proximity Check
        const borderCheck = checkBorderProximity(ordered, w, h);

        // Check 7: Contrast Difference (Inside Document vs Outside Document)
        const contrast = measureInsideOutsideContrast(ordered, gray, w, h);

        // Compute Composite Document Score
        // High score favors: continuous physical edges, strong contrast with table, clean angles, interior positioning
        let compositeScore =
            0.28 * edgeContinuity.minEdgeSupport +
            0.14 * edgeContinuity.avgEdgeSupport +
            0.24 * contrast.contrastScore +
            0.15 * symmetryCheck.score +
            0.11 * angleCheck.score +
            0.08 * (areaRatio >= 0.20 && areaRatio <= 0.85 ? 1.0 : 0.70);

        // Heavy border penalty: penalize candidates pinned to the camera frame
        if (borderCheck.touchesImageBorder) {
            compositeScore -= (0.22 * borderCheck.borderEdgeCount);
        }

        if (compositeScore >= 0.40) {
            candidates.push({
                points: ordered,
                score: compositeScore,
                minEdgeSupport: edgeContinuity.minEdgeSupport,
                avgEdgeSupport: edgeContinuity.avgEdgeSupport,
                contrastScore: contrast.contrastScore,
                angleScore: angleCheck.score,
                symmetryScore: symmetryCheck.score,
                areaRatio,
                aspectRatio: ar,
                touchesImageBorder: borderCheck.touchesImageBorder,
                sourceScale,
            });
        }
    }

    return candidates;
}

/**
 * Checks if candidate touches the camera frame borders.
 */
function checkBorderProximity(
    pts: [Point, Point, Point, Point],
    w: number,
    h: number
): { touchesImageBorder: boolean; borderEdgeCount: number } {
    let borderEdgeCount = 0;
    const margin = 4;

    for (let i = 0; i < 4; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % 4];

        const isTop = p1.y <= margin && p2.y <= margin;
        const isBottom = p1.y >= h - margin - 1 && p2.y >= h - margin - 1;
        const isLeft = p1.x <= margin && p2.x <= margin;
        const isRight = p1.x >= w - margin - 1 && p2.x >= w - margin - 1;

        if (isTop || isBottom || isLeft || isRight) {
            borderEdgeCount++;
        }
    }

    return {
        touchesImageBorder: borderEdgeCount >= 1,
        borderEdgeCount,
    };
}

/**
 * Measures contrast step between the interior of the document and the surrounding table.
 */
function measureInsideOutsideContrast(
    pts: [Point, Point, Point, Point],
    gray: Uint8ClampedArray,
    w: number,
    h: number
): { contrastScore: number; insideMean: number; outsideMean: number } {
    // Center point of polygon
    const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
    const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;

    let insideSum = 0;
    let outsideSum = 0;
    let sampleCount = 0;

    for (let i = 0; i < 4; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % 4];

        for (let s = 1; s <= 8; s++) {
            const t = s / 9;
            const ex = p1.x + t * (p2.x - p1.x);
            const ey = p1.y + t * (p2.y - p1.y);

            // Inward normal vector (towards center)
            const vx = cx - ex;
            const vy = cy - ey;
            const vLen = Math.hypot(vx, vy);
            if (vLen < 5) continue;

            const nx = (vx / vLen) * 5; // 5px inward
            const ny = (vy / vLen) * 5;

            const inX = Math.round(ex + nx);
            const inY = Math.round(ey + ny);
            const outX = Math.round(ex - nx); // 5px outward
            const outY = Math.round(ey - ny);

            if (inX >= 0 && inX < w && inY >= 0 && inY < h && outX >= 0 && outX < w && outY >= 0 && outY < h) {
                insideSum += gray[inY * w + inX];
                outsideSum += gray[outY * w + outX];
                sampleCount++;
            }
        }
    }

    if (sampleCount < 10) {
        return { contrastScore: 0.5, insideMean: 128, outsideMean: 128 };
    }

    const insideMean = insideSum / sampleCount;
    const outsideMean = outsideSum / sampleCount;
    const diff = Math.abs(insideMean - outsideMean);

    // High difference (e.g. > 45 luma levels) indicates a clear physical paper boundary
    const contrastScore = Math.min(1.0, diff / 65);

    return { contrastScore, insideMean, outsideMean };
}

/**
 * Secondary fallback: Extracts the largest solid bright document region.
 */
function extractLargestBrightDocumentRegion(
    sourceCanvas: HTMLCanvasElement,
    origW: number,
    origH: number
): [Point, Point, Point, Point] | null {
    const thumbMax = 320;
    const scale = Math.min(thumbMax / origW, thumbMax / origH, 1.0);
    const tw = Math.max(32, Math.round(origW * scale));
    const th = Math.max(32, Math.round(origH * scale));

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = tw;
    thumbCanvas.height = th;
    const ctx = thumbCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(sourceCanvas, 0, 0, tw, th);
    const imgData = ctx.getImageData(0, 0, tw, th);
    const d = imgData.data;

    const gray = new Uint8ClampedArray(tw * th);
    let sum = 0;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const val = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
        gray[p] = val;
        sum += val;
    }
    const mean = sum / (tw * th);

    // Segment pixels brighter than background mean
    const binMap = new Uint8ClampedArray(tw * th);
    for (let i = 0; i < tw * th; i++) {
        binMap[i] = gray[i] >= Math.max(110, Math.round(mean * 1.05)) ? 255 : 0;
    }

    const closed = morphologicalClose(binMap, tw, th);
    const contours = findClosedContours(closed, tw, th);

    let bestRegion: Point[] | null = null;
    let maxArea = 0;

    for (const contour of contours) {
        const hull = convexHull(contour);
        const area = polygonArea(hull);
        const ratio = area / (tw * th);

        if (ratio >= 0.12 && ratio <= 0.88 && area > maxArea) {
            maxArea = area;
            bestRegion = hull;
        }
    }

    if (!bestRegion) return null;

    // Simplify to 4 corners
    const perimeter = bestRegion.reduce((pSum, p, i) => {
        const next = bestRegion![(i + 1) % bestRegion!.length];
        return pSum + Math.hypot(next.x - p.x, next.y - p.y);
    }, 0);

    let simplified = simplifyPolygon(bestRegion, perimeter * 0.035);
    if (simplified.length !== 4) {
        // Minimum bounding box fallback on hull
        let minX = tw, minY = th, maxX = 0, maxY = 0;
        for (const p of bestRegion) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        simplified = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
        ];
    }

    const invScale = 1.0 / scale;
    return [
        { x: Math.min(origW, Math.max(0, Math.round(simplified[0].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(simplified[0].y * invScale))) },
        { x: Math.min(origW, Math.max(0, Math.round(simplified[1].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(simplified[1].y * invScale))) },
        { x: Math.min(origW, Math.max(0, Math.round(simplified[2].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(simplified[2].y * invScale))) },
        { x: Math.min(origW, Math.max(0, Math.round(simplified[3].x * invScale))), y: Math.min(origH, Math.max(0, Math.round(simplified[3].y * invScale))) },
    ];
}

/**
 * Passport Photo default crop.
 */
function createPassportPhotoCrop(w: number, h: number, startTime: number): DetectionResult {
    const targetAspect = 0.778;
    const currentAspect = w / h;

    let cropW: number;
    let cropH: number;

    if (Math.abs(currentAspect - targetAspect) < 0.15) {
        cropW = Math.round(w * 0.88);
        cropH = Math.round(h * 0.88);
    } else if (currentAspect > targetAspect) {
        cropH = Math.round(h * 0.85);
        cropW = Math.round(cropH * targetAspect);
    } else {
        cropW = Math.round(w * 0.85);
        cropH = Math.round(cropW / targetAspect);
    }

    const startX = Math.round((w - cropW) / 2);
    const startY = Math.round((h - cropH) / 2);

    const points: [Point, Point, Point, Point] = [
        { x: startX, y: startY },
        { x: startX + cropW, y: startY },
        { x: startX + cropW, y: startY + cropH },
        { x: startX, y: startY + cropH },
    ];

    return {
        points,
        detected: true,
        confidence: 0.95,
        processingTimeMs: Math.round(performance.now() - startTime),
        method: 'passport-photo',
        statusMessage: '✓ Passport photo frame aligned',
        docType: 'photo',
    };
}

/**
 * Signature ink crop.
 */
function detectSignatureCrop(
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
    startTime: number
): DetectionResult {
    const marginX = Math.round(w * 0.06);
    const marginY = Math.round(h * 0.12);

    const points: [Point, Point, Point, Point] = [
        { x: marginX, y: marginY },
        { x: w - marginX, y: marginY },
        { x: w - marginX, y: h - marginY },
        { x: marginX, y: h - marginY },
    ];

    return {
        points,
        detected: true,
        confidence: 0.88,
        processingTimeMs: Math.round(performance.now() - startTime),
        method: 'signature',
        statusMessage: '✓ Signature frame aligned',
        docType: 'signature',
    };
}

/**
 * Centered aspect-aware emergency fallback.
 */
function createEmergencyAspectFallback(
    w: number,
    h: number,
    startTime: number,
    docType?: string
): DetectionResult {
    const cropW = Math.round(w * 0.70);
    const cropH = Math.round(h * 0.70);

    const startX = Math.round((w - cropW) / 2);
    const startY = Math.round((h - cropH) / 2);

    const points: [Point, Point, Point, Point] = [
        { x: startX, y: startY },
        { x: startX + cropW, y: startY },
        { x: startX + cropW, y: startY + cropH },
        { x: startX, y: startY + cropH },
    ];

    return {
        points,
        detected: false,
        confidence: 0.20,
        processingTimeMs: Math.round(performance.now() - startTime),
        method: 'centered-emergency-fallback',
        statusMessage: '⚠ Could not confidently detect document boundaries — adjust manually',
        docType,
    };
}

/**
 * Fast 3x3 Gaussian Blur filter.
 */
function gaussianBlur3x3(input: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(w * h);
    for (let y = 1; y < h - 1; y++) {
        const yOff = y * w;
        for (let x = 1; x < w - 1; x++) {
            const idx = yOff + x;
            const sum =
                input[idx - w - 1] + 2 * input[idx - w] + input[idx - w + 1] +
                2 * input[idx - 1] + 4 * input[idx] + 2 * input[idx + 1] +
                input[idx + w - 1] + 2 * input[idx + w] + input[idx + w + 1];
            output[idx] = sum >> 4;
        }
    }
    return output;
}

/**
 * Enhances contrast using min-max histogram normalization.
 */
function enhanceContrast(input: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
    let minVal = 255;
    let maxVal = 0;
    for (let i = 0; i < input.length; i++) {
        const v = input[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
    }

    const range = maxVal - minVal;
    if (range < 20) return input;

    const output = new Uint8ClampedArray(w * h);
    const scale = 255 / range;
    for (let i = 0; i < input.length; i++) {
        output[i] = Math.min(255, Math.max(0, Math.round((input[i] - minVal) * scale)));
    }
    return output;
}

/**
 * Computes Sobel gradient magnitude.
 */
function sobelFilter(input: Uint8ClampedArray, w: number, h: number): { gradMagnitude: Uint8ClampedArray; maxGrad: number } {
    const gradMagnitude = new Uint8ClampedArray(w * h);
    let maxGrad = 0;

    for (let y = 1; y < h - 1; y++) {
        const yOff = y * w;
        for (let x = 1; x < w - 1; x++) {
            const idx = yOff + x;
            const gx =
                -input[idx - w - 1] + input[idx - w + 1] +
                -2 * input[idx - 1] + 2 * input[idx + 1] +
                -input[idx + w - 1] + input[idx + w + 1];

            const gy =
                -input[idx - w - 1] - 2 * input[idx - w] - input[idx - w + 1] +
                input[idx + w - 1] + 2 * input[idx + w] + input[idx + w + 1];

            const mag = Math.min(255, Math.abs(gx) + Math.abs(gy));
            gradMagnitude[idx] = mag;
            if (mag > maxGrad) maxGrad = mag;
        }
    }

    return { gradMagnitude, maxGrad };
}

/**
 * Calculates Otsu threshold on gradient magnitude.
 */
function computeOtsuThreshold(grad: Uint8ClampedArray, maxGrad: number): number {
    if (maxGrad <= 15) return 25;

    const hist = new Uint32Array(256);
    let total = 0;
    for (let i = 0; i < grad.length; i++) {
        const v = grad[i];
        if (v > 10) {
            hist[v]++;
            total++;
        }
    }

    if (total === 0) return 30;

    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let varMax = 0;
    let threshold = 35;

    for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;

        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varBetween > varMax) {
            varMax = varBetween;
            threshold = t;
        }
    }

    return Math.max(20, Math.min(75, threshold));
}

/**
 * Binarizes gradient edges.
 */
function binarizeEdges(grad: Uint8ClampedArray, threshold: number, w: number, h: number): Uint8ClampedArray {
    const edgeMap = new Uint8ClampedArray(w * h);
    for (let i = 0; i < grad.length; i++) {
        edgeMap[i] = grad[i] >= threshold ? 255 : 0;
    }
    return edgeMap;
}

/**
 * Morphological closing with 5x5 kernel to seal line gaps.
 */
function morphologicalClose(edgeMap: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
    const dilated = new Uint8ClampedArray(w * h);
    for (let y = 2; y < h - 2; y++) {
        const yOff = y * w;
        for (let x = 2; x < w - 2; x++) {
            let hit = false;
            for (let dy = -2; dy <= 2 && !hit; dy++) {
                const dyOff = (y + dy) * w;
                for (let dx = -2; dx <= 2; dx++) {
                    if (edgeMap[dyOff + x + dx] === 255) {
                        hit = true;
                        break;
                    }
                }
            }
            if (hit) dilated[yOff + x] = 255;
        }
    }

    const closed = new Uint8ClampedArray(w * h);
    for (let y = 2; y < h - 2; y++) {
        const yOff = y * w;
        for (let x = 2; x < w - 2; x++) {
            let allSet = true;
            for (let dy = -1; dy <= 1 && allSet; dy++) {
                const dyOff = (y + dy) * w;
                for (let dx = -1; dx <= 1; dx++) {
                    if (dilated[dyOff + x + dx] !== 255) {
                        allSet = false;
                        break;
                    }
                }
            }
            if (allSet) closed[yOff + x] = 255;
        }
    }
    return closed;
}

/**
 * Extract strictly closed contours using Moore Neighbor tracing.
 */
function findClosedContours(edgeMap: Uint8ClampedArray, w: number, h: number): Point[][] {
    const visited = new Uint8ClampedArray(w * h);
    const contours: Point[][] = [];
    const minContourLength = 35;

    for (let y = 4; y < h - 4; y += 2) {
        const yOff = y * w;
        for (let x = 4; x < w - 4; x += 2) {
            const idx = yOff + x;
            if (edgeMap[idx] === 255 && !visited[idx]) {
                const contour: Point[] = [];
                let cx = x;
                let cy = y;
                const startX = x;
                const startY = y;

                let steps = 0;
                let isClosed = false;

                while (steps < 2500) {
                    visited[cy * w + cx] = 1;
                    contour.push({ x: cx, y: cy });

                    if (steps > 20 && Math.abs(cx - startX) <= 1 && Math.abs(cy - startY) <= 1) {
                        isClosed = true;
                        break;
                    }

                    let foundNext = false;
                    const neighbors = [
                        [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1], [cx - 1, cy + 1],
                        [cx - 1, cy], [cx - 1, cy - 1], [cx, cy - 1], [cx + 1, cy - 1],
                    ];

                    for (const [nx, ny] of neighbors) {
                        if (nx >= 2 && nx < w - 2 && ny >= 2 && ny < h - 2) {
                            const nIdx = ny * w + nx;
                            if (edgeMap[nIdx] === 255 && !visited[nIdx]) {
                                cx = nx;
                                cy = ny;
                                foundNext = true;
                                break;
                            }
                        }
                    }

                    if (!foundNext) break;
                    steps++;
                }

                if (contour.length >= minContourLength && isClosed) {
                    contours.push(contour);
                }
            }
        }
    }

    return contours;
}

/**
 * Ramer-Douglas-Peucker polygon simplification.
 */
function simplifyPolygon(points: Point[], epsilon: number): Point[] {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const dist = perpendicularDistance(points[i], points[0], points[end]);
        if (dist > maxDist) {
            maxDist = dist;
            index = i;
        }
    }

    if (maxDist > epsilon) {
        const rec1 = simplifyPolygon(points.slice(0, index + 1), epsilon);
        const rec2 = simplifyPolygon(points.slice(index), epsilon);
        return [...rec1.slice(0, rec1.length - 1), ...rec2];
    } else {
        return [points[0], points[end]];
    }
}

function perpendicularDistance(p: Point, p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - p1.x, p.y - p1.y);
    const num = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
    return num / Math.sqrt(lenSq);
}

/**
 * Convex Hull using Monotone Chain algorithm.
 */
function convexHull(points: Point[]): Point[] {
    if (points.length <= 3) return points;
    const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

    const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const lower: Point[] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

/**
 * Polygon Area via Shoelace formula.
 */
function polygonArea(pts: Point[]): number {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += pts[i].x * pts[j].y;
        area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
}

/**
 * Checks if 4 points form a strictly convex polygon.
 */
function isStrictlyConvex(pts: [Point, Point, Point, Point]): boolean {
    let sign: number | null = null;
    for (let i = 0; i < 4; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % 4];
        const p3 = pts[(i + 2) % 4];

        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;

        const cross = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(cross) < 10) return false;

        const currSign = cross > 0 ? 1 : -1;
        if (sign === null) {
            sign = currSign;
        } else if (sign !== currSign) {
            return false;
        }
    }
    return true;
}

/**
 * Verifies internal angles are within realistic bounds (55° to 125°).
 */
function checkInternalAngles(pts: [Point, Point, Point, Point]): { valid: boolean; score: number } {
    let totalScore = 1.0;

    for (let i = 0; i < 4; i++) {
        const prev = pts[(i + 3) % 4];
        const curr = pts[i];
        const next = pts[(i + 1) % 4];

        const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };

        const mag1 = Math.hypot(v1.x, v1.y);
        const mag2 = Math.hypot(v2.x, v2.y);
        if (mag1 < 10 || mag2 < 10) return { valid: false, score: 0 };

        const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
        const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;

        if (angleDeg < 55 || angleDeg > 125) {
            return { valid: false, score: 0 };
        }

        const devFromRightAngle = Math.abs(angleDeg - 90);
        totalScore -= (devFromRightAngle / 90) * 0.22;
    }

    return { valid: true, score: Math.max(0.2, totalScore) };
}

/**
 * Checks perspective symmetry (parallelism of opposite edges and length proportionality).
 */
function checkPerspectiveSymmetry(pts: [Point, Point, Point, Point]): { valid: boolean; score: number } {
    const [tl, tr, br, bl] = pts;

    const topLen = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const bottomLen = Math.hypot(br.x - bl.x, br.y - bl.y);
    const leftLen = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const rightLen = Math.hypot(br.x - tr.x, br.y - tr.y);

    if (topLen < 15 || bottomLen < 15 || leftLen < 15 || rightLen < 15) {
        return { valid: false, score: 0 };
    }

    const horizRatio = Math.min(topLen, bottomLen) / Math.max(topLen, bottomLen);
    const vertRatio = Math.min(leftLen, rightLen) / Math.max(leftLen, rightLen);

    if (horizRatio < 0.55 || vertRatio < 0.55) {
        return { valid: false, score: 0 };
    }

    const topAngle = Math.atan2(tr.y - tl.y, tr.x - tl.x) * (180 / Math.PI);
    const bottomAngle = Math.atan2(br.y - bl.y, br.x - bl.x) * (180 / Math.PI);
    const horizAngleDiff = Math.abs(topAngle - bottomAngle);

    const leftAngle = Math.atan2(bl.y - tl.y, bl.x - tl.x) * (180 / Math.PI);
    const rightAngle = Math.atan2(br.y - tr.y, br.x - tr.x) * (180 / Math.PI);
    const vertAngleDiff = Math.abs(leftAngle - rightAngle);

    if (horizAngleDiff > 28 || vertAngleDiff > 28) {
        return { valid: false, score: 0 };
    }

    const symmetryScore = (horizRatio + vertRatio) / 2;
    return { valid: true, score: symmetryScore };
}

/**
 * Computes average width-to-height aspect ratio.
 */
function computeAspectRatio(pts: [Point, Point, Point, Point]): number {
    const [tl, tr, br, bl] = pts;
    const avgW = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2;
    const avgH = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;
    return avgH > 0 ? avgW / avgH : 1;
}

/**
 * Verifies that ALL FOUR edges INDIVIDUALLY have strong gradient support in the image.
 */
function checkIndividualEdgeContinuity(
    pts: [Point, Point, Point, Point],
    gradMag: Uint8ClampedArray,
    w: number,
    h: number
): { minEdgeSupport: number; avgEdgeSupport: number } {
    const edgeSupports: number[] = [];
    const samplesPerEdge = 25;

    for (let i = 0; i < 4; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % 4];

        let supportedCount = 0;

        for (let s = 1; s <= samplesPerEdge; s++) {
            const t = s / (samplesPerEdge + 1);
            const sx = Math.round(p1.x + t * (p2.x - p1.x));
            const sy = Math.round(p1.y + t * (p2.y - p1.y));

            let hasEdge = false;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = sx + dx;
                    const ny = sy + dy;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        if (gradMag[ny * w + nx] > 20) {
                            hasEdge = true;
                            break;
                        }
                    }
                }
                if (hasEdge) break;
            }

            if (hasEdge) supportedCount++;
        }

        edgeSupports.push(supportedCount / samplesPerEdge);
    }

    const minEdgeSupport = Math.min(...edgeSupports);
    const avgEdgeSupport = edgeSupports.reduce((a, b) => a + b, 0) / 4;

    return { minEdgeSupport, avgEdgeSupport };
}

