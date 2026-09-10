/**
 * SmartDocumentScannerModal.tsx
 *
 * Full-screen mobile-first Smart Document Scanner & Crop System modal.
 * Pipeline:
 *  1. Ingest File -> EXIF Orientation Normalization
 *  2. Fast Client-side Document Boundary Detection (sub-30ms)
 *  3. Interactive Crop Editor (4 corner handles + 4 edge handles + loupe)
 *  4. Perspective Straightening (Homography Mesh Warper)
 *  5. Enhancement Filters & Confirmation -> JPEG File output
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    X,
    Loader2,
    Crop,
    CheckCircle2,
    RotateCcw,
    RotateCw,
    Scan,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
} from 'lucide-react';
import {
    normalizeImageOrientation,
    Point,
} from '../../utils/scanner/imageOrientation';
import {
    detectDocumentCorners,
    DetectionResult,
} from '../../utils/scanner/cvDocumentDetector';
import {
    canvasToFile,
} from '../../utils/scanner/perspectiveTransformer';
import { SmartCropEditor } from './SmartCropEditor';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export interface SmartDocumentScannerModalProps {
    isOpen: boolean;
    file: File | null;
    documentLabel?: string;
    docType?: string;
    onClose: () => void;
    onConfirmUpload: (processedFile: File) => void;
}

type ScannerStep = 'detecting' | 'crop' | 'preview' | 'exporting';

export const SmartDocumentScannerModal: React.FC<SmartDocumentScannerModalProps> = ({
    isOpen,
    file,
    documentLabel = 'Document',
    docType,
    onClose,
    onConfirmUpload,
}) => {
    const [step, setStep] = useState<ScannerStep>('detecting');
    const [normalizedCanvas, setNormalizedCanvas] = useState<HTMLCanvasElement | null>(null);
    const [cropPoints, setCropPoints] = useState<[Point, Point, Point, Point] | null>(null);
    const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);
    const [isAutoRotated, setIsAutoRotated] = useState<boolean>(false);
    const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
    const [detectionInfo, setDetectionInfo] = useState<{ confidence: number; timeMs: number } | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Initialize pipeline when a new file is passed
    useEffect(() => {
        if (!isOpen || !file) {
            setStep('detecting');
            setNormalizedCanvas(null);
            setCropPoints(null);
            setIsAutoDetected(false);
            setIsAutoRotated(false);
            setDetectionResult(null);
            setErrorMessage(null);
            return;
        }

        let isMounted = true;
        const processInitialImage = async () => {
            setStep('detecting');
            setErrorMessage(null);

            try {
                // 1. EXIF Orientation Normalization & Content Orientation Analysis
                const norm = await normalizeImageOrientation(file, docType);
                if (!isMounted) return;

                // 2. Client-side CV Document Boundary & Corner Detection
                const detection: DetectionResult = detectDocumentCorners(norm.canvas, docType);
                if (!isMounted) return;

                setNormalizedCanvas(norm.canvas);
                setCropPoints(detection.points);
                setIsAutoDetected(detection.detected);
                setIsAutoRotated(norm.autoRotatedDegrees !== 0);
                setDetectionResult(detection);
                setDetectionInfo({
                    confidence: detection.confidence,
                    timeMs: detection.processingTimeMs,
                });

                // Transition to interactive crop editor
                setStep('crop');
            } catch (err: any) {
                console.error('Document detection pipeline failed:', err);
                if (!isMounted) return;
                setErrorMessage(err.message || 'Failed to process image orientation.');
            }
        };

        processInitialImage();

        return () => {
            isMounted = false;
        };
    }, [isOpen, file, docType]);

    // Lock body scroll while modal is active
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Update canvas and points if manual rotation occurs inside editor
    const handleUpdateCanvasAndPoints = useCallback(
        (canvas: HTMLCanvasElement, points: [Point, Point, Point, Point]) => {
            setNormalizedCanvas(canvas);
            setCropPoints(points);
        },
        []
    );

    const handlePointsChange = useCallback((points: [Point, Point, Point, Point]) => {
        setCropPoints(points);
    }, []);

    // Step 2 -> Step 3: Straighten & Preview
    const handleContinueToPreview = () => {
        if (!normalizedCanvas || !cropPoints) return;
        setStep('preview');
    };

    // Step 3 -> Step 2: Back to Crop Editor
    const handleBackToCrop = () => {
        setStep('crop');
    };

    // Step 3 -> Export File & Confirm Upload
    const handleFinalConfirm = async (warpedCanvas: HTMLCanvasElement) => {
        if (!file) return;
        setStep('exporting');

        try {
            const baseName = (file.name || 'scanned_document').replace(/\.[^.]+$/, '');
            const finalFile = await canvasToFile(warpedCanvas, `${baseName}.jpg`, 'image/jpeg', 0.90);
            onConfirmUpload(finalFile);
            onClose();
        } catch (err: any) {
            console.error('Final export failed:', err);
            setErrorMessage(err.message || 'Failed to generate processed file');
            setStep('preview');
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-950 text-white select-none">
            {/* ── Modal Header ── */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-md">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0 shadow-inner">
                        <Scan size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">{documentLabel}</h2>
                            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 text-[10px] font-semibold">
                                Smart Scanner
                            </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                            {step === 'detecting' && 'Detecting document borders...'}
                            {step === 'crop' && 'Drag corners to match document boundaries'}
                            {step === 'preview' && 'Review straightened result before upload'}
                            {step === 'exporting' && 'Optimizing document image...'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-90 border border-slate-700/60 shadow-sm"
                        aria-label="Cancel and Close Scanner"
                        title="Close"
                    >
                        <X size={19} />
                    </button>
                </div>
            </div>

            {/* ── Modal Body Content ── */}
            <div className="flex-1 relative flex flex-col overflow-hidden min-h-0">
                {/* 1. Detection Loading State */}
                {step === 'detecting' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 animate-pulse">
                                <Scan size={32} />
                            </div>
                            <div className="absolute -inset-2 border-2 border-sky-500/20 rounded-3xl animate-ping pointer-events-none" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-white">Scanning Document</h3>
                            <p className="text-xs text-slate-400">Analyzing boundaries &amp; content layout...</p>
                        </div>
                        {errorMessage && (
                            <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                                <AlertCircle size={14} className="text-red-400 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Interactive Smart Crop Editor */}
                {step === 'crop' && normalizedCanvas && cropPoints && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 relative min-h-0">
                            <SmartCropEditor
                                sourceCanvas={normalizedCanvas}
                                initialPoints={cropPoints}
                                isAutoDetected={isAutoDetected}
                                isAutoRotated={isAutoRotated}
                                confidence={detectionResult?.confidence}
                                method={detectionResult?.method}
                                statusMessage={detectionResult?.statusMessage}
                                onUpdateCanvasAndPoints={handleUpdateCanvasAndPoints}
                                onPointsChange={handlePointsChange}
                            />
                        </div>

                        {/* Crop Bottom Navigation Bar */}
                        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-lg">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 active:bg-slate-750 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                            >
                                <span>Retake / Cancel</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleContinueToPreview}
                                className="flex-1 sm:flex-initial min-h-[44px] px-7 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-650 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-950/60 transition-all active:scale-95"
                            >
                                <span>Continue</span>
                                <ChevronRight size={17} />
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Document Straightened Preview Modal */}
                {step === 'preview' && normalizedCanvas && cropPoints && (
                    <div className="flex-1 min-h-0">
                        <DocumentPreviewModal
                            sourceCanvas={normalizedCanvas}
                            points={cropPoints}
                            documentLabel={documentLabel}
                            onBackToCrop={handleBackToCrop}
                            onConfirm={handleFinalConfirm}
                        />
                    </div>
                )}

                {/* 4. Exporting / Uploading State */}
                {step === 'exporting' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                        <Loader2 size={36} className="text-primary-500 animate-spin" />
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-white">Preparing Document</h3>
                            <p className="text-xs text-slate-400">Applying perspective transform and optimizing...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

export default SmartDocumentScannerModal;
