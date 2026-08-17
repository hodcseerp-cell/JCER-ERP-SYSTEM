import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../../../services/api';
import admissionService from '../../../services/admission.service';
import { generateStudentReport, ExportFilterMetadata } from '../../../utils/studentExportGenerator';
import { getAcademicYear } from '../../../utils/date.util';
import { 
  ArrowLeft, Download, RefreshCw, Loader2, HelpCircle, FileSpreadsheet, CheckCircle2, RotateCcw, Filter, FileText, Search, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';

interface StudentExportPageProps {
  readOnly?: boolean;
}

export const StudentExportPage: React.FC<StudentExportPageProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPrincipal = location.pathname.startsWith('/principal');
  const backRoute = isPrincipal ? '/principal/students' : '/admin/students';

  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);

  // Filter Form State
  const [academicYear, setAcademicYear] = useState<string>(getAcademicYear());
  const [branchId, setBranchId] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [admissionType, setAdmissionType] = useState<string>('ALL');
  const [qualification, setQualification] = useState<string>('ALL');
  const [gender, setGender] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [district, setDistrict] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Report configuration
  const [exportType, setExportType] = useState<'summary' | 'complete'>('summary');
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');

  // Loading & Preview state
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{ studentCount: number } | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const list = await admissionService.getBranches();
      setBranches(list);
    } catch (err) {
      console.error('Failed to load branches:', err);
      toast.error('Failed to load branch list.');
    }
  };

  const handleResetFilters = () => {
    setAcademicYear(getAcademicYear());
    setBranchId('ALL');
    setStatus('ALL');
    setAdmissionType('ALL');
    setQualification('ALL');
    setGender('ALL');
    setCategory('ALL');
    setDistrict('');
    setStartDate('');
    setEndDate('');
    setSearch('');
    setExportType('summary');
    setFormat('excel');
    setPreviewData(null);
    toast.info('Filters reset to default.');
  };

  const handleRunPreview = async () => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await admissionService.listApplications({
        page: 1,
        limit: 1,
        status: status === 'ALL' ? undefined : status,
        branchId: branchId === 'ALL' ? undefined : branchId,
        admissionType: admissionType === 'ALL' ? undefined : admissionType,
        qualification: qualification === 'ALL' ? undefined : qualification,
        gender: gender === 'ALL' ? undefined : gender,
        category: category === 'ALL' ? undefined : category,
        district: district.trim() || undefined,
        academicYear: academicYear === 'ALL' ? undefined : academicYear,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
      });

      setPreviewData({ studentCount: res.total });
      toast.success(`Found ${res.total} matching student record(s).`);
    } catch (err) {
      console.error('Preview count failed:', err);
      toast.error('Failed to load preview count.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!academicYear) {
      toast.error('Please select an Academic Year.');
      return;
    }

    setExportLoading(true);
    const toastId = toast.loading(`Generating ${exportType.toUpperCase()} report as ${format.toUpperCase()}...`);

    try {
      const isComplete = exportType === 'complete';

      const res = await admissionService.listApplications({
        page: 1,
        limit: 100000,
        status: status === 'ALL' ? undefined : status,
        branchId: branchId === 'ALL' ? undefined : branchId,
        admissionType: admissionType === 'ALL' ? undefined : admissionType,
        qualification: qualification === 'ALL' ? undefined : qualification,
        gender: gender === 'ALL' ? undefined : gender,
        category: category === 'ALL' ? undefined : category,
        district: district.trim() || undefined,
        academicYear: academicYear === 'ALL' ? undefined : academicYear,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        includeFullDetails: isComplete,
      });

      const matchedRows = res.applications;

      if (!matchedRows || matchedRows.length === 0) {
        toast.dismiss(toastId);
        toast.warning('No matching students found for the selected export criteria.');
        setExportLoading(false);
        return;
      }

      const branchObj = branches.find(b => b.id === branchId);
      const branchCode = branchId === 'ALL' ? 'ALL' : (branchObj?.code || 'BRANCH');
      const branchName = branchId === 'ALL' ? 'All Branches' : (branchObj?.name || 'Branch');
      const statusLabel = status === 'ALL' ? 'All Statuses' : status;

      const filterMeta: ExportFilterMetadata = {
        academicYear: academicYear === 'ALL' ? 'All Sessions' : academicYear,
        branchName,
        branchCode,
        statusLabel,
        admissionType,
        qualification,
        gender,
        category,
        district,
        startDate,
        endDate,
        search,
      };

      generateStudentReport(matchedRows, exportType, format, filterMeta);

      toast.dismiss(toastId);
      toast.success(`Successfully exported ${matchedRows.length} student record(s) as ${format.toUpperCase()}`);
      setPreviewData({ studentCount: matchedRows.length });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.dismiss(toastId);
      toast.error(err.response?.data?.error || 'Failed to generate student export report.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(backRoute)}
          className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-2xl transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200"
          title="Back to Students"
        >
          <ArrowLeft size={18} className="text-neutral-700 dark:text-neutral-300" />
          <span className="hidden sm:inline">Back to Students</span>
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-wider">
            STUDENT DATABASE EXPORT
          </h1>
          <p className="text-xs text-neutral-550 dark:text-neutral-450 font-medium">
            Export student records based on academic year, branch, admission status, qualification, and other filters.
          </p>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        
        {/* Primary Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Academic Year */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Academic Years</option>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = 2026 + i;
                const opt = `${y}-${y + 1}`;
                return <option key={opt} value={opt}>{opt}</option>;
              })}
            </select>
          </div>

          {/* 2. Branch / Department */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Branch / Department
            </label>
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Branches / Departments</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Admission Status */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Admission Status
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Verified (Admin)</option>
              <option value="PRINCIPAL_APPROVED">Principal Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ENROLLED">Admission Confirmed</option>
              <option value="CANCELLATION_REQUESTED">Cancellation Requested</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* 4. Admission Type */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Admission Type
            </label>
            <select
              value={admissionType}
              onChange={(e) => { setAdmissionType(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="KCET">KCET</option>
              <option value="DCET">DCET (Lateral)</option>
              <option value="MANAGEMENT">Management</option>
              <option value="COMEDK">COMEDK</option>
            </select>
          </div>

          {/* 5. Qualification */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Qualification
            </label>
            <select
              value={qualification}
              onChange={(e) => { setQualification(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Qualifications</option>
              <option value="PUC">PUC / 12th</option>
              <option value="DIPLOMA">Diploma</option>
            </select>
          </div>

          {/* 6. Gender */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => { setGender(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters (Category, District, Search) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
          
          {/* Category */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="GM">GM (General Merit)</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="2A">2A</option>
              <option value="2B">2B</option>
              <option value="3A">3A</option>
              <option value="3B">3B</option>
              <option value="C1">C1</option>
            </select>
          </div>

          {/* District */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              District
            </label>
            <input
              type="text"
              placeholder="e.g. Belagavi"
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setPreviewData(null); }}
              className="w-full h-11 px-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
            />
          </div>

          {/* Search Keyword */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
              Search Keyword
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name, application no, phone, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPreviewData(null); }}
                className="w-full h-11 pl-9 pr-3.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        </div>

        {/* Export Type Selection */}
        <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800/60">
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
            EXPORT TYPE <span className="text-rose-500">*</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Summary Report Option */}
            <div 
              onClick={() => setExportType('summary')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                exportType === 'summary'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                exportType === 'summary' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-neutral-300 dark:border-neutral-600'
              }`}>
                {exportType === 'summary' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wide">Summary Report</h4>
                <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Compact 15 columns covering basic contact, department, admission type, status, and document links.
                </p>
              </div>
            </div>

            {/* Complete Report Option */}
            <div 
              onClick={() => setExportType('complete')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                exportType === 'complete'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                exportType === 'complete' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-neutral-300 dark:border-neutral-600'
              }`}>
                {exportType === 'complete' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <h4 className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wide">Complete Report</h4>
                <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Full 360° All Fields across Sections A to F (Personal, Parent, Address, Academic, Documents, Admin).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Format Selection */}
        <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800/60">
          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-450 dark:text-neutral-500">
            EXPORT FORMAT <span className="text-rose-500">*</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            {[
              { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
              { id: 'csv', label: 'CSV Format', icon: FileText },
              { id: 'pdf', label: 'PDF Report', icon: Download },
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = format === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id as any)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 border-violet-700 text-white shadow-sm'
                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                  }`}
                >
                  <Icon size={14} />
                  {fmt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-neutral-100 dark:border-neutral-800/60">
          
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2.5 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw size={14} />
            Reset Filters
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRunPreview}
              disabled={previewLoading || exportLoading}
              className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              {previewLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Run Preview Count
            </button>

            <button
              type="button"
              onClick={() => handleExportSubmit()}
              disabled={exportLoading || previewLoading}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {exportLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Export Students
            </button>
          </div>
        </div>
      </div>

      {/* Preview Summary Card */}
      {previewData && (
        <div className="mt-8 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-250/30 dark:border-emerald-900/30 rounded-3xl p-6 md:p-8 animate-fade-in flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100/55 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/50 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wide">EXPORT PREVIEW RESULT</h3>
              <p className="text-xs text-neutral-550 dark:text-neutral-400 mt-0.5">Found matching student records in database ready for export.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-stretch md:self-auto justify-around bg-white/50 dark:bg-neutral-900/60 border border-emerald-200/40 dark:border-neutral-800/40 p-4.5 rounded-2xl shrink-0">
            <div className="text-center px-4">
              <span className="block text-2xl font-black text-neutral-900 dark:text-white">{previewData.studentCount}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-450 dark:text-neutral-550">Matching Students</span>
            </div>
            <button
              onClick={() => handleExportSubmit()}
              disabled={exportLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download {format.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* Information guidelines box */}
      <div className="mt-8 bg-neutral-100 dark:bg-neutral-900/40 border border-neutral-250/20 dark:border-neutral-800/60 rounded-3xl p-6 md:p-8 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={16} className="text-neutral-450" />
          <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">Export Guidance & Details</h4>
        </div>
        <p className="text-xs text-neutral-550 dark:text-neutral-450 leading-relaxed">
          The <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">Summary Report</code> generates a compact spreadsheet featuring essential identification, status, contact information, and clickable document review links.
        </p>
        <p className="text-xs text-neutral-550 dark:text-neutral-450 leading-relaxed">
          The <code className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-800 rounded">Complete Report</code> extracts full 360° student data across Sections A (Admission), B (Personal), C (Address), D (Academic & Marks), E (Document Verification Status), and F (Administrative Audit Logs).
        </p>
      </div>

    </div>
  );
};

export default StudentExportPage;
