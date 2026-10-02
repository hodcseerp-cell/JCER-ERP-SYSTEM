import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarCheck,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  UserCheck,
  UserX,
  Search,
  Calendar,
  Clock,
  Save,
  ChevronRight,
  ArrowLeft,
  Info,
  Users,
  History,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import facultyService, {
  FacultyAssignmentItem,
  FacultyAttendanceWorkspaceData,
  StudentAttendanceRow,
  RecordedSessionItem,
} from '../../services/faculty.service';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const FacultyAttendancePage: React.FC = () => {
  const { academicYear, setAcademicYear, academicYears } = useAcademicYear();
  const activeAY = academicYear || '2026-27';

  // Construct available academic year options list
  const availableYearOptions = useMemo(() => {
    const list = [...academicYears];
    if (!list.some((y) => y.year === activeAY)) {
      list.unshift({ id: `ay-${activeAY}`, year: activeAY });
    }
    return list;
  }, [academicYears, activeAY]);

  const handleAcademicYearChange = (newYear: string) => {
    if (newYear === activeAY) return;
    setAcademicYear(newYear);
    // Explicitly reset any drill-down state so that we don't display stale semester/subject/workspace
    setSelectedAssignmentId(null);
    setSelectedSubjectId(null);
    setSelectedSemNum(null);
    setWorkspaceData(null);
    setCurrentView('SEMESTERS');
  };

  // Reset drilldown and workspace state when active academic year changes
  useEffect(() => {
    setSelectedAssignmentId(null);
    setSelectedSubjectId(null);
    setSelectedSemNum(null);
    setWorkspaceData(null);
    setCurrentView('SEMESTERS');
  }, [activeAY]);

  // Navigation View State: 'SEMESTERS' | 'SUBJECTS' | 'SECTIONS' | 'WORKSPACE'
  const [currentView, setCurrentView] = useState<'SEMESTERS' | 'SUBJECTS' | 'SECTIONS' | 'WORKSPACE'>('SEMESTERS');

  // Selected Scope States
  const [selectedSemNum, setSelectedSemNum] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Core Data States
  const [courses, setCourses] = useState<FacultyAssignmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Workspace Data & Date/Period State
  const [workspaceData, setWorkspaceData] = useState<FacultyAttendanceWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [showPreviousDetails, setShowPreviousDetails] = useState<boolean>(false);

  // Active Session Student Status Map: { [studentId]: 'PRESENT' | 'ABSENT' | 'EXCUSED' }
  const [sessionAttendance, setSessionAttendance] = useState<{ [studentId: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Load all attendance courses for active AY
  const loadCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await facultyService.getAttendanceCourses(undefined, activeAY);
      setCourses(list || []);
    } catch (err: any) {
      console.error('Failed to load attendance courses:', err);
      const errMsg = err.response?.data?.error || 'Unable to load attendance data. Please refresh and try again.';
      setLoadError(errMsg);
      setNotification({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [activeAY]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load Workspace details for a selected assignment
  const loadWorkspace = useCallback(async (assignmentId: string) => {
    setLoadingWorkspace(true);
    try {
      const data = await facultyService.getAttendanceWorkspace(assignmentId);
      setWorkspaceData(data);
    } catch (err: any) {
      console.error('Failed to load workspace:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to load section attendance workspace.',
      });
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      loadWorkspace(selectedAssignmentId);
    } else {
      setWorkspaceData(null);
    }
  }, [selectedAssignmentId, loadWorkspace]);

  // Existing session for current selectedDate and selectedPeriod
  const existingSession = useMemo(() => {
    if (!workspaceData?.recordedSessions) return null;
    return (
      workspaceData.recordedSessions.find(
        (s) => s.date === selectedDate && s.sessionPeriod === Number(selectedPeriod)
      ) || null
    );
  }, [workspaceData, selectedDate, selectedPeriod]);

  // Initialize or reload student attendance map for (selectedDate, selectedPeriod)
  useEffect(() => {
    if (!workspaceData || !workspaceData.students) return;

    const initialMap: { [studentId: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' } = {};

    workspaceData.students.forEach((st) => {
      if (existingSession) {
        const isAbsent = (existingSession.absentStudents || []).some((a) => a.id === st.id);
        initialMap[st.id] = isAbsent ? 'ABSENT' : 'PRESENT';
      } else {
        // Default all students to PRESENT initially
        initialMap[st.id] = 'PRESENT';
      }
    });

    setSessionAttendance(initialMap);
  }, [workspaceData, existingSession]);

  // Semester Grouping
  const semestersGroup = useMemo(() => {
    const map: Record<number, FacultyAssignmentItem[]> = {};
    courses.forEach((c) => {
      if (!map[c.semester]) map[c.semester] = [];
      map[c.semester].push(c);
    });
    return map;
  }, [courses]);

  const semesterNumbers = useMemo(() => {
    return Object.keys(semestersGroup)
      .map(Number)
      .sort((a, b) => a - b);
  }, [semestersGroup]);

  // Subject Grouping for Selected Semester
  const semesterSubjectsMap = useMemo(() => {
    if (selectedSemNum === null) return {};
    const semCourses = semestersGroup[selectedSemNum] || [];
    const map: Record<string, FacultyAssignmentItem[]> = {};
    semCourses.forEach((c) => {
      if (!map[c.subjectId]) map[c.subjectId] = [];
      map[c.subjectId].push(c);
    });
    return map;
  }, [selectedSemNum, semestersGroup]);

  // Selected Assignment Item
  const selectedAssignmentItem = useMemo(() => {
    if (!selectedAssignmentId) return null;
    return courses.find((c) => c.id === selectedAssignmentId) || null;
  }, [selectedAssignmentId, courses]);

  // Selected Subject Details
  const selectedSubjectItem = useMemo(() => {
    if (selectedSubjectId && selectedSemNum !== null) {
      const subSections = semesterSubjectsMap[selectedSubjectId] || [];
      if (subSections.length > 0) return subSections[0];
      const match = courses.find((c) => c.subjectId === selectedSubjectId);
      if (match) return match;
    }
    if (selectedAssignmentItem) return selectedAssignmentItem;
    if (selectedSubjectId) {
      return courses.find((c) => c.subjectId === selectedSubjectId) || null;
    }
    return null;
  }, [selectedSubjectId, selectedSemNum, semesterSubjectsMap, selectedAssignmentItem, courses]);

  // Dashboard Overview Metrics
  const totalAssignedSubjects = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => set.add(c.subjectId));
    return set.size;
  }, [courses]);

  const totalTeachingSections = courses.length;

  const completedTodayCount = useMemo(() => {
    return courses.filter((c) => c.completedToday).length;
  }, [courses]);

  const pendingTodayCount = useMemo(() => {
    return Math.max(0, totalTeachingSections - completedTodayCount);
  }, [totalTeachingSections, completedTodayCount]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Previous recorded session for this section
  const previousClassInfo = useMemo(() => {
    if (!workspaceData || !workspaceData.recordedSessions) return null;
    const pastSessions = workspaceData.recordedSessions.filter(
      (s) => s.date < selectedDate || (s.date === selectedDate && s.sessionPeriod < selectedPeriod)
    );
    return pastSessions.length > 0 ? pastSessions[0] : null;
  }, [workspaceData, selectedDate, selectedPeriod]);

  // Navigation Handlers (Preserves 4-level workflow)
  const handleOpenSemester = (semNum: number) => {
    setSelectedSemNum(semNum);
    setSelectedSubjectId(null);
    setSelectedAssignmentId(null);
    setCurrentView('SUBJECTS');
  };

  const handleOpenSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedAssignmentId(null);
    setCurrentView('SECTIONS');
  };

  const handleOpenWorkspace = (assignmentId: string, customDate?: string, customPeriod?: number) => {
    const target = courses.find((c) => c.id === assignmentId);
    if (target) {
      setSelectedSemNum(target.semester);
      setSelectedSubjectId(target.subjectId);
    }
    setSelectedAssignmentId(assignmentId);
    if (customDate) setSelectedDate(customDate);
    else setSelectedDate(todayStr);
    if (customPeriod) setSelectedPeriod(customPeriod);
    else setSelectedPeriod(1);
    setSearchQuery('');
    setShowPreviousDetails(false);
    setCurrentView('WORKSPACE');
  };

  const handleBackToSemesters = () => {
    setSelectedSemNum(null);
    setSelectedSubjectId(null);
    setSelectedAssignmentId(null);
    setCurrentView('SEMESTERS');
  };

  const handleBackToSubjects = () => {
    if (selectedAssignmentItem) {
      setSelectedSemNum(selectedAssignmentItem.semester);
    }
    setSelectedSubjectId(null);
    setSelectedAssignmentId(null);
    setCurrentView('SUBJECTS');
  };

  const handleBackToSections = () => {
    if (selectedAssignmentItem) {
      setSelectedSemNum(selectedAssignmentItem.semester);
      setSelectedSubjectId(selectedAssignmentItem.subjectId);
    }
    setSelectedAssignmentId(null);
    setCurrentView('SECTIONS');
  };

  const handleSmartBack = () => {
    if (currentView === 'WORKSPACE') {
      handleBackToSections();
    } else if (currentView === 'SECTIONS') {
      handleBackToSubjects();
    } else if (currentView === 'SUBJECTS') {
      handleBackToSemesters();
    }
  };

  // Mark All Students
  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    if (!workspaceData) return;
    const updated: { [studentId: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' } = {};
    workspaceData.students.forEach((st) => {
      updated[st.id] = status;
    });
    setSessionAttendance(updated);
  };

  // Toggle individual student
  const handleToggleStudent = (studentId: string) => {
    setSessionAttendance((prev) => {
      const current = prev[studentId] || 'PRESENT';
      return {
        ...prev,
        [studentId]: current === 'PRESENT' ? 'ABSENT' : 'PRESENT',
      };
    });
  };

  // Real-time Summary Counts
  const currentTotalCount = workspaceData?.students?.length || 0;
  const currentPresentCount = useMemo(() => {
    return Object.values(sessionAttendance).filter((st) => st === 'PRESENT').length;
  }, [sessionAttendance]);
  const currentAbsentCount = currentTotalCount - currentPresentCount;
  const currentAttendancePct =
    currentTotalCount > 0 ? Number(((currentPresentCount / currentTotalCount) * 100).toFixed(1)) : 100.0;

  // Save Attendance Submission
  const handleSaveAttendance = async () => {
    if (!selectedAssignmentId || !workspaceData) return;

    if (currentAbsentCount > 0) {
      const confirmMsg = `You are marking ${currentAbsentCount} student(s) ABSENT out of ${currentTotalCount}.\n\nPresent: ${currentPresentCount}\nAbsent: ${currentAbsentCount}\n\nDo you want to proceed and save?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setSubmitting(true);
    try {
      const records = Object.entries(sessionAttendance).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const updated = await facultyService.saveAttendance(selectedAssignmentId, {
        date: selectedDate,
        sessionPeriod: Number(selectedPeriod),
        records,
      });

      setWorkspaceData(updated);
      setNotification({
        type: 'success',
        message: `Attendance saved successfully for ${selectedDate} (Period ${selectedPeriod}): ${currentPresentCount} Present · ${currentAbsentCount} Absent.`,
      });
      await loadCourses();
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to save attendance session.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Students for Workspace Table
  const filteredWorkspaceStudents = useMemo(() => {
    if (!workspaceData) return [];
    return workspaceData.students.filter((st) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const matchName = st.studentName.toLowerCase().includes(q);
      const matchUsn = st.usn.toLowerCase().includes(q);
      return matchName || matchUsn;
    });
  }, [workspaceData, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (!workspaceData || !workspaceData.students) return;

    const headers = ['SL NO', 'USN', 'Student Name', 'Section', 'Conducted', 'Present', 'Absent', 'Percentage', 'Status'];
    const rows = workspaceData.students.map((st, idx) => [
      idx + 1,
      st.usn,
      `"${st.studentName}"`,
      st.section,
      st.classesConducted,
      st.presentCount,
      st.absentCount,
      `${st.attendancePercentage}%`,
      st.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Attendance_${workspaceData.assignment.subjectCode}_Sec${workspaceData.assignment.section}_Sem${workspaceData.assignment.semester}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl shadow-md flex items-center justify-between transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="font-medium text-sm">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP ATTENDANCE HEADER (Shown ONLY on SEMESTERS Dashboard overview to avoid duplication on detail screens) */}
      {currentView === 'SEMESTERS' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Attendance
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Teaching attendance for assigned subjects and sections • <span className="font-semibold text-indigo-600">CSE Department</span> ({activeAY})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-100 p-1.5 sm:p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden sm:inline">Academic Year:</span>
              <div className="relative inline-flex items-center">
                <select
                  value={activeAY}
                  onChange={(e) => handleAcademicYearChange(e.target.value)}
                  disabled={loading}
                  className="bg-white px-3 py-1 pr-6 rounded-lg text-indigo-950 shadow-2xs font-extrabold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none border-none"
                >
                  {availableYearOptions.map((opt) => (
                    <option key={opt.year} value={opt.year} className="text-slate-900 font-semibold py-1">
                      {opt.year}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-600 absolute right-2 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={loadCourses}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}

      {/* COMPACT BREADCRUMB / CONTEXT CARD (Shown whenever navigating within sub-levels, directly at top) */}
      {currentView !== 'SEMESTERS' && (
        <div className="bg-white px-6 py-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSmartBack}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition border border-slate-200 shadow-2xs cursor-pointer group"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back</span>
            </button>

            <nav className="flex items-center space-x-2 text-sm font-semibold text-slate-500 select-none">
              <button
                type="button"
                onClick={handleBackToSemesters}
                className="hover:text-indigo-600 transition cursor-pointer"
              >
                Attendance
              </button>

              {selectedSemNum !== null && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={handleBackToSubjects}
                    className={`hover:text-indigo-600 transition cursor-pointer ${
                      currentView === 'SUBJECTS' ? 'text-indigo-950 font-bold' : ''
                    }`}
                  >
                    Semester {selectedSemNum}
                  </button>
                </>
              )}

              {selectedSubjectItem && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={handleBackToSections}
                    className={`hover:text-indigo-600 transition cursor-pointer ${
                      currentView === 'SECTIONS' ? 'text-indigo-950 font-bold' : ''
                    }`}
                  >
                    {selectedSubjectItem.subjectName}
                  </button>
                </>
              )}

              {currentView === 'WORKSPACE' && selectedAssignmentItem && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="text-indigo-600 font-extrabold">
                    Section {selectedAssignmentItem.section}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Faculty Teaching Workspace
            </span>
            <button
              type="button"
              onClick={loadCourses}
              disabled={loading}
              title="Refresh Data"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 1: ATTENDANCE DASHBOARD */}
      {currentView === 'SEMESTERS' && (
        <div className="space-y-6">
          {/* Four Colorful Metric Cards (Inspired by Teaching Allocation) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Assigned Subjects */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Assigned Subjects</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{loading ? '-' : totalAssignedSubjects}</h3>
                <p className="text-xs text-slate-500 mt-1">Active Subjects</p>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* 2. Teaching Sections */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Teaching Sections</p>
                <h3 className="text-3xl font-extrabold text-indigo-950 mt-1">{loading ? '-' : totalTeachingSections}</h3>
                <p className="text-xs text-indigo-600 mt-1">Active Sections</p>
              </div>
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Pending Today */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending Today</p>
                <h3 className="text-3xl font-extrabold text-amber-950 mt-1">{loading ? '-' : pendingTodayCount}</h3>
                <p className="text-xs text-amber-600 mt-1">Attendance Due</p>
              </div>
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Completed Today */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed Today</p>
                <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{loading ? '-' : completedTodayCount}</h3>
                <p className="text-xs text-emerald-600 mt-1">Recorded Sessions</p>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* YOUR SEMESTERS SECTION */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider px-1">
              YOUR SEMESTERS
            </h2>

            {loading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-slate-600 font-medium text-sm">Loading attendance assignments...</p>
              </div>
            ) : loadError ? (
              <div className="bg-white p-12 rounded-2xl border border-rose-200 text-center space-y-3 shadow-sm">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-rose-900">Unable to load attendance data</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">{loadError}</p>
                <button
                  onClick={loadCourses}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Again
                </button>
              </div>
            ) : semesterNumbers.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800">No Attendance Courses Assigned</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  You do not have any active teaching assignments for Academic Year {activeAY}. Contact your HOD for subject allocation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {semesterNumbers.map((semNum) => {
                  const semCourses = semestersGroup[semNum] || [];
                  const uniqueSubjectIds = new Set(semCourses.map((c) => c.subjectId));
                  const subjectNames = Array.from(new Set(semCourses.map((c) => c.subjectName)));

                  return (
                    <div
                      key={semNum}
                      onClick={() => handleOpenSemester(semNum)}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-800 font-mono text-base font-extrabold flex items-center justify-center border border-indigo-100">
                            0{semNum}
                          </span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                            AY {activeAY}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            SEMESTER {semNum}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1 font-medium">
                            {uniqueSubjectIds.size} {uniqueSubjectIds.size === 1 ? 'Subject' : 'Subjects'} • {semCourses.length} {semCourses.length === 1 ? 'Section' : 'Sections'}
                          </p>
                        </div>

                        {/* Subject Preview */}
                        <div className="pt-2 text-xs text-slate-600 font-medium">
                          <span className="text-slate-400 block text-[11px] uppercase font-bold mb-1">Assigned Subjects</span>
                          <p className="truncate text-slate-700 font-semibold">
                            {subjectNames.join(' • ')}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                        <span>View Subjects</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 2: SEMESTER SUBJECTS (Inspired by Teaching Allocation Subject Cards) */}
      {currentView === 'SUBJECTS' && selectedSemNum !== null && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">
              SEMESTER {selectedSemNum} SUBJECTS ({Object.keys(semesterSubjectsMap).length})
            </h2>
          </div>

          <div className="space-y-5">
            {Object.entries(semesterSubjectsMap).map(([subjId, secList]) => {
              const firstSubj = secList[0];

              return (
                <div
                  key={subjId}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-6 space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg tracking-wider">
                          {firstSubj.subjectCode}
                        </span>
                        <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                          {firstSubj.type || 'IPCC'}
                        </span>
                        <span className="px-3 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                          {firstSubj.credits} Credits
                        </span>
                        {firstSubj.cycle && (
                          <span className="px-3 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                            {firstSubj.cycle}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900">
                        {firstSubj.subjectName}
                      </h3>
                    </div>

                    <span className="px-3.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-full flex items-center space-x-1.5 self-start">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending Today</span>
                    </span>
                  </div>

                  {/* Assigned Sections */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      ASSIGNED SECTIONS ({secList.length})
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {secList.map((sec) => (
                        <span
                          key={sec.id}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg shadow-2xs"
                        >
                          Section {sec.section} • {sec.totalStudents} Students
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() => handleOpenSubject(subjId)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition flex items-center space-x-2 cursor-pointer"
                    >
                      <span>View Sections</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 3: SUBJECT SECTIONS */}
      {currentView === 'SECTIONS' && selectedSubjectItem && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg tracking-wider">
                  {selectedSubjectItem.subjectCode}
                </span>
                <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                  {selectedSubjectItem.type || 'IPCC'}
                </span>
                <span className="px-3 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                  {selectedSubjectItem.credits} Credits
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
                {selectedSubjectItem.subjectName}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Semester {selectedSubjectItem.semester} • Teaching Sections
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(semesterSubjectsMap[selectedSubjectItem.subjectId] || []).map((sec) => (
              <div
                key={sec.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-extrabold text-slate-900">
                        SECTION {sec.section}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Semester {sec.semester} • {sec.departmentCode}
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-full border border-blue-200 flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{sec.totalStudents} Students</span>
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center space-x-3 text-xs font-medium text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Today's Attendance</span>
                      <span className="text-amber-700 text-[11px]">● Pending for {todayStr}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">AY {sec.academicYear}</span>
                  <button
                    onClick={() => handleOpenWorkspace(sec.id)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition flex items-center space-x-2 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Take Attendance →</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL 4: TAKE ATTENDANCE WORKSPACE */}
      {currentView === 'WORKSPACE' && selectedAssignmentItem && (
        <div className="space-y-6">
          {/* TOP WORKSPACE / SUBJECT DETAIL CARD */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* 1. TOP ROW: Badges on LEFT, Export Button on RIGHT */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-slate-900 text-white font-mono text-xs font-bold rounded-lg tracking-wider">
                  {selectedAssignmentItem.subjectCode}
                </span>
                <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                  {selectedAssignmentItem.type || 'IPCC'}
                </span>
                <span className="px-3 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                  {selectedAssignmentItem.credits} Credits
                </span>
                <span className="px-3.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
                  Section {selectedAssignmentItem.section}
                </span>
                <span className="px-3 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                  Semester {selectedAssignmentItem.semester}
                </span>
              </div>

              <div className="shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="h-[42px] px-4 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-xs cursor-pointer"
                  title="Export Section Attendance CSV Report"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Export Attendance Report</span>
                </button>
              </div>
            </div>

            {/* 2. SUBJECT NAME ON ITS OWN LINE */}
            <div className="pt-0.5">
              <h2 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight capitalize">
                {selectedAssignmentItem.subjectName}
              </h2>
            </div>

            {/* 3. ACADEMIC METADATA ROW WITH REAL DROPDOWN */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 font-medium pb-1">
              <span className="font-bold text-slate-800">
                {selectedAssignmentItem.departmentCode || 'CSE'} Department
              </span>

              <span className="text-slate-300 select-none">•</span>

              {/* Functional Academic Year Dropdown Control */}
              <div className="relative inline-flex items-center">
                <div className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-indigo-200/90 hover:border-indigo-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-xl px-3.5 h-[42px] transition shadow-xs">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                    Academic Year:
                  </span>
                  <select
                    value={activeAY}
                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-indigo-950 focus:outline-none cursor-pointer pr-5 appearance-none"
                  >
                    {availableYearOptions.map((opt) => (
                      <option key={opt.year} value={opt.year} className="text-slate-900 font-semibold py-1">
                        {opt.year}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600 absolute right-3 pointer-events-none" />
                </div>
              </div>

              <span className="text-slate-300 select-none">•</span>

              <span className="font-semibold text-slate-700">
                {currentTotalCount} Enrolled Students
              </span>
            </div>

            {/* 4. DIVIDER */}
            <div className="border-t border-slate-100" />

            {/* 5. ATTENDANCE SESSION ROW */}
            <div className="pt-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Label */}
              <div className="shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  ATTENDANCE SESSION
                </span>
              </div>

              {/* Center: Date & Period controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 h-[42px] hover:bg-slate-100/70 transition shadow-2xs">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600">Date:</span>
                  <input
                    type="date"
                    max={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 h-[42px] hover:bg-slate-100/70 transition shadow-2xs">
                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-600">Period:</span>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer pr-1"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right: Recorded Session Status */}
              <div className="shrink-0 self-start lg:self-auto">
                {existingSession ? (
                  <span className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Recorded Session: {existingSession.presentCount} Present · {existingSession.absentCount} Absent ({existingSession.percentage}%)
                    </span>
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    <span>New Attendance Session</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ATTENDANCE SUMMARY (Three colorful cards matching Teaching Allocation) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Total */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Students</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{currentTotalCount}</h3>
                <p className="text-xs text-slate-400 mt-1">Section Roster</p>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Present */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Present</p>
                <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{currentPresentCount}</h3>
                <p className="text-xs text-emerald-600 mt-1 font-bold">{currentAttendancePct}% Attendance Rate</p>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            {/* Absent */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Absent</p>
                <h3 className="text-3xl font-extrabold text-rose-950 mt-1">{currentAbsentCount}</h3>
                <p className={`text-xs mt-1 font-bold ${currentAbsentCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {currentAbsentCount > 0 ? 'Needs Attention' : 'All Students Present'}
                </p>
              </div>
              <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
                <UserX className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* PREVIOUS CLASS SECTION */}
          {previousClassInfo ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">PREVIOUS CLASS</span>
                    <span className="text-sm font-bold text-slate-800">
                      {previousClassInfo.date} • Period {previousClassInfo.sessionPeriod}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs font-semibold text-slate-600">
                    <strong className="text-emerald-700">{previousClassInfo.presentCount} Present</strong> •{' '}
                    <strong className="text-rose-700">{previousClassInfo.absentCount} Absent</strong> ({previousClassInfo.percentage}%)
                  </span>
                  {previousClassInfo.absentStudents && previousClassInfo.absentStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPreviousDetails((prev) => !prev)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer flex items-center space-x-1"
                    >
                      <span>{showPreviousDetails ? 'Hide Absent List' : 'View Details'}</span>
                      {showPreviousDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {showPreviousDetails && previousClassInfo.absentStudents && previousClassInfo.absentStudents.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-2">
                    Absent Students in Previous Class ({previousClassInfo.absentStudents.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {previousClassInfo.absentStudents.map((abs) => (
                      <span key={abs.id} className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold rounded-lg">
                        {abs.usn} {abs.studentName ? `(${abs.studentName})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 text-xs text-slate-500 font-medium">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>No previous attendance recorded for this section prior to {selectedDate}.</span>
            </div>
          )}

          {/* SEARCH + BULK ACTIONS TOOLBAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student name or USN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => handleMarkAll('PRESENT')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>MARK ALL PRESENT</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('ABSENT')}
                className="px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <UserX className="w-4 h-4 text-rose-600" />
                <span>MARK ALL ABSENT</span>
              </button>
            </div>
          </div>

          {/* STUDENT DATA TABLE (Dark navy header, 58–68px row height, clear borders, hover effect) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingWorkspace ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-slate-600 font-medium text-sm">Loading section student roster...</p>
              </div>
            ) : filteredWorkspaceStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No students found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#111111] text-white font-bold uppercase tracking-wider text-xs border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-5 w-20 text-center">SL NO</th>
                      <th className="py-4 px-5 w-48 font-mono">USN</th>
                      <th className="py-4 px-5">STUDENT NAME</th>
                      <th className="py-4 px-5 w-56 text-right">ATTENDANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredWorkspaceStudents.map((st, idx) => {
                      const isPresent = (sessionAttendance[st.id] || 'PRESENT') === 'PRESENT';

                      return (
                        <tr
                          key={st.id}
                          className={`transition-colors h-[64px] ${
                            isPresent
                              ? 'hover:bg-slate-50/80'
                              : 'bg-rose-50/30 hover:bg-rose-50/60'
                          }`}
                        >
                          <td className="py-3 px-5 font-mono font-bold text-slate-400 text-center">
                            {String(idx + 1).padStart(2, '0')}
                          </td>

                          <td className="py-3 px-5 font-mono font-bold text-indigo-950">
                            {st.usn}
                          </td>

                          <td className="py-3 px-5">
                            <span className="font-bold text-slate-900 block text-sm">
                              {st.studentName}
                            </span>
                            {st.rollNumber && st.rollNumber !== 'N/A' && st.rollNumber !== '' && (
                              <span className="text-xs text-slate-400 font-medium">
                                Roll: {st.rollNumber}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <span
                                className={`text-xs font-extrabold tracking-wider transition-colors duration-200 select-none ${
                                  isPresent ? 'text-emerald-700' : 'text-rose-500'
                                }`}
                              >
                                {isPresent ? 'PRESENT' : 'ABSENT'}
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isPresent}
                                onClick={() => handleToggleStudent(st.id)}
                                title={isPresent ? 'Mark Absent' : 'Mark Present'}
                                className="relative inline-flex items-center w-[58px] h-[32px] p-[3px] rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer shadow-inner shrink-0"
                                style={{
                                  background: isPresent
                                    ? 'linear-gradient(90deg, #4ce2a7 0%, #38c8c7 50%, #4da5e8 100%)'
                                    : '#cbd5e1',
                                }}
                              >
                                <span
                                  className={`inline-block w-[26px] h-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.22),0_1px_2px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out transform ${
                                    isPresent ? 'translate-x-[26px]' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* STICKY BOTTOM SAVE ACTION BAR */}
          <div className="sticky bottom-4 z-40 bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-700">
            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-slate-400 block text-xs uppercase font-bold">Roster Summary</span>
                <span className="font-extrabold text-white text-base">
                  {currentTotalCount} Students • <span className="text-emerald-400">{currentPresentCount} Present</span> • <span className="text-rose-400">{currentAbsentCount} Absent</span>
                </span>
              </div>
              <div className="hidden md:block h-8 w-px bg-slate-700" />
              <div className="hidden md:block">
                <span className="text-slate-400 block text-xs uppercase font-bold">Attendance Rate</span>
                <span className="font-extrabold text-blue-400 text-base">{currentAttendancePct}%</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleBackToSections}
                className="px-5 py-2.5 border border-slate-700 rounded-xl text-slate-300 hover:bg-white/10 transition text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={submitting || loadingWorkspace}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition shadow-md disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Attendance...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>✓ SAVE ATTENDANCE</span>
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

export default FacultyAttendancePage;
