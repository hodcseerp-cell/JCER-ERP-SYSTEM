import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Camera, Image as ImageIcon, FileText } from 'lucide-react';

/**
 * MobileUploadBottomSheet
 *
 * Clean native mobile bottom sheet attached directly to the bottom edge of the viewport.
 * Uses React Portal to document.body so it is never constrained by form containers or footers.
 * Used ONLY on mobile/tablet viewports (< 768px).
 */
const MobileUploadBottomSheet = ({
    isOpen,
    onClose,
    documentLabel,
    onSelectOption,
}) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isAnimated, setIsAnimated] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            const timer = setTimeout(() => setIsAnimated(true), 20);
            return () => clearTimeout(timer);
        } else {
            setIsAnimated(false);
            const timer = setTimeout(() => setShouldRender(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Lock body scroll when bottom sheet is active
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (!shouldRender || typeof document === 'undefined') return null;

    const handleOptionClick = (optionType) => {
        onClose();
        setTimeout(() => {
            onSelectOption(optionType);
        }, 50);
    };

    const sheetContent = (
        <div className="md:hidden">
            {/* Dimmed Backdrop */}
            <div
                className={`fixed inset-0 z-[99998] bg-black/45 transition-opacity duration-200 ease-out ${
                    isAnimated ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Bottom Sheet Modal Attached to Viewport Bottom */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-upload-sheet-title"
                className={`fixed bottom-0 left-0 right-0 w-full z-[99999] bg-white dark:bg-slate-900 rounded-t-[20px] rounded-b-none shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out border-t border-slate-100 dark:border-slate-800 flex flex-col ${
                    isAnimated ? 'translate-y-0' : 'translate-y-full'
                }`}
                style={{
                    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                }}
            >
                {/* Drag Handle */}
                <div
                    className="pt-3 pb-1 flex justify-center cursor-pointer select-none"
                    onClick={onClose}
                >
                    <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                </div>

                {/* Sheet Header */}
                <div className="px-5 pt-1 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3
                        id="mobile-upload-sheet-title"
                        className="text-base font-bold text-slate-900 dark:text-white"
                    >
                        Upload Document
                    </h3>
                    {documentLabel && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                            {documentLabel}
                        </p>
                    )}
                </div>

                {/* Simple Options List */}
                <div className="p-4 space-y-2">
                    {/* 1. Take Photo */}
                    <button
                        type="button"
                        onClick={() => handleOptionClick('camera')}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 transition-colors text-left border border-slate-100 dark:border-slate-800/80 min-h-[48px]"
                    >
                        <Camera className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                Take Photo
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Use your camera
                            </div>
                        </div>
                    </button>

                    {/* 2. Choose from Photos */}
                    <button
                        type="button"
                        onClick={() => handleOptionClick('photos')}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 transition-colors text-left border border-slate-100 dark:border-slate-800/80 min-h-[48px]"
                    >
                        <ImageIcon className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                Choose from Photos
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Select from gallery
                            </div>
                        </div>
                    </button>

                    {/* 3. Choose from Files */}
                    <button
                        type="button"
                        onClick={() => handleOptionClick('files')}
                        className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700 transition-colors text-left border border-slate-100 dark:border-slate-800/80 min-h-[48px]"
                    >
                        <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                Choose from Files
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Browse device files
                            </div>
                        </div>
                    </button>

                    {/* 4. Cancel Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full mt-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 transition-colors text-center min-h-[44px]"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(sheetContent, document.body);
};

export default MobileUploadBottomSheet;
