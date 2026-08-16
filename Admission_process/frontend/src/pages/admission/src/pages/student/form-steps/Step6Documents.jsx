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

// Helper to resolve static file paths from backend origin.
// Signed R2 URLs (https://...) are returned as-is.
// Legacy local /uploads/... paths are resolved against the backend origin.
// Raw R2 object keys (e.g. "2026-2027/CSE/JCER-0001/Photo.jpg") are NOT
// valid URLs — return '' so the broken-image icon is shown instead of a
// mangled URL.
const resolveDocUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('blob:')) return path;
    if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
        const base = api.defaults.baseURL || '/api';
        return `${base.replace('/api', '')}/${path.replace(/^\//, '')}`;
    }
    // Raw R2 key with no signed URL yet — cannot display
    return '';
};

// Helper to parse filename from backend path (strips query-string from signed URLs)
const getFilenameFromUrl = (url) => {
    if (!url) return '';
    const withoutQuery = url.split('?')[0];
    return withoutQuery.split('/').pop();
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
            label: 'College Fees Receipt',
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
        {
            id: 'admissionFormFeeReceipt',
            label: 'Admission Form Fee Receipt',
            description: 'Offline receipt or online payment screenshot',
            icon: FileText,
            required: true,
            apiField: 'admissionFormFeeReceipt',
            dbKey: 'admissionFormFeeReceiptUrl',
            colorRequired: false,
            hint: 'JPG or PNG · Max 10 MB',
        },
    ];

    // ── State ────────────────────────────────────────────────────────────────
    const [docStates,        setDocStates]       = useState({});
    const [isUploading,      setIsUploading]     = useState(false);
    const [paymentMode,      setPaymentMode]     = useState(() => data?.admissionFormFeePaymentMode || 'OFFLINE');
    const [utrNumber,        setUtrNumber]       = useState(() => data?.admissionFormFeeUtr || '');
    const [utrError,         setUtrError]        = useState('');

    const handlePaymentModeChange = (mode) => {
        if (readOnly) return;
        setPaymentMode(mode);
        if (mode === 'OFFLINE') {
            setUtrError('');
        }
    };

    const handleUtrChange = (e) => {
        if (readOnly) return;
        setUtrNumber(e.target.value);
        setUtrError('');
    };
    const [dragOver,         setDragOver]        = useState(null);
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

        if (paymentMode === 'ONLINE') {
            if (!utrNumber || !utrNumber.trim()) {
                setUtrError('UTR / Transaction Number is required for online payments.');
                toast.error('Please enter the UTR / Transaction Number.');
                return;
            }
        }

        setIsUploading(true);
        try {
            const saveRes = await api.post('/student/documents', {
                admissionFormFeeUtr: paymentMode === 'ONLINE' ? utrNumber : null,
                admissionFormFeePaymentMode: paymentMode,
            });
            
            if (saveRes.data.success) {
                if (onUploadSuccess) await onUploadSuccess();
                onNext();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save payment details.');
        } finally {
            setIsUploading(false);
        }
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
        
        const matches = {
            photo: ['passport', 'photo'],
            signature: ['signature'],
            sslcMarkscard: ['sslc', '10th', 'tenth'],
            pucMarkscard: ['puc', '12th', 'twelfth'],
            diplomaSemester5Marksheet: ['diploma 5th', 'semester 5', 'sem 5'],
            diplomaSemester6Marksheet: ['diploma 6th', 'semester 6', 'sem 6'],
            cetScoreCard: ['cet', 'dcet', 'entrance'],
            feesPaidReceipt: ['fees paid', 'receipt', 'fees verified'],
            casteCertificate: ['caste'],
            incomeCertificate: ['income', 'gap'],
            studyCertificate: ['study', 'domicile']
        };

        const isOriginalFlagged = (() => {
            if (applicationStatus !== 'CORRECTION_REQUIRED' && applicationStatus !== 'REJECTED') return false;
            if (!adminRemarks) return false;
            
            const remarkLabels = {
                photo: ['passport size photo', 'recent passport photo'],
                signature: ['candidate e-signature', 'e-signature'],
                sslcMarkscard: ['sslc / 10th marks card', 'sslc marks card', '10th marks card'],
                pucMarkscard: ['puc / 12th marks card', 'puc marks card', '12th marks card'],
                diplomaSemester5Marksheet: ['diploma 5th semester marks card'],
                diplomaSemester6Marksheet: ['diploma 6th semester marks card'],
                cetScoreCard: ['entrance score card (cet/dcet)'],
                aadhaar: ['aadhaar card copy'],
                feesPaidReceipt: ['college fees receipt'],
                admissionFormFeeReceipt: ['admission form fee receipt'],
                casteCertificate: ['caste certificate (optional)', 'caste certificate'],
                incomeCertificate: ['income / gap year certificate', 'income certificate'],
                studyCertificate: ['domicile / study certificate', '7 years study certificate']
            };

            const targetLabels = remarkLabels[doc.id] || [];
            const lines = adminRemarks.split('\n');
            
            return lines.some(line => {
                const lowerLine = line.toLowerCase();
                return lowerLine.trim().startsWith('•') && 
                       targetLabels.some(label => lowerLine.includes(label)) &&
                       (lowerLine.includes('re-upload') || lowerLine.includes('needs correction/re-upload'));
            });
        })();

        const isDocDisabled = (() => {
            if (readOnly) return true;
            if (applicationStatus !== 'CORRECTION_REQUIRED') return false;

            const remarkLabels = {
                photo: ['passport size photo', 'recent passport photo'],
                signature: ['candidate e-signature', 'e-signature'],
                sslcMarkscard: ['sslc / 10th marks card', 'sslc marks card', '10th marks card'],
                pucMarkscard: ['puc / 12th marks card', 'puc marks card', '12th marks card'],
                diplomaSemester5Marksheet: ['diploma 5th semester marks card'],
                diplomaSemester6Marksheet: ['diploma 6th semester marks card'],
                cetScoreCard: ['entrance score card (cet/dcet)'],
                aadhaar: ['aadhaar card copy'],
                feesPaidReceipt: ['college fees receipt'],
                admissionFormFeeReceipt: ['admission form fee receipt'],
                casteCertificate: ['caste certificate (optional)', 'caste certificate'],
                incomeCertificate: ['income / gap year certificate', 'income certificate'],
                studyCertificate: ['domicile / study certificate', '7 years study certificate']
            };

            const hasFlaggedDocs = REQUIRED_DOCUMENTS.some(d => {
                if (!adminRemarks) return false;
                const targetLabels = remarkLabels[d.id] || [];
                return adminRemarks.split('\n').some(line => {
                    const lowerLine = line.toLowerCase();
                    return lowerLine.trim().startsWith('•') && 
                           targetLabels.some(label => lowerLine.includes(label)) &&
                           (lowerLine.includes('re-upload') || lowerLine.includes('needs correction/re-upload'));
                });
            });

            if (hasFlaggedDocs) {
                return !isOriginalFlagged;
            }
            return false;
        })();

        const docRemarks = (() => {
            if (!adminRemarks) return null;
            const lines = adminRemarks.split('\n');
            
            const remarkLabels = {
                photo: ['passport size photo', 'recent passport photo'],
                signature: ['candidate e-signature', 'e-signature'],
                sslcMarkscard: ['sslc / 10th marks card', 'sslc marks card', '10th marks card'],
                pucMarkscard: ['puc / 12th marks card', 'puc marks card', '12th marks card'],
                diplomaSemester5Marksheet: ['diploma 5th semester marks card'],
                diplomaSemester6Marksheet: ['diploma 6th semester marks card'],
                cetScoreCard: ['entrance score card (cet/dcet)'],
                aadhaar: ['aadhaar card copy'],
                feesPaidReceipt: ['college fees receipt'],
                admissionFormFeeReceipt: ['admission form fee receipt'],
                casteCertificate: ['caste certificate (optional)', 'caste certificate'],
                incomeCertificate: ['income / gap year certificate', 'income certificate'],
                studyCertificate: ['domicile / study certificate', '7 years study certificate']
            };

            const targetLabels = remarkLabels[doc.id] || [];
            const lineIdx = lines.findIndex(line => {
                const lowerLine = line.toLowerCase();
                return lowerLine.trim().startsWith('•') && 
                       targetLabels.some(label => lowerLine.includes(label)) &&
                       (lowerLine.includes('re-upload') || lowerLine.includes('needs correction/re-upload'));
            });

            if (lineIdx === -1) return null;

            const currentLine = lines[lineIdx];
            const reasonMatch = currentLine.match(/\(([^)]+)\)/);
            const reason = reasonMatch ? reasonMatch[1] : null;

            const nextLine = lines[lineIdx + 1];
            let note = null;
            if (nextLine && nextLine.trim().startsWith('Note:')) {
                note = nextLine.replace(/^\s*Note:\s*/i, '').trim();
            }

            return { reason, note };
        })();

        const rejectionMessage = (() => {
            if (!docRemarks) {
                return "This document was rejected by the admin. Please re-upload a clear, correct copy.";
            }
            const parts = ["This document was rejected by the admin."];
            if (docRemarks.reason) {
                parts.push(`Reason: ${docRemarks.reason}.`);
            }
            if (docRemarks.note) {
                parts.push(`Instructions: "${docRemarks.note}"`);
            } else if (!docRemarks.reason) {
                parts.push("Please re-upload a clear, correct copy.");
            }
            return parts.join(" ");
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
                            <span>{rejectionMessage}</span>
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
                                className="w-full h-28 object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => window.open(previewUrl, '_blank')}
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
                        disabled={isBusy || isDocDisabled}
                        onChange={(e) => handleFileInputChange(e, doc.id)}
                        aria-hidden="true"
                    />

                    {/* ── Actions Row ── */}
                    {showActionButtons ? (
                        <div className="flex gap-2 w-full mt-auto pt-2">
                            <button
                                type="button"
                                onClick={() => handleReplaceClick(doc.id)}
                                disabled={isBusy || isDocDisabled}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all select-none text-center disabled:opacity-50"
                            >
                                <RefreshCw size={13} />
                                <span>Replace</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRemoveClick(doc.id)}
                                disabled={isBusy || isDocDisabled}
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
                            disabled={isBusy || isDocDisabled}
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

    const renderCustomUploader = (docId) => {
        const doc = DOCS.find(d => d.id === docId);
        if (!doc) return null;
        
        const state      = docStates[docId] || {};
        const cardState  = getCardState(doc);
        const isBusy     = cardState === 'processing' || cardState === 'uploading';
        const previewUrl = cardState === 'uploaded' ? resolveDocUrl(data?.[doc.dbKey]) : state?.previewUrl;
        const showPreview = (cardState === 'uploaded' || cardState === 'ready' || cardState === 'uploading') && previewUrl;
        const filename = cardState === 'uploaded' ? getFilenameFromUrl(data?.[doc.dbKey]) : '';

        return (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center justify-center space-y-3 min-h-[140px] relative">
                {showPreview ? (
                    <div className="w-full flex flex-col items-center">
                        <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 mb-2 w-full max-w-[200px]">
                            <img src={previewUrl} alt="Preview" className="w-full h-24 object-cover" />
                            <button
                                type="button"
                                onClick={() => window.open(previewUrl, '_blank')}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-md px-1.5 py-0.5 text-[9px] flex items-center gap-1 transition-colors"
                            >
                                <Eye size={9} /> View
                            </button>
                        </div>
                        {filename && <p className="text-[10px] text-slate-500 font-medium truncate max-w-xs">{filename}</p>}
                        
                        <div className="flex gap-2 w-full max-w-[200px] mt-2">
                            <button
                                type="button"
                                onClick={() => handleReplaceClick(docId)}
                                disabled={isBusy || readOnly}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[10px] font-bold transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={10} /> Replace
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRemoveClick(docId)}
                                disabled={isBusy || readOnly}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-[10px] font-bold transition-all disabled:opacity-50"
                            >
                                <Trash2 size={10} /> Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 text-slate-400">
                            <UploadCloud size={20} />
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (fileInputRefs.current[docId]) {
                                    fileInputRefs.current[docId].click();
                                }
                            }}
                            disabled={isBusy || readOnly}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                        >
                            {isBusy ? <Loader2 size={12} className="animate-spin inline mr-1" /> : 'Choose File'}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1">PNG or JPG, max 10MB</p>
                    </div>
                )}

                {/* Hidden input trigger */}
                <input
                    ref={el => { if (el) fileInputRefs.current[docId] = el; }}
                    type="file"
                    className="hidden"
                    accept={ACCEPTED_MIME}
                    disabled={isBusy || readOnly}
                    onChange={(e) => handleFileInputChange(e, docId)}
                />
            </div>
        );
    };

    return (
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
                    {DOCS.filter(d => d.id !== 'admissionFormFeeReceipt').map(renderCard)}
                </div>

                {/* ── Admission Form Fee Receipt Section ── */}
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-5 mt-6 space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <ClipboardList size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Admission Form Fee Receipt <span className="text-red-500">*</span></h3>
                            <p className="text-xs text-slate-500">Provide payment proof of ₹500 for the admission application form</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <label className={`flex-1 flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            paymentMode === 'OFFLINE' ? 'border-primary-500 bg-primary-50/20' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="radio"
                                    name="admissionFormFeePaymentMode"
                                    value="OFFLINE"
                                    checked={paymentMode === 'OFFLINE'}
                                    disabled={readOnly}
                                    onChange={() => handlePaymentModeChange('OFFLINE')}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 block">Paid Offline</span>
                                    <span className="text-[10px] text-slate-500">Receipt given by college office</span>
                                </div>
                            </div>
                        </label>

                        <label className={`flex-1 flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            paymentMode === 'ONLINE' ? 'border-primary-500 bg-primary-50/20' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="radio"
                                    name="admissionFormFeePaymentMode"
                                    value="ONLINE"
                                    checked={paymentMode === 'ONLINE'}
                                    disabled={readOnly}
                                    onChange={() => handlePaymentModeChange('ONLINE')}
                                    className="text-primary-600 focus:ring-primary-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 block">Pay Online via QR Code</span>
                                    <span className="text-[10px] text-slate-500">Scan QR, enter UTR &amp; upload screenshot</span>
                                </div>
                            </div>
                        </label>
                    </div>

                    {paymentMode === 'OFFLINE' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                                <h4 className="text-xs font-bold text-slate-700 mb-1">Upload Offline Fee Receipt</h4>
                                <p className="text-[10px] text-slate-400 mb-3">Please upload a clear scan/photo of the physical receipt given by the college office.</p>
                                {renderCustomUploader('admissionFormFeeReceipt')}
                            </div>
                        </div>
                    )}

                    {paymentMode === 'ONLINE' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* QR Code Card */}
                            <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col items-center justify-center space-y-3">
                                <span className="text-[10px] font-bold text-slate-650 uppercase tracking-wider">Scan to Pay ₹500</span>
                                <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                    <img src="/QR_code.jpg" alt="Payment QR Code" className="w-32 h-32 object-contain" />
                                </div>
                                <a href="/QR_code.jpg" download="Jain_College_Admission_Fee_QR.jpg" className="text-[10px] font-bold text-primary-600 hover:underline">
                                    Download QR Code
                                </a>
                            </div>

                            {/* Inputs Card */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 block">
                                        UTR / Transaction Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="admissionFormFeeUtr"
                                        value={utrNumber}
                                        onChange={handleUtrChange}
                                        disabled={readOnly}
                                        placeholder="Enter 12-digit UTR or Transaction ID"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-xs text-slate-900 font-semibold"
                                    />
                                    {utrError && <p className="text-red-500 text-[10px] font-semibold mt-0.5">{utrError}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 block">
                                        Upload Payment Screenshot <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-[10px] text-slate-400 mb-2">Upload screenshot showing UTR number, date and amount.</p>
                                    {renderCustomUploader('admissionFormFeeReceipt')}
                                </div>
                            </div>
                        </div>
                    )}
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
                        aria-label={readOnly ? "Continue to next step" : "Save documents and continue to next step"}
                    >
                        <span>{readOnly ? 'Continue' : 'Save & Continue'}</span> <ChevronRight size={16} />
                    </button>
                </div>
            </form>
    );
};

export default Step6Documents;
