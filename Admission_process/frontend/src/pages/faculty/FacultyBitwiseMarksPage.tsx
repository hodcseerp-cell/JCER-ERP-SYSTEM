import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  BookOpen,
  Eye,
  X,
  Filter,
  RefreshCw,
  Loader2,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Edit3,
} from 'lucide-react';
import facultyService, {
  FacultyAssignmentItem,
  FacultyMarksWorkspaceData,
} from '../../services/faculty.service';
import usePersistentState from '../../hooks/usePersistentState';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const FacultyBitwiseMarksPage: React.FC = () => {
  const { academicYear } = useAcademicYear();
  const [selectedSemester, setSelectedSemester] = usePersistentState<string>(
    'faculty_bitwise_sem_filter',
    'ALL'
  );
  const [courses, setCourses] = useState<FacultyAssignmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Workspace modal state
  const [selectedAssignmentId, setSelectedAssignmentId] = usePersistentState<string | null>(
    'faculty_bitwise_selected_assignment_id',
    null
  );
  const [workspaceData, setWorkspaceData] = useState<FacultyMarksWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);

  // Modal active tab: 'view' | 'edit'
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable marks map
  const [editableMarks, setEditableMarks] = useState<{
    [studentId: string]: { ia1: string; ia2: string; assignment: string };
  }>({});
  const [savingMarks, setSavingMarks] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const marksList = await facultyService.getMarksCourses(selectedSemester, academicYear);
      setCourses(marksList);
    } catch (err) {
      console.error('Failed to load marks courses:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSemester, academicYear]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load marks workspace
  const loadWorkspace = useCallback(async (assignmentId: string) => {
    try {
      setLoadingWorkspace(true);
      const data = await facultyService.getMarksWorkspace(assignmentId);
      setWorkspaceData(data);

      // Populate editable marks
      const initialMap: { [studentId: string]: { ia1: string; ia2: string; assignment: string } } = {};
      data.students.forEach((s) => {
        initialMap[s.id] = {
          ia1: s.ia1 !== undefined && s.ia1 !== null ? String(s.ia1) : '',
          ia2: s.ia2 !== undefined && s.ia2 !== null ? String(s.ia2) : '',
          assignment: s.assignment !== undefined && s.assignment !== null ? String(s.assignment) : '',
        };
      });
      setEditableMarks(initialMap);
    } catch (err: any) {
      console.error('Failed to load marks workspace:', err);
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      loadWorkspace(selectedAssignmentId);
      setActiveTab('view');
      setSearchQuery('');
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);
    } else {
      setWorkspaceData(null);
    }
  }, [selectedAssignmentId, loadWorkspace]);

  // Handle Mark Change
  const handleMarkChange = (studentId: string, field: 'ia1' | 'ia2' | 'assignment', value: string) => {
    // Only allow numbers and decimal point
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    setEditableMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  // Save Marks
  const handleSaveMarks = async () => {
    if (!selectedAssignmentId || !workspaceData) return;
    try {
      setSavingMarks(true);
      setSaveSuccessMsg(null);
      setSaveErrorMsg(null);

      const payload = Object.entries(editableMarks).map(([studentId, marks]) => ({
        studentId,
        ia1: marks.ia1 !== '' ? Number(marks.ia1) : 0,
        ia2: marks.ia2 !== '' ? Number(marks.ia2) : 0,
        assignment: marks.assignment !== '' ? Number(marks.assignment) : 0,
      }));

      const updated = await facultyService.saveMarks(selectedAssignmentId, { marks: payload });
      setWorkspaceData(updated);
      setSaveSuccessMsg('Continuous internal assessment marks saved successfully!');

      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to save marks:', err);
      setSaveErrorMsg(err.response?.data?.error || err.message || 'Failed to save marks.');
    } finally {
      setSavingMarks(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!workspaceData || !workspaceData.students) return;

    const headers = ['USN', 'Student Name', 'IA-1 (20M)', 'IA-2 (20M)', 'Assignment (10M)', 'Total CIE (50M)'];
    const rows = workspaceData.students.map((s) => [
      s.usn,
      `"${s.studentName}"`,
      s.ia1 ?? 0,
      s.ia2 ?? 0,
      s.assignment ?? 0,
      s.totalCie ?? 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Continuous_Marks_${workspaceData.assignment.subjectCode}_Sem${workspaceData.assignment.semester}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!workspaceData) return [];
    return workspaceData.students.filter((s) => {
      return (
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.usn.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [workspaceData, searchQuery]);

  const availableSemesters = Array.from(new Set(courses.map((c) => c.semester))).sort();

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Continuous Assessment Courses
            </span>
            <div className="text-3xl font-black mt-0.5">
              {courses.length} <span className="text-sm font-semibold text-neutral-400">subjects</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadCourses()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Filter className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>FILTER MARKS SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Semesters</option>
            {availableSemesters.map((sem) => (
              <option key={sem} value={String(sem)}>
                Semester {sem}
              </option>
            ))}
          </select>

          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-bold text-neutral-600 dark:text-neutral-300">
            Showing <span className="text-neutral-900 dark:text-white font-black">{courses.length}</span>{' '}
            {courses.length === 1 ? 'subject' : 'subjects'}
          </div>
        </div>
      </div>

      {/* ── Bitwise Marks Subject Table ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            Internal Assessment & Bitwise Marks Breakdown
          </span>
          <span className="text-xs text-neutral-400 font-medium">Academic Year 2026-27</span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-2" />
            <p className="text-xs font-semibold">Loading continuous marks roster...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <Award className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              No continuous marks courses assigned
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Courses with Marks & Bit-Wise Access granted by HOD will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/75 dark:bg-neutral-800/40 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Subject Name</th>
                  <th className="py-3.5 px-6">Subject Code</th>
                  <th className="py-3.5 px-6 text-center">Semester</th>
                  <th className="py-3.5 px-6 text-center">Section</th>
                  <th className="py-3.5 px-6 text-center">Evaluations</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
                {courses.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group"
                  >
                    <td className="py-4 px-6 font-bold text-neutral-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-neutral-900 dark:text-white">
                            {sub.subjectName}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-normal">
                            {sub.totalStudents} Registered Students • {sub.credits} Credits
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        {sub.subjectCode}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-neutral-800 dark:text-neutral-200">
                      Sem {sub.semester}
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                      {sub.section}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                          IA-1 (20M)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                          IA-2 (20M)
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                          Assignment (10M)
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedAssignmentId(sub.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 font-bold text-xs transition-colors border border-violet-200 dark:border-violet-800 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage Marks</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Marks Workspace Modal ───────────────────────────────────────────── */}
      {selectedAssignmentId &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between bg-neutral-50/70 dark:bg-neutral-800/40">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                      {workspaceData?.assignment?.subjectCode || '...'}
                    </span>
                    <span className="text-xs font-bold text-neutral-500">
                      Sem {workspaceData?.assignment?.semester} • {workspaceData?.assignment?.section} • AY{' '}
                      {workspaceData?.assignment?.academicYear}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                    {workspaceData?.assignment?.subjectName || 'Continuous Marks Workspace'}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedAssignmentId(null)}
                    className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Mode Tabs & Action Bar */}
              <div className="px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('view')}
                    className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'view'
                        ? 'border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/30'
                        : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    Marks Overview & Total CIE
                  </button>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'edit'
                        ? 'border-violet-600 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/30'
                        : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Enter / Edit Marks</span>
                  </button>
                </div>

                {activeTab === 'view' && (
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1 px-3 py-1.5 mb-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {loadingWorkspace ? (
                  <div className="py-16 flex flex-col items-center justify-center text-neutral-400">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-2" />
                    <p className="text-xs font-semibold">Loading continuous marks workspace...</p>
                  </div>
                ) : (
                  <>
                    {/* Alerts */}
                    {saveSuccessMsg && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{saveSuccessMsg}</span>
                      </div>
                    )}
                    {saveErrorMsg && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{saveErrorMsg}</span>
                      </div>
                    )}

                    {/* Search filter */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search student by Name or USN..."
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>

                    {/* ── TAB 1: READ ONLY / MARKS OVERVIEW ────────────────────── */}
                    {activeTab === 'view' && (
                      <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                            Enrolled Students & Continuous CIE Breakdown
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            Total Enrolled: {workspaceData?.students?.length ?? 0}
                          </span>
                        </div>

                        {filteredStudents.length === 0 ? (
                          <div className="p-8 text-center text-neutral-400 text-xs font-semibold">
                            No enrolled students found.
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[380px]">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider z-10">
                                <tr>
                                  <th className="py-2.5 px-4">USN</th>
                                  <th className="py-2.5 px-4">Student Name</th>
                                  <th className="py-2.5 px-4 text-center">IA-1 (20M)</th>
                                  <th className="py-2.5 px-4 text-center">IA-2 (20M)</th>
                                  <th className="py-2.5 px-4 text-center">Assignment (10M)</th>
                                  <th className="py-2.5 px-4 text-center">Total CIE (50M)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
                                {filteredStudents.map((s) => (
                                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                    <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                                      {s.usn}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                                      {s.studentName}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                      {s.ia1 || 0}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                      {s.ia2 || 0}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                      {s.assignment || 0}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-black text-violet-600 dark:text-violet-400">
                                      {s.totalCie || 0}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── TAB 2: INTERACTIVE EDIT MARKS VIEW ───────────────────── */}
                    {activeTab === 'edit' && (
                      <div className="space-y-4">
                        <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden">
                          <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                              Enter Internal Assessment Marks (Auto Calculates Total CIE)
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              Limits: IA1 ≤ 20, IA2 ≤ 20, Assignment ≤ 10
                            </span>
                          </div>

                          <div className="overflow-x-auto max-h-[380px]">
                            <table className="w-full text-left border-collapse">
                              <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider z-10">
                                <tr>
                                  <th className="py-2.5 px-4">USN</th>
                                  <th className="py-2.5 px-4">Student Name</th>
                                  <th className="py-2.5 px-4 text-center">IA-1 (Max 20)</th>
                                  <th className="py-2.5 px-4 text-center">IA-2 (Max 20)</th>
                                  <th className="py-2.5 px-4 text-center">Assignment (Max 10)</th>
                                  <th className="py-2.5 px-4 text-center">CIE Total (50M)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
                                {filteredStudents.map((s) => {
                                  const row = editableMarks[s.id] || { ia1: '', ia2: '', assignment: '' };
                                  const numIa1 = Number(row.ia1) || 0;
                                  const numIa2 = Number(row.ia2) || 0;
                                  const numAss = Number(row.assignment) || 0;
                                  const total = Number((numIa1 + numIa2 + numAss).toFixed(1));

                                  const isIa1Invalid = numIa1 > 20 || numIa1 < 0;
                                  const isIa2Invalid = numIa2 > 20 || numIa2 < 0;
                                  const isAssInvalid = numAss > 10 || numAss < 0;

                                  return (
                                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                      <td className="py-2 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                                        {s.usn}
                                      </td>
                                      <td className="py-2 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                                        {s.studentName}
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                        <input
                                          type="text"
                                          value={row.ia1}
                                          onChange={(e) => handleMarkChange(s.id, 'ia1', e.target.value)}
                                          placeholder="0"
                                          className={`w-16 text-center py-1 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                                            isIa1Invalid
                                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-600 focus:ring-rose-500'
                                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-violet-500'
                                          }`}
                                        />
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                        <input
                                          type="text"
                                          value={row.ia2}
                                          onChange={(e) => handleMarkChange(s.id, 'ia2', e.target.value)}
                                          placeholder="0"
                                          className={`w-16 text-center py-1 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                                            isIa2Invalid
                                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-600 focus:ring-rose-500'
                                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-violet-500'
                                          }`}
                                        />
                                      </td>
                                      <td className="py-2 px-4 text-center">
                                        <input
                                          type="text"
                                          value={row.assignment}
                                          onChange={(e) => handleMarkChange(s.id, 'assignment', e.target.value)}
                                          placeholder="0"
                                          className={`w-16 text-center py-1 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                                            isAssInvalid
                                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-600 focus:ring-rose-500'
                                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-violet-500'
                                          }`}
                                        />
                                      </td>
                                      <td className="py-2 px-4 text-center font-mono font-black text-violet-600 dark:text-violet-400">
                                        {total}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Save Marks Button */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleSaveMarks}
                            disabled={savingMarks}
                            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {savingMarks ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving Continuous Marks...</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                <span>Save Assessment Marks</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
                <span className="text-[11px] text-neutral-400">
                  Continuous assessment records stored in JCER ERP database.
                </span>
                <button
                  onClick={() => setSelectedAssignmentId(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close Workspace
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default FacultyBitwiseMarksPage;
