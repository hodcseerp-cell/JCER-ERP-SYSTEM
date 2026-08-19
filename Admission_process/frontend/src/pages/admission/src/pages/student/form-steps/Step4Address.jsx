import React, { useState, useEffect } from 'react';
import api from '../../../../../../services/api';
import { Loader2, ChevronLeft, ChevronRight, Home, MapPin, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Step4Address = ({ onNext, onPrev, data = {}, updateData, applicationStatus, adminRemarks, readOnly = false }) => {
    const [loading, setLoading] = useState(false);
    const [originalValues, setOriginalValues] = useState(null);

    const safeData = data || {};

    useEffect(() => {
        if (safeData && !originalValues) {
            setOriginalValues({
                ...safeData,
                // Handle pre-mapped database names
                Address: safeData.Address || safeData.currentAddressLine1 || '',
                City: safeData.City || safeData.currentCity || '',
                Pincode: safeData.Pincode || safeData.currentPincode || '',
                permanentAddress: safeData.permanentAddress || safeData.permanentAddressLine1 || ''
            });
        }
    }, [safeData, originalValues]);

    const isFieldFlagged = (fieldName) => {
        if (applicationStatus !== 'CORRECTION_REQUIRED' && applicationStatus !== 'REJECTED') return false;
        if (!adminRemarks) return false;
        const remarksLower = adminRemarks.toLowerCase();
        const matches = {
            Address: ['current address', 'address'],
            City: ['current city', 'city'],
            Taluk: ['current taluk', 'taluk'],
            DistrictId: ['current district', 'district'],
            Pincode: ['current pincode', 'pincode'],
            permanentAddress: ['permanent address'],
            permanentCity: ['permanent city'],
            permanentTaluk: ['permanent taluk'],
            permanentDistrictId: ['permanent district'],
            permanentPincode: ['permanent pincode']
        };
        const keywords = matches[fieldName] || [];
        return keywords.some(kw => remarksLower.includes(kw));
    };

    const ALL_STEP4_FIELDS = ['Address', 'City', 'Taluk', 'DistrictId', 'Pincode', 'permanentAddress', 'permanentCity', 'permanentTaluk', 'permanentDistrictId', 'permanentPincode'];
    const hasFlaggedFieldsInStep4 = ALL_STEP4_FIELDS.some(f => isFieldFlagged(f));

    const isFieldDisabled = (fieldName) => {
        if (readOnly) return true;
        if (applicationStatus !== 'CORRECTION_REQUIRED') return false;
        if (hasFlaggedFieldsInStep4) {
            return !isFieldFlagged(fieldName);
        }
        return false;
    };

    const isFieldCorrected = (fieldName) => {
        if (!originalValues) return false;
        if (!isFieldFlagged(fieldName)) return false;
        
        let currentValue = safeData[fieldName] || '';
        let originalValue = originalValues[fieldName] || '';

        // Fallback checks for mapped values
        if (fieldName === 'Address' && !currentValue) currentValue = safeData.currentAddressLine1 || '';
        if (fieldName === 'City' && !currentValue) currentValue = safeData.currentCity || '';
        if (fieldName === 'Pincode' && !currentValue) currentValue = safeData.currentPincode || '';
        if (fieldName === 'permanentAddress' && !currentValue) currentValue = safeData.permanentAddressLine1 || '';
        
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

    const [sameAsCurrent, setSameAsCurrent] = useState(() => {
        if (!safeData) return false;
        if (safeData.sameAsCurrent !== undefined) {
            return safeData.sameAsCurrent === true || safeData.sameAsCurrent === 'true';
        }
        const hasCurrent = safeData.Address || safeData.currentAddressLine1;
        const hasPermanent = safeData.permanentAddress || safeData.permanentAddressLine1;
        if (hasCurrent && hasCurrent === hasPermanent) {
            const hasCurrentCity = safeData.City || safeData.currentCity;
            const hasPermanentCity = safeData.permanentCity;
            const hasCurrentPincode = safeData.Pincode || safeData.currentPincode;
            const hasPermanentPincode = safeData.permanentPincode;
            if (hasCurrentCity && hasCurrentCity === hasPermanentCity && hasCurrentPincode && hasCurrentPincode === hasPermanentPincode) {
                return true;
            }
        }
        return false;
    });
    const [pincodeError, setPincodeError] = useState('');
    const [permanentPincodeError, setPermanentPincodeError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (readOnly) {
            onNext();
            return;
        }

        if (pincodeError || permanentPincodeError) {
            toast.error('Please resolve validation errors first.');
            return;
        }

        const currAddress = data.Address || data.currentAddressLine1;
        const currCity = data.City || data.currentCity;
        const currDistrict = data.DistrictId || data.currentDistrictId;
        const currPincode = data.Pincode || data.currentPincode;
        const currState = data.currentState;

        if (!currAddress?.trim()) {
            toast.error("Please enter Current Address Line 1.");
            return;
        }
        if (!currCity?.trim()) {
            toast.error("Please enter Current City / Town / Village.");
            return;
        }
        if (!currDistrict) {
            toast.error("Please select Current District.");
            return;
        }
        if (!currPincode || String(currPincode).length !== 6) {
            toast.error("Please enter a valid 6-digit Current Pincode.");
            return;
        }
        if (!currState?.trim()) {
            toast.error("Please select Current State.");
            return;
        }

        if (!sameAsCurrent) {
            const permAddress = data.permanentAddress || data.permanentAddressLine1;
            const permCity = data.permanentCity;
            const permDistrict = data.permanentDistrictId;
            const permPincode = data.permanentPincode;
            const permState = data.permanentState;

            if (!permAddress?.trim()) {
                toast.error("Please enter Permanent Address Line 1.");
                return;
            }
            if (!permCity?.trim()) {
                toast.error("Please enter Permanent City / Town / Village.");
                return;
            }
            if (!permDistrict) {
                toast.error("Please select Permanent District.");
                return;
            }
            if (!permPincode || String(permPincode).length !== 6) {
                toast.error("Please enter a valid 6-digit Permanent Pincode.");
                return;
            }
            if (!permState?.trim()) {
                toast.error("Please select Permanent State.");
                return;
            }
        }

        setLoading(true);

        try {
            const payload = {
                currentAddressLine1: data.Address || data.currentAddressLine1 || '',
                currentCity: data.City || data.currentCity || '',
                currentTaluk: data.Taluk || '',
                currentDistrictId: data.DistrictId || null,
                currentPincode: data.Pincode || data.currentPincode || '',
                currentState: data.currentState || '',
                sameAsCurrent: sameAsCurrent,
                permanentAddressLine1: sameAsCurrent ? (data.Address || data.currentAddressLine1 || '') : (data.permanentAddress || data.permanentAddressLine1 || ''),
                permanentCity: sameAsCurrent ? (data.City || data.currentCity || '') : (data.permanentCity || ''),
                permanentTaluk: sameAsCurrent ? (data.Taluk || '') : (data.permanentTaluk || ''),
                permanentDistrictId: sameAsCurrent ? (data.DistrictId || null) : (data.permanentDistrictId || null),
                permanentPincode: sameAsCurrent ? (data.Pincode || data.currentPincode || '') : (data.permanentPincode || ''),
                permanentState: sameAsCurrent ? (data.currentState || '') : (data.permanentState || '')
            };

            const res = await api.put('/student/address', payload);
            if (res.data.success) {
                toast.success('Address saved!');
                onNext();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save address details');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (e) => {
        const checked = e.target.checked;
        setSameAsCurrent(checked);
        
        const updates = { sameAsCurrent: checked };
        if (checked) {
            updates.permanentAddress = data.Address || data.currentAddressLine1 || '';
            updates.permanentCity = data.City || data.currentCity || '';
            updates.permanentTaluk = data.Taluk || '';
            updates.permanentDistrictId = data.DistrictId || '';
            updates.permanentPincode = data.Pincode || data.currentPincode || '';
        }
        updateData(updates);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateData({ [name]: value });
    };

    const handlePincodeChange = (e) => {
        const { name } = e.target;
        const raw = e.target.value.replace(/\D/g, '');
        if (raw.length > 6) {
            const msg = 'Pincode must be exactly 6 digits';
            if (name === 'permanentPincode') setPermanentPincodeError(msg);
            else setPincodeError(msg);
            updateData({ [name]: raw.slice(0, 6) });
        } else {
            if (name === 'permanentPincode') setPermanentPincodeError('');
            else setPincodeError('');
            updateData({ [name]: raw });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in flex flex-col">
            <div className="space-y-8 flex flex-col p-0 m-0 border-0 w-full">
            {/* Current Address */}
            <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                        <MapPin size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Current Address</h2>
                        <p className="text-xs text-slate-500">Present residential details</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Street Address */}
                    <div className={getFieldContainerClass('Address', 'md:col-span-2 lg:col-span-3')}>
                        <label className="text-sm font-medium text-slate-700">Street Address <span className="text-red-500">*</span></label>
                        <textarea required disabled={isFieldDisabled('Address')} name="Address" rows="3" className={getFieldInputClass('Address', 'py-3 h-auto min-h-[80px]')} value={data.Address || data.currentAddressLine1 || ''} onChange={handleChange} placeholder="Enter street address" />
                        {renderFeedback('Address')}
                        {!(data.Address || data.currentAddressLine1) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* City */}
                    <div className={getFieldContainerClass('City')}>
                        <label className="text-sm font-medium text-slate-700">City / Village <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('City')} type="text" name="City" className={getFieldInputClass('City')} value={data.City || data.currentCity || ''} onChange={handleChange} placeholder="Enter city or village" />
                        {renderFeedback('City')}
                        {!(data.City || data.currentCity) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* Taluk */}
                    <div className={getFieldContainerClass('Taluk')}>
                        <label className="text-sm font-medium text-slate-700">Taluk <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('Taluk')} type="text" name="Taluk" className={getFieldInputClass('Taluk')} value={data.Taluk || ''} onChange={handleChange} placeholder="Enter taluk" />
                        {renderFeedback('Taluk')}
                        {!data.Taluk && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* District */}
                    <div className={getFieldContainerClass('DistrictId')}>
                        <label className="text-sm font-medium text-slate-700">District <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('DistrictId')} type="text" name="DistrictId" className={getFieldInputClass('DistrictId')} value={data.DistrictId || ''} onChange={handleChange} placeholder="Enter district" />
                        {renderFeedback('DistrictId')}
                        {!data.DistrictId && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>

                    {/* Pincode */}
                    <div className={getFieldContainerClass('Pincode')}>
                        <label className="text-sm font-medium text-slate-700">Pincode <span className="text-red-500">*</span></label>
                        <input required disabled={isFieldDisabled('Pincode')} type="text" name="Pincode" className={getFieldInputClass('Pincode')} value={data.Pincode || data.currentPincode || ''} onChange={handlePincodeChange} placeholder="Enter pincode" />
                        {renderFeedback('Pincode')}
                        {!(data.Pincode || data.currentPincode) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-550 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                        {pincodeError && <p className="text-red-500 text-[11px] font-semibold mt-1">⚠ {pincodeError}</p>}
                    </div>

                    <div className="space-y-1.5 p-3 rounded-xl">
                        <label className="text-sm font-medium text-slate-700">State <span className="text-red-500">*</span></label>
                        <input required disabled={readOnly} type="text" name="currentState" className="input-premium h-11 uppercase" value={data.currentState || ''} onChange={handleChange} placeholder="Enter state" />
                    </div>
                </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Home size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Permanent Address</h2>
                            <p className="text-xs text-slate-500">Legal domicile address details</p>
                        </div>
                    </div>
                    
                    {!readOnly && (
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 select-none transition-colors">
                            <input type="checkbox" checked={sameAsCurrent} onChange={handleCheckboxChange} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span className="text-xs font-semibold text-slate-700">Same as current address</span>
                        </label>
                    )}
                </div>

                {!sameAsCurrent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* Permanent Address Street */}
                        <div className={getFieldContainerClass('permanentAddress', 'md:col-span-2 lg:col-span-3')}>
                            <label className="text-sm font-medium text-slate-700">Street Address <span className="text-red-500">*</span></label>
                            <textarea required disabled={isFieldDisabled('permanentAddress')} name="permanentAddress" rows="3" className={getFieldInputClass('permanentAddress', 'py-3 h-auto min-h-[80px]')} value={data.permanentAddress || data.permanentAddressLine1 || ''} onChange={handleChange} placeholder="Enter permanent street address" />
                            {renderFeedback('permanentAddress')}
                            {!(data.permanentAddress || data.permanentAddressLine1) && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>

                        {/* Permanent City */}
                        <div className={getFieldContainerClass('permanentCity')}>
                            <label className="text-sm font-medium text-slate-700">City / Village <span className="text-red-500">*</span></label>
                            <input required disabled={isFieldDisabled('permanentCity')} type="text" name="permanentCity" className={getFieldInputClass('permanentCity')} value={data.permanentCity || ''} onChange={handleChange} placeholder="Enter city or village" />
                            {renderFeedback('permanentCity')}
                            {!data.permanentCity && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>

                        {/* Permanent Taluk */}
                        <div className={getFieldContainerClass('permanentTaluk')}>
                            <label className="text-sm font-medium text-slate-700">Taluk <span className="text-red-500">*</span></label>
                            <input required disabled={isFieldDisabled('permanentTaluk')} type="text" name="permanentTaluk" className={getFieldInputClass('permanentTaluk')} value={data.permanentTaluk || ''} onChange={handleChange} placeholder="Enter permanent taluk" />
                            {renderFeedback('permanentTaluk')}
                            {!data.permanentTaluk && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>

                        {/* Permanent District */}
                        <div className={getFieldContainerClass('permanentDistrictId')}>
                            <label className="text-sm font-medium text-slate-700">District <span className="text-red-500">*</span></label>
                            <input required disabled={isFieldDisabled('permanentDistrictId')} type="text" name="permanentDistrictId" className={getFieldInputClass('permanentDistrictId')} value={data.permanentDistrictId || ''} onChange={handleChange} placeholder="Enter permanent district" />
                            {renderFeedback('permanentDistrictId')}
                            {!data.permanentDistrictId && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>

                        {/* Permanent Pincode */}
                        <div className={getFieldContainerClass('permanentPincode')}>
                            <label className="text-sm font-medium text-slate-700">Pincode <span className="text-red-500">*</span></label>
                            <input required disabled={isFieldDisabled('permanentPincode')} type="text" name="permanentPincode" className={getFieldInputClass('permanentPincode')} value={data.permanentPincode || ''} onChange={handlePincodeChange} placeholder="Enter permanent pincode" />
                            {renderFeedback('permanentPincode')}
                            {!data.permanentPincode && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                            {permanentPincodeError && (
                                <p className="text-red-550 text-[11px] font-semibold mt-1">⚠ {permanentPincodeError}</p>
                            )}
                        </div>

                        <div className="space-y-1.5 p-3 rounded-xl">
                            <label className="text-sm font-medium text-slate-700">State <span className="text-red-500">*</span></label>
                            <input required disabled={readOnly} type="text" name="permanentState" className="input-premium h-11 uppercase" value={data.permanentState || ''} onChange={handleChange} placeholder="Enter state" />
                        </div>
                    </div>
                )}

                {sameAsCurrent && (
                    <div className="bg-primary-50 rounded-lg p-6 text-center border border-primary-100 flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white text-primary-600 flex items-center justify-center border border-primary-100">
                            <Home size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Same as Current Address</p>
                            <p className="text-xs text-slate-500">Permanent address will be automatically synced.</p>
                        </div>
                    </div>
                )}
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

export default Step4Address;
