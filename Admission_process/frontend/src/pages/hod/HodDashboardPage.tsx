import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import {
  Building2,
  Users,
  BookOpen,
  Layers,
  ShieldCheck,
  CalendarCheck,
  Award,
  AlertTriangle,
  ChevronRight,
  Filter,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Sparkles,
  Lock,
  ArrowUpRight,
} from 'lucide-react';
import hodService, { HodDashboardData } from '../../services/hod.service';

export const HodDashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<HodDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (AY, Semester, Section - Department is locked)
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  useEffect(() => {
    fetchDashboardData();
  }, [academicYear, selectedSemester, selectedSection]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodService.getDashboardData({
        academicYear,
        semester: selectedSemester,
        section: selectedSection,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load HOD dashboard:', err);
      setError(err?.response?.data?.error || 'Unable to load HOD dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const hodName = data?.hod?.name || user?.name || 'Head of Department';
  const deptName = data?.department?.name || user?.department?.name || 'Computer Science & Engineering';
  const deptCode = data?.department?.code || user?.department?.code || 'CSE';
  const stats = data?.stats;

  return (
    <div className="space-y-6">
      
      {/* ── Welcome Banner (Dark Shiny Navy Blue Style) ───────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] p-6 sm:p-8 text-white border border-[#1e3a8a]/40 shadow-[0_16px_36px_rgba(7,14,34,0.35)]">
        {/* Shiny specular reflections & glass gleam */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-16 left-1/4 w-96 h-40 bg-gradient-to-b from-blue-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome, {hodName} 👋
            </h2>
            <p className="text-sm text-blue-100/90 max-w-2xl font-medium">
              Academic Control Hub for <span className="font-bold text-white">{deptName}</span>. Monitor departmental students, faculty assignments, bit-wise marks, and attendance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/hod/faculty/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-950/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-blue-400/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Faculty</span>
            </Link>
            <Link
              to="/hod/students"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all backdrop-blur-md"
            >
              <Users className="w-4 h-4" />
              <span>View Students</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Filter Bar (Admin Clean Design) ─────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Filter className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>FILTER ACADEMIC SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Locked Department pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>Dept: <strong className="text-neutral-900 dark:text-white">{deptCode}</strong></span>
          </div>

          {/* Academic Year Selector */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="2026-27">AY 2026-27</option>
            <option value="2025-26">AY 2025-26</option>
            <option value="2024-25">AY 2024-25</option>
          </select>

          {/* Semester Selector */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
            <option value="3">Semester 3</option>
            <option value="4">Semester 4</option>
            <option value="5">Semester 5</option>
            <option value="6">Semester 6</option>
            <option value="7">Semester 7</option>
            <option value="8">Semester 8</option>
          </select>

          {/* Section Selector */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>
      </div>

      {/* ── 8 Core Summary Cards (Admin Card Style) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Students */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : (stats?.totalStudents ?? 0)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Enrolled in {deptCode}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Semesters 1-8</span>
            <Link to="/hod/students" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Directory <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 2: Total Faculty */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Total Faculty
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : (stats?.totalFaculty ?? 0)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Teaching staff in dept</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Professors & Assts</span>
            <Link to="/hod/faculty" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Faculty List <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 3: Total Subjects */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Total Subjects
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : (stats?.totalSubjects ?? 0)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Curriculum offerings</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Theory & Lab</span>
            <Link to="/hod/subjects" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Subjects <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Active Sections */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Active Sections
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : (stats?.activeSections ?? 0)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Classroom divisions</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Sections A, B, C</span>
            <Link to="/hod/students/sections" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Sections <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 5: Overall Attendance */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Overall Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : `${stats?.overallAttendance ?? 0}%`}
            </h3>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, stats?.overallAttendance ?? 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Department avg</span>
            <Link to="/hod/attendance" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Attendance <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 6: Average Marks */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Average Marks
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : `${stats?.averageMarks ?? 0}%`}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">IA & Assessment avg</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Bit-wise metrics</span>
            <Link to="/hod/academics" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Academics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 7: Defaulters (< 75%) */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Defaulters (&lt; 75%)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
              {loading ? '...' : (stats?.attendanceDefaulters ?? 0)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Requires follow-up</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Attendance list</span>
            <Link to="/hod/attendance/defaulters" className="text-rose-600 dark:text-rose-400 font-bold hover:underline inline-flex items-center gap-0.5">
              Defaulters List <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 8: Pending Faculty Actions */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Pending Actions
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {loading ? '...' : (stats?.pendingFacultyActions ?? 0)}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Awaiting Dean/Principal</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Approval queue</span>
            <Link to="/hod/faculty" className="text-amber-600 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-0.5">
              Review Queue <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pending Faculty Authorizations Widget (Admin Table Style) ──────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              <span>Pending Faculty Authorizations</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                Awaiting Authority Approval
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Newly created faculty accounts stay <span className="font-bold text-neutral-700 dark:text-neutral-300">PENDING_AUTHORIZATION</span> until approved by Dean Academics or Principal.
            </p>
          </div>
          <Link
            to="/hod/faculty/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs transition-colors shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Faculty</span>
          </Link>
        </div>

        {data?.pendingAuthorizationsList && data.pendingAuthorizationsList.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Assigned Subject</th>
                  <th className="py-3.5 px-4">Sem & Sec</th>
                  <th className="py-3.5 px-4">Dispatched To</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Login Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {data.pendingAuthorizationsList.map((req) => (
                  <tr key={req.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 dark:text-white">{req.facultyName}</div>
                      <div className="text-[11px] text-neutral-400">{req.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-800 dark:text-neutral-200">
                      <div>{req.subjectName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{req.subjectCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-700 dark:text-neutral-300">
                      Sem {req.semester} • Sec {req.section}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                        req.authority === 'PRINCIPAL'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {req.authority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <Lock className="w-3 h-3" /> Disabled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No Pending Faculty Requests</p>
            <p className="text-xs text-neutral-400 mt-1">All faculty accounts in your department are authorized and active.</p>
          </div>
        )}
      </div>

      {/* ── Two-Column Row: Attendance Analytics & Bit-Wise Marks Summary ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card Left: Attendance Analytics Snapshot */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                  <span>Attendance Analytics</span>
                </h3>
                <p className="text-xs text-neutral-400">Semester-wise average percentage</p>
              </div>
              <Link to="/hod/attendance" className="text-xs font-bold text-neutral-900 dark:text-white hover:underline inline-flex items-center gap-1">
                Full Breakdown <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4 mt-4">
              {data?.attendanceAnalytics?.semesterBreakdown && data.attendanceAnalytics.semesterBreakdown.length > 0 ? (
                data.attendanceAnalytics.semesterBreakdown.map((item) => (
                  <div key={item.semester}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-neutral-700 dark:text-neutral-300">Semester {item.semester}</span>
                      <span className="text-neutral-900 dark:text-white font-mono">{item.attendance}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-neutral-900 dark:bg-neutral-100 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.attendance}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-semibold text-neutral-400">No attendance data recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Right: Bit-Wise Academic Component Snapshot ──── */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
                  <span>Bit-Wise Performance Snapshot</span>
                </h3>
                <p className="text-xs text-neutral-400">Normalized Bit 1 to Bit 5 component scores</p>
              </div>
              <Link to="/hod/academics/bitwise" className="text-xs font-bold text-neutral-900 dark:text-white hover:underline inline-flex items-center gap-1">
                Bit Analysis <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {data?.marksAnalytics?.bitwiseSummary && data.marksAnalytics.bitwiseSummary.length > 0 ? (
                data.marksAnalytics.bitwiseSummary.map((b) => (
                  <div key={b.name} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white flex items-center justify-center font-black text-xs">
                        {b.name.replace('Bit ', 'B')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{b.name}</p>
                        <p className="text-[10px] text-neutral-400">Max Marks: {b.maxMarks}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-neutral-900 dark:text-white">{b.average} / {b.maxMarks}</p>
                      <p className="text-[10px] text-neutral-400 font-medium">{((b.average / b.maxMarks) * 100).toFixed(0)}% achievement</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-semibold text-neutral-400">No bit-wise assessment scores recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Department Faculty Assignments ────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-neutral-800 dark:text-neutral-200" />
              <span>Active Department Faculty Assignments</span>
            </h3>
            <p className="text-xs text-neutral-400">Live subjects, sections, and sheet access controls</p>
          </div>
          <Link to="/hod/faculty/assignments" className="text-xs font-bold text-neutral-900 dark:text-white hover:underline inline-flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.recentAssignments && data.recentAssignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentAssignments.map((assign) => (
              <div key={assign.id} className="p-4 rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/30 border border-neutral-200/70 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">{assign.facultyName}</h4>
                    <p className="text-[11px] text-neutral-400">{assign.email}</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                    Sem {assign.semester} • {assign.section}
                  </span>
                </div>

                <div className="mt-3 py-2 px-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-xs">
                  <span className="text-neutral-400 font-medium text-[10px] block">Subject:</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{assign.subjectName}</span>
                  <span className="text-[10px] text-neutral-400 font-mono ml-1.5">({assign.subjectCode})</span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 font-semibold">Sheet Access:</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      assign.attendanceAccess
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      Attn: {assign.attendanceAccess ? 'ON' : 'OFF'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      assign.marksAccess
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      Marks: {assign.marksAccess ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
            <Users className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No Faculty Assignments Yet</p>
            <p className="text-xs text-neutral-400 mt-1">Assignments made to department faculty will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HodDashboardPage;
