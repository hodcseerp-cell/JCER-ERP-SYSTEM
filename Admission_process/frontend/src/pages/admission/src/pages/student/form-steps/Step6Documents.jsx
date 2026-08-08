import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../../../../../../services/api';
import {
    Loader2, UploadCloud, CheckCircle2, XCircle, FileImage,
    User, FileText, GraduationCap, ClipboardList, ChevronLeft,
    ChevronRight, Eye, Trash2, RefreshCw, ShieldCheck, Camera,
    AlertTriangle, Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { compressDocumentImage, validateFileType } from '../../../utils/imageCompressor';

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCEPTED_MIME     = 'image/jpeg,image/jpg,image/png';
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024; // 10 MB original limit

const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024)         return `${bytes} B`;
    if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Helper to resolve static file paths from backend origin
const resolveDocUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    const base = api.defaults.baseURL || '/api';
    return `${base.replace('/api', '')}${path}`;
};

// Helper to parse filename from backend path
const getFilenameFromUrl = (url) => {
    if (!url) return '';
    return url.split('/').pop();
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Step6Documents = ({ onNext, onPrev, data, onUploadSuccess, applicationStatus, adminRemarks, readOnly = false }) => {
    const isDiploma    = data?.qualification === 'DIPLOMA';
    const isManagement = data?.admissionType === 'MANAGEMENT';

    // ── Document configuration ───────────────────────────────────────────────
    const DOCS = [
        {
            id: 'photo',
            label: 'Recent Passport Photo',
            description: 'Clear color photo, plain background',
            icon: User,
            required: true,
            apiField: 'photo',
            dbKey: 'photoUrl',
            colorRequired: false,
            hint: 'Color image · JPG or PNG · Max 10 MB',
        },
        {
            id: 'signature',
            label: 'E-Signature / Scanned Signature',
            description: 'Signature on white background',
            icon: ClipboardList,
            required: true,
            apiField: 'signature',
            dbKey: 'signatureUrl',
            colorRequired: false,
            hint: 'JPG or PNG · Max 10 MB',
        },
        {
            id: 'sslcMarkscard',
            label: 'SSLC / 10th Marks Card',
            description: 'Original color marks card, all text legible',
            icon: FileText,
            required: true,
            apiField: 'tenthMarksheet',
            dbKey: 'tenthMarksheetUrl',
            colorRequired: false,
            hint: 'Color scan · All marks readable · Max 10 MB',
        },
        ...(isDiploma ? [
            {
                id: 'diplomaSemester5Marksheet',
                label: 'Diploma 5th Semester Marks Card',
                description: 'Clearly legible marks card',
                icon: GraduationCap,
                required: true,
                apiField: 'diplomaSemester5Marksheet',
                dbKey: 'diplomaSemester5MarksheetUrl',
                colorRequired: false,
                hint: 'JPG or PNG · Max 10 MB',
            },
            {
                id: 'diplomaSemester6Marksheet',
                label: 'Diploma 6th Semester Marks Card',
                description: 'Clearly legible marks card',
                icon: GraduationCap,
                required: true,
                apiField: 'diplomaSemester6Marksheet',
                dbKey: 'diplomaSemester6MarksheetUrl',
                colorRequired: false,
                hint: 'JPG or PNG · Max 10 MB',
            },
        ] : [
            {
                id: 'pucMarkscard',
                label: 'PUC / 12th Marks Card',
                description: 'All subjects and marks clearly visible',
                icon: GraduationCap,
                required: true,
                apiField: 'twelfthMarksheet',
                dbKey: 'twelfthMarksheetUrl',
                colorRequired: false,
                hint: 'JPG or PNG · Max 10 MB',
            },
        ]),
        {
            id: 'aadhaar',
            label: 'Aadhaar Card Copy',
            description: 'Both sides visible, name/DOB/number readable',
            icon: ShieldCheck,
            required: true,
            apiField: 'aadhaar',
            dbKey: 'aadhaarUrl',
            colorRequired: false,
            hint: 'Color copy · All details readable · Max 10 MB',
        },
        {
            id: 'cetScoreCard',
            label: 'Entrance Score Card (CET/DCET)',
            description: isManagement ? 'Optional for Management quota' : 'CET or DCET score card',
            icon: FileText,
            required: !isManagement,
            apiField: 'cetScoreCard',
            dbKey: 'cetScoreCardUrl',
            colorRequired: false,
            hint: isManagement ? 'Optional for Management · JPG or PNG' : 'JPG or PNG · Max 10 MB',
        },
        {
            id: 'feesPaidReceipt',
            label: 'Fees Paid Receipt',
            description: 'Shows fee payment confirmation',
            icon: FileText,
            required: true,
            apiField: 'feesPaidReceipt',
            dbKey: 'feesPaidReceiptUrl',
            colorRequired: false,
            hint: 'Color copy · Amount & date visible · Max 10 MB',
        },
        {
            id: 'casteCertificate',
            label: 'Caste Certificate',
            description: 'Government-issued caste certificate',
            icon: FileText,
            required: false,
            apiField: 'casteCertificate',
            dbKey: 'casteCertificateUrl',
            colorRequired: false,
            hint: 'JPG or PNG · Optional · Max 10 MB',
        },
        {
            id: 'incomeCertificate',
            label: 'Income Certificate',
            description: 'Annual family income certificate',
            icon: FileText,
            required: false,
            apiField: 'gapCertificate',
            dbKey: 'gapCertificateUrl',
            colorRequired: false,
            hint: 'JPG or PNG · Optional · Max 10 MB',
        },
        {
            id: 'studyCertificate',
            label: '7 Years Study Certificate',
            description: 'Karnataka domicile / study certificate',
            icon: FileText,
            required: true,
            apiField: 'domicileCertificate',
            dbKey: 'domicileCertificateUrl',
            colorRequired: false,
            hint: 'JPG or PNG · Max 10 MB',
        },
    ];

    // ── State ────────────────────────────────────────────────────────────────
    const [docStates,        setDocStates]       = useState({});
    const [isUploading,      setIsUploading]     = useState(false);
    const [dragOver,         setDragOver]        = useState(null);
    const [previewDoc,       setPreviewDoc]      = useState(null);
    const [submitAttempted,  setSubmitAttempted] = useState(false);
    const fileInputRefs = useRef({});

    const [reuploadedDocs, setReuploadedDocs] = useState(() => {
        try {
            const saved = sessionStorage.getItem(`reuploaded_docs_${data?.id}`);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (data?.id) {
            sessionStorage.setItem(`reuploaded_docs_${data.id}`, JSON.stringify(reuploadedDocs));
        }
    }, [reuploadedDocs, data?.id]);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            Object.values(docStates).forEach(s => {
                if (s?.previewUrl) URL.revokeObjectURL(s.previewUrl);
            });
        };
    }, []); // eslint-disable-line

    const setDocState = useCallback((docId, updates) => {
        setDocStates(prev => ({
            ...prev,
            [docId]: { ...(prev[docId] || {}), ...updates },
        }));
    }, []);

    const isDocPresent = useCallback((doc) => {
        const state = docStates[doc.id];
        if (state?.status === 'ready') return true;
        return !!(data?.[doc.dbKey]);
    }, [docStates, data]);

    // ── Get Card State Helper ────────────────────────────────────────────────
    const getCardState = useCallback((doc) => {
        const state = docStates[doc.id] || {};
        const status = state.status || 'idle';
        const isInDb = !!(data?.[doc.dbKey]);

        if (status === 'processing' || status === 'validating') {
            return 'processing';
        }
        if (status === 'ready') {
            return 'ready';
        }
        if (status === 'uploading') {
            return 'uploading';
        }
        if (status === 'error') {
            return 'error';
        }
        if (isInDb) {
            return 'uploaded';
        }
        if (doc.required && submitAttempted) {
            return 'missing';
        }
        return 'idle';
    }, [docStates, data, submitAttempted]);

    // ── File processing pipeline (Immediate Uploads) ─────────────────────────
    const handleFilePicked = useCallback(async (docId, file) => {
        const doc = DOCS.find(d => d.id === docId);
        if (!doc || !file) return;

        if (fileInputRefs.current[docId]) {
            fileInputRefs.current[docId].value = '';
        }

        // 1. Validate file type (MIME + extension)
        const typeCheck = validateFileType(file);
        if (!typeCheck.valid) {
            toast.error(typeCheck.error);
            return;
        }

        // 2. Original size guard
        if (file.size > MAX_ORIGINAL_SIZE) {
            toast.error('File is too large. Please select an image under 10 MB.');
            return;
        }

        // 3. Color validation via backend sharp check
        if (doc.colorRequired) {
            setDocState(docId, { status: 'validating', error: null });
            try {
                const valFD = new FormData();
                valFD.append('document',     file);
                valFD.append('documentType', doc.apiField);
                const valRes = await api.post('/student/validate-document', valFD, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (!valRes.data.success) {
                    const msg = valRes.data.message || 'Please upload the original COLOR image of this document.';
                    setDocState(docId, { status: 'error', error: msg });
                    toast.error(msg);
                    return;
                }
            } catch (err) {
                const msg = err.response?.data?.message || 'Please upload the original COLOR image of this document.';
                setDocState(docId, { status: 'error', error: msg });
                toast.error(msg);
                return;
            }
        }

        // 4. Compress image
        setDocState(docId, { status: 'processing', error: null });
        try {
            const result     = await compressDocumentImage(file, docId);
            const previewUrl = URL.createObjectURL(result.file);

            // Revoke old preview URL if replacing
            const prev = docStates[docId];
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);

            setDocState(docId, {
                status:             'uploading',
                uploadProgress:     0,
                file:               result.file,
                previewUrl,
                originalSize:       result.originalSize,
                compressedSize:     result.compressedSize,
                compressionPercent: result.compressionPercent,
                error:              null,
            });

            // 5. Immediately Upload to Backend!
            const uploadFormData = new FormData();
            uploadFormData.append(doc.apiField, result.file);

            const uploadRes = await api.post('/student/documents', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (ev) => {
                    if (ev.total) {
                        const progress = Math.round((ev.loaded / ev.total) * 100);
                        setDocState(docId, { uploadProgress: progress });
                    }
                }
            });

            if (uploadRes.data.success) {
                toast.success(`${doc.label} uploaded successfully!`);
                setReuploadedDocs(prev => {
                    if (prev.includes(docId)) return prev;
                    return [...prev, docId];
                });
                if (onUploadSuccess) await onUploadSuccess();
                // Clear local file picking state to hydrate UI from updated backend URL
                setDocStates(prev => {
                    const next = { ...prev };
                    delete next[docId];
                    return next;
                });
            }
        } catch (err) {
            setDocState(docId, {
                status: 'error',
                error: 'Upload failed. Your previous document is still safe.'
            });
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to process document.';
            toast.error(msg);
        }
    }, [docStates, DOCS, onUploadSuccess, reuploadedDocs]); // eslint-disable-line

    const handleFileInputChange = useCallback((e, docId) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) handleFilePicked(docId, file);
    }, [handleFilePicked]);

    // ── Replace Action ───────────────────────────────────────────────────────
    const handleReplaceClick = (docId) => {
        const doc = DOCS.find(d => d.id === docId);
        if (!doc) return;
        const confirm = window.confirm(`You already uploaded a ${doc.label}.\nAre you sure you want to replace it with a new file?`);
        if (confirm) {
            if (fileInputRefs.current[docId]) {
                fileInputRefs.current[docId].click();
            }
        }
    };

    // ── Remove Action ────────────────────────────────────────────────────────
    const handleRemoveClick = async (docId) => {
        const doc = DOCS.find(d => d.id === docId);
        if (!doc) return;
        const confirm = window.confirm(`Are you sure you want to remove this document?\nYou can upload another document later.`);
        if (confirm) {
            setDocState(docId, { status: 'processing', error: null });
            try {
                const res = await api.delete(`/student/documents/${doc.apiField}`);
                if (res.data.success) {
                    toast.success(`${doc.label} removed successfully!`);
                    if (onUploadSuccess) await onUploadSuccess();
                    setDocStates(prev => {
                        const next = { ...prev };
                        delete next[docId];
                        return next;
                    });
                }
            } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Failed to remove document.';
                setDocState(docId, { status: 'error', error: msg });
                toast.error(msg);
            }
        }
    };

    // ── Drag & Drop ──────────────────────────────────────────────────────────
    const handleDragOver  = useCallback((e, docId) => { e.preventDefault(); e.stopPropagation(); setDragOver(docId); }, []);
    const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(null); }, []);
    const handleDrop      = useCallback((e, docId) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(null);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFilePicked(docId, file);
    }, [handleFilePicked]);

    // ── Submit (Save & Continue Navigation Only) ──────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly) { onNext(); return; }

        const missing = DOCS.filter(doc => doc.required && !isDocPresent(doc));
        if (missing.length > 0) {
            setSubmitAttempted(true);
            toast.error('Please upload all required documents before continuing.');
            
            // Smooth scroll to the first missing card
            setTimeout(() => {
                const firstMissingId = missing[0].id;
                const el = document.getElementById(`doc-card-${firstMissingId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return;
        }

        onNext();
    };

    // ── Badge Renderer ───────────────────────────────────────────────────────
    const renderBadge = (doc, cardState, state) => {
        switch (cardState) {
            case 'missing':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                        Not Uploaded
                    </span>
                );
            case 'error':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                        Upload Failed
                    </span>
                );
            case 'processing':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
                        <Loader2 size={10} className="animate-spin text-blue-600" />
                        Processing...
                    </span>
                );
            case 'ready':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        Ready to Upload
                    </span>
                );
            case 'uploading':
                const progress = state?.uploadProgress || 0;
                return (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
                        <Loader2 size={10} className="animate-spin text-blue-600" />
                        Uploading {progress}%
                    </span>
                );
            case 'uploaded':
                return (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        Uploaded
                    </span>
                );
            case 'idle':
            default:
                if (doc.required) {
                    return (
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                            Required
                        </span>
                    );
                } else {
                    return (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Optional
                        </span>
                    );
                }
        }
    };

    // ── Computed ─────────────────────────────────────────────────────────────
    const anyBusy      = Object.values(docStates).some(s => s?.status === 'processing' || s?.status === 'validating' || s?.status === 'uploading');

    // ── Document Card ─────────────────────────────────────────────────────────
    const renderCard = (doc) => {
        const state      = docStates[doc.id] || {};
        const cardState  = getCardState(doc);
        const isDragging = dragOver === doc.id;
        const isBusy     = cardState === 'processing' || cardState === 'uploading';
        
        const isOriginalFlagged = (() => {
            if (applicationStatus !== 'CORRECTION_REQUIRED' && applicationStatus !== 'REJECTED') return false;
            if (!adminRemarks) return false;
            const remarksLower = adminRemarks.toLowerCase();
            const matches = {
                photo: ['passport', 'photo'],
                signature: ['signature'],
                sslcMarkscard: ['sslc', '10th', 'tenth'],
                pucMarkscard: ['puc', '12th', 'twelfth'],
                diplomaSemester5: ['diploma 5th', 'semester 5', 'sem 5'],
                diplomaSemester6: ['diploma 6th', 'semester 6', 'sem 6'],
                cetScoreCard: ['cet', 'dcet', 'entrance'],
                feesPaidReceipt: ['fees paid', 'receipt', 'fees verified'],
                casteCertificate: ['caste'],
                incomeCertificate: ['income', 'gap'],
                studyCertificate: ['study', 'domicile']
            };
            const keywords = matches[doc.id] || [];
            return keywords.some(kw => remarksLower.includes(kw));
        })();

        const isDocFlagged = isOriginalFlagged && !reuploadedDocs.includes(doc.id);
        const isReuploaded = isOriginalFlagged && reuploadedDocs.includes(doc.id);

        let cardClass = '';
        if (isDocFlagged) {
            cardClass = 'bg-red-50/40 border-red-500 shadow-sm shadow-red-50 border-2';
        } else if (isReuploaded) {
            cardClass = 'bg-green-50/30 border-green-500 shadow-sm shadow-green-50 border-2';
        } else {
            switch (cardState) {
                case 'missing':
                case 'error':
                    cardClass = 'bg-red-50/40 border-red-500 shadow-sm shadow-red-50';
                    break;
                case 'processing':
                case 'ready':
                case 'uploading':
                    cardClass = 'bg-blue-50/40 border-blue-400 shadow-sm shadow-blue-50';
                    break;
                case 'uploaded':
                    cardClass = 'bg-green-50/30 border-green-500 shadow-sm shadow-green-50';
                    break;
                case 'idle':
                default:
                    cardClass = 'bg-white border-slate-200 hover:border-slate-300';
                    break;
            }
        }

        if (isDragging) {
            cardClass = 'bg-primary-50 border-primary-400 border-dashed scale-[1.01] shadow-md';
        }

        const previewUrl = cardState === 'uploaded' ? resolveDocUrl(data?.[doc.dbKey]) : state?.previewUrl;
        const showPreview = (cardState === 'uploaded' || cardState === 'ready' || cardState === 'uploading') && previewUrl;
        const showActionButtons = cardState === 'uploaded';
        const filename = cardState === 'uploaded' ? getFilenameFromUrl(data?.[doc.dbKey]) : '';

        return (
            <div
                key={doc.id}
                id={`doc-card-${doc.id}`}
                className={`rounded-xl border-2 transition-all duration-200 overflow-hidden flex flex-col p-4 ${cardClass}`}
                onDragOver={(e) => !isBusy && !readOnly && handleDragOver(e, doc.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => !isBusy && !readOnly && handleDrop(e, doc.id)}
                role="region"
                aria-label={`Document upload: ${doc.label}`}
            >
                {/* ── Card Header ── */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isDocFlagged ? 'bg-red-100 text-red-500'
                        : (cardState === 'uploaded' || isReuploaded) ? 'bg-green-100 text-green-600'
                        : (cardState === 'missing' || cardState === 'error') ? 'bg-red-100 text-red-500'
                        : (cardState === 'ready' || cardState === 'processing' || cardState === 'uploading') ? 'bg-blue-100 text-blue-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                        {isDocFlagged ? <XCircle size={18} /> : (cardState === 'uploaded' || isReuploaded) ? <CheckCircle2 size={18} /> : (cardState === 'missing' || cardState === 'error') ? <XCircle size={18} /> : <doc.icon size={18} />}
                    </div>

                    {isDocFlagged ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            Rejected
                        </span>
                    ) : isReuploaded ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                            Re-uploaded
                        </span>
                    ) : renderBadge(doc, cardState, state)}
                </div>

                <div className="flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">{doc.label}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{doc.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 mb-3">{doc.hint}</p>

                    {isDocFlagged && (
                        <div className="mb-3 flex items-start gap-1.5 text-[11px] text-red-600 font-semibold border border-red-200/50 bg-red-50/50 rounded-lg p-2.5">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500" />
                            <span>This document was rejected by the admin. Please re-upload a clear, correct copy.</span>
                        </div>
                    )}

                    {isReuploaded && (
                        <div className="mb-3 flex items-start gap-1.5 text-[11px] text-green-700 font-semibold border border-green-200/50 bg-green-50/50 rounded-lg p-2.5 animate-fade-in">
                            <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-green-600" />
                            <span>Document replaced and updated. Ready for resubmission.</span>
                        </div>
                    )}

                    {/* ── Image Preview ── */}
                    {showPreview && (
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 mb-2">
                            <img
                                src={previewUrl}
                                alt={`${doc.label} preview`}
                                className="w-full h-28 object-contain"
                            />
                            <button
                                type="button"
                                onClick={() => setPreviewDoc({ docId: doc.id, url: previewUrl })}
                                className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md px-1.5 py-1 text-[10px] flex items-center gap-1 transition-colors"
                                aria-label={`View full size preview of ${doc.label}`}
                            >
                                <Eye size={10} /> View
                            </button>
                        </div>
                    )}

                    {/* Filename display */}
                    {filename && (
                        <p className="text-[11px] font-medium text-slate-600 truncate px-1 mb-2 max-w-full">
                            {filename}
                        </p>
                    )}

                    {/* ── Compression Stats ── */}
                    {cardState === 'ready' && state.originalSize && state.compressedSize && state.compressedSize < state.originalSize && (
                        <div className="mb-3 px-2.5 py-1.5 bg-white/70 rounded-lg border border-slate-100">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-slate-400">Original: {formatSize(state.originalSize)}</span>
                                <span className="text-slate-300 mx-1">→</span>
                                <span className="text-green-600 font-semibold">Optimized: {formatSize(state.compressedSize)}</span>
                            </div>
                            {state.compressionPercent > 0 && (
                                <div className="text-[10px] font-bold text-primary-600 mb-1">
                                    Reduced by {state.compressionPercent}%
                                </div>
                            )}
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-700"
                                    style={{ width: `${Math.max(5, 100 - state.compressionPercent)}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Bottom validation messages ── */}
                    {cardState === 'missing' && (
                        <div className="mb-3 flex items-center gap-1.5 text-[11px] text-red-600 font-semibold animate-pulse">
                            <AlertTriangle size={12} className="shrink-0" />
                            <span>Required document not uploaded</span>
                        </div>
                    )}
                    {cardState === 'error' && (
                        <div className="mb-3 flex items-start gap-1.5 text-[11px] text-red-600 font-semibold">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span className="leading-tight">{state.error || 'Upload failed. Please try again.'}</span>
                        </div>
                    )}
                    {cardState === 'uploaded' && (
                        <div className="mb-3 flex items-center gap-1.5 text-[11px] text-green-700 font-semibold">
                            <CheckCircle2 size={12} className="shrink-0 text-green-600" />
                            <span>Document uploaded successfully</span>
                        </div>
                    )}

                    {/* Hidden input trigger */}
                    <input
                        ref={el => { if (el) fileInputRefs.current[doc.id] = el; }}
                        type="file"
                        className="hidden"
                        accept={ACCEPTED_MIME}
                        disabled={isBusy || readOnly}
                        onChange={(e) => handleFileInputChange(e, doc.id)}
                        aria-hidden="true"
                    />

                    {/* ── Actions Row ── */}
                    {showActionButtons ? (
                        <div className="flex gap-2 w-full mt-auto pt-2">
                            <button
                                type="button"
                                onClick={() => handleReplaceClick(doc.id)}
                                disabled={isBusy || readOnly}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all select-none text-center disabled:opacity-50"
                            >
                                <RefreshCw size={13} />
                                <span>Replace</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRemoveClick(doc.id)}
                                disabled={isBusy || readOnly}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-semibold transition-all select-none disabled:opacity-50 text-center"
                            >
                                <Trash2 size={13} />
                                <span>Remove</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (fileInputRefs.current[doc.id]) {
                                    fileInputRefs.current[doc.id].click();
                                }
                            }}
                            disabled={isBusy || readOnly}
                            className={`w-full mt-auto pt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition-all select-none text-center ${
                                cardState === 'missing'
                                    ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 border-2'
                                    : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'
                            }`}
                        >
                            {isBusy ? (
                                <><Loader2 size={13} className="animate-spin" /><span>Processing...</span></>
                            ) : (
                                <>
                                    <UploadCloud size={13} className="hidden sm:block" />
                                    <Camera    size={13} className="sm:hidden" />
                                    <span className="hidden sm:inline">Choose File</span>
                                    <span className="sm:hidden">Upload / Camera</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* Lightbox full-size preview */}
            {previewDoc && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setPreviewDoc(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Document full preview"
                >
                    <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setPreviewDoc(null)}
                            className="absolute -top-9 right-0 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                            <XCircle size={15} /> Close preview
                        </button>
                        <img
                            src={previewDoc.url}
                            alt="Full document preview"
                            className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in flex flex-col" noValidate>

                {/* Step header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-primary-600 rounded-full" />
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Step 6: Document Upload</h2>
                            <p className="text-xs text-slate-500 mt-0.5">JPG / PNG only · Images are automatically optimized before upload</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold hidden sm:block">
                        Document Verification
                    </span>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-700">
                    <ImageIcon size={14} className="shrink-0 mt-0.5 text-blue-500" />
                    <span>
                        Drag &amp; drop images onto any card, or tap <strong>Choose File</strong> to browse.
                        Mobile users can capture documents directly using the device camera.
                        All images are automatically compressed while preserving readability.
                    </span>
                </div>

                {/* Document grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DOCS.map(renderCard)}
                </div>

                {/* Upload progress bar */}
                {anyBusy && (
                    <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
                        <span className="text-xs font-semibold text-primary-700 flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin" /> Document operations in progress…
                        </span>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-0 -mx-4 -mb-4 sm:mx-0 sm:mb-0 sm:static sm:bg-transparent z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:shadow-none">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="btn-secondary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold"
                        aria-label="Go to previous step"
                    >
                        <ChevronLeft size={16} /> Back
                    </button>

                    <button
                        type="submit"
                        id="bottom-submit-btn"
                        disabled={isUploading || anyBusy}
                        className="btn-primary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-6 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-opacity"
                        aria-label="Save documents and continue to next step"
                    >
                        <span>Save &amp; Continue</span> <ChevronRight size={16} />
                    </button>
                </div>
            </form>
        </>
    );
};

export default Step6Documents;
