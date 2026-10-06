import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Building2,
  GraduationCap,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  Edit,
  History,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import mentorService, {
  AllocationItem,
  DepartmentItem,
  EligibleFacultyItem,
} from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const HodViewAllocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  // Filters
  const [semester, setSemester] = useState<string>('ALL');
  const [section, setSection] = useState<string>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'REASSIGNED' | 'ALL'>('ACTIVE');
  const [page, setPage] = useState<number>(1);

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [authorizedSemesters, setAuthorizedSemesters] = useState<number[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState<boolean>(false);
  const [targetAllocation, setTargetAllocation] = useState<AllocationItem | null>(null);
  const [newDeptId, setNewDeptId] = useState<string>('');
  const [newFacultyId, setNewFacultyId] = useState<string>('');
  const [reassignFacultyList, setReassignFacultyList] = useState<EligibleFacultyItem[]>([]);
  const [loadingReassignFaculty, setLoadingReassignFaculty] = useState<boolean>(false);
  const [reassignNotes, setReassignNotes] = useState<string>('');
  const [savingReassignment, setSavingReassignment] = useState<boolean>(false);

  // Allocation History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyStudentName, setHistoryStudentName] = useState<string>('');
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Load Departments
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const depts = await mentorService.getMentorCoreDepartments();
        setDepartments(depts);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    loadDepts();
  }, []);

  // Fetch Allocations
  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await mentorService.getAllocations({
        academicYear,
        semester: semester !== 'ALL' ? Number(semester) : undefined,
        section: section !== 'ALL' ? section : undefined,
        mentorDepartmentId: selectedDeptId !== 'ALL' ? selectedDeptId : undefined,
        search: searchQuery,
        status: statusFilter,
        page,
        limit: 25,
      });
      setAllocations(res.allocations);
      setTotalCount(res.total);
      setTotalPages(res.totalPages || 1);
      setAuthorizedSemesters(res.authorizedSemesters);
    } catch (err: any) {
      console.error('Failed to load allocations:', err);
      toast.error(err.response?.data?.error || 'Failed to load allocations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [academicYear, semester, section, selectedDeptId, statusFilter, page]);

  // Load Faculty when Reassign Core Dept changes
  useEffect(() => {
    if (!newDeptId) {
      setReassignFacultyList([]);
      setNewFacultyId('');
      return;
    }
    const loadFaculty = async () => {
      setLoadingReassignFaculty(true);
      setNewFacultyId('');
      try {
        const res = await mentorService.getEligibleFaculty(newDeptId, undefined, academicYear);
        setReassignFacultyList(res);
      } catch (err) {
        console.error('Failed to load faculty for reassignment:', err);
      } finally {
        setLoadingReassignFaculty(false);
      }
    };
    loadFaculty();
  }, [newDeptId, academicYear]);

  // Open Reassign Modal
  const handleOpenReassign = (allocation: AllocationItem) => {
    setTargetAllocation(allocation);
    setNewDeptId(allocation.mentorDepartmentId || '');
    setNewFacultyId('');
    setReassignNotes('');
    setReassignModalOpen(true);
  };

  // Submit Reassignment
  const handleConfirmReassignment = async () => {
    if (!targetAllocation || !newFacultyId || !newDeptId) {
      toast.error('Please select both core department and new faculty mentor.');
      return;
    }

    setSavingReassignment(true);
    try {
      await mentorService.reassignMentor({
        studentId: targetAllocation.studentId,
        newFacultyId,
        mentorDepartmentId: newDeptId,
        academicYear,
        notes: reassignNotes,
      });

      toast.success(`Mentor reassigned for ${targetAllocation.studentName}!`);
      setReassignModalOpen(false);
      setTargetAllocation(null);
      fetchAllocations();
    } catch (err: any) {
      console.error('Reassignment failed:', err);
      toast.error(err.response?.data?.error || 'Failed to reassign mentor.');
    } finally {
      setSavingReassignment(false);
    }
  };

  // View Student History
  const handleViewHistory = async (studentId: string, studentName: string) => {
    setHistoryStudentName(studentName);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const hist = await mentorService.getStudentAllocationHistory(studentId);
      setHistoryList(hist);
    } catch (err) {
      console.error('Failed to load history:', err);
      toast.error('Failed to load student allocation history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <Link
              to="/hod/mentors"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:border-neutral-200 border-2 border-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Back to Mentors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-neutral-200" />
              <span>Back to Mentors</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mentor Allocations
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                View, filter, search, and reassign departmental student mentor allocations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/hod/mentors/assign"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <Sparkles className="size-4" />
            <span>New Allocation</span>
          </Link>
        </div>
      </div>

      {/* ── FILTER CONTROLS ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Semester Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Semesters</option>
              {authorizedSemesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Sections</option>
              {['A', 'B', 'C', 'D', 'E', 'F'].map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Mentor Core Dept */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Mentor Core Dept
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Core Depts</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Status */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ACTIVE">Active Allocations</option>
              <option value="REASSIGNED">Reassigned History</option>
              <option value="ALL">All Records</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAllocations()}
                placeholder="Search USN / student name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── ALLOCATIONS TABLE ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700 dark:text-neutral-300">
            Total Allocations Found: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{totalCount}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 dark:text-neutral-300 font-bold border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">USN</th>
                <th className="py-3 px-4 text-center">Sem / Sec</th>
                <th className="py-3 px-4">Mentor</th>
                <th className="py-3 px-4">Mentor Core Dept</th>
                <th className="py-3 px-4">Assigned Date</th>
                <th className="py-3 px-4">Assigned By</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-slate-700 dark:text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading allocations...</span>
                  </td>
                </tr>
              ) : allocations.length > 0 ? (
                allocations.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {row.studentName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-neutral-300">
                      {row.usn}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold">
                      Sem {row.semester} - {row.section}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{row.mentorName}</div>
                      <div className="text-[11px] text-slate-400 dark:text-neutral-500">{row.mentorEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-neutral-300 font-medium">
                      {row.mentorDepartmentName} ({row.mentorDepartmentCode})
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-neutral-400">
                      {row.assignedDate ? new Date(row.assignedDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-neutral-400">
                      {row.assignedByName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'ACTIVE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReassign(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold transition"
                          title="Reassign Mentor"
                        >
                          <Edit className="size-3" />
                          <span>Reassign</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewHistory(row.studentId, row.studentName)}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 transition"
                          title="Allocation History"
                        >
                          <History className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No mentor allocation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3">
            <div className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs font-bold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── REASSIGNMENT MODAL ── */}
      {reassignModalOpen && targetAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit className="size-4 text-indigo-500" />
                  <span>Reassign Mentor for {targetAllocation.studentName}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  USN: {targetAllocation.usn} • Sem {targetAllocation.semester} - {targetAllocation.section}
                </p>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Current Mentor */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Mentor</span>
              <div className="font-bold text-slate-800 dark:text-neutral-200">
                {targetAllocation.mentorName} ({targetAllocation.mentorDepartmentName})
              </div>
            </div>

            {/* Select New Core Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                New Mentor Core Department *
              </label>
              <select
                value={newDeptId}
                onChange={(e) => setNewDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select Core Department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Select New Faculty */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                New Faculty Member *
              </label>
              <select
                value={newFacultyId}
                onChange={(e) => setNewFacultyId(e.target.value)}
                disabled={!newDeptId || loadingReassignFaculty}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">
                  {loadingReassignFaculty ? 'Loading eligible faculty...' : '— Select New Faculty Mentor —'}
                </option>
                {reassignFacultyList.map((f) => (
                  <option key={f.facultyId} value={f.facultyId}>
                    {f.name} ({f.designation}) — {f.currentMenteeCount} mentees
                  </option>
                ))}
              </select>
            </div>

            {/* Reassign Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                Reason / Reassignment Notes (Optional)
              </label>
              <textarea
                value={reassignNotes}
                onChange={(e) => setReassignNotes(e.target.value)}
                placeholder="Specify reason for mentor reassignment..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newFacultyId || savingReassignment}
                onClick={handleConfirmReassignment}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {savingReassignment ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirm Reassignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ALLOCATION HISTORY MODAL ── */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="size-4 text-indigo-500" />
                  <span>Allocation History: {historyStudentName}</span>
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
              ) : historyList.length > 0 ? (
                historyList.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>Mentor: {h.faculty?.name || '—'}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Core Dept: {h.mentorDepartment?.name || '—'}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Assigned: {new Date(h.assignedAt).toLocaleDateString()}</span>
                      <span>By: {h.assignedByHod?.name || 'HOD'}</span>
                    </div>
                    {h.notes && (
                      <div className="text-[11px] text-slate-600 dark:text-neutral-400 italic pt-1">
                        Note: "{h.notes}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No historical records found.</div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodViewAllocationsPage;
