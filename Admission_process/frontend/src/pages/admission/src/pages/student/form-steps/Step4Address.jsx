import React, { useState, useEffect } from 'react';
import api from '../../../../../../services/api';
import { Loader2, ChevronLeft, ChevronRight, Home, MapPin } from 'lucide-react';
import SelectDropdown from '../../../components/SelectDropdown';
import toast from 'react-hot-toast';

const Step4Address = ({ onNext, onPrev, data, updateData, applicationStatus, adminRemarks, readOnly = false }) => {
    const [loading, setLoading] = useState(false);

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
    const [sameAsCurrent, setSameAsCurrent] = useState(() => {
        if (data.sameAsCurrent !== undefined) {
            return data.sameAsCurrent === true || data.sameAsCurrent === 'true';
        }
        const hasCurrent = data.Address || data.currentAddressLine1;
        const hasPermanent = data.permanentAddress || data.permanentAddressLine1;
        if (hasCurrent && hasCurrent === hasPermanent) {
            const hasCurrentCity = data.City || data.currentCity;
            const hasPermanentCity = data.permanentCity;
            const hasCurrentPincode = data.Pincode || data.currentPincode;
            const hasPermanentPincode = data.permanentPincode;
            if (hasCurrentCity && hasCurrentCity === hasPermanentCity && hasCurrentPincode && hasCurrentPincode === hasPermanentPincode) {
                return true;
            }
        }
        return false;
    });
    const [districts, setDistricts] = useState([]);
    const [pincodeError, setPincodeError] = useState('');
    const [permanentPincodeError, setPermanentPincodeError] = useState('');

    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                const res = await api.get('/address/districts');
                if (res.data.success) {
                    setDistricts(res.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch districts:", error);
                toast.error("Could not load districts list", { id: 'fetch-districts-error' });
            }
        };
        fetchDistricts();
    }, []);

    useEffect(() => {
        if (data.sameAsCurrent !== undefined) {
            setSameAsCurrent(data.sameAsCurrent === true || data.sameAsCurrent === 'true');
        }
    }, [data.sameAsCurrent]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (readOnly) {
            onNext();
            return;
        }

        setLoading(true);
        try {
            const payload = {
                currentAddressLine1: data.Address || data.currentAddressLine1,
                currentCity: data.City || data.currentCity,
                currentState: 'Karnataka',
                currentPincode: data.Pincode || data.currentPincode,
                currentCountry: 'India',
                sameAsCurrent,
                permanentAddressLine1: sameAsCurrent ? (data.Address || data.currentAddressLine1) : (data.permanentAddress || data.permanentAddressLine1),
                permanentCity: sameAsCurrent ? (data.City || data.currentCity) : (data.permanentCity || data.permanentCity),
                permanentState: 'Karnataka',
                permanentPincode: sameAsCurrent ? (data.Pincode || data.currentPincode) : (data.permanentPincode || data.permanentPincode),
                permanentCountry: 'India',
            };

            const res = await api.put('/student/address', payload);
            if (res.data.success) {
                toast.success('Address details saved!');
                updateData({ sameAsCurrent });
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
            <fieldset disabled={readOnly} className="space-y-8 flex flex-col p-0 m-0 border-0 w-full">
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
                    <div className={`md:col-span-2 lg:col-span-3 space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('Address') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                        <label className="text-sm font-medium text-slate-700">Street Address <span className="text-red-500">*</span></label>
                        <textarea required name="Address" rows="3" className={`input-premium py-3 h-auto min-h-[80px] uppercase ${isFieldFlagged('Address') ? 'border-red-500 focus:border-red-500' : ''}`} value={data.Address || data.currentAddressLine1 || ''} onChange={handleChange} placeholder="Enter street address" />
                        {isFieldFlagged('Address') && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                        )}
                        {!(data.Address || data.currentAddressLine1) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                    <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('City') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                        <label className="text-sm font-medium text-slate-700">City / Village <span className="text-red-500">*</span></label>
                        <input required type="text" name="City" className={`input-premium h-11 uppercase ${isFieldFlagged('City') ? 'border-red-500 focus:border-red-500' : ''}`} value={data.City || data.currentCity || ''} onChange={handleChange} placeholder="Enter city or village" />
                        {isFieldFlagged('City') && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                        )}
                        {!(data.City || data.currentCity) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                    <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('Taluk') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                        <label className="text-sm font-medium text-slate-700">Taluk <span className="text-red-500">*</span></label>
                        <input required type="text" name="Taluk" className={`input-premium h-11 uppercase ${isFieldFlagged('Taluk') ? 'border-red-500 focus:border-red-500' : ''}`} value={data.Taluk || ''} onChange={handleChange} placeholder="Enter taluk" />
                        {isFieldFlagged('Taluk') && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                        )}
                        {!data.Taluk && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                    <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('DistrictId') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                        <label className="text-sm font-medium text-slate-700">District <span className="text-red-500">*</span></label>
                        <SelectDropdown
                            id="DistrictId" name="DistrictId" required
                            value={data.DistrictId || ''}
                            onChange={(val) => handleChange({ target: { name: 'DistrictId', value: val } })}
                            placeholder="Select district..."
                            options={districts.map(d => ({ value: d.id, label: d.name }))}
                        />
                        {isFieldFlagged('DistrictId') && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                        )}
                        {!data.DistrictId && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                    </div>
                    <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('Pincode') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                        <label className="text-sm font-medium text-slate-700">Pincode <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            pattern="[0-9]{6}"
                            name="Pincode"
                            className={`input-premium h-11 ${isFieldFlagged('Pincode') ? 'border-red-500 focus:border-red-500' : ''}`}
                            value={data.Pincode || data.currentPincode || ''}
                            onChange={handlePincodeChange}
                            onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                            placeholder="Enter 6-digit pincode"
                        />
                        {isFieldFlagged('Pincode') && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                        )}
                        {!(data.Pincode || data.currentPincode) && applicationStatus === 'REJECTED' && (
                            <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                        )}
                        {pincodeError && (
                            <p className="text-red-500 text-[11px] font-semibold mt-1">⚠ {pincodeError}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-5 pt-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                            <Home size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Permanent Address</h2>
                            <p className="text-xs text-slate-500">Permanent home address</p>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={sameAsCurrent}
                            onChange={handleCheckboxChange}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Same as Current Address</span>
                    </label>
                </div>

                {!sameAsCurrent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                        <div className={`md:col-span-2 lg:col-span-3 space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('permanentAddress') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                            <label className="text-sm font-medium text-slate-700">Street Address <span className="text-red-500">*</span></label>
                            <textarea required name="permanentAddress" rows="3" className={`input-premium py-3 h-auto min-h-[80px] uppercase ${isFieldFlagged('permanentAddress') ? 'border-red-500 focus:border-red-500' : ''}`} value={data.permanentAddress || data.permanentAddressLine1 || ''} onChange={handleChange} placeholder="Enter street address" />
                            {isFieldFlagged('permanentAddress') && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                            )}
                            {!(data.permanentAddress || data.permanentAddressLine1) && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>
                        <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('permanentCity') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                            <label className="text-sm font-medium text-slate-700">City / Village <span className="text-red-500">*</span></label>
                            <input required type="text" name="permanentCity" className={`input-premium h-11 uppercase ${isFieldFlagged('permanentCity') ? 'border-red-500 focus:border-red-500' : ''}`} value={data.permanentCity || ''} onChange={handleChange} placeholder="Enter city or village" />
                            {isFieldFlagged('permanentCity') && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                            )}
                            {!(data.permanentCity) && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>
                        <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('permanentTaluk') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                            <label className="text-sm font-medium text-slate-700">Taluk <span className="text-red-500">*</span></label>
                            <input required type="text" name="permanentTaluk" className={`input-premium h-11 uppercase ${isFieldFlagged('permanentTaluk') ? 'border-red-500 focus:border-red-500' : ''}`} value={data.permanentTaluk || ''} onChange={handleChange} placeholder="Enter taluk" />
                            {isFieldFlagged('permanentTaluk') && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                            )}
                            {!data.permanentTaluk && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>
                         <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('permanentDistrictId') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                            <label className="text-sm font-medium text-slate-700">District <span className="text-red-500">*</span></label>
                            <SelectDropdown
                                id="permanentDistrictId" name="permanentDistrictId" required
                                value={data.permanentDistrictId || ''}
                                onChange={(val) => handleChange({ target: { name: 'permanentDistrictId', value: val } })}
                                placeholder="Select district..."
                                options={districts.map(d => ({ value: d.id, label: d.name }))}
                            />
                            {isFieldFlagged('permanentDistrictId') && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                            )}
                            {!data.permanentDistrictId && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                        </div>
                        <div className={`space-y-1.5 p-3 rounded-xl transition-all ${isFieldFlagged('permanentPincode') ? 'border-2 border-red-500 bg-red-50/10' : ''}`}>
                            <label className="text-sm font-medium text-slate-700">Pincode <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                pattern="[0-9]{6}"
                                name="permanentPincode"
                                className={`input-premium h-11 ${isFieldFlagged('permanentPincode') ? 'border-red-500 focus:border-red-500' : ''}`}
                                value={data.permanentPincode || ''}
                                onChange={handlePincodeChange}
                                onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }}
                                placeholder="Enter 6-digit pincode"
                            />
                            {isFieldFlagged('permanentPincode') && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">🔴 Requires correction / verification</p>
                            )}
                            {!(data.permanentPincode) && applicationStatus === 'REJECTED' && (
                                <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                            )}
                            {permanentPincodeError && (
                                <p className="text-red-500 text-[11px] font-semibold mt-1">⚠ {permanentPincodeError}</p>
                            )}
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
            </fieldset>

            <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-0 -mx-4 -mb-4 sm:mx-0 sm:mb-0 sm:static sm:bg-transparent z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:shadow-none">
                <button type="button" onClick={onPrev} className="btn-secondary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
                    <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" id="bottom-submit-btn" disabled={loading} className="btn-primary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-6 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                        <>Save & Continue <ChevronRight size={16} /></>
                    )}
                </button>
            </div>
        </form>
    );
};

export default Step4Address;
