import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  BookOpen,
  Eye,
  X,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  Sparkles,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Users,
} from 'lucide-react';
import facultyService, {
  FacultyAssignmentItem,
  FacultyMarksWorkspaceData,
  GoogleAccountStatus,
} from '../../services/faculty.service';
import { GoogleAccountConnection } from '../../components/hod/GoogleAccountConnection';
import { GoogleSheetWorkspace } from '../../components/faculty/GoogleSheetWorkspace';
import usePersistentState from '../../hooks/usePersistentState';

type FacultyMarksView = 'marks' | 'sheet';

export const FacultyBitwiseMarksPage: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = usePersistentState<string>(
    'faculty_bitwise_sem_filter',
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
  const [viewMode, setViewMode] = usePersistentState<FacultyMarksView>(
    'faculty_bitwise_view_mode',
    'marks'
  );
  const [sheetAssignmentId, setSheetAssignmentId] = usePersistentState<string | null>(
    'faculty_bitwise_sheet_assignment_id',
    null
  );

  // Workspace modal state
  const [selectedAssignmentId, setSelectedAssignmentId] = usePersistentState<string | null>(
    'faculty_bitwise_selected_assignment_id',
    null
  );
  const [workspaceData, setWorkspaceData] = useState<FacultyMarksWorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);
  const [syncingMarks, setSyncingMarks] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const [marksList, googleStatus] = await Promise.all([
        facultyService.getMarksCourses(selectedSemester),
        facultyService.getGoogleConnection(),
      ]);
      setCourses(marksList);
      setGoogleAccount(googleStatus);
    } catch (err) {
      console.error('Failed to load marks courses:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSemester]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load marks workspace
  const loadWorkspace = useCallback(async (assignmentId: string) => {
    try {
      setLoadingWorkspace(true);
      setSyncMessage(null);
      const data = await facultyService.getMarksWorkspace(assignmentId);
      setWorkspaceData(data);
    } catch (err: any) {
      console.error('Failed to load marks workspace:', err);
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to load marks workspace.',
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

  // Sync marks from Google Sheet
  const handleSyncMarks = async () => {
    if (!selectedAssignmentId) return;
    try {
      setSyncingMarks(true);
      setSyncMessage(null);
      const res = await facultyService.syncMarks(selectedAssignmentId);
      setSyncMessage({
        type: res.success ? 'success' : 'error',
        text: res.message || 'Marks sync finished.',
      });
      await loadWorkspace(selectedAssignmentId);
      await loadCourses();
    } catch (err: any) {
      console.error('Marks sync error:', err);
      setSyncMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to sync marks.',
      });
    } finally {
      setSyncingMarks(false);
    }
  };

  const availableSemesters = Array.from(new Set(courses.map((c) => c.semester))).sort();

  // If in sheet view mode, render the in-page Google Sheet workspace
  if (viewMode === 'sheet' && sheetAssignmentId) {
    return (
      <GoogleSheetWorkspace
        assignmentId={sheetAssignmentId}
        viewType="MARKS"
        onClose={() => setViewMode('marks')}
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
                  <th className="py-3.5 px-6 text-center">Google Tab</th>
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
                      {sub.marksSheet?.tabTitle ? (
                        <button
                          onClick={() => {
                            setSheetAssignmentId(sub.id);
                            setViewMode('sheet');
                          }}
                          className="inline-flex items-center gap-1 font-mono text-xs font-extrabold text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900 border border-violet-200 dark:border-violet-800 transition-colors cursor-pointer"
                          title={`Open ${sub.marksSheet.tabTitle} workspace`}
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          {sub.marksSheet.tabTitle}
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
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
                          Quiz (10M)
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedAssignmentId(sub.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 font-bold text-xs transition-colors border border-violet-200 dark:border-violet-800 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Sync</span>
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
      {selectedAssignmentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                    {workspaceData?.assignment?.subjectCode || '...'}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">
                    Sem {workspaceData?.assignment?.semester} • {workspaceData?.assignment?.section} • AY {workspaceData?.assignment?.academicYear}
                  </span>
                </div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                  {workspaceData?.assignment?.subjectName || 'Continuous Marks Workspace'}
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs font-bold border border-violet-200 dark:border-violet-800 transition-colors cursor-pointer"
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
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-2" />
                  <p className="text-xs font-semibold">Loading continuous marks workspace...</p>
                </div>
              ) : (
                <>
                  {/* Toast Alert */}
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

                  {/* Sync Toolbar */}
                  <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-neutral-900 dark:text-white">
                          Continuous Marks Tab:{' '}
                          <span className="font-mono text-violet-600 dark:text-violet-400">
                            {workspaceData?.googleSheet?.tabTitle || 'N/A'}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          {workspaceData?.googleSheet?.connected
                            ? 'Mapped master Bitwise Marks Google Sheet connected.'
                            : 'Marks spreadsheet not yet connected by HOD.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSyncMarks}
                      disabled={syncingMarks || !workspaceData?.googleSheet?.connected}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-violet-950/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      {syncingMarks ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Syncing...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Sync Marks from Google Sheet</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Marks Evaluation Roster */}
                  <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        Enrolled Students & Bitwise Assessment Records
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Total Enrolled: {workspaceData?.students?.length ?? 0}
                      </span>
                    </div>

                    {workspaceData?.students?.length === 0 ? (
                      <div className="p-8 text-center text-neutral-400 text-xs font-semibold">
                        No enrolled students in this cohort.
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[340px]">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
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
                                <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                  {s.ia1 || '—'}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                  {s.ia2 || '—'}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                  {s.assignment || '—'}
                                </td>
                                <td className="py-3 px-4 text-center font-mono font-black text-violet-600 dark:text-violet-400">
                                  {s.totalCie || '—'}
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
                Bitwise assessment values mapped from authorized subject tab.
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

export default FacultyBitwiseMarksPage;
