/**
 * SmartCropEditor.tsx
 *
 * HARD STABILITY GUARD ARCHITECTURE:
 *  1. IMMUTABLE FIXED STAGE:
 *     - Stage width/height and scale are calculated once on canvas mount or 90° rotation and LOCKED.
 *     - No ResizeObserver, scroll, or window event can resize or reflow the stage during an editing session.
 *     - Stage bounding rect is cached on pointerdown (eliminates synchronous getBoundingClientRect layout thrashing during drag).
 *  2. SINGLE SOURCE OF TRUTH (LOCKED COORDINATES):
 *     - NORMALIZED [0..1]: Single source of truth for crop points (stored in cropPointsRef).
 *     - During pointermove: Updates LOCAL cropPointsRef and local React rendering state ONLY.
 *     - ZERO parent callbacks and ZERO prop round-trips during dragging.
 *     - On pointerup ONLY: Converts local normalized coordinates to image coordinates and commits ONCE.
 *  3. ZERO CSS ANIMATIONS/TRANSITIONS ON ACTIVE HANDLES:
 *     - Handles use immediate layout positioning without CSS scale or duration transitions.
 */

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { RotateCcw, RotateCw, RefreshCw, Sparkles, AlertCircle, CheckCircle2, FileSearch } from 'lucide-react';
import { Point, rotateCanvasWithPoints } from '../../utils/scanner/imageOrientation';
import { DetectionMethod } from '../../utils/scanner/cvDocumentDetector';

const DEBUG_SCANNER = false;

// ── Explicit Coordinate Space Types ──────────────────────────────────────────
export type NormalizedPoint = { x: number; y: number }; // 0.0 to 1.0
export type DisplayPoint = { x: number; y: number };    // 0 to stageWidth / stageHeight
export type ImagePoint = { x: number; y: number };      // 0 to sourceCanvas.width / height

// ── Pure Coordinate Conversion Functions ─────────────────────────────────────
export function normalizedToDisplay(p: NormalizedPoint, stageW: number, stageH: number): DisplayPoint {
    return {
        x: p.x * stageW,
        y: p.y * stageH,
    };
}

export function displayToNormalized(p: DisplayPoint, stageW: number, stageH: number): NormalizedPoint {
    return {
        x: Math.min(1.0, Math.max(0.0, stageW > 0 ? p.x / stageW : 0)),
        y: Math.min(1.0, Math.max(0.0, stageH > 0 ? p.y / stageH : 0)),
    };
}

export function normalizedToSource(p: NormalizedPoint, origW: number, origH: number): ImagePoint {
    return {
        x: Math.min(origW, Math.max(0, Math.round(p.x * origW))),
        y: Math.min(origH, Math.max(0, Math.round(p.y * origH))),
    };
}

export function sourceToNormalized(p: ImagePoint | Point, origW: number, origH: number): NormalizedPoint {
    return {
        x: Math.min(1.0, Math.max(0.0, origW > 0 ? p.x / origW : 0)),
        y: Math.min(1.0, Math.max(0.0, origH > 0 ? p.y / origH : 0)),
    };
}

export interface SmartCropEditorProps {
    sourceCanvas: HTMLCanvasElement;
    initialPoints: [Point, Point, Point, Point]; // [TL, TR, BR, BL] in image coordinates
    isAutoDetected: boolean;
    isAutoRotated?: boolean;
    confidence?: number;
    method?: DetectionMethod;
    statusMessage?: string;
    onUpdateCanvasAndPoints: (canvas: HTMLCanvasElement, points: [Point, Point, Point, Point]) => void;
    onPointsChange: (points: [Point, Point, Point, Point]) => void;
}

type DragTarget =
    | { type: 'corner'; index: number }
    | {
          type: 'edge';
          index: number;
          startNormPoints: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint];
          startPointerNorm: NormalizedPoint;
      };

interface StageLayout {
    width: number;
    height: number;
    scale: number;
}

export const SmartCropEditor: React.FC<SmartCropEditorProps> = ({
    sourceCanvas,
    initialPoints,
    isAutoDetected,
    isAutoRotated = false,
    confidence = 0,
    method,
    statusMessage,
    onUpdateCanvasAndPoints,
    onPointsChange,
}) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasDisplayRef = useRef<HTMLCanvasElement>(null);

    const origW = sourceCanvas.width;
    const origH = sourceCanvas.height;

    // Helper: Convert initial 4 points from source coordinates to normalized [0..1]
    const computeInitialNorm = useCallback(
        (pts: [Point, Point, Point, Point], w: number, h: number): [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] => [
            sourceToNormalized(pts[0], w, h),
            sourceToNormalized(pts[1], w, h),
            sourceToNormalized(pts[2], w, h),
            sourceToNormalized(pts[3], w, h),
        ],
        []
    );

    // ── 1. Single Source of Truth Ref for High-Frequency Dragging ────────────
    const cropPointsRef = useRef<[NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]>(
        computeInitialNorm(initialPoints, origW, origH)
    );

    // Local React state for rendering SVG polygon overlay and handles
    const [normPoints, setNormPoints] = useState<[NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint]>(
        () => cropPointsRef.current
    );

    // ── 2. Fixed Stage Layout State & Stability Guard Refs ────────────────────
    const [stageLayout, setStageLayout] = useState<StageLayout>({ width: 320, height: 440, scale: 1 });
    const isDraggingRef = useRef<boolean>(false);
    const activeDragRef = useRef<DragTarget | null>(null);
    const [activeDragUI, setActiveDragUI] = useState<{ type: 'corner' | 'edge'; index: number } | null>(null);
    const stageRectRef = useRef<DOMRect | null>(null);

    const [isRotating, setIsRotating] = useState(false);
    const [loupeState, setLoupeState] = useState<{ active: boolean; x: number; y: number; imgX: number; imgY: number } | null>(null);

    // ── 3. Initialize Crop ONLY when sourceCanvas changes (New Image or 90° Rotation) ──
    const prevCanvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        if (sourceCanvas !== prevCanvasRef.current) {
            prevCanvasRef.current = sourceCanvas;
            const initNorm = computeInitialNorm(initialPoints, sourceCanvas.width, sourceCanvas.height);
            cropPointsRef.current = initNorm;
            setNormPoints(initNorm);

            if (DEBUG_SCANNER) {
                console.log(`[DEBUG] Initialized crop for new canvas (${sourceCanvas.width}x${sourceCanvas.height})`);
                console.log(`[DEBUG] Initial normalized points:`, initNorm);
            }
        }
    }, [sourceCanvas, initialPoints, computeInitialNorm]);

    // ── 4. Calculate Immutable Stage Dimensions (Hard-Locked During Session) ─
    const measureAndSetStage = useCallback(() => {
        if (!viewportRef.current || !sourceCanvas) return;

        const rect = viewportRef.current.getBoundingClientRect();
        // Safe viewport area with padding
        const availW = Math.max(120, (rect.width || window.innerWidth) - 24);
        const availH = Math.max(120, (rect.height || (window.innerHeight - 200)) - 24);

        const imgW = sourceCanvas.width;
        const imgH = sourceCanvas.height;

        const scale = Math.min(availW / imgW, availH / imgH, 1.0);
        const stageW = Math.max(32, Math.round(imgW * scale));
        const stageH = Math.max(32, Math.round(imgH * scale));

        setStageLayout({ width: stageW, height: stageH, scale });

        if (DEBUG_SCANNER) {
            console.log(`[DEBUG] Locked Stage size: ${stageW}x${stageH}, scale: ${scale.toFixed(4)}`);
            console.log(`[DEBUG] Source size: ${imgW}x${imgH}`);
        }
    }, [sourceCanvas]);

    // Measure stage on mount and sourceCanvas change
    useLayoutEffect(() => {
        measureAndSetStage();
    }, [measureAndSetStage]);

    // Redraw fixed image canvas ONLY when sourceCanvas or stageLayout dimensions change
    useLayoutEffect(() => {
        if (!canvasDisplayRef.current || !sourceCanvas || stageLayout.width <= 0 || stageLayout.height <= 0) return;

        const dCanvas = canvasDisplayRef.current;
        dCanvas.width = sourceCanvas.width;
        dCanvas.height = sourceCanvas.height;
        const ctx = dCanvas.getContext('2d', { alpha: false });
        if (ctx) {
            ctx.drawImage(sourceCanvas, 0, 0);
        }
    }, [sourceCanvas, stageLayout.width, stageLayout.height]);

    // ── 5. Manual Rotation Handlers ──────────────────────────────────────────
    const handleRotate = (dir: 'cw' | 'ccw') => {
        if (isRotating) return;
        setIsRotating(true);

        try {
            const currentNorm = cropPointsRef.current;
            const currentAbsPts: [Point, Point, Point, Point] = [
                normalizedToSource(currentNorm[0], sourceCanvas.width, sourceCanvas.height),
                normalizedToSource(currentNorm[1], sourceCanvas.width, sourceCanvas.height),
                normalizedToSource(currentNorm[2], sourceCanvas.width, sourceCanvas.height),
                normalizedToSource(currentNorm[3], sourceCanvas.width, sourceCanvas.height),
            ];

            const result = rotateCanvasWithPoints(sourceCanvas, currentAbsPts, dir);
            const newNorm: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] = [
                sourceToNormalized(result.points[0], result.canvas.width, result.canvas.height),
                sourceToNormalized(result.points[1], result.canvas.width, result.canvas.height),
                sourceToNormalized(result.points[2], result.canvas.width, result.canvas.height),
                sourceToNormalized(result.points[3], result.canvas.width, result.canvas.height),
            ];

            cropPointsRef.current = newNorm;
            setNormPoints(newNorm);
            onUpdateCanvasAndPoints(result.canvas, result.points);
            onPointsChange(result.points);
        } finally {
            setTimeout(() => setIsRotating(false), 200);
        }
    };

    const handleReset = () => {
        if (isRotating) return;
        const defaultNorm: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] = [
            { x: 0.05, y: 0.05 },
            { x: 0.95, y: 0.05 },
            { x: 0.95, y: 0.95 },
            { x: 0.05, y: 0.95 },
        ];
        cropPointsRef.current = defaultNorm;
        setNormPoints(defaultNorm);

        const absPts: [Point, Point, Point, Point] = [
            normalizedToSource(defaultNorm[0], sourceCanvas.width, sourceCanvas.height),
            normalizedToSource(defaultNorm[1], sourceCanvas.width, sourceCanvas.height),
            normalizedToSource(defaultNorm[2], sourceCanvas.width, sourceCanvas.height),
            normalizedToSource(defaultNorm[3], sourceCanvas.width, sourceCanvas.height),
        ];
        onPointsChange(absPts);
    };

    // ── 6. Pointer Drag Handlers (Cached Rect, Zero Layout Thrashing) ────────
    const handleCornerPointerDown = (e: React.PointerEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // Cache stage bounding rect once on pointerdown to prevent layout thrashing
        if (stageRef.current) {
            stageRectRef.current = stageRef.current.getBoundingClientRect();
        }

        isDraggingRef.current = true;
        activeDragRef.current = { type: 'corner', index };
        setActiveDragUI({ type: 'corner', index });

        const np = cropPointsRef.current[index];
        const disp = normalizedToDisplay(np, stageLayout.width, stageLayout.height);
        updateLoupe(disp.x, disp.y, np.x * origW, np.y * origH);
    };

    const handleEdgePointerDown = (e: React.PointerEvent, edgeIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        if (!stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        stageRectRef.current = rect;

        const startPointerNorm = displayToNormalized(
            { x: e.clientX - rect.left, y: e.clientY - rect.top },
            stageLayout.width,
            stageLayout.height
        );

        isDraggingRef.current = true;
        activeDragRef.current = {
            type: 'edge',
            index: edgeIndex,
            startNormPoints: [...cropPointsRef.current] as [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint],
            startPointerNorm,
        };
        setActiveDragUI({ type: 'edge', index: edgeIndex });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const drag = activeDragRef.current;
        const rect = stageRectRef.current;
        if (!isDraggingRef.current || !drag || !rect) return;
        e.preventDefault();

        // Calculate normalized point using cached stage bounding rect
        const normPointer: NormalizedPoint = {
            x: Math.min(1.0, Math.max(0.0, (e.clientX - rect.left) / stageLayout.width)),
            y: Math.min(1.0, Math.max(0.0, (e.clientY - rect.top) / stageLayout.height)),
        };

        if (drag.type === 'corner') {
            const idx = drag.index;
            const updated: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] = [
                ...cropPointsRef.current,
            ];
            updated[idx] = normPointer;

            cropPointsRef.current = updated;
            setNormPoints(updated); // Local visual rendering only

            const disp = normalizedToDisplay(normPointer, stageLayout.width, stageLayout.height);
            updateLoupe(disp.x, disp.y, normPointer.x * origW, normPointer.y * origH);
        } else if (drag.type === 'edge') {
            const edgeIdx = drag.index;
            const dx = normPointer.x - drag.startPointerNorm.x;
            const dy = normPointer.y - drag.startPointerNorm.y;

            const i1 = edgeIdx; // 0=Top(TL,TR), 1=Right(TR,BR), 2=Bottom(BR,BL), 3=Left(BL,TL)
            const i2 = (edgeIdx + 1) % 4;

            const p1 = drag.startNormPoints[i1];
            const p2 = drag.startNormPoints[i2];

            const updated: [NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint] = [
                ...cropPointsRef.current,
            ];
            updated[i1] = {
                x: Math.min(1.0, Math.max(0.0, p1.x + dx)),
                y: Math.min(1.0, Math.max(0.0, p1.y + dy)),
            };
            updated[i2] = {
                x: Math.min(1.0, Math.max(0.0, p2.x + dx)),
                y: Math.min(1.0, Math.max(0.0, p2.y + dy)),
            };

            cropPointsRef.current = updated;
            setNormPoints(updated); // Local visual rendering only
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (_) {}

        isDraggingRef.current = false;
        activeDragRef.current = null;
        stageRectRef.current = null;
        setActiveDragUI(null);
        setLoupeState(null);

        // Commit final points in Image coordinates to parent ONCE
        const finalNorm = cropPointsRef.current;
        const finalSourcePoints: [Point, Point, Point, Point] = [
            normalizedToSource(finalNorm[0], origW, origH),
            normalizedToSource(finalNorm[1], origW, origH),
            normalizedToSource(finalNorm[2], origW, origH),
            normalizedToSource(finalNorm[3], origW, origH),
        ];

        if (DEBUG_SCANNER) {
            console.log('[DEBUG] Committing final points to parent:', finalSourcePoints);
        }
        onPointsChange(finalSourcePoints);
    };

    // ── 7. Loupe Magnifier ───────────────────────────────────────────────────
    const updateLoupe = (stageX: number, stageY: number, imgX: number, imgY: number) => {
        if (!sourceCanvas) return;
        setLoupeState({
            active: true,
            x: stageX,
            y: Math.max(60, stageY - 70), // Render above finger
            imgX,
            imgY,
        });
    };

    const loupeCanvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!loupeState || !loupeState.active || !loupeCanvasRef.current || !sourceCanvas) return;
        const lCanvas = loupeCanvasRef.current;
        const lCtx = lCanvas.getContext('2d');
        if (!lCtx) return;

        const size = 110;
        lCanvas.width = size;
        lCanvas.height = size;

        const zoom = 2.5;
        const srcRadius = (size / 2) / zoom;

        lCtx.clearRect(0, 0, size, size);
        lCtx.save();
        lCtx.beginPath();
        lCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        lCtx.clip();

        // Draw zoomed region from source canvas
        lCtx.drawImage(
            sourceCanvas,
            loupeState.imgX - srcRadius,
            loupeState.imgY - srcRadius,
            srcRadius * 2,
            srcRadius * 2,
            0,
            0,
            size,
            size
        );

        // Crosshairs
        lCtx.strokeStyle = '#0ea5e9';
        lCtx.lineWidth = 1.5;
        lCtx.beginPath();
        lCtx.moveTo(size / 2, 0);
        lCtx.lineTo(size / 2, size);
        lCtx.moveTo(0, size / 2);
        lCtx.lineTo(size, size / 2);
        lCtx.stroke();

        lCtx.restore();
    }, [loupeState, sourceCanvas]);

    // ── 8. Screen Points for SVG Polygon and Interactive Handles ─────────────
    const sp0 = normalizedToDisplay(normPoints[0], stageLayout.width, stageLayout.height); // TL
    const sp1 = normalizedToDisplay(normPoints[1], stageLayout.width, stageLayout.height); // TR
    const sp2 = normalizedToDisplay(normPoints[2], stageLayout.width, stageLayout.height); // BR
    const sp3 = normalizedToDisplay(normPoints[3], stageLayout.width, stageLayout.height); // BL

    const midpoints: DisplayPoint[] = [
        { x: (sp0.x + sp1.x) / 2, y: (sp0.y + sp1.y) / 2 }, // Top edge
        { x: (sp1.x + sp2.x) / 2, y: (sp1.y + sp2.y) / 2 }, // Right edge
        { x: (sp2.x + sp3.x) / 2, y: (sp2.y + sp3.y) / 2 }, // Bottom edge
        { x: (sp3.x + sp0.x) / 2, y: (sp3.y + sp0.y) / 2 }, // Left edge
    ];

    const polygonPoints = `${sp0.x},${sp0.y} ${sp1.x},${sp1.y} ${sp2.x},${sp2.y} ${sp3.x},${sp3.y}`;
    const cornerLabels = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];

    return (
        <div className="flex flex-col h-full w-full select-none overflow-hidden bg-slate-950">
            {/* ── Top Section: Detection Status & Rotation Adjustment Bar ── */}
            <div className="flex flex-col bg-slate-900/95 border-b border-slate-800/90 shrink-0 shadow-md">
                {/* 1. Detection Status Bar */}
                <div className="px-3 sm:px-4 py-2 flex items-center justify-center text-center border-b border-slate-800/60">
                    {confidence >= 0.68 || method === 'passport-photo' || method === 'signature' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 font-semibold text-[11px] sm:text-xs">
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
                            <span>{statusMessage || (isAutoRotated ? 'Auto-detected & oriented upright' : '✓ Document boundaries detected')}</span>
                        </div>
                    ) : confidence >= 0.40 ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-950/60 border border-sky-800/50 text-sky-300 font-medium text-[11px] sm:text-xs">
                            <Sparkles size={13} className="shrink-0 text-sky-400" />
                            <span>{statusMessage || '◈ Possible document boundaries detected — adjust if needed'}</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/50 border border-amber-800/40 text-amber-300 font-medium text-[11px] sm:text-xs">
                            <AlertCircle size={13} className="shrink-0 text-amber-400" />
                            <span>{statusMessage || '⚠ Could not confidently detect document boundaries — adjust manually'}</span>
                        </div>
                    )}
                </div>

                {/* 2. Mobile-First Rotation & Adjustment Toolbar */}
                <div className="grid grid-cols-3 gap-2 px-3 sm:px-4 py-2 max-w-lg mx-auto w-full">
                    <button
                        type="button"
                        onClick={() => handleRotate('ccw')}
                        disabled={isRotating}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 active:bg-slate-750 text-slate-100 border border-slate-700/70 shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Rotate 90° Counter-Clockwise"
                        aria-label="Rotate Left"
                    >
                        <RotateCcw size={15} className="shrink-0 text-sky-400" />
                        <span className="truncate">Rotate Left</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleRotate('cw')}
                        disabled={isRotating}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 active:bg-slate-750 text-slate-100 border border-slate-700/70 shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Rotate 90° Clockwise"
                        aria-label="Rotate Right"
                    >
                        <RotateCw size={15} className="shrink-0 text-sky-400" />
                        <span className="truncate">Rotate Right</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isRotating}
                        className="min-h-[44px] px-2.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/40 shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                        title="Reset Crop to Full Frame"
                        aria-label="Reset Crop Area"
                    >
                        <RefreshCw size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">Reset</span>
                    </button>
                </div>
            </div>

            {/* ── 3. Centered Viewport Containing Immutable Stage ── */}
            <div
                ref={viewportRef}
                className="relative flex-1 w-full bg-slate-950 overflow-hidden select-none flex items-center justify-center p-3 touch-none min-h-0"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }}
            >
                {/* ── FIXED SCANNER STAGE (Dimensions do not change during drag) ── */}
                <div
                    ref={stageRef}
                    className="relative bg-black rounded-lg shadow-2xl overflow-hidden select-none shrink-0"
                    style={{
                        width: `${stageLayout.width}px`,
                        height: `${stageLayout.height}px`,
                        touchAction: 'none',
                        userSelect: 'none',
                    }}
                >
                    {/* Layer 1: Fixed Document Image Canvas */}
                    <canvas
                        ref={canvasDisplayRef}
                        className="absolute inset-0 w-full h-full block pointer-events-none"
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                        }}
                    />

                    {/* Layer 2: SVG Crop Boundary & Dimmed Mask Overlay */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${stageLayout.width} ${stageLayout.height}`}
                        style={{ touchAction: 'none' }}
                    >
                        <defs>
                            <mask id="cropMask">
                                <rect width="100%" height="100%" fill="white" />
                                <polygon points={polygonPoints} fill="black" />
                            </mask>
                        </defs>

                        {/* Darkened mask outside crop area */}
                        <rect
                            width="100%"
                            height="100%"
                            fill="rgba(0, 0, 0, 0.68)"
                            mask="url(#cropMask)"
                        />

                        {/* Glowing cyan crop boundary line */}
                        <polygon
                            points={polygonPoints}
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            className="filter drop-shadow-[0_0_8px_rgba(14,165,233,0.85)]"
                        />

                        {/* Guide grid dashed lines */}
                        <line
                            x1={(sp0.x * 2 + sp1.x) / 3}
                            y1={(sp0.y * 2 + sp1.y) / 3}
                            x2={(sp3.x * 2 + sp2.x) / 3}
                            y2={(sp3.y * 2 + sp2.y) / 3}
                            stroke="rgba(14, 165, 233, 0.30)"
                            strokeDasharray="4 4"
                        />
                        <line
                            x1={(sp0.x + sp1.x * 2) / 3}
                            y1={(sp0.y + sp1.y * 2) / 3}
                            x2={(sp3.x + sp2.x * 2) / 3}
                            y2={(sp3.y + sp2.y * 2) / 3}
                            stroke="rgba(14, 165, 233, 0.30)"
                            strokeDasharray="4 4"
                        />
                    </svg>

                    {/* Layer 3: 4 Draggable Corner Handles */}
                    {[sp0, sp1, sp2, sp3].map((sp, idx) => {
                        const isDraggingThis = activeDragUI?.type === 'corner' && activeDragUI.index === idx;
                        return (
                            <div
                                key={`corner-${idx}`}
                                className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
                                style={{
                                    left: `${sp.x}px`,
                                    top: `${sp.y}px`,
                                    transform: 'translate(-50%, -50%)',
                                    width: '48px',
                                    height: '48px',
                                    touchAction: 'none',
                                }}
                                onPointerDown={(e) => handleCornerPointerDown(e, idx)}
                                aria-label={`Drag ${cornerLabels[idx]} corner`}
                            >
                                <div
                                    className={`rounded-full flex items-center justify-center ${
                                        isDraggingThis
                                            ? 'w-9 h-9 bg-sky-400/40 border-2 border-white shadow-[0_0_16px_rgba(14,165,233,1)]'
                                            : 'w-7 h-7 bg-sky-500/30 border-2 border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.9)]'
                                    }`}
                                >
                                    <div
                                        className={`rounded-full bg-white shadow-md ${
                                            isDraggingThis ? 'w-4 h-4' : 'w-3.5 h-3.5'
                                        }`}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Layer 4: 4 Edge Midpoint Handles */}
                    {midpoints.map((mp, idx) => {
                        const isDraggingThis = activeDragUI?.type === 'edge' && activeDragUI.index === idx;
                        return (
                            <div
                                key={`edge-${idx}`}
                                className="absolute flex items-center justify-center cursor-move z-15"
                                style={{
                                    left: `${mp.x}px`,
                                    top: `${mp.y}px`,
                                    transform: 'translate(-50%, -50%)',
                                    width: '44px',
                                    height: '44px',
                                    touchAction: 'none',
                                }}
                                onPointerDown={(e) => handleEdgePointerDown(e, idx)}
                                aria-label="Drag crop edge"
                            >
                                <div
                                    className={`rounded-full bg-white/95 border border-sky-400 shadow-md flex items-center justify-center ${
                                        isDraggingThis
                                            ? 'w-7 h-3.5 border-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.8)]'
                                            : 'w-6 h-2.5'
                                    }`}
                                >
                                    <div className="w-2 h-1 bg-sky-500 rounded-full" />
                                </div>
                            </div>
                        );
                    })}

                    {/* Layer 5: Magnifier Loupe Floating View */}
                    {loupeState && loupeState.active && (
                        <div
                            className="absolute pointer-events-none z-40 rounded-full border-2 border-sky-400 shadow-[0_8px_24px_rgba(0,0,0,0.7)] overflow-hidden bg-black"
                            style={{
                                left: `${loupeState.x}px`,
                                top: `${loupeState.y}px`,
                                transform: 'translate(-50%, -50%)',
                                width: '110px',
                                height: '110px',
                            }}
                        >
                            <canvas ref={loupeCanvasRef} className="w-full h-full" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Instruction Bar ── */}
            <div className="px-3 py-2 bg-slate-900/95 text-center text-[11px] sm:text-xs text-slate-400 border-t border-slate-800/80 shrink-0 flex items-center justify-center gap-1.5">
                <span className="text-sky-400 text-xs">✦</span>
                <span>Adjust the glowing corners to match the document edges</span>
            </div>
        </div>
    );
};



