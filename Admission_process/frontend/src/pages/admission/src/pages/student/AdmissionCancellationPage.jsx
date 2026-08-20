import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, XCircle, Send, Loader2, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import api from '../../../../../services/api';
import toast from 'react-hot-toast';
import useApplicationStatus from '../../hooks/useApplicationStatus';

export const AdmissionCancellationPage = () => {
    const navigate = useNavigate();
    const { stepStatus, refetch } = useApplicationStatus();
    const [reason, setReason] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) {
            toast.error('Please select a reason for cancellation.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/student/cancellation-request', { reason, remarks });
            if (res.data?.success) {
                toast.success('Admission cancellation request submitted successfully.');
                if (refetch) refetch();
                navigate('/admission/dashboard');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to submit cancellation request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6 max-w-3xl mx-auto pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <button
                    type="button"
                    onClick={() => navigate('/admission/dashboard')}
                    className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors bg-transparent border-none cursor-pointer"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </button>
                <span className="px-3 py-1 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-full text-[11px] font-extrabold uppercase tracking-wider border border-red-200/60 dark:border-red-900/50">
                    Cancellation Form
                </span>
            </div>

            {/* Page Header */}
            <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <XCircle size={22} />
                    </div>
                    Request Admission Cancellation
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pl-13">
                    Submit a formal request to cancel your enrolled admission at JCER.
                </p>
            </div>

            {/* Warning & Policy Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wide">
                    <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Important Cancellation Policy & Instructions</span>
                </div>
                <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 space-y-1.5 font-medium pl-6 list-disc">
                    <li>Once submitted, your application status will change to <strong>Cancellation Requested</strong>.</li>
                    <li>The college administration and principal will review your request within 2-3 business days.</li>
                    <li>Any eligible fee refunds will be processed as per university &amp; state government guidelines.</li>
                </ul>
            </div>

            {/* Main Cancellation Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
                
                {/* Application Context Summary */}
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Application ID / Number</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{stepStatus?.applicationNumber || stepStatus?.studentId || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Current Status</span>
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-extrabold rounded-full text-[10px] uppercase border border-emerald-200/60 dark:border-emerald-900/50">
                            {stepStatus?.applicationStatus || 'ENROLLED'}
                        </span>
                    </div>
                </div>

                {/* Reason Dropdown */}
                <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Reason for Cancellation <span className="text-red-500">*</span>
                    </label>
                    <select
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer"
                    >
                        <option value="">Select a reason for cancellation...</option>
                        <option value="Joined Another College">Joined Another College / Seat allocated in KCET/COMEDK</option>
                        <option value="Financial Reasons">Financial Reasons</option>
                        <option value="Personal Reasons">Personal / Health Reasons</option>
                        <option value="Wrong Course Selected">Wrong Course / Preferred Branch Unavailable</option>
                        <option value="Relocation">Relocation to another city/state</option>
                        <option value="Other">Other Reasons</option>
                    </select>
                </div>

                {/* Additional Remarks */}
                <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Remarks / Additional Details <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                        rows={4}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Provide any specific comments, administrative references, or additional explanations here..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                    />
                </div>

                {/* Action Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => navigate('/admission/dashboard')}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-5 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                        Cancel &amp; Return to Dashboard
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !reason}
                        className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Submitting Request...</span>
                            </>
                        ) : (
                            <>
                                <Send size={14} />
                                <span>Submit Cancellation Request</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdmissionCancellationPage;
