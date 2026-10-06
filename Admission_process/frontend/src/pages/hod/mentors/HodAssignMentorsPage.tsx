import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Building2,
  GraduationCap,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Info,
  X,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import mentorService, {
  EligibleStudentItem,
  DepartmentItem,
  EligibleFacultyItem,
} from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const HodAssignMentorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { academicYear } = useAcademicYear();

  // Filters State
  const [semester, setSemester] = useState<string>(searchParams.get('semester') || '');
  const [section, setSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('UNASSIGNED');

  // Data State
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [students, setStudents] = useState<EligibleStudentItem[]>([]);
  const [authorizedSemesters, setAuthorizedSemesters] = useState<number[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Range Selection Helper State
  const [rangeFrom, setRangeFrom] = useState<string>('1');
  const [rangeTo, setRangeTo] = useState<string>('');
  const [rangeError, setRangeError] = useState<string>('');

  // Step 2 & 3 State
  const [loadingDepartments, setLoadingDepartments] = useState<boolean>(false);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const [loadingFaculty, setLoadingFaculty] = useState<boolean>(false);
  const [facultyList, setFacultyList] = useState<EligibleFacultyItem[]>([]);
  const [facultySearch, setFacultySearch] = useState<string>('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');

  // Confirmation Modal / Review State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');

  // Fetch Departments on mount
  useEffect(() => {
    const loadDepts = async () => {
      setLoadingDepartments(true);
      try {
        const depts = await mentorService.getMentorCoreDepartments();
        setDepartments(depts);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepts();
  }, []);

  // Fetch Students whenever filters change
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await mentorService.getEligibleStudents({
        academicYear,
        semester: semester ? Number(semester) : undefined,
        section: section !== 'ALL' ? section : undefined,
        search: searchQuery,
        status: statusFilter,
        limit: 150,
      });
      setStudents(res.students);
      setAuthorizedSemesters(res.authorizedSemesters);
      if (!semester && res.authorizedSemesters.length > 0) {
        setSemester(String(res.authorizedSemesters[0]));
      }
    } catch (err: any) {
      console.error('Failed to load students:', err);
      toast.error(err.response?.data?.error || 'Failed to load students.');
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [academicYear, semester, section, statusFilter]);

  // Load Faculty when Core Department changes
  useEffect(() => {
    if (!selectedDeptId) {
      setFacultyList([]);
      setSelectedFacultyId('');
      return;
    }
    const loadFaculty = async () => {
      setLoadingFaculty(true);
      setSelectedFacultyId('');
      try {
        const res = await mentorService.getEligibleFaculty(selectedDeptId, facultySearch, academicYear);
        setFacultyList(res);
      } catch (err: any) {
        console.error('Failed to load faculty:', err);
        toast.error('Failed to load eligible faculty for selected department.');
      } finally {
        setLoadingFaculty(false);
      }
    };
    loadFaculty();
  }, [selectedDeptId, facultySearch, academicYear]);

  // Clear selections when semester changes
  const handleSemesterChange = (newSem: string) => {
    setSemester(newSem);
    setSelectedStudentIds([]);
  };

  // Student Selection helpers
  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  // Range Selection Helper Handler
  const handleSelectRange = () => {
    setRangeError('');
    if (!students || students.length === 0) {
      setRangeError('No students available in the current table.');
      return;
    }

    const fromNum = parseInt(rangeFrom, 10);
    const toNum = parseInt(rangeTo, 10);

    if (isNaN(fromNum) || isNaN(toNum)) {
      setRangeError('Please enter valid numeric values for From and To.');
      return;
    }

    if (fromNum < 1 || toNum < 1) {
      setRangeError('Range values must be at least 1.');
      return;
    }

    if (fromNum > toNum) {
      setRangeError(`"From" (${fromNum}) cannot be greater than "To" (${toNum}).`);
      return;
    }

    if (toNum > students.length) {
      setRangeError(`Range must be between 1 and ${students.length}.`);
      return;
    }

    // 1-indexed range from current visible table order
    const targetStudents = students.slice(fromNum - 1, toNum);
    const targetIds = targetStudents.map((s) => s.id);

    // Merge with existing manual selections
    setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    toast.success(`Selected rows ${fromNum} to ${toNum} (${targetIds.length} student${targetIds.length === 1 ? '' : 's'}).`);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
    setRangeError('');
  };

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));
  const reassignedStudents = selectedStudents.filter((s) => s.isAssigned);
  const selectedFaculty = facultyList.find((f) => f.facultyId === selectedFacultyId);
  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  // Submit Handler
  const handleConfirmAssignment = async () => {
    if (selectedStudentIds.length === 0 || !selectedFacultyId || !selectedDeptId) {
      toast.error('Please complete all steps before confirming.');
      return;
    }

    setAssigning(true);
    try {
      const res = await mentorService.bulkAssignMentors({
        studentIds: selectedStudentIds,
        facultyId: selectedFacultyId,
        mentorDepartmentId: selectedDeptId,
        academicYear,
        semester: semester ? Number(semester) : undefined,
        notes: assignmentNotes,
      });

      toast.success(res.message || 'Mentor assignments saved successfully!');
      setShowConfirmModal(false);
      setSelectedStudentIds([]);
      setAssignmentNotes('');
      // Refresh students
      fetchStudents();
    } catch (err: any) {
      console.error('Assignment error:', err);
      toast.error(err.response?.data?.error || 'Failed to save mentor assignments.');
    } finally {
      setAssigning(false);
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
                Assign Mentors
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Select students semester-wise, pick a mentor core department and eligible faculty, then confirm.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/hod/mentors/allocations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 text-xs font-bold transition shadow-sm"
          >
            <span>View Allocations Table</span>
          </Link>
        </div>
      </div>

      {/* ── WORKFLOW STEPPER INDICATOR ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 Indicator */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            selectedStudentIds.length > 0
              ? 'border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`size-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                selectedStudentIds.length > 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}
            >
              1
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Step 1: Select Students</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                {selectedStudentIds.length > 0
                  ? `${selectedStudentIds.length} student(s) selected`
                  : 'Select unassigned or assigned students'}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 Indicator */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            selectedDeptId
              ? 'border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`size-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                selectedDeptId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}
            >
              2
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Step 2: Mentor Core Dept</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                {selectedDept ? selectedDept.name : 'Choose permanent department'}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 Indicator */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            selectedFacultyId
              ? 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`size-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                selectedFacultyId
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
              }`}
            >
              3
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Step 3: Faculty Mentor</div>
              <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                {selectedFaculty ? selectedFaculty.name : 'Pick eligible faculty member'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: SELECT STUDENTS SECTION ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="size-4 text-indigo-500" />
              <span>Step 1: Select Students</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Filter eligible students in your authorized department scope.
            </p>
          </div>

          {selectedStudentIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                {selectedStudentIds.length} Selected
              </span>
              <button
                onClick={() => setSelectedStudentIds([])}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200 underline font-medium"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* ── Filter Bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Semester Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Semester *
            </label>
            <select
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
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
              onChange={(e) => setSection(e.target.value)}
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

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Allocation Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="UNASSIGNED">Unassigned Only (Recommended)</option>
              <option value="ASSIGNED">Already Assigned</option>
              <option value="ALL">All Students</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                placeholder="Search by student name or USN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ── Compact Range Selection Helper Card ── */}
        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/70 dark:bg-neutral-800/30 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-neutral-100">
                  Range Selection Helper
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {students.length} Visible Row{students.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Enter a row range to quickly check students in the table below. (Selection helper only — does not save until you click Allocate.)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <label htmlFor="range-from" className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                  From:
                </label>
                <input
                  id="range-from"
                  type="number"
                  min="1"
                  max={students.length || 1}
                  value={rangeFrom}
                  onChange={(e) => {
                    setRangeFrom(e.target.value);
                    setRangeError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectRange()}
                  placeholder="1"
                  className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-bold text-center text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="range-to" className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                  To:
                </label>
                <input
                  id="range-to"
                  type="number"
                  min="1"
                  max={students.length || 1}
                  value={rangeTo}
                  onChange={(e) => {
                    setRangeTo(e.target.value);
                    setRangeError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectRange()}
                  placeholder={students.length > 0 ? String(Math.min(17, students.length)) : '1'}
                  className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-bold text-center text-slate-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectRange}
                disabled={students.length === 0}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-xs cursor-pointer select-none"
              >
                Select Range
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                disabled={selectedStudentIds.length === 0}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 disabled:opacity-50 transition shadow-xs cursor-pointer select-none"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {rangeError && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-in fade-in duration-150">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{rangeError}</span>
            </div>
          )}
        </div>

        {/* ── Student Selection Table ── */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800 max-h-[380px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] dark:bg-neutral-950 sticky top-0 z-10 text-white font-extrabold uppercase tracking-wider text-[11px] border-b border-neutral-800 backdrop-blur-sm">
              <tr>
                <th className="py-3 px-4 w-10 text-white">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="flex items-center text-white hover:text-indigo-400"
                  >
                    {students.length > 0 && selectedStudentIds.length === students.length ? (
                      <CheckSquare className="size-4 text-indigo-400" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 text-white font-extrabold">Student Name</th>
                <th className="py-3 px-4 text-white font-extrabold">USN</th>
                <th className="py-3 px-4 text-white font-extrabold">Department</th>
                <th className="py-3 px-4 text-center text-white font-extrabold">Sem / Sec</th>
                <th className="py-3 px-4 text-white font-extrabold">Current Mentor</th>
                <th className="py-3 px-4 text-center text-white font-extrabold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-slate-700 dark:text-neutral-300">
              {loadingStudents ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading eligible students...</span>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((st) => {
                  const isChecked = selectedStudentIds.includes(st.id);
                  return (
                    <tr
                      key={st.id}
                      onClick={() => handleToggleStudent(st.id)}
                      className={`cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50/60 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleStudent(st.id)}
                          className="flex items-center text-slate-500"
                        >
                          {isChecked ? (
                            <CheckSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {st.name}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-neutral-300">
                        {st.usn}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-neutral-400">
                        {st.departmentCode}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold">
                        Sem {st.semester} - {st.section}
                      </td>
                      <td className="py-3 px-4">
                        {st.currentMentor ? (
                          <div className="text-[11px]">
                            <span className="font-bold text-slate-800 dark:text-neutral-200">
                              {st.currentMentor.facultyName}
                            </span>
                            <span className="text-slate-400 dark:text-neutral-500 block text-[10px]">
                              ({st.currentMentor.coreDepartmentCode})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {st.isAssigned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No students match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Dynamic Count Summary Bar (Outside & Below the Table) ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200/90 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-850/70 text-xs text-slate-600 dark:text-neutral-300 shadow-2xs select-none">
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
            <span>
              Total: <strong className="font-extrabold text-slate-900 dark:text-white">{students.length}</strong> student{students.length === 1 ? '' : 's'}
            </span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              Unassigned: <strong className="font-extrabold">{students.filter((s) => !s.isAssigned).length}</strong>
            </span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
              Assigned: <strong className="font-extrabold">{students.filter((s) => s.isAssigned).length}</strong>
            </span>
            {reassignedStudents.length > 0 && (
              <>
                <span className="text-slate-300 dark:text-neutral-700">•</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  Reassigning: <strong className="font-extrabold">{reassignedStudents.length}</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>
              Selected: <strong className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{selectedStudentIds.length}</strong> of {students.length}
            </span>
            {selectedStudentIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── STEP 2 & 3: SELECT MENTOR CORE DEPARTMENT & FACULTY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 2: Mentor Core Department */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="size-4 text-indigo-500" />
              <span>Step 2: Mentor Core Department *</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Select the faculty member's permanent/core department from database records.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
              Mentor Core Department *
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={loadingDepartments}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select Core Department —</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1.5">
              Only faculty actively registered in this core department will be available in Step 3.
            </p>
          </div>
        </div>

        {/* Step 3: Select Faculty Member */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="size-4 text-indigo-500" />
              <span>Step 3: Select Faculty Member *</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Only active and eligible faculty belonging to the selected department will appear.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
              Faculty Member *
            </label>
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              disabled={!selectedDeptId || loadingFaculty}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">
                {!selectedDeptId
                  ? '— Please select core department first —'
                  : loadingFaculty
                  ? 'Loading faculty...'
                  : facultyList.length === 0
                  ? 'No eligible faculty found'
                  : '— Select Faculty Member —'}
              </option>
              {facultyList.map((f) => (
                <option key={f.facultyId} value={f.facultyId}>
                  {f.name} ({f.designation}) — {f.currentMenteeCount} active mentees
                </option>
              ))}
            </select>
          </div>

          {/* Mentor Workload Information Card */}
          {selectedFaculty && (
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-xs text-slate-900 dark:text-white">
                  {selectedFaculty.name}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  {selectedFaculty.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-indigo-100/60 dark:border-indigo-900/40">
                <div className="p-2 rounded-lg bg-white/80 dark:bg-neutral-900/80">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Current Mentees</div>
                  <div className="text-base font-black text-slate-800 dark:text-white">
                    {selectedFaculty.currentMenteeCount}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/80 dark:bg-neutral-900/80">
                  <div className="text-[10px] text-indigo-600 uppercase font-bold">+ New Selected</div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    +{selectedStudentIds.length}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/80 dark:bg-neutral-900/80">
                  <div className="text-[10px] text-emerald-600 uppercase font-bold">New Total</div>
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {selectedFaculty.currentMenteeCount + selectedStudentIds.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ASSIGNMENT CONFIRMATION ACTION PANEL ── */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            Ready to review and save mentor allocation?
          </div>
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            {selectedStudentIds.length} student(s) selected •{' '}
            {selectedFaculty ? `Assigned to: ${selectedFaculty.name}` : 'No faculty selected yet'}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedStudentIds([])}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-bold hover:bg-slate-50 transition"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={selectedStudentIds.length === 0 || !selectedFacultyId || !selectedDeptId}
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Sparkles className="size-4" />
            <span>Review & Confirm Allocation</span>
          </button>
        </div>
      </div>

      {/* ── CONFIRMATION & REVIEW MODAL ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="size-5 text-indigo-500" />
                  <span>Confirm Mentor Allocation</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Please review the assignment details before saving to the database.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Reassignment Warning if any */}
            {reassignedStudents.length > 0 && (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <div className="font-bold">Reassignment Notice</div>
                  <div>
                    {reassignedStudents.length} of the selected students already have an active mentor.
                    Confirming will mark their previous assignment as reassigned and record the audit history.
                  </div>
                </div>
              </div>
            )}

            {/* Summary Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-slate-100 dark:border-neutral-800">
              <div>
                <span className="text-slate-400 block font-medium">Semester / Academic Year</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">
                  Semester {semester} ({academicYear})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Selected Mentor Core Department</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">
                  {selectedDept?.name} ({selectedDept?.code})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Selected Faculty Mentor</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedFaculty?.name} ({selectedFaculty?.designation})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total Students Selected</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedStudentIds.length} Students
                </span>
              </div>
            </div>

            {/* Selected Students List Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Selected Students List ({selectedStudents.length})
              </span>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-100 dark:border-neutral-800 divide-y divide-slate-100 dark:divide-neutral-800 p-2">
                {selectedStudents.map((st) => (
                  <div key={st.id} className="py-1.5 px-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-neutral-200">{st.name}</span>
                      <span className="text-[11px] font-mono text-slate-400 ml-2">({st.usn})</span>
                    </div>
                    {st.isAssigned && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        Old: {st.currentMentor?.facultyName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                Allocation Notes (Optional)
              </label>
              <textarea
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Add any specific instructions or allocation notes..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                disabled={assigning}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-600 dark:text-neutral-400 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning}
                onClick={handleConfirmAssignment}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50"
              >
                {assigning ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Saving Assignments...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Confirm & Save Assignments</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodAssignMentorsPage;
