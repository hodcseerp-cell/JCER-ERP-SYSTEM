import React, { useState, useEffect } from 'react';
import API from '../../../services/api';
import toast from 'react-hot-toast';
import { 
  ArrowUpCircle, 
  Search, 
  Loader2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp, 
  Users, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  Clock,
  X,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  GraduationCap,
  Check,
  Send,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';

interface StudentData {
  id: string;
  usn: string;
  enrollmentNumber: string;
  semester: number;
  admissionType: 'FRESH' | 'LATERAL';
  initialSemester: number;
  currentAcademicYear: string;
  lastPromotedAt: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  admission: {
    applicationStatus: string;
    applicationNumber: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
}

const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const AdminPromotionPage: React.FC = () => {
  // Page view mode: 'LIST' | 'CONFIRM' | 'OUTCOME'
  const [viewStep, setViewStep] = useState<'LIST' | 'CONFIRM' | 'OUTCOME'>('LIST');

  // Filters
  const [semesterFilter, setSemesterFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [admissionTypeFilter, setAdmissionTypeFilter] = useState<string>('All');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lists & data
  const [students, setStudents] = useState<StudentData[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [promoting, setPromoting] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const limit = 15;

  // Selected students
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Preview & Confirmation
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [eligiblePreviewList, setEligiblePreviewList] = useState<any[]>([]);
  const [skippedPreviewList, setSkippedPreviewList] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<string>('');

  // Outcome
  const [outcomeData, setOutcomeData] = useState<any>(null);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchStudents();
    setSelectedStudentIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterFilter, departmentFilter, admissionTypeFilter, academicYearFilter, searchQuery, page]);

  const fetchFilters = async () => {
    try {
      const res = await API.get('/admin/promotion/filters');
      if (res.data?.success) {
        setDepartments(res.data.data.departments);
        setAcademicYears(res.data.data.academicYears);
        if (res.data.data.academicYears?.length > 0) {
          setAcademicYearFilter(res.data.data.academicYears[0]);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load promotion filters.');
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await API.get('/admin/promotion/students', {
        params: {
          semester: semesterFilter,
          departmentId: departmentFilter,
          admissionType: admissionTypeFilter,
          academicYear: academicYearFilter,
          search: searchQuery,
          page,
          limit
        }
      });
      if (res.data?.success) {
        setStudents(res.data.data.students);
        setTotalRecords(res.data.data.total);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err: any) {
      toast.error('Failed to fetch student queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleTriggerPreview = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student.');
      return;
    }

    if (semesterFilter === 'All') {
      toast.error('Please select a specific current semester in the filters to enable promotion.');
      return;
    }

    const fromSem = Number(semesterFilter);
    const toSem = fromSem + 1;

    try {
      setPreviewLoading(true);
      setViewStep('CONFIRM'); // Switch to dedicated confirmation page! Bottom bar vanishes!
      const res = await API.post('/admin/promotion/preview', {
        studentIds: selectedStudentIds,
        fromSemester: fromSem,
        toSemester: toSem
      });
      if (res.data?.success) {
        setEligibleCount(res.data.data.eligibleCount);
        setSkippedCount(res.data.data.skippedCount);
        setEligiblePreviewList(res.data.data.eligible);
        setSkippedPreviewList(res.data.data.skipped);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate promotion preview.');
      setViewStep('LIST');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecutePromotion = async () => {
    const fromSem = Number(semesterFilter);
    const toSem = fromSem + 1;

    try {
      setPromoting(true);
      const res = await API.post('/admin/promotion/bulk', {
        studentIds: selectedStudentIds,
        fromSemester: fromSem,
        toSemester: toSem,
        academicYear: academicYearFilter,
        remarks
      });

      if (res.data?.success) {
        setOutcomeData(res.data.data);
        setViewStep('OUTCOME');
        toast.success(res.data.message || 'Promotion completed successfully.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to execute promotions.');
    } finally {
      setPromoting(false);
    }
  };

  const handleFinishOutcome = () => {
    setSelectedStudentIds([]);
    setRemarks('');
    setViewStep('LIST');
    fetchStudents();
  };

  const fromSemNum = semesterFilter !== 'All' ? Number(semesterFilter) : null;
  const targetSemester = (fromSemNum !== null && !isNaN(fromSemNum)) ? fromSemNum + 1 : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDICATED CONFIRMATION PAGE (viewStep === 'CONFIRM')
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewStep === 'CONFIRM') {
    return (
      <div className="animate-fade-in space-y-6 p-4 sm:p-6 max-w-6xl mx-auto min-h-screen text-slate-800 dark:text-slate-100 pb-16">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setViewStep('LIST')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Selection Table</span>
          </button>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-full text-[11px] font-extrabold uppercase tracking-wider border border-blue-200/60 dark:border-blue-900/50">
            Promotion Review Batch
          </span>
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F4C81] dark:text-white tracking-tight flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-[#0F4C81]" />
            CONFIRM BULK ACADEMIC PROMOTION
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium pl-11">
            Review the pre-promotion analysis below for candidate eligibility before committing batch updates.
          </p>
        </div>

        {previewLoading ? (
          <div className="py-24 text-center space-y-4 bg-white dark:bg-slate-900 border rounded-3xl p-12 shadow-sm animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Analyzing student eligibility rules &amp; VTU constraints...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 3 Metric Cards Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Total Selected</span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">{selectedStudentIds.length}</span>
                </div>
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600">
                  <Users size={22} />
                </div>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">Eligible Candidates</span>
                  <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">{eligibleCount}</span>
                </div>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <UserCheck size={22} />
                </div>
              </div>

              <div className="bg-rose-50/70 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 tracking-wider block">Skipped / Ineligible</span>
                  <span className="text-3xl font-black text-rose-700 dark:text-rose-300 mt-1 block">{skippedCount}</span>
                </div>
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 rounded-2xl flex items-center justify-center text-rose-600">
                  <UserX size={22} />
                </div>
              </div>
            </div>

            {/* Promotion Transition Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300 block">Semester Promotion Route</span>
                <h3 className="text-lg font-black tracking-tight">
                  {getOrdinal(Number(semesterFilter))} Semester &rarr; {targetSemester ? `${getOrdinal(targetSemester)} Semester` : 'No Next Semester'}
                </h3>
                <p className="text-xs text-blue-200 font-medium">Academic Cycle: {academicYearFilter}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl text-xs font-bold border border-white/20">
                  {eligibleCount} Student(s) to be updated
                </span>
              </div>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 cols: Eligible List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <UserCheck size={18} className="text-emerald-600" />
                      Eligible Candidates ({eligibleCount})
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">Verified &amp; Ready</span>
                  </div>

                  {eligiblePreviewList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No eligible candidates found for promotion in this selection.
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                      {eligiblePreviewList.map((st, idx) => (
                        <div key={st.id || idx} className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
                              {st.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{st.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{st.usn || 'USN Pending'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-extrabold rounded-full border border-emerald-200/60 dark:border-emerald-900/50">
                              {getOrdinal(Number(semesterFilter))} &rarr; {targetSemester ? getOrdinal(targetSemester) : 'N/A'} Sem
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skipped Candidates Box if any */}
                {skippedPreviewList.length > 0 && (
                  <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-xs uppercase tracking-wider border-b border-rose-200/60 pb-2">
                      <AlertTriangle size={16} />
                      <span>Skipped Candidates ({skippedCount})</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {skippedPreviewList.map((st, idx) => (
                        <div key={st.id || idx} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-rose-100 dark:border-rose-950 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{st.name}</p>
                            <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{st.reason}</p>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 font-bold">{st.usn || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 1 col: Execution Panel */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 sticky top-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={18} className="text-blue-600" />
                      Authorization &amp; Remarks
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Enter optional batch comments for audit trails.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Batch Promotion Remarks
                    </label>
                    <textarea
                      rows={4}
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="e.g. Regular VTU 2026 Academic Promotion for 1st Year CSE Students..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      type="button"
                      disabled={promoting || eligibleCount === 0}
                      onClick={handleExecutePromotion}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      {promoting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Promoting Students...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>CONFIRM &amp; EXECUTE PROMOTION</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewStep('LIST')}
                      disabled={promoting}
                      className="w-full py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Cancel &amp; Return to Table
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDICATED OUTCOME PAGE (viewStep === 'OUTCOME')
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewStep === 'OUTCOME') {
    return (
      <div className="animate-fade-in space-y-6 p-4 sm:p-6 max-w-4xl mx-auto min-h-screen text-slate-800 dark:text-slate-100 pb-16">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 text-center">
          
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200/60 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={40} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              PROMOTION EXECUTED SUCCESSFULLY
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto">
              The selected candidates have been officially promoted to their next academic semester.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Status</span>
              <span className="text-sm font-black text-emerald-600 uppercase mt-1 block">SUCCESS</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Promoted Count</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{outcomeData?.promotedCount || 0}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">Skipped Count</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{outcomeData?.skippedCount || 0}</span>
            </div>
          </div>

          {outcomeData?.skipped?.length > 0 && (
            <div className="max-w-xl mx-auto text-left space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-rose-500 tracking-wider block">Skipped Candidates Summary</span>
              <div className="max-h-36 overflow-y-auto border border-rose-100 dark:border-rose-950 rounded-2xl p-3 bg-rose-50/20 dark:bg-rose-950/20 text-xs space-y-1.5 text-rose-700 dark:text-rose-300">
                {outcomeData.skipped.map((s: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>&bull; {s.name} ({s.usn || 'N/A'})</span>
                    <span className="font-bold">{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleFinishOutcome}
              className="w-full py-3.5 bg-slate-900 hover:bg-black dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Return to Promotion Table
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN SELECTION TABLE VIEW (viewStep === 'LIST')
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className={`space-y-6 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/10 min-h-screen text-slate-800 dark:text-slate-100 ${selectedStudentIds.length > 0 && semesterFilter !== 'All' ? 'pb-44' : ''}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F4C81] dark:text-white tracking-tight flex items-center gap-2">
            <ArrowUpCircle className="w-8 h-8 text-[#0F4C81]" />
            ACADEMIC PROMOTION
          </h1>
          <p className="text-sm text-slate-500 mt-1">Promote enrolled students to their next academic semester.</p>
        </div>
        <button
          onClick={() => { fetchStudents(); setSelectedStudentIds([]); }}
          className="px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
        </button>
      </div>

      {/* Filters Box */}
      <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Queue Selection Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Current Semester Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Current Semester</label>
            <select
              value={semesterFilter}
              onChange={(e) => { setSemesterFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">3rd Semester</option>
              <option value="4">4th Semester</option>
              <option value="5">5th Semester</option>
              <option value="6">6th Semester</option>
              <option value="7">7th Semester</option>
              <option value="8">8th Semester</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Admission Type Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Admission Type</label>
            <select
              value={admissionTypeFilter}
              onChange={(e) => { setAdmissionTypeFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="FRESH">Fresh Admission (Regular)</option>
              <option value="LATERAL">Lateral Entry</option>
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Academic Year</label>
            <select
              value={academicYearFilter}
              onChange={(e) => { setAcademicYearFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
            >
              {academicYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Promote To target (Read Only info) */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Promote To (Target)</label>
            <div className="w-full bg-slate-100 dark:bg-slate-800 border rounded-xl px-3 py-2 text-xs font-black text-slate-700 dark:text-slate-200">
              {targetSemester ? `${getOrdinal(targetSemester)} Semester` : 'Select Semester'}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="pt-1">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search USN, Name or Email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs font-bold text-slate-400">Loading student promotion queue...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">No students found</p>
            <p className="text-xs text-slate-400">Try adjusting the filter criteria above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="p-3.5 text-center w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={students.length > 0 && selectedStudentIds.length === students.length}
                      className="rounded accent-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">USN</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5 text-center">Admission Type</th>
                  <th className="p-3.5 text-center">Current Sem</th>
                  <th className="p-3.5 text-center">Academic Year</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Last Promoted</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium">
                {students.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const name = student.user ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : 'N/A';
                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectStudent(student.id)}
                          className="rounded accent-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {name}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300 font-bold">
                        {student.usn || student.enrollmentNumber || 'PENDING'}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {student.user?.email || 'N/A'}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {student.department?.name || 'N/A'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold rounded-md uppercase">
                          {student.admissionType === 'LATERAL' ? 'Lateral' : 'Fresh'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        {getOrdinal(student.semester)} Sem
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        {student.currentAcademicYear || '2026-2027'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md uppercase">
                          {student.admission?.applicationStatus || 'ENROLLED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center text-slate-400 text-[11px]">
                        {student.lastPromotedAt ? new Date(student.lastPromotedAt).toLocaleDateString('en-IN') : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        {students.length > 0 && (
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-slate-500">
              Total {totalRecords} records found.
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 border rounded-lg hover:bg-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Promotion trigger floating bar (ONLY SHOWN IN 'LIST' VIEW MODE!) */}
      {selectedStudentIds.length > 0 && semesterFilter !== 'All' && viewStep === 'LIST' && (
        <div className="fixed bottom-28 left-6 right-6 md:left-[316px] bg-white dark:bg-slate-950 border-2 border-blue-600 rounded-2xl p-4 shadow-2xl flex items-center justify-between z-[60] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xs">
              {selectedStudentIds.length}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block text-slate-400">Selected Candidate(s)</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Ready to promote from {getOrdinal(Number(semesterFilter))} Semester to {targetSemester ? `${getOrdinal(targetSemester)} Semester` : 'No Next Semester'}.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedStudentIds([])}
              className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleTriggerPreview}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow shadow-emerald-500/20 cursor-pointer"
            >
              <ArrowUpCircle className="w-4 h-4" /> Promote Selected ({selectedStudentIds.length})
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPromotionPage;
