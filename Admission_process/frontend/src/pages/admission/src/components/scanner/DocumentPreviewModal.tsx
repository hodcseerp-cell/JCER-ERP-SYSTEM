/**
 * DocumentPreviewModal.tsx
 *
 * Final verification screen displaying the perspective-corrected, straightened document.
 * Includes enhancement filters (Original, Auto Enhance, B&W), rotation adjustments,
 * and Confirm & Upload action.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    CheckCircle2,
    ChevronLeft,
    RotateCw,
    RotateCcw,
    Sparkles,
    Image as ImageIcon,
    Sliders,
    Layers,
    FileCheck,
} from 'lucide-react';
import {
    warpPerspective,
    ScannerFilterType,
} from '../../utils/scanner/perspectiveTransformer';
import { Point, rotateCanvasWithPoints } from '../../utils/scanner/imageOrientation';

export interface DocumentPreviewProps {
    sourceCanvas: HTMLCanvasElement;
    points: [Point, Point, Point, Point];
    documentLabel?: string;
    onBackToCrop: () => void;
    onConfirm: (warpedCanvas: HTMLCanvasElement) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewProps> = ({
    sourceCanvas,
    points,
    documentLabel,
    onBackToCrop,
    onConfirm,
}) => {
    const [selectedFilter, setSelectedFilter] = useState<ScannerFilterType>('original');
    const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(true);

    // Generate straightened canvas when filter or inputs change
    useEffect(() => {
        setIsGenerating(true);
        try {
            const outCanvas = warpPerspective(sourceCanvas, points, {
                filter: selectedFilter,
                maxDimension: 2200,
            });
            setWarpedCanvas(outCanvas);
            const url = outCanvas.toDataURL('image/jpeg', 0.90);
            setPreviewUrl(url);
        } catch (err) {
            console.error('Perspective warp failed:', err);
        } finally {
            setIsGenerating(false);
        }
    }, [sourceCanvas, points, selectedFilter]);

    // Handle post-straighten rotation if student wants to tweak orientation
    const handleRotateWarped = (dir: 'cw' | 'ccw') => {
        if (!warpedCanvas) return;
        const dummyPoints: [Point, Point, Point, Point] = [
            { x: 0, y: 0 },
            { x: warpedCanvas.width, y: 0 },
            { x: warpedCanvas.width, y: warpedCanvas.height },
            { x: 0, y: warpedCanvas.height },
        ];
        const res = rotateCanvasWithPoints(warpedCanvas, dummyPoints, dir);
        setWarpedCanvas(res.canvas);
        setPreviewUrl(res.canvas.toDataURL('image/jpeg', 0.90));
    };

    const handleConfirmClick = () => {
        if (!warpedCanvas) return;
        onConfirm(warpedCanvas);
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-white select-none">
            {/* ── Sub-header with Filter Pills & Rotation ── */}
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                    <button
                        type="button"
                        onClick={() => setSelectedFilter('original')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            selectedFilter === 'original'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <ImageIcon size={12} />
                        <span>Original</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedFilter('enhance')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            selectedFilter === 'enhance'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Sparkles size={12} />
                        <span>Enhanced</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedFilter('bw')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            selectedFilter === 'bw'
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Layers size={12} />
                        <span>B&W Scan</span>
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => handleRotateWarped('ccw')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all text-xs flex items-center gap-1"
                        title="Rotate Left"
                    >
                        <RotateCcw size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleRotateWarped('cw')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition-all text-xs flex items-center gap-1"
                        title="Rotate Right"
                    >
                        <RotateCw size={13} />
                    </button>
                </div>
            </div>

            {/* ── Document Preview Viewport ── */}
            <div className="flex-1 w-full bg-slate-950 p-4 flex items-center justify-center overflow-auto min-h-0">
                {isGenerating ? (
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400 font-medium">Straightening document...</p>
                    </div>
                ) : previewUrl ? (
                    <div className="relative max-h-full max-w-full flex items-center justify-center rounded-lg overflow-hidden shadow-2xl border border-slate-750 bg-slate-900">
                        <img
                            src={previewUrl}
                            alt="Corrected document preview"
                            className="max-h-[calc(100vh-220px)] max-w-full object-contain rounded-md"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <FileCheck size={11} />
                            <span>Straightened</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-red-400">Preview rendering failed</p>
                )}
            </div>

            {/* ── Bottom Action Controls ── */}
            <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-lg">
                <button
                    type="button"
                    onClick={onBackToCrop}
                    className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:bg-slate-750 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                >
                    <ChevronLeft size={17} />
                    <span>Adjust Crop</span>
                </button>

                <button
                    type="button"
                    onClick={handleConfirmClick}
                    disabled={isGenerating || !warpedCanvas}
                    className="flex-1 sm:flex-initial min-h-[44px] px-7 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-650 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all active:scale-95 disabled:opacity-50"
                >
                    <CheckCircle2 size={17} />
                    <span>Confirm &amp; Upload</span>
                </button>
            </div>
        </div>
    );
};
