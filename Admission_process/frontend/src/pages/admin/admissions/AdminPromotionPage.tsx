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
  X
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

export const AdminPromotionPage: React.FC = () => {
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
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [eligiblePreviewList, setEligiblePreviewList] = useState<any[]>([]);
  const [skippedPreviewList, setSkippedPreviewList] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<string>('');

  // Outcome
  const [showOutcomeModal, setShowOutcomeModal] = useState<boolean>(false);
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
      setShowConfirmModal(true);
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
      setShowConfirmModal(false);
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
        setShowConfirmModal(false);
        setShowOutcomeModal(true);
        toast.success(res.data.message || 'Promotion completed successfully.');
        setSelectedStudentIds([]);
        fetchStudents();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to execute promotions.');
    } finally {
      setPromoting(false);
    }
  };

  const targetSemester = semesterFilter !== 'All' ? Number(semesterFilter) + 1 : null;

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/10 min-h-screen text-slate-800 dark:text-slate-100">
      
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
          className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase">Total In Queue</span>
            <span className="text-xl font-black tracking-tight">{totalRecords}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase">Target Semester</span>
            <span className="text-xl font-black tracking-tight">
              {targetSemester ? `${targetSemester}th Sem` : 'Select Filter'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-50 dark:bg-violet-950/30 text-violet-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase">Selected Students</span>
            <span className="text-xl font-black tracking-tight">{selectedStudentIds.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-605 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block uppercase">Session Cycle</span>
            <span className="text-sm font-black tracking-tight block mt-1">{academicYearFilter}</span>
          </div>
        </div>
      </div>

      {/* Filters workspace */}
      <div className="bg-white dark:bg-slate-950 border border-slate-250/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase text-[#0F4C81] dark:text-indigo-400 tracking-wider">Queue Selection Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Current Semester</label>
            <select
              value={semesterFilter}
              onChange={e => { setSemesterFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold cursor-pointer"
            >
              <option value="All">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7].map(sem => (
                <option key={sem} value={sem}>{sem}th Semester</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Department</label>
            <select
              value={departmentFilter}
              onChange={e => { setDepartmentFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Admission Type</label>
            <select
              value={admissionTypeFilter}
              onChange={e => { setAdmissionTypeFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="FRESH">Fresh</option>
              <option value="LATERAL">Lateral Entry</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Academic Year</label>
            <select
              value={academicYearFilter}
              onChange={e => { setAcademicYearFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold cursor-pointer"
            >
              {academicYears.map(ay => (
                <option key={ay} value={ay}>{ay}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400">Promote To (Target)</label>
            <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border rounded-xl text-xs font-black text-slate-600 dark:text-slate-300">
              {targetSemester ? `${targetSemester}th Semester` : 'Select Current Sem First'}
            </div>
          </div>

        </div>

        {/* Search */}
        <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search USN, Name or Email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-semibold focus:ring-1 outline-none"
            />
          </div>
          {semesterFilter === 'All' && (
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Please filter by a specific "Current Semester" to enable Promotion tools.
            </span>
          )}
        </div>
      </div>

      {/* Main Student Queue Table */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Querying Enrolled student data...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-350 mx-auto" />
            <p className="text-sm font-extrabold text-slate-500">No Enrolled students match current filters.</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      disabled={semesterFilter === 'All'}
                      checked={selectedStudentIds.length === students.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-4 font-bold text-slate-500">Student Name</th>
                  <th className="p-4 font-bold text-slate-500">USN</th>
                  <th className="p-4 font-bold text-slate-500">Email</th>
                  <th className="p-4 font-bold text-slate-500">Department</th>
                  <th className="p-4 font-bold text-slate-500">Admission Type</th>
                  <th className="p-4 font-bold text-slate-500 text-center">Current Sem</th>
                  <th className="p-4 font-bold text-slate-500">Academic Year</th>
                  <th className="p-4 font-bold text-slate-500 text-center">Status</th>
                  <th className="p-4 font-bold text-slate-500">Last Promoted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        disabled={semesterFilter === 'All'}
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => handleSelectStudent(s.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {s.user?.firstName} {s.user?.lastName}
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-650">{s.usn || 'PENDING'}</td>
                    <td className="p-4 text-slate-500 font-semibold">{s.user?.email}</td>
                    <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{s.department?.name} ({s.department?.code})</td>
                    <td className="p-4 text-slate-600">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.admissionType === 'LATERAL' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {s.admissionType === 'LATERAL' ? 'Lateral' : 'Fresh'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-extrabold text-slate-800 dark:text-slate-200">{s.semester}th Sem</td>
                    <td className="p-4 text-slate-500 font-semibold">{s.currentAcademicYear}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase">
                        {s.admission?.applicationStatus || 'ENROLLED'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-medium">
                      {s.lastPromotedAt ? new Date(s.lastPromotedAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer controls */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-bold">
            Total {totalRecords} records found.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="p-2 bg-white dark:bg-slate-800 border rounded-xl hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="p-2 bg-white dark:bg-slate-800 border rounded-xl hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Promotion trigger floating bar */}
      {selectedStudentIds.length > 0 && semesterFilter !== 'All' && (
        <div className="fixed bottom-6 left-6 right-6 md:left-[316px] bg-white dark:bg-slate-950 border-2 border-blue-600 rounded-2xl p-4 shadow-xl flex items-center justify-between z-50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xs">
              {selectedStudentIds.length}
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider block text-slate-400">Selected Candidate(s)</span>
              <span className="text-xs font-bold text-slate-600">
                Ready to promote from {semesterFilter}th Semester to {targetSemester}th Semester.
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow shadow-emerald-500/20"
            >
              <ArrowUpCircle className="w-4 h-4" /> Promote Selected ({selectedStudentIds.length})
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION / PREVIEW MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="absolute right-4 top-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-slate-450" />
            </button>

            <div>
              <h2 className="text-lg font-black text-[#0F4C81] dark:text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                Confirm Bulk Academic Promotion
              </h2>
              <p className="text-xs text-slate-500 mt-1">Review the preview analysis below before committing updates.</p>
            </div>

            {previewLoading ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Analyzing eligibility rules...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-semibold">
                
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-905">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Selected</span>
                    <span className="text-lg font-black">{selectedStudentIds.length}</span>
                  </div>
                  <div className="p-3 border border-emerald-200 bg-emerald-50/25 rounded-xl text-emerald-600">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Eligible</span>
                    <span className="text-lg font-black">{eligibleCount}</span>
                  </div>
                  <div className="p-3 border border-rose-250 bg-rose-50/20 rounded-xl text-rose-600">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Skipped</span>
                    <span className="text-lg font-black">{skippedCount}</span>
                  </div>
                </div>

                {/* Eligible List */}
                {eligiblePreviewList.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-emerald-600 uppercase block tracking-wider">Eligible candidates ({eligibleCount})</span>
                    <div className="max-h-36 overflow-y-auto border rounded-xl p-3 bg-slate-50/30 dark:bg-slate-900/10 space-y-1">
                      {eligiblePreviewList.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-[11px]">
                          <span>{item.name}</span>
                          <span className="font-mono font-bold text-indigo-650">{item.usn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skipped List */}
                {skippedPreviewList.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-rose-500 uppercase block tracking-wider">Skipped candidates ({skippedCount})</span>
                    <div className="max-h-36 overflow-y-auto border border-rose-100 rounded-xl p-3 bg-rose-50/10 space-y-1">
                      {skippedPreviewList.map(item => (
                        <div key={item.id} className="flex justify-between items-start text-[11px] text-rose-700">
                          <div>
                            <span className="font-bold">{item.name}</span>
                            <span className="block text-[10px] text-rose-400">{item.reason}</span>
                          </div>
                          <span className="font-mono font-bold">{item.usn || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action input */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Promotion Batch Remarks (Optional)</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter purpose or administrative reference (e.g. FY 2026 Regular Promotion)..."
                    className="w-full p-3 border rounded-xl text-xs font-semibold outline-none focus:ring-1"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={promoting || eligibleCount === 0}
                    onClick={handleExecutePromotion}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    CONFIRM & PROMOTE
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* OUTCOME / SUMMARY REPORT MODAL */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative text-center">
            
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-850 dark:text-white uppercase tracking-tight">PROMOTION COMPLETED</h2>
              <p className="text-xs text-slate-500">Your bulk academic promotion request has been processed.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left space-y-2.5 text-xs font-semibold">
              <div className="flex justify-between"><strong>Status:</strong> <span className="text-emerald-600 font-extrabold uppercase">SUCCESS</span></div>
              <div className="flex justify-between"><strong>Promoted Count:</strong> <span className="text-indigo-650 font-black">{outcomeData?.promotedCount}</span></div>
              <div className="flex justify-between"><strong>Skipped Count:</strong> <span className="text-rose-600 font-black">{outcomeData?.skippedCount}</span></div>
              {outcomeData?.batchId && (
                <div className="flex justify-between"><strong>Batch ID:</strong> <span className="font-mono text-slate-500">{outcomeData.batchId.slice(0, 8)}...</span></div>
              )}
            </div>

            {outcomeData?.skipped?.length > 0 && (
              <div className="text-left space-y-1.5">
                <span className="text-[10px] font-black text-rose-500 uppercase block tracking-wider">Skipped Log Detail</span>
                <div className="max-h-24 overflow-y-auto border border-rose-100 rounded-xl p-2.5 bg-rose-50/10 text-[10px] space-y-1 text-rose-700">
                  {outcomeData.skipped.map((s: any, idx: number) => (
                    <div key={idx}>• {s.name} ({s.usn || 'N/A'}) — <span className="font-bold">{s.reason}</span></div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOutcomeModal(false)}
                className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-colors"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default AdminPromotionPage;
