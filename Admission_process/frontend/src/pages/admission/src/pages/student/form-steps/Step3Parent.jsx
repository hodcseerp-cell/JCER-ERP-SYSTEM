import React, { useState, useEffect } from 'react';
import api from '../../../../../../services/api';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Step3Parent = ({ onNext, onPrev, data, updateData, applicationStatus, adminRemarks, readOnly = false }) => {
    const [loading, setLoading] = useState(false);
    const [originalValues, setOriginalValues] = useState(null);

    useEffect(() => {
        if (data && !originalValues) {
            setOriginalValues({
                ...data,
                // Handle pre-mapped database names
                parentMobile: data.parentMobile || data.fatherPhone || '',
                occupation: data.occupation || data.fatherOccupation || '',
                annualIncome: data.annualIncome || data.fatherAnnualIncome || ''
            });
        }
    }, [data, originalValues]);

    const isFieldFlagged = (fieldName) => {
        if (applicationStatus !== 'CORRECTION_REQUIRED' && applicationStatus !== 'REJECTED') return false;
        if (!adminRemarks) return false;
        const remarksLower = adminRemarks.toLowerCase();
        const matches = {
            fatherName: ["father's name"],
            parentMobile: ["father's mobile"],
            occupation: ["father's occupation"],
            motherName: ["mother's name"],
            motherPhone: ["mother's mobile"],
            motherOccupation: ["mother's occupation"],
            annualIncome: ["annual income"]
        };
        const keywords = matches[fieldName] || [];
        return keywords.some(kw => remarksLower.includes(kw));
    };

    const ALL_STEP3_FIELDS = ['fatherName', 'parentMobile', 'occupation', 'motherName', 'motherPhone', 'motherOccupation', 'annualIncome'];
    const hasFlaggedFieldsInStep3 = ALL_STEP3_FIELDS.some(f => isFieldFlagged(f));

    const isFieldDisabled = (fieldName) => {
        if (readOnly) return true;
        if (applicationStatus !== 'CORRECTION_REQUIRED') return false;
        if (hasFlaggedFieldsInStep3) {
            return !isFieldFlagged(fieldName);
        }
        return false;
    };

    const isFieldCorrected = (fieldName) => {
        if (!originalValues) return false;
        if (!isFieldFlagged(fieldName)) return false;
        
        let currentValue = data[fieldName] || '';
        let originalValue = originalValues[fieldName] || '';

        // Fallback checks for mapped values
        if (fieldName === 'parentMobile' && !currentValue) currentValue = data.fatherPhone || '';
        if (fieldName === 'occupation' && !currentValue) currentValue = data.fatherOccupation || '';
        if (fieldName === 'annualIncome' && !currentValue) currentValue = data.fatherAnnualIncome || '';
        
        return String(currentValue) !== String(originalValue);
    };

    const getFieldContainerClass = (fieldName, extra = "") => {
        const base = `space-y-1.5 p-3 rounded-xl transition-all duration-300 ${extra}`;
        if (!isFieldFlagged(fieldName)) return base;
        if (isFieldCorrected(fieldName)) {
            return `${base} border-2 border-emerald-500 bg-emerald-50/10`;
        }
        return `${base} border-2 border-red-500 bg-red-50/10`;
    };

    const getFieldInputClass = (fieldName, extra = "") => {
        const baseClass = `input-premium h-11 uppercase ${extra}`;
        if (!isFieldFlagged(fieldName)) return baseClass;
        if (isFieldCorrected(fieldName)) {
            return `${baseClass} border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20`;
        }
        return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500/20`;
    };

    const renderFeedback = (fieldName) => {
        if (!isFieldFlagged(fieldName)) return null;
        if (isFieldCorrected(fieldName)) {
            return (
                <p className="text-emerald-600 text-[11px] font-bold mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Corrected
                </p>
            );
        }
        return (
            <p className="text-red-500 text-[11px] font-bold mt-1">
                🔴 Requires correction / verification
            </p>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (readOnly) {
            onNext();
            return;
        }

        setLoading(true);
        try {
            const payload = {
                fatherName: data.fatherName,
                motherName: data.motherName,
                fatherPhone: data.parentMobile || data.fatherPhone,
                fatherEmail: data.parentEmail || data.fatherEmail,
                fatherOccupation: data.occupation || data.fatherOccupation,
                fatherAnnualIncome: (data.annualIncome !== undefined && data.annualIncome !== '' && data.annualIncome !== null)
                    ? parseFloat(data.annualIncome)
                    : (data.fatherAnnualIncome !== undefined && data.fatherAnnualIncome !== '' && data.fatherAnnualIncome !== null)
                        ? parseFloat(data.fatherAnnualIncome)
                        : null,
                motherOccupation: data.motherOccupation || '',
                motherPhone: data.motherPhone || '',
            };

            const res = await api.put('/student/parent', payload);
            if (res.data.success) {
                toast.success('Parent details saved!');
                onNext();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save parent details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        updateData({ [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in flex flex-col">
            <div className="space-y-6 flex flex-col p-0 m-0 border-0 w-full">
            
            {/* Father's Details */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-slate-900">Step 3: Parent / Guardian Details</h2>
                </div>
                
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mt-4">
                    Father's Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Father Name */}
                    <div className={getFieldContainerClass('fatherName')}>
                        <label className="text-sm font-medium text-slate-700">Father's Name <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('fatherName')} type="text" name="fatherName" className={getFieldInputClass('fatherName')} value={data.fatherName || ''} onChange={handleChange} placeholder="Enter father's name" />
                        {renderFeedback('fatherName')}
                        {!data.fatherName && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* Father Mobile */}
                    <div className={getFieldContainerClass('parentMobile')}>
                        <label className="text-sm font-medium text-slate-700">Father's Mobile No. <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('parentMobile')} type="tel" name="parentMobile" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className={getFieldInputClass('parentMobile')} value={data.parentMobile || data.fatherPhone || ''} onChange={handleChange} placeholder="Enter father's mobile number" />
                        {renderFeedback('parentMobile')}
                        {!(data.parentMobile || data.fatherPhone) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* Father Occupation */}
                    <div className={getFieldContainerClass('occupation')}>
                        <label className="text-sm font-medium text-slate-700">Father's Occupation <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('occupation')} type="text" name="occupation" className={getFieldInputClass('occupation')} value={data.occupation || data.fatherOccupation || ''} onChange={handleChange} placeholder="Enter father's occupation" />
                        {renderFeedback('occupation')}
                        {!(data.occupation || data.fatherOccupation) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Mother's Details */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Mother's Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Mother Name */}
                    <div className={getFieldContainerClass('motherName')}>
                        <label className="text-sm font-medium text-slate-700">Mother's Name <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('motherName')} type="text" name="motherName" className={getFieldInputClass('motherName')} value={data.motherName || ''} onChange={handleChange} placeholder="Enter mother's name" />
                        {renderFeedback('motherName')}
                        {!data.motherName && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* Mother Mobile */}
                    <div className={getFieldContainerClass('motherPhone')}>
                        <label className="text-sm font-medium text-slate-700">Mother's Mobile No. <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('motherPhone')} type="tel" name="motherPhone" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className={getFieldInputClass('motherPhone')} value={data.motherPhone || ''} onChange={handleChange} placeholder="Enter mother's mobile number" />
                        {renderFeedback('motherPhone')}
                        {!data.motherPhone && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* Mother Occupation */}
                    <div className={getFieldContainerClass('motherOccupation')}>
                        <label className="text-sm font-medium text-slate-700">Mother's Occupation <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('motherOccupation')} type="text" name="motherOccupation" className={getFieldInputClass('motherOccupation')} value={data.motherOccupation || ''} onChange={handleChange} placeholder="Enter mother's occupation" />
                        {renderFeedback('motherOccupation')}
                        {!data.motherOccupation && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Family Information */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Family Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-1.5 lg:col-span-2 p-3 rounded-xl">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            Parent Email ID
                            <span className="text-[11px] font-normal text-slate-400 italic">(Optional)</span>
                        </label>
                        <input disabled={readOnly} type="email" name="parentEmail" className="input-premium h-11" value={data.parentEmail || data.fatherEmail || ''} onChange={handleChange} placeholder="Enter parent email (optional)" />
                    </div>

                    {/* Annual Income */}
                    <div className={getFieldContainerClass('annualIncome', 'lg:col-span-1')}>
                        <label className="text-sm font-medium text-slate-700">Annual Income (₹) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                            <input required disabled={isFieldDisabled('annualIncome')} type="number" min="0" name="annualIncome" inputMode="numeric" className={getFieldInputClass('annualIncome', '!pl-9')} value={data.annualIncome || data.fatherAnnualIncome || ''} onChange={handleChange} placeholder="Enter annual income" />
                        </div>
                        {renderFeedback('annualIncome')}
                        {!(data.annualIncome || data.fatherAnnualIncome) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                </div>
            </div>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-0 -mx-4 -mb-4 sm:mx-0 sm:mb-0 sm:static sm:bg-transparent z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:shadow-none">
                <button type="button" onClick={onPrev} className="btn-secondary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
                    <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" id="bottom-submit-btn" disabled={loading} className="btn-primary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-6 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                        <>{readOnly ? 'Continue' : 'Save & Continue'} <ChevronRight size={16} /></>
                    )}
                </button>
            </div>
        </form>
    );
};

export default Step3Parent;
