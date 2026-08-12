import React, { useState, useEffect } from 'react';
import api from '../../../../../../services/api';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SelectDropdown from '../../../components/SelectDropdown';

const Step2Personal = ({ onNext, onPrev, data, updateData, applicationStatus, adminRemarks, readOnly = false }) => {
    const [loading, setLoading] = useState(false);
    const [originalValues, setOriginalValues] = useState(null);

    useEffect(() => {
        if (data && !originalValues) {
            setOriginalValues({ ...data });
        }
    }, [data, originalValues]);

    const isFieldFlagged = (fieldName) => {
        if (applicationStatus !== 'CORRECTION_REQUIRED' && applicationStatus !== 'REJECTED') return false;
        if (!adminRemarks) return false;
        const remarksLower = adminRemarks.toLowerCase();
        const matches = {
            firstName: ['first name'],
            middleName: ['middle name'],
            lastName: ['last name'],
            gender: ['gender'],
            dateOfBirth: ['date of birth', 'dob'],
            caste: ['caste'],
            category: ['category'],
            religion: ['religion'],
            nationality: ['nationality'],
            areaType: ['area type'],
            studiedInKarnataka: ['studied in karnataka', 'karnataka resident']
        };
        const keywords = matches[fieldName] || [];
        return keywords.some(kw => remarksLower.includes(kw));
    };

    const isFieldCorrected = (fieldName) => {
        if (!originalValues) return false;
        if (!isFieldFlagged(fieldName)) return false;
        
        const currentValue = data[fieldName] || '';
        const originalValue = originalValues[fieldName] || '';
        
        return currentValue !== originalValue;
    };

    const getFieldContainerClass = (fieldName) => {
        const base = "space-y-1.5 p-3.5 rounded-xl transition-all duration-300";
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
                ...data,
                firstName: data.firstName || '',
                middleName: data.middleName || null,
                lastName: data.lastName || '',
                caste: data.caste || '',
                category: data.category ? String(data.category).toUpperCase() : '',
                studiedInKarnataka: data.studiedInKarnataka === 'true' || data.studiedInKarnataka === true
            };

            if (payload.dateOfBirth && payload.dateOfBirth.includes('/')) {
                const parts = payload.dateOfBirth.split('/');
                if (parts.length === 3) {
                    const [d, m, y] = parts;
                    const fullYear = y.length === 2 ? `20${y}` : y;
                    payload.dateOfBirth = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }
            }

            const parsedDate = new Date(payload.dateOfBirth);
            if (isNaN(parsedDate.getTime())) {
                setLoading(false);
                return toast.error("Invalid Date of Birth. Please check the format (DD/MM/YYYY).");
            }

            const res = await api.put('/student/personal', payload);
            if (res.data.success) {
                toast.success('Personal details saved!');
                onNext();
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save personal details');
        } finally {
            setLoading(false);
        }
    };

    const formatDOB = (value) => {
        const d = value.replace(/\D/g, '').slice(0, 8);
        if (d.length <= 2) return d;
        if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
        return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    };

    const handleChange = (e) => {
        let value = e.target.value;
        if (e.target.name === 'dateOfBirth') {
            value = formatDOB(value);
        }
        updateData({ [e.target.name]: value });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-slate-900">Step 2: Personal Details</h2>
                </div>
                <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded text-xs font-semibold">
                    Basic Information
                </span>
            </div>

            <fieldset disabled={readOnly} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-0 m-0 border-0 w-full">
                {/* First Name */}
                <div className={getFieldContainerClass('firstName')}>
                    <label className="text-sm font-medium text-slate-700">First Name (As per SSLC) <span className="text-red-500">*</span></label>
                    <input required type="text" name="firstName" className={getFieldInputClass('firstName')} value={data.firstName || ''} onChange={handleChange} placeholder="Enter first name" />
                    {renderFeedback('firstName')}
                    {!data.firstName && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Middle Name */}
                <div className={getFieldContainerClass('middleName')}>
                    <label className="text-sm font-medium text-slate-700">Middle Name</label>
                    <input type="text" name="middleName" className={getFieldInputClass('middleName')} value={data.middleName || ''} onChange={handleChange} placeholder="Enter middle name" />
                    {renderFeedback('middleName')}
                </div>

                {/* Last Name */}
                <div className={getFieldContainerClass('lastName')}>
                    <label className="text-sm font-medium text-slate-700">Last Name (As per SSLC) <span className="text-red-500">*</span></label>
                    <input required type="text" name="lastName" className={getFieldInputClass('lastName')} value={data.lastName || ''} onChange={handleChange} placeholder="Enter last name" />
                    {renderFeedback('lastName')}
                    {!data.lastName && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Caste */}
                <div className={getFieldContainerClass('caste')}>
                    <label className="text-sm font-medium text-slate-700">Caste <span className="text-red-500">*</span></label>
                    <input required type="text" name="caste" className={getFieldInputClass('caste')} value={data.caste || ''} onChange={handleChange} placeholder="Enter caste" />
                    {renderFeedback('caste')}
                    {!data.caste && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Gender */}
                <div className={getFieldContainerClass('gender')}>
                    <label className="text-sm font-medium text-slate-700">Gender <span className="text-red-500">*</span></label>
                    <SelectDropdown
                        id="gender" name="gender" required
                        value={data.gender || ''}
                        onChange={(val) => handleChange({ target: { name: 'gender', value: val } })}
                        placeholder="Select gender..."
                        options={[
                            { value: 'MALE', label: 'Male' },
                            { value: 'FEMALE', label: 'Female' },
                            { value: 'OTHER', label: 'Other' },
                        ]}
                    />
                    {renderFeedback('gender')}
                    {!data.gender && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Date of Birth */}
                <div className={getFieldContainerClass('dateOfBirth')}>
                    <label className="text-sm font-medium text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
                    <input
                        required
                        type="text"
                        name="dateOfBirth"
                        className={getFieldInputClass('dateOfBirth')}
                        value={data.dateOfBirth || ''}
                        onChange={handleChange}
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                    />
                    {renderFeedback('dateOfBirth')}
                    {!data.dateOfBirth && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Category */}
                <div className={getFieldContainerClass('category')}>
                    <label className="text-sm font-medium text-slate-700">Category <span className="text-red-500">*</span></label>
                    <SelectDropdown
                        id="category" name="category" required
                        value={data.category || ''}
                        onChange={(val) => handleChange({ target: { name: 'category', value: val } })}
                        placeholder="Select category..."
                        options={[
                            { value: 'GEN', label: 'GEN (General Merit)' },
                            { value: 'OBC', label: 'OBC (Other Backward Classes)' },
                            { value: 'C1', label: 'Category 1' },
                            { value: '2A', label: 'Category 2A' },
                            { value: '2B', label: 'Category 2B' },
                            { value: '3A', label: 'Category 3A' },
                            { value: '3B', label: 'Category 3B' },
                            { value: 'SC', label: 'SC (Scheduled Castes)' },
                            { value: 'ST', label: 'ST (Scheduled Tribes)' },
                            { value: 'EWS', label: 'EWS (Economically Weaker Sections)' },
                            { value: 'SEBC', label: 'SEBC (Socially and Educationally Backward Classes)' },
                        ]}
                    />
                    {renderFeedback('category')}
                    {!data.category && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Religion */}
                <div className={getFieldContainerClass('religion')}>
                    <label className="text-sm font-medium text-slate-700">Religion <span className="text-red-500">*</span></label>
                    <SelectDropdown
                        id="religion" name="religion" required
                        value={data.religion || ''}
                        onChange={(val) => handleChange({ target: { name: 'religion', value: val } })}
                        placeholder="Select religion..."
                        options={['HINDU', 'MUSLIM', 'CHRISTIAN', 'JAIN', 'SIKH', 'BUDDHIST', 'OTHER'].map(r => ({ value: r, label: r }))}
                    />
                    {renderFeedback('religion')}
                    {!data.religion && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Nationality */}
                <div className={getFieldContainerClass('nationality')}>
                    <label className="text-sm font-medium text-slate-700">Nationality <span className="text-red-500">*</span></label>
                    <SelectDropdown
                        id="nationality" name="nationality" required
                        value={data.nationality || ''}
                        onChange={(val) => handleChange({ target: { name: 'nationality', value: val } })}
                        placeholder="Select nationality..."
                        options={[
                            { value: 'INDIAN', label: 'Indian' },
                            { value: 'NRI', label: 'NRI' },
                            { value: 'FOREIGN', label: 'Foreign' },
                        ]}
                    />
                    {renderFeedback('nationality')}
                    {!data.nationality && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* Area Type */}
                <div className={getFieldContainerClass('areaType')}>
                    <label className="text-sm font-medium text-slate-700">Area Type <span className="text-red-500">*</span></label>
                    <SelectDropdown
                        id="areaType" name="areaType" required
                        value={data.areaType || ''}
                        onChange={(val) => handleChange({ target: { name: 'areaType', value: val } })}
                        placeholder="Select area type..."
                        options={[
                            { value: 'URBAN', label: 'Urban' },
                            { value: 'RURAL', label: 'Rural' },
                        ]}
                    />
                    {renderFeedback('areaType')}
                    {!data.areaType && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>

                {/* studiedInKarnataka */}
                <div className={getFieldContainerClass('studiedInKarnataka')}>
                    <label className="text-sm font-medium text-slate-700">Karnataka Resident (7yrs) <span className="text-red-500">*</span></label>
                    <SelectDropdown
                        id="studiedInKarnataka" name="studiedInKarnataka" required
                        value={data.studiedInKarnataka !== undefined ? String(data.studiedInKarnataka) : ''}
                        onChange={(val) => handleChange({ target: { name: 'studiedInKarnataka', value: val } })}
                        placeholder="Select..."
                        options={[
                            { value: 'true', label: 'Yes' },
                            { value: 'false', label: 'No' },
                        ]}
                    />
                    {renderFeedback('studiedInKarnataka')}
                    {!data.studiedInKarnataka && applicationStatus === 'REJECTED' && (
                        <p className="text-red-500 text-[11px] font-bold mt-1">Please fill this field mandatorily</p>
                    )}
                </div>
            </fieldset>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-4">
                <p className="text-sm text-red-800 font-medium">
                    <strong>Note:</strong> Your application will be rejected if you submit incorrect personal details. Please double-check your name and DOB as per SSLC records.
                </p>
            </div>

            <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md p-3 sm:p-0 -mx-4 -mb-4 sm:mx-0 sm:mb-0 sm:static sm:bg-transparent z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] sm:shadow-none">
                <button
                    type="button"
                    onClick={onPrev}
                    className="btn-secondary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold"
                >
                    <ChevronLeft size={16} />
                    Back
                </button>

                <button
                    type="submit"
                    id="bottom-submit-btn"
                    disabled={loading}
                    className="btn-primary w-full sm:w-auto min-h-[48px] sm:min-h-[44px] h-11 px-6 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                        <>{readOnly ? 'Continue' : 'Save & Continue'} <ChevronRight size={16} /></>
                    )}
                </button>
            </div>
        </form>
    );
};

export default Step2Personal;
