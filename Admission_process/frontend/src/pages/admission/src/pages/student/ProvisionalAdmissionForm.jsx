import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Eye,
  Check,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import api from '../../../../../services/api';
import toast from 'react-hot-toast';
import { compressDocumentImage } from '../../utils/imageCompressor';
import { getSemesterRules, getRequiredAcademicSemesters } from '../../utils/semesterDocumentRules';

export const ProvisionalAdmissionForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [application, setApplication] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [originalPhoto, setOriginalPhoto] = useState(null);
  const [confirmCorrect, setConfirmCorrect] = useState(false);

  // Step 1 states
  const [selectedSemester, setSelectedSemester] = useState('');

  // Step 2 states - exam records
  const [examRecords, setExamRecords] = useState([]);

  // Step 3 states - file uploads progress & state
  const [uploads, setUploads] = useState({}); // map of docKey -> docRecord
  const [historicalDocs, setHistoricalDocs] = useState({}); // map of semNum -> doc (from prior applications)
  const [isLateral, setIsLateral] = useState(false);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-save step 2 inputs to localStorage to prevent data loss on refresh
  useEffect(() => {
    if (examRecords && examRecords.length > 0 && application?.id) {
      localStorage.setItem(`prov_exam_records_${application.id}`, JSON.stringify(examRecords));
    }
  }, [examRecords, application?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get config
      const configRes = await api.get('/provisional/config');
      if (configRes.data?.success) {
        setConfig(configRes.data.data);
      }

      // Get my application
      const appRes = await api.get('/provisional/my-admission');
      if (appRes.data?.success) {
        const { application: appData, studentName, usn, branchName, applicationNumber, originalPhotoUrl, semester: studentSem, isInitialLateralEntry, isLateral: latFlag, admissionType, initialSemester } = appRes.data.data;

        if (isInitialLateralEntry && !appData) {
          toast.error("Provisional Admission is not applicable for your initial 3rd Semester lateral entry.");
          navigate('/admission/dashboard');
          return;
        }

        const studentIsLateral = Boolean(latFlag || admissionType === 'LATERAL' || initialSemester === 3);
        setIsLateral(studentIsLateral);

        setStudentProfile({ name: studentName, usn, branchName, applicationNumber, semester: studentSem });
        setOriginalPhoto(originalPhotoUrl);

        if (appData) {
          setApplication(appData);
          setSelectedSemester(String(appData.semester));

          // Set exam records from cache if it exists, otherwise from database
          const cached = localStorage.getItem(`prov_exam_records_${appData.id}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              const expectedSems = getRequiredAcademicSemesters(studentIsLateral, appData.semester);
              const cachedSemNumbers = parsed.map((r) => r.semesterNumber);
              const matches = expectedSems.length === parsed.length && expectedSems.every(s => cachedSemNumbers.includes(s));
              if (matches) {
                setExamRecords(parsed);
              } else if (appData.semesterRecords && appData.semesterRecords.length > 0) {
                setExamRecords(appData.semesterRecords);
              } else {
                initializeExamRecords(appData.semester, studentIsLateral);
              }
            } catch (e) {
              if (appData.semesterRecords && appData.semesterRecords.length > 0) {
                setExamRecords(appData.semesterRecords);
              } else {
                initializeExamRecords(appData.semester, studentIsLateral);
              }
            }
          } else if (appData.semesterRecords && appData.semesterRecords.length > 0) {
            setExamRecords(appData.semesterRecords);
          } else {
            initializeExamRecords(appData.semester, studentIsLateral);
          }

          // Set uploads map
          if (appData.documents && appData.documents.length > 0) {
            const upMap = {};
            appData.documents.forEach(doc => {
              const key = doc.documentType === 'FEE_RECEIPT'
                ? 'FEE_RECEIPT'
                : `MARKS_CARD_${doc.semesterNumber}`;
              upMap[key] = doc;
            });
            setUploads(upMap);
          }

          // Route/step resolution based on status
          if (appData.status === 'DRAFT') {
            if (appData.semesterRecords && appData.semesterRecords.length > 0) {
              setStep(3);
            } else if (appData.semester) {
              setStep(2);
            } else {
              setStep(1);
            }
          } else if (appData.status === 'CORRECTION_REQUIRED') {
            setStep(3);
          } else {
            // Read-only or acknowledgement view
            setStep(5);
          }
        } else {
          // No application yet
          setSelectedSemester('');
          setExamRecords([]);
        }
      }
    } catch (err) {
      console.error('Could not fetch provisional details', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Provisional Admission is only available for fully enrolled students.';
      toast.error(errMsg);
      navigate('/admission/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalDocs = async () => {
    try {
      setLoadingHistorical(true);
      const res = await api.get('/provisional/historical-docs');
      if (res.data?.success) {
        // Build a map: semesterNumber -> doc
        const histMap = {};
        (res.data.data || []).forEach(doc => {
          histMap[doc.semesterNumber] = doc;
        });
        setHistoricalDocs(histMap);
        if (res.data.isLateral !== undefined) {
          setIsLateral(Boolean(res.data.isLateral));
        }
      }
    } catch (err) {
      console.warn('Could not load historical semester docs:', err);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const initializeExamRecords = (targetSem, lateral = isLateral) => {
    const semInt = Number(targetSem);
    const expected = getRequiredAcademicSemesters(lateral, semInt);
    const initial = expected.map(s => ({
      semesterNumber: s,
      examMonth: 'January',
      examYear: new Date().getFullYear(),
      subjectsPassed: 0,
      subjectsFailed: 0,
      failedSubjectCodes: []
    }));
    setExamRecords(initial);
  };

  const handleSemesterChange = (e) => {
    const sem = e.target.value;
    setSelectedSemester(sem);
    if (sem) {
      initializeExamRecords(sem, isLateral);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!selectedSemester) {
      toast.error('Please select a target semester.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/provisional/step1', { semester: Number(selectedSemester) });
      if (res.data?.success) {
        setApplication(res.data.data);
        if (examRecords.length === 0) {
          initializeExamRecords(selectedSemester, isLateral);
        }
        setStep(2);
        toast.success('Basic details saved.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save basic details.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordFieldChange = (index, field, value) => {
    const updated = [...examRecords];
    updated[index][field] = value;

    if (field === 'subjectsFailed') {
      const failedCount = Math.max(0, parseInt(value) || 0);
      const codes = [...(updated[index].failedSubjectCodes || [])];
      if (codes.length < failedCount) {
        while (codes.length < failedCount) {
          codes.push('');
        }
      } else if (codes.length > failedCount) {
        codes.splice(failedCount);
      }
      updated[index].failedSubjectCodes = codes;
    }

    setExamRecords(updated);
  };

  const handleFailedSubjectCodeChange = (semIndex, codeIndex, val) => {
    const updated = [...examRecords];
    updated[semIndex].failedSubjectCodes[codeIndex] = val.toUpperCase();
    setExamRecords(updated);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    for (const rec of examRecords) {
      if (rec.subjectsPassed === '' || rec.subjectsFailed === '') {
        toast.error(`Please complete subjects passed and failed for Semester ${rec.semesterNumber}`);
        return;
      }
      const passed = Number(rec.subjectsPassed);
      const failed = Number(rec.subjectsFailed);
      if (passed < 0 || failed < 0) {
        toast.error('Passed and failed subject counts cannot be negative.');
        return;
      }
      if (failed > 0) {
        const codes = rec.failedSubjectCodes || [];
        if (codes.filter(c => c && c.trim()).length !== failed) {
          toast.error(`Please fill in all ${failed} failed subject codes for Semester ${rec.semesterNumber}`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const res = await api.put('/provisional/step2', {
        applicationId: application.id,
        records: examRecords
      });
      if (res.data?.success) {
        localStorage.removeItem(`prov_exam_records_${application.id}`);
        // Fetch historical docs when transitioning to Step 3
        await fetchHistoricalDocs();
        setStep(3);
        toast.success('Academic records saved.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save academic records.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, documentType, semesterNumber = null) => {
    let file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('PDF files are not allowed. Please upload JPG, JPEG, or PNG images only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB.');
      return;
    }

    const docKey = documentType === 'FEE_RECEIPT'
      ? 'FEE_RECEIPT'
      : `MARKS_CARD_${semesterNumber}`;

    const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);

    // Auto compression for images
    if (isImage) {
      try {
        const result = await compressDocumentImage(file, 'document');
        file = result.file;
      } catch (err) {
        // Fallback silently to original image if compression fails
      }
    }

    const formData = new FormData();
    formData.append('applicationId', application.id);
    formData.append('documentType', documentType);
    if (semesterNumber) {
      formData.append('semesterNumber', String(semesterNumber));
    }
    formData.append('file', file);

    const uploadToastId = toast.loading(`Uploading file...`);

    try {
      const res = await api.post('/provisional/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.success) {
        toast.success('Document uploaded successfully.', { id: uploadToastId });
        setUploads(prev => ({
          ...prev,
          [docKey]: {
            ...res.data.data.document,
            url: res.data.data.url
          }
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed.', { id: uploadToastId });
    }
  };

  const handleStep3Submit = () => {
    const { previousSemesters, requiredNow } = getSemesterRules(isLateral, Number(selectedSemester));

    if (!uploads['FEE_RECEIPT']) {
      toast.error('Please upload your College Fee Receipt.');
      return;
    }

    // Validate all requiredNow sems exist in current uploads
    for (const sem of requiredNow) {
      if (!uploads[`MARKS_CARD_${sem}`]) {
        toast.error(`Please upload Semester ${sem} Marks Card.`);
        return;
      }
    }

    // Validate all previousSemesters exist either as current uploads (re-upload) or historical docs
    for (const sem of previousSemesters) {
      const hasCurrentUpload = !!uploads[`MARKS_CARD_${sem}`];
      const histDoc = historicalDocs[sem];
      const histOk = histDoc && histDoc.verificationStatus !== 'REJECTED';
      if (!hasCurrentUpload && !histOk) {
        toast.error(
          histDoc && histDoc.verificationStatus === 'REJECTED'
            ? `Semester ${sem} Marks Card was rejected. Please re-upload it.`
            : `Semester ${sem} Marks Card history not found. Please upload it.`
        );
        return;
      }
    }

    setStep(4); // Advance to Review & Finalize
  };

  const handleFinalSubmit = async () => {
    if (!confirmCorrect) {
      toast.error('Please confirm that the information is correct.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/provisional/submit', { applicationId: application.id });
      if (res.data?.success) {
        localStorage.removeItem(`prov_exam_records_${application.id}`);
        toast.success('Provisional Admission application submitted successfully! 🚀');
        setStep(5);
        fetchData(); // Reload success details
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit application.');
    } finally {
      setSaving(false);
    }
  };

  const triggerPrint = () => {
    window.open(`/admission/acknowledgement/${application.id}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading Provisional Admission System...</p>
        </div>
      </div>
    );
  }

  const isCorrectionMode = application?.status === 'CORRECTION_REQUIRED';
  const hasAnyRejected = Object.values(uploads).some(doc => doc?.verificationStatus === 'REJECTED');

  // Compute cumulative semester rules
  const { previousSemesters, requiredNow } = getSemesterRules(isLateral, Number(selectedSemester));
  const isAnyHistoricalDocRejected = previousSemesters.some(sem => {
    const histDoc = historicalDocs[sem];
    return histDoc && histDoc.verificationStatus === 'REJECTED';
  });

  // expectedSems used for Step 2 academic records and review validation
  const expectedSems = getRequiredAcademicSemesters(isLateral, Number(selectedSemester));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 px-4 sm:px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-[#0F4C81]" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#0F4C81] dark:text-white uppercase leading-none">Provisional Admission</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Apply for admission to your next academic semester.</p>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <span className="text-xs font-bold text-slate-500">Academic Year: {config?.admissionCycle || '2026-2027'}</span>
            <button
              onClick={() => navigate('/admission/dashboard')}
              className="px-4 py-2 border border-slate-350 dark:border-slate-700 rounded-lg hover:bg-slate-100 text-xs font-bold transition-all"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* Student Details Card */}
        {studentProfile && (
          <div className="bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-[#0F4C81] dark:text-indigo-400 tracking-wider border-b pb-2">Student Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
              <div><span className="text-slate-400">Student Name:</span> <span className="text-slate-800 dark:text-slate-200 block mt-0.5">{studentProfile.name}</span></div>
              <div><span className="text-slate-400">USN:</span> <span className="text-slate-800 dark:text-slate-200 block font-mono mt-0.5">{studentProfile.usn}</span></div>
              <div><span className="text-slate-400">Application No:</span> <span className="text-slate-800 dark:text-slate-200 block font-mono mt-0.5">{studentProfile.applicationNumber}</span></div>
              <div><span className="text-slate-400">Branch:</span> <span className="text-slate-800 dark:text-slate-200 block mt-0.5">{studentProfile.branchName}</span></div>
              <div><span className="text-slate-400">Academic Year:</span> <span className="text-slate-800 dark:text-slate-200 block mt-0.5">{config?.admissionCycle || '2026-2027'}</span></div>
            </div>
          </div>
        )}

        {/* 3-Step Progress Indicator */}
        {step < 5 && (
          <div className="mb-2">
            <div className="flex items-center justify-between max-w-md mx-auto relative">
              {[1, 2, 3].map(num => (
                <div key={num} className="flex flex-col items-center z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold border transition-all ${step === num
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : step > num
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-350 dark:border-slate-700 text-slate-500'
                    }`}>
                    {step > num ? <Check className="w-4 h-4" /> : num}
                  </div>
                  <span className="text-[10px] font-bold mt-2 uppercase tracking-wide">
                    {num === 1 ? '1. Basic Details' : num === 2 ? '2. Academic Records' : '3. Documents'}
                  </span>
                </div>
              ))}
              <div className="absolute top-4.5 left-6 right-6 h-[2px] bg-slate-200 dark:bg-slate-800 z-0">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Render Form panels */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-880 rounded-2xl p-6 sm:p-8 shadow-sm flex-grow">

          {/* STEP 1: Basic details selection */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">STEP 1 — BASIC DETAILS</h2>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">SELECT PROVISIONAL ADMISSION SEMESTER</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[3, 5, 7].map(sem => {
                    const isOpen = sem === Number(studentProfile?.semester) ||
                      (sem === 3 && config?.provisionalAdmission3Open) ||
                      (sem === 5 && config?.provisionalAdmission5Open) ||
                      (sem === 7 && config?.provisionalAdmission7Open);
                    return (
                      <label
                        key={sem}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!isOpen ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200' :
                            selectedSemester === String(sem)
                              ? 'border-blue-650 bg-blue-50/30'
                              : 'border-slate-250 dark:border-slate-80 border-slate-200 hover:border-slate-350'
                          }`}
                      >
                        <input
                          type="radio"
                          name="targetSemester"
                          value={sem}
                          disabled={!isOpen}
                          checked={selectedSemester === String(sem)}
                          onChange={handleSemesterChange}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-extrabold">{sem}th Semester</span>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-bold">{isOpen ? 'AVAILABLE' : 'CLOSED'}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="submit"
                  disabled={saving || !selectedSemester}
                  className="px-6 py-2.5 bg-[#0F4C81] hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue →'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Lower Exam details */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">STEP 2 — LOWER EXAMINATION DETAILS</h2>
                <p className="text-xs text-slate-500 mt-1">Enter your semester-wise examination details exactly as shown on your marks cards.</p>
              </div>

              <div className="space-y-6">
                {examRecords.map((record, index) => (
                  <div key={record.semesterNumber} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                    <h3 className="text-xs font-black text-[#0F4C81] dark:text-indigo-400 uppercase tracking-wide">
                      {record.semesterNumber}th Semester
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Examination Month</label>
                        <select
                          value={record.examMonth}
                          onChange={(e) => handleRecordFieldChange(index, 'examMonth', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Examination Year</label>
                        <select
                          value={record.examYear}
                          onChange={(e) => handleRecordFieldChange(index, 'examYear', parseInt(e.target.value) || '')}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold"
                        >
                          {Array.from({ length: 6 }).map((_, i) => {
                            const y = new Date().getFullYear() + i;
                            return <option key={y} value={y}>{y}</option>;
                          })}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Subjects Passed</label>
                        <input
                          type="number"
                          value={record.subjectsPassed}
                          min="0"
                          max="20"
                          onChange={(e) => handleRecordFieldChange(index, 'subjectsPassed', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-bold text-emerald-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Subjects Failed</label>
                        <input
                          type="number"
                          value={record.subjectsFailed}
                          min="0"
                          max="20"
                          onChange={(e) => handleRecordFieldChange(index, 'subjectsFailed', e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-bold text-rose-600"
                        />
                      </div>
                    </div>

                    {Number(record.subjectsFailed) > 0 && (
                      <div className="mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <label className="text-[10px] font-extrabold text-rose-500 uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Failed Subject Codes
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Array.from({ length: Number(record.subjectsFailed) }).map((_, codeIdx) => (
                            <input
                              key={codeIdx}
                              type="text"
                              required
                              value={record.failedSubjectCodes?.[codeIdx] || ''}
                              onChange={(e) => handleFailedSubjectCodeChange(index, codeIdx, e.target.value)}
                              placeholder={`Subject Code ${codeIdx + 1}`}
                              className="px-3 py-2 bg-white dark:bg-slate-900 border border-rose-350 dark:border-rose-950 rounded-lg text-xs font-mono font-bold uppercase tracking-wider focus:ring-1 focus:ring-rose-500 outline-none"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#0F4C81] hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue →'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Document uploads */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">STEP 3 — REQUIRED DOCUMENTS</h2>
                <p className="text-xs text-slate-500 mt-1">Upload clear copies of the required marks cards and receipt.</p>
              </div>

              {application?.correctionReason && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/35 border border-amber-250 dark:border-amber-900 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-400 space-y-1">
                  <div className="flex items-center gap-1 font-bold uppercase"><AlertTriangle className="w-4 h-4" /> Correction Remarks:</div>
                  <p>{application.correctionReason}</p>
                </div>
              )}

              {loadingHistorical && (
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading document history...
                </div>
              )}

              <div className="space-y-6">
                {/* ── Section 1: College Fee Receipt (always in current application) ── */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                    College Fee Receipt
                  </h3>
                  {(() => {
                    const key = 'FEE_RECEIPT';
                    const isRejected = uploads[key]?.verificationStatus === 'REJECTED';
                    const isLocked = isCorrectionMode && (hasAnyRejected || isAnyHistoricalDocRejected) && !isRejected;

                    return (
                      <div className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${isRejected
                          ? 'border-rose-400 dark:border-rose-900 bg-rose-50/10 dark:bg-rose-950/5'
                          : isLocked
                            ? 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                        }`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-350">College Fee Receipt *</h4>
                            {isRejected && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-250 dark:border-rose-900 rounded-md">
                                Needs Correction
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-neutral-500 bg-neutral-105 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
                                Locked / Approved
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Upload current session provisional admission fee receipt.</p>
                          {isRejected && uploads[key]?.verificationRemarks && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold mt-1.5 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-1 rounded border border-rose-100 dark:border-rose-900/50 inline-block animate-pulse">
                              Correction Note: {uploads[key].verificationRemarks}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {uploads[key] ? (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-1 rounded-lg ${isRejected
                                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900'
                                  : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900'
                                }`}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> {isRejected ? 'Rejected' : 'Uploaded'}
                              </span>
                              <a
                                href={uploads[key].url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-100 flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </a>
                            </div>
                          ) : null}
                          {isLocked ? (
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-[10px] flex items-center gap-1 shadow-sm select-none">
                              <Lock className="w-3.5 h-3.5" /> Locked
                            </span>
                          ) : (
                            <label className="px-3 py-1.5 bg-[#0F4C81] text-white hover:bg-blue-700 rounded-xl font-bold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-sm">
                              <Upload className="w-3 h-3" /> {uploads[key] ? 'Replace' : 'Upload'}
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                onChange={(e) => handleFileUpload(e, 'FEE_RECEIPT')}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* ── Section 2: Previously Uploaded Semester Marks Cards ── */}
                {previousSemesters.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Documents From Previous Applications
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium -mt-1">
                      These marks cards were uploaded during your earlier semester application and will be included automatically.
                    </p>
                    {previousSemesters.map(sem => {
                      const histDoc = historicalDocs[sem];
                      // Also check if student re-uploaded it in current application (e.g. due to rejection)
                      const currentUpload = uploads[`MARKS_CARD_${sem}`];
                      const effectiveDoc = currentUpload || histDoc;
                      const isHistRejected = histDoc && histDoc.verificationStatus === 'REJECTED' && !currentUpload;
                      const isReUploaded = !!currentUpload;
                      const isVerified = effectiveDoc?.verificationStatus === 'VERIFIED';

                      return (
                        <div key={sem} className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${isHistRejected
                            ? 'border-rose-400 dark:border-rose-900 bg-rose-50/10 dark:bg-rose-950/5'
                            : !effectiveDoc
                              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/10 dark:bg-amber-950/5'
                              : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10 dark:bg-emerald-950/5'
                          }`}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-350">Semester {sem} Marks Card</h4>
                              {isHistRejected ? (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-250 dark:border-rose-900 rounded-md animate-pulse">
                                  Re-Upload Required
                                </span>
                              ) : isReUploaded ? (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md">
                                  Re-Uploaded
                                </span>
                              ) : isVerified ? (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-md">
                                  Verified ✓
                                </span>
                              ) : effectiveDoc ? (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-md">
                                  Already Uploaded ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md">
                                  Missing
                                </span>
                              )}
                            </div>
                            {isHistRejected && histDoc?.verificationRemarks && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold mt-1.5 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-1 rounded border border-rose-100 dark:border-rose-900/50 inline-block animate-pulse">
                                Rejected: {histDoc.verificationRemarks}
                              </p>
                            )}
                            {effectiveDoc && !isHistRejected && (
                              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                {effectiveDoc.originalFileName} · {(effectiveDoc.fileSize / 1024).toFixed(0)} KB
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {effectiveDoc && !isHistRejected && (
                              <a
                                href={effectiveDoc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-100 flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </a>
                            )}
                            {/* Allow re-upload if rejected */}
                            {isHistRejected && (
                              <label className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-sm">
                                <Upload className="w-3 h-3" /> Re-Upload
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png"
                                  onChange={(e) => handleFileUpload(e, 'SEMESTER_MARKS_CARD', sem)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Section 3: New Semester Marks Cards (required for current application) ── */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#0F4C81]" />
                    {requiredNow.length > 0
                      ? `New Semester Marks Cards — Upload Required`
                      : 'Semester Marks Cards'}
                  </h3>
                  {requiredNow.map(sem => {
                    const key = `MARKS_CARD_${sem}`;
                    const isRejected = uploads[key]?.verificationStatus === 'REJECTED';
                    const isLocked = isCorrectionMode && (hasAnyRejected || isAnyHistoricalDocRejected) && !isRejected;

                    return (
                      <div key={sem} className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${isRejected
                          ? 'border-rose-400 dark:border-rose-900 bg-rose-50/10 dark:bg-rose-950/5'
                          : isLocked
                            ? 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                        }`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-350">Semester {sem} Marks Card *</h4>
                            {isRejected && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-250 dark:border-rose-900 rounded-md">
                                Needs Correction
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-neutral-500 bg-neutral-105 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
                                Locked / Approved
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Upload original or attested copy of Semester {sem} marksheet.</p>
                          {isRejected && uploads[key]?.verificationRemarks && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold mt-1.5 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-1 rounded border border-rose-100 dark:border-rose-900/50 inline-block animate-pulse">
                              Correction Note: {uploads[key].verificationRemarks}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {uploads[key] ? (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-1 rounded-lg ${isRejected
                                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900'
                                  : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900'
                                }`}>
                                <CheckCircle2 className="w-3.5 h-3.5" /> {isRejected ? 'Rejected' : 'Uploaded'}
                              </span>
                              <a
                                href={uploads[key].url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-100 flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Preview
                              </a>
                            </div>
                          ) : null}
                          {isLocked ? (
                            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-[10px] flex items-center gap-1 shadow-sm select-none">
                              <Lock className="w-3.5 h-3.5" /> Locked
                            </span>
                          ) : (
                            <label className="px-3 py-1.5 bg-[#0F4C81] text-white hover:bg-blue-700 rounded-xl font-bold text-[10px] flex items-center gap-1.5 cursor-pointer shadow-sm">
                              <Upload className="w-3 h-3" /> {uploads[key] ? 'Replace' : 'Upload'}
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                onChange={(e) => handleFileUpload(e, 'SEMESTER_MARKS_CARD', sem)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleStep3Submit}
                  className="px-6 py-2.5 bg-[#0F4C81] hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1 cursor-pointer"
                >
                  Review & Finalize →
                </button>
              </div>
            </div>
          )}


          {/* STEP 4: Review & Finalize */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide">REVIEW & FINAL SUBMISSION</h2>
                <p className="text-xs text-slate-500 mt-1">Verify your application parameters. Confirm to submit.</p>
              </div>

              {/* Student details summary */}
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-xs space-y-2">
                <span className="text-[10px] font-black text-[#0F4C81] uppercase block tracking-wider">Candidate Particulars</span>
                <div className="grid grid-cols-2 gap-y-2 font-semibold">
                  <div><span className="text-slate-500 font-bold">Name:</span> <span className="text-slate-850 dark:text-white">{studentProfile?.name}</span></div>
                  <div><span className="text-slate-500 font-bold">USN:</span> <span className="font-mono text-slate-850 dark:text-white">{studentProfile?.usn}</span></div>
                  <div><span className="text-slate-500 font-bold">Branch:</span> <span>{studentProfile?.branchName}</span></div>
                  <div><span className="text-slate-500 font-bold">Provisional Semester:</span> <span>{selectedSemester}th Semester</span></div>
                  <div><span className="text-slate-500 font-bold">Academic Session:</span> <span>{config?.admissionCycle || '2026-2027'}</span></div>
                </div>
              </div>

              {/* Exam Records Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-[#0F4C81] uppercase block tracking-wider">Lower Examinations Summary</span>
                <div className="overflow-x-auto border rounded-xl w-full">
                  <table className="w-full text-left text-xs font-semibold min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                      <tr>
                        <th className="p-3 font-bold text-slate-600">Semester</th>
                        <th className="p-3 font-bold text-slate-600">Month/Year</th>
                        <th className="p-3 font-bold text-slate-600 text-center">Passed</th>
                        <th className="p-3 font-bold text-slate-600 text-center">Failed</th>
                        <th className="p-3 font-bold text-slate-600">Failed Codes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examRecords.map(rec => (
                        <tr key={rec.semesterNumber} className="border-b">
                          <td className="p-3 font-bold">{rec.semesterNumber}th Semester</td>
                          <td className="p-3 text-slate-500">{rec.examMonth} {rec.examYear}</td>
                          <td className="p-3 text-emerald-600 font-bold text-center">{rec.subjectsPassed}</td>
                          <td className="p-3 text-rose-600 font-bold text-center">{rec.subjectsFailed}</td>
                          <td className="p-3 font-mono text-slate-600 uppercase">{(rec.failedSubjectCodes || []).join(', ') || 'NIL'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Checkboxes confirmation */}
              <div className="pt-4 border-t space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmCorrect}
                    onChange={e => setConfirmCorrect(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    I confirm that all information provided is correct and matches my official VTU marks card results.
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-xl border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Edit
                </button>
                <button
                  type="button"
                  disabled={saving || !confirmCorrect}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} SUBMIT APPLICATION
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success screen */}
          {step === 5 && (
            <div className="text-center space-y-6 py-8">

              {application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW' || application?.status === 'RESUBMITTED' ? (
                <>
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-blue-100 dark:border-blue-900 animate-pulse">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-[#0F4C81] dark:text-white uppercase tracking-tight">
                      {application?.status === 'RESUBMITTED' ? 'APPLICATION RESUBMITTED' : 'APPLICATION SUBMITTED'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Your provisional admission request has been {application?.status === 'RESUBMITTED' ? 'resubmitted' : 'submitted'} successfully.
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-sm mx-auto text-left space-y-2.5 text-xs font-semibold">
                    <div className="flex justify-between"><strong>Provisional Admission No:</strong> <span className="font-mono text-indigo-700">{application.provisionalAdmissionNumber}</span></div>
                    <div className="flex justify-between"><strong>Academic Year:</strong> <span>{application.academicYear}</span></div>
                    <div className="flex justify-between"><strong>Semester:</strong> <span>{selectedSemester}th Semester</span></div>
                    <div className="flex justify-between"><strong>Status:</strong> <span className="uppercase text-blue-600 font-extrabold">{application.status}</span></div>
                  </div>
                </>
              ) : null}

              {application?.status === 'APPROVED' || application?.status === 'CONFIRMED' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100 dark:border-emerald-900 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-tight">ADMISSION APPROVED</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Congratulations! Your provisional admission to <strong>{selectedSemester}th Semester</strong> has been approved by the principal.
                    </p>
                  </div>
                </>
              ) : null}

              {application?.status === 'REJECTED' ? (
                <>
                  <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-rose-600 dark:text-rose-450 uppercase tracking-tight">APPLICATION REJECTED</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Your provisional admission request was not accepted. Please contact the administrative office.
                    </p>
                    {application.rejectionReason && (
                      <p className="p-3 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-lg max-w-md mx-auto">
                        <strong>Reason:</strong> {application.rejectionReason}
                      </p>
                    )}
                  </div>
                </>
              ) : null}

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/admission/dashboard')}
                  className="px-6 py-2.5 rounded-xl border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold tracking-wide uppercase cursor-pointer"
                >
                  Go to Dashboard
                </button>
                {(application?.status === 'APPROVED' || application?.status === 'CONFIRMED' || application?.status === 'SUBMITTED' || application?.status === 'UNDER_REVIEW' || application?.status === 'RESUBMITTED') && (
                  <button
                    onClick={triggerPrint}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 hover:shadow-lg cursor-pointer text-xs uppercase"
                  >
                    <Printer className="w-4 h-4" /> Print Acknowledgement
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-850 text-center text-xs font-semibold text-slate-500 dark:bg-slate-950">
        <p>© {new Date().getFullYear()} Jain College of Engineering & Research. All rights reserved.</p>
      </footer>

    </div>
  );
};
