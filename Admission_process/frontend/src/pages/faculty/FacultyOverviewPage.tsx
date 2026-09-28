import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import {
  BookOpen,
  CalendarCheck,
  Award,
  Filter,
  Sparkles,
  Lock,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import facultyService, {
  FacultyDashboardData,
  FacultyAssignmentItem,
} from '../../services/faculty.service';
import { GoogleAccountConnection } from '../../components/hod/GoogleAccountConnection';

export const FacultyOverviewPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<FacultyDashboardData | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [connectingGoogle, setConnectingGoogle] = useState<boolean>(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facultyService.getDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load faculty dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Google OAuth connect flow
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
          loadDashboard();
        }
      };
      window.addEventListener('message', handleMessage);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setConnectingGoogle(false);
          loadDashboard();
        }
      }, 1000);
    } catch (err) {
      console.error('Google connect error:', err);
      setConnectingGoogle(false);
    }
  };

  const facultyName =
    data?.profile?.user
      ? `${data.profile.user.firstName || ''} ${data.profile.user.lastName || ''}`.trim()
      : user?.name || 'Faculty Member';
  const deptCode = data?.profile?.departmentCode || 'CSE';
  const deptName = data?.profile?.departmentName || 'Computer Science & Engineering';
  const designation = data?.profile?.designation || 'Assistant Professor';

  const assignments = data?.assignments || [];

  // Unique semesters from active assignments
  const availableSemesters = Array.from(new Set(assignments.map((a) => a.semester))).sort();

  const filteredAssignments = assignments.filter((a) => {
    if (selectedSemester !== 'ALL' && String(a.semester) !== selectedSemester) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner (Dark Shiny Navy Blue Style) ────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] p-6 sm:p-8 text-white border border-[#1e3a8a]/40 shadow-[0_16px_36px_rgba(7,14,34,0.35)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-16 left-1/4 w-96 h-40 bg-gradient-to-b from-blue-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{designation} • {deptCode} Dept</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome, {facultyName} 👋
            </h2>
            <p className="text-sm text-blue-100/90 max-w-2xl font-medium">
              Faculty Academic Workspace for <span className="font-bold text-white">{deptName}</span>. Manage assigned course curriculum, take student attendance with section Google Sheets, and enter continuous bitwise marks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadDashboard()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all backdrop-blur-md cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/faculty/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-950/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-blue-400/30"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Take Attendance</span>
            </Link>
            <Link
              to="/faculty/bitwise-marks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all backdrop-blur-md"
            >
              <Award className="w-4 h-4" />
              <span>Bitwise Marks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Google Account Connection Card ──────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <GoogleAccountConnection
          account={
            data?.googleAccount || {
              connected: false,
              isConnected: false,
              email: null,
              status: 'NOT_CONNECTED',
            }
          }
          checking={loading}
          connecting={connectingGoogle}
          onConnect={handleConnectGoogle}
        />
      </div>

      {/* ── 4 Real Summary Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Subjects */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-blue-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Assigned Subjects
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {data?.stats?.totalAssignments ?? 0}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Teaching allocations from HOD</p>
        </div>

        {/* Card 2: Attendance Courses */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-emerald-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Attendance Courses
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {data?.stats?.attendanceCoursesCount ?? 0}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Section-wise active rosters</p>
        </div>

        {/* Card 3: Continuous Marks Courses */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-violet-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Marks & Bitwise
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {data?.stats?.marksCoursesCount ?? 0}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Authorized CIE evaluation tabs</p>
        </div>

        {/* Card 4: Connected Sheets */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-indigo-400/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Sync Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {assignments.filter((a) => a.attendanceSheet.connected).length} / {assignments.length}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Google Sheets connected</p>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>FILTER ASSIGNED SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>Dept: {deptCode}</span>
          </div>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Assigned Semesters</option>
            {availableSemesters.map((s) => (
              <option key={s} value={String(s)}>
                Semester {s}
              </option>
            ))}
          </select>

          <div className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            Showing <span className="font-black text-neutral-900 dark:text-white">{filteredAssignments.length}</span> course(s)
          </div>
        </div>
      </div>

      {/* ── Assigned Courses Table ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            HOD Teaching Allocations & Course Access
          </span>
          <span className="text-xs text-neutral-400 font-medium">Academic Year 2026-27</span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs font-semibold">Loading assigned courses...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <BookOpen className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No teaching assignments found</p>
            <p className="text-xs text-neutral-400 mt-1">Assignments created by your HOD will appear here automatically.</p>
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
                  <th className="py-3.5 px-6 text-center">Attendance Access</th>
                  <th className="py-3.5 px-6 text-center">Marks Access</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
                {filteredAssignments.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
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
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                          <FileSpreadsheet className="w-3 h-3" />
                          {sub.attendanceSheet.tabTitle}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {sub.attendanceAccess ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Authorized
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {sub.marksAccess ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Authorized
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.attendanceAccess && (
                          <Link
                            to="/faculty/attendance"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs transition-colors border border-blue-200 dark:border-blue-800"
                          >
                            <span>Attendance</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                        {sub.marksAccess && (
                          <Link
                            to="/faculty/bitwise-marks"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold text-xs transition-colors border border-violet-200 dark:border-violet-800"
                          >
                            <span>Marks</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Activity & Connected Spreadsheets Footer ──────────────────── */}
      {data?.recentSyncs && data.recentSyncs.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
              Recent Google Sheets Synchronization Activity
            </span>
            <span className="text-[11px] text-neutral-400 font-semibold">Audit Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recentSyncs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Tab: {log.tabTitle}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {log.recordsProcessed} processed • {log.recordsCreated} added
                  </div>
                </div>
                <Clock className="w-4 h-4 text-neutral-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyOverviewPage;
