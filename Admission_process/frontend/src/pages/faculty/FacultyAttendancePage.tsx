import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  BookOpen,
  Eye,
  X,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  FileSpreadsheet,
  Users,
  Percent,
  Check,
  Ban,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import facultyService, {
  FacultyAssignmentItem,
  FacultyAttendanceWorkspaceData,
  GoogleAccountStatus,
} from '../../services/faculty.service';
import { GoogleAccountConnection } from '../../components/hod/GoogleAccountConnection';
import { GoogleSheetWorkspace } from '../../components/faculty/GoogleSheetWorkspace';
import usePersistentState from '../../hooks/usePersistentState';

type FacultyAttendanceView = 'attendance' | 'sheet';

export const FacultyAttendancePage: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = usePersistentState<string>(
    'faculty_attendance_sem_filter',
    'ALL'
  );
  const [courses, setCourses] = useState<FacultyAssignmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountStatus>({
    connected: false,
    isConnected: false,
    email: null,
    status: 'NOT_CONNECTED',
    displayName: null,
    profilePicture: null,
  });
  const [connectingGoogle, setConnectingGoogle] = useState<boolean>(false);

  // In-Page Workspace State
  const [viewMode, setViewMode] = usePersistentState<FacultyAttendanceView>(
    'faculty_attendance_view_mode',
    'attendance'
  );
  const [sheetAssignmentId, setSheetAssignmentId] = usePersistentState<string | null>(
    'faculty_attendance_sheet_assignment_id',
    null
  );

  // Workspace modal state
  const [selectedAssignmentId, setSelectedAssignmentId] = usePersistentState<string | null>(
    'faculty_attendance_selected_assignment_id',
    null
  );
  const [workspaceData, setWorkspaceData] = useState<FacultyAttendanceWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);
  const [syncingAttendance, setSyncingAttendance] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const [courseList, googleStatus] = await Promise.all([
        facultyService.getAttendanceCourses(selectedSemester),
        facultyService.getGoogleConnection(),
      ]);
      setCourses(courseList);
      setGoogleAccount(googleStatus);
    } catch (err) {
      console.error('Failed to load attendance courses:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load workspace data when modal is open
  const loadWorkspace = useCallback(async (assignmentId: string) => {
    try {
      setLoadingWorkspace(true);
      setSyncMessage(null);
      const data = await facultyService.getAttendanceWorkspace(assignmentId);
      setWorkspaceData(data);
    } catch (err: any) {
      console.error('Failed to load attendance workspace:', err);
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to load attendance workspace.',
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

  // Handle Google OAuth flow
  const handleConnectGoogle = async (forceSelect = true) => {
    try {
      setConnectingGoogle(true);
      const authUrl = await facultyService.getGoogleAuthUrl();
      if (!authUrl) return;

      const popup = window.open(
        authUrl,
        'Google OAuth',
        'width=550,height=650,left=300,top=100'
      );

      const handleMessage = (e: MessageEvent) => {
        if (e.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          loadCourses();
        }
      };
      window.addEventListener('message', handleMessage);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setConnectingGoogle(false);
          loadCourses();
        }
      }, 1000);
    } catch (err) {
      console.error('Google connect error:', err);
      setConnectingGoogle(false);
    }
  };

  // Trigger sync attendance
  const handleSyncAttendance = async () => {
    if (!selectedAssignmentId) return;
    try {
      setSyncingAttendance(true);
      setSyncMessage(null);
      const res = await facultyService.syncAttendance(selectedAssignmentId);
      setSyncMessage({
        type: res.success ? 'success' : 'error',
        text: res.message || 'Attendance sync finished.',
      });
      // Refresh workspace and parent courses list
      await loadWorkspace(selectedAssignmentId);
      await loadCourses();
    } catch (err: any) {
      console.error('Attendance sync error:', err);
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to sync attendance.',
      });
    } finally {
      setSyncingAttendance(false);
    }
  };

  // Semesters list
  const availableSemesters = Array.from(new Set(courses.map((c) => c.semester))).sort();

  // If in sheet view mode, render the in-page Google Sheet workspace
  if (viewMode === 'sheet' && sheetAssignmentId) {
    return (
      <GoogleSheetWorkspace
        assignmentId={sheetAssignmentId}
        viewType="ATTENDANCE"
        onClose={() => setViewMode('attendance')}
        onConnectGoogle={() => handleConnectGoogle(true)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Attendance Roster Courses
            </span>
            <div className="text-3xl font-black mt-0.5">
              {courses.length} <span className="text-sm font-semibold text-neutral-400">assigned</span>
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

      {/* ── Google Account Card ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <GoogleAccountConnection
          account={googleAccount}
          checking={loading}
          connecting={connectingGoogle}
          onConnect={handleConnectGoogle}
        />
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>FILTER ATTENDANCE SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-blue-500"
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

      {/* ── Attendance Subject Table ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            Assigned Courses & Attendance Records
          </span>
          <span className="text-xs text-neutral-400 font-medium">Academic Year 2026-27</span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs font-semibold">Loading attendance roster...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <CalendarCheck className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              No attendance courses assigned
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Courses with Attendance Access granted by HOD will be displayed here.
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
                  <th className="py-3.5 px-6 text-center">Google Tab</th>
                  <th className="py-3.5 px-6 text-center">Attendance %</th>
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
                          <BookOpen className="w-4 h-4" />
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
                      {sub.attendanceSheet?.tabTitle ? (
                        <button
                          onClick={() => {
                            setSheetAssignmentId(sub.id);
                            setViewMode('sheet');
                          }}
                          className="inline-flex items-center gap-1 font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                          title={`Open ${sub.attendanceSheet.tabTitle} workspace`}
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          {sub.attendanceSheet.tabTitle}
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center font-bold">
                      {sub.attendancePercentage !== null ? (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs ${
                            sub.attendancePercentage >= 75
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {sub.attendancePercentage}%
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-normal">Pending Sync</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedAssignmentId(sub.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-500" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Attendance Workspace Modal ─────────────────────────────────────── */}
      {selectedAssignmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {workspaceData?.assignment?.subjectCode || '...'}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    Sem {workspaceData?.assignment?.semester} • {workspaceData?.assignment?.section} • AY {workspaceData?.assignment?.academicYear}
                  </span>
                </div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                  {workspaceData?.assignment?.subjectName || 'Attendance Workspace'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {workspaceData?.googleSheet && (
                  <button
                    onClick={() => {
                      if (selectedAssignmentId) {
                        setSheetAssignmentId(selectedAssignmentId);
                        setSelectedAssignmentId(null);
                        setViewMode('sheet');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Open Sheet ({workspaceData.googleSheet.tabTitle || 'Sheet'})</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedAssignmentId(null)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingWorkspace ? (
                <div className="py-16 flex flex-col items-center justify-center text-neutral-400">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-xs font-semibold">Loading attendance workspace data...</p>
                </div>
              ) : (
                <>
                  {/* Sync Action Alert / Message */}
                  {syncMessage && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                        syncMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {syncMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      )}
                      <span>{syncMessage.text}</span>
                    </div>
                  )}

                  {/* 4 Quick Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60">
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                        Classes Conducted
                      </span>
                      <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                        {workspaceData?.metrics?.totalClassesConducted ?? 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60">
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                        Enrolled Students
                      </span>
                      <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
                        {workspaceData?.metrics?.totalStudents ?? 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60">
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                        Overall Attendance
                      </span>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {workspaceData?.metrics?.overallAttendancePercentage ?? 100}%
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60">
                      <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                        Attendance Shortage
                      </span>
                      <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {workspaceData?.metrics?.shortageCount ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Sync Toolbar */}
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-neutral-900 dark:text-white">
                          Google Tab: <span className="font-mono text-blue-600 dark:text-cyan-400">{workspaceData?.googleSheet?.tabTitle || 'N/A'}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {workspaceData?.googleSheet?.connected
                            ? 'Google Spreadsheet is connected and mapped by HOD.'
                            : 'Spreadsheet connection is pending or disconnected.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSyncAttendance}
                      disabled={syncingAttendance || !workspaceData?.googleSheet?.connected}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-950/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      {syncingAttendance ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Sync Attendance from Google Sheet</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Student Attendance Roster Table */}
                  <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Enrolled Student Roster & Attendance Status
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Min. Threshold: 75%
                      </span>
                    </div>

                    {workspaceData?.students?.length === 0 ? (
                      <div className="p-8 text-center text-neutral-400 text-xs font-semibold">
                        No students enrolled in this semester/section yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[340px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            <tr>
                              <th className="py-2.5 px-4">USN / Enrollment</th>
                              <th className="py-2.5 px-4">Student Name</th>
                              <th className="py-2.5 px-4 text-center">Conducted</th>
                              <th className="py-2.5 px-4 text-center">Present</th>
                              <th className="py-2.5 px-4 text-center">Absent</th>
                              <th className="py-2.5 px-4 text-center">Attendance %</th>
                              <th className="py-2.5 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
                            {workspaceData?.students?.map((s) => (
                              <tr
                                key={s.id}
                                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                              >
                                <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                                  {s.usn}
                                </td>
                                <td className="py-3 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                                  {s.studentName}
                                </td>
                                <td className="py-3 px-4 text-center font-semibold text-neutral-600 dark:text-neutral-400">
                                  {s.classesConducted}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                  {s.presentCount}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-rose-600 dark:text-rose-400">
                                  {s.absentCount}
                                </td>
                                <td className="py-3 px-4 text-center font-black">
                                  <span
                                    className={`${
                                      s.attendancePercentage >= 75
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}
                                  >
                                    {s.attendancePercentage}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      s.status === 'Eligible'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}
                                  >
                                    {s.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
              <span className="text-[11px] text-neutral-400">
                Data synchronized securely with JCER ERP database.
              </span>
              <button
                onClick={() => setSelectedAssignmentId(null)}
                className="px-4 py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAttendancePage;
