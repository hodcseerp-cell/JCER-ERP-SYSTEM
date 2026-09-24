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

  // Filters (AY, Semester, Section - No Department!)
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
      
      {/* ── Welcome Banner with Department Scope Lock ───────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-cyan-400/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
              <Lock className="w-3.5 h-3.5 text-cyan-300" />
              <span>Department: {deptCode} [LOCKED] • Academic Year {academicYear}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {hodName} 👋
            </h2>
            <p className="text-sm text-indigo-100 max-w-2xl font-medium">
              Academic Control Hub for <span className="font-bold text-white">{deptName}</span>. Monitor departmental students, faculty assignments, bit-wise marks, and attendance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/hod/faculty/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-indigo-900 font-bold text-xs shadow-lg hover:bg-indigo-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Create Faculty</span>
            </Link>
            <Link
              to="/hod/students"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white font-bold text-xs transition-all"
            >
              <Users className="w-4 h-4" />
              <span>View Students</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Filter Bar (Semester, Section, AY - Department is permanently locked) ── */}
      <div className="glass-card rounded-2xl p-4 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-indigo-600" />
          <span>FILTER ACADEMIC SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Locked Department pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Dept: <strong className="text-slate-900 dark:text-white">{deptCode}</strong></span>
          </div>

          {/* Academic Year Selector */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026-27">AY 2026-27</option>
            <option value="2025-26">AY 2025-26</option>
            <option value="2024-25">AY 2024-25</option>
          </select>

          {/* Semester Selector */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
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
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>
      </div>

      {/* ── 8 Core KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Total Students */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : (stats?.totalStudents ?? 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Enrolled in {deptCode}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Semesters 1-8</span>
            <Link to="/hod/students" className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Directory <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 2: Total Faculty */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Faculty</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : (stats?.totalFaculty ?? 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Teaching staff in dept</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Professors & Assts</span>
            <Link to="/hod/faculty" className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Faculty List <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 3: Total Subjects */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Subjects</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : (stats?.totalSubjects ?? 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Curriculum offerings</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Theory & Lab</span>
            <Link to="/hod/subjects" className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Subjects <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Active Sections */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sections</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : (stats?.activeSections ?? 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Classroom divisions</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Sections A, B, C</span>
            <Link to="/hod/students/sections" className="text-purple-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Sections <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 5: Overall Attendance % */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : `${stats?.overallAttendance ?? 84.6}%`}
            </h3>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2">
              <div
                className="bg-teal-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, stats?.overallAttendance ?? 85)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Department avg</span>
            <Link to="/hod/attendance" className="text-teal-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Attendance <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 6: Average Marks % */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Marks</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? '...' : `${stats?.averageMarks ?? 72.4}%`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">IA & Assessment avg</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Bit-wise metrics</span>
            <Link to="/hod/academics" className="text-sky-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Academics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 7: Attendance Defaulters (< 75%) */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Defaulters (&lt; 75%)</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-rose-600">
              {loading ? '...' : (stats?.attendanceDefaulters ?? 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Requires immediate follow-up</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Parent contact</span>
            <Link to="/hod/attendance/defaulters" className="text-rose-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Defaulters List <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 8: Pending Faculty Actions */}
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Faculty Actions</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-amber-600">
              {loading ? '...' : (stats?.pendingFacultyActions ?? 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting Dean/Principal</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Approval queue</span>
            <Link to="/hod/faculty" className="text-amber-600 font-bold hover:underline inline-flex items-center gap-0.5">
              Review Queue <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pending Faculty Authorizations Widget (Prompt Item 1 & 17) ───────── */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Pending Faculty Authorizations</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Awaiting Authority Approval
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Newly created faculty accounts stay <span className="font-bold text-slate-700 dark:text-slate-300">PENDING_AUTHORIZATION</span> and cannot log in until approved by Dean Academics or Principal.
            </p>
          </div>
          <Link
            to="/hod/faculty/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Faculty</span>
          </Link>
        </div>

        {data?.pendingAuthorizationsList && data.pendingAuthorizationsList.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Faculty Member</th>
                  <th className="py-3 px-4">Assigned Subject</th>
                  <th className="py-3 px-4">Sem & Sec</th>
                  <th className="py-3 px-4">Dispatched To</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Login Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.pendingAuthorizationsList.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{req.facultyName}</div>
                      <div className="text-[11px] text-slate-400">{req.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      <div>{req.subjectName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.subjectCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      Sem {req.semester} • Sec {req.section}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                        req.authority === 'PRINCIPAL'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {req.authority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
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
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Pending Faculty Requests</p>
            <p className="text-xs text-slate-400 mt-1">All faculty accounts in your department are authorized and active.</p>
          </div>
        )}
      </div>

      {/* ── Two-Column Row: Attendance Analytics & Bit-Wise Marks Summary ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card Left: Attendance Analytics Snapshot */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-teal-600" />
                <span>Attendance Analytics</span>
              </h3>
              <p className="text-xs text-slate-400">Semester-wise average percentage</p>
            </div>
            <Link to="/hod/attendance" className="text-xs font-bold text-teal-600 hover:underline inline-flex items-center gap-1">
              Full Breakdown <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {data?.attendanceAnalytics?.semesterBreakdown?.map((item) => (
              <div key={item.semester}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Semester {item.semester}</span>
                  <span className="text-teal-600">{item.attendance}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${item.attendance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Right: Bit-Wise Academic Component Snapshot (Prompt Item 6) ──── */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <span>Bit-Wise Performance Snapshot</span>
              </h3>
              <p className="text-xs text-slate-400">Normalized Bit 1 to Bit 5 component scores</p>
            </div>
            <Link to="/hod/academics/bitwise" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
              Bit Analysis <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.marksAnalytics?.bitwiseSummary?.map((b) => (
              <div key={b.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                    {b.name.replace('Bit ', 'B')}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.name}</p>
                    <p className="text-[10px] text-slate-400">Max Marks: {b.maxMarks}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{b.average} / {b.maxMarks}</p>
                  <p className="text-[10px] text-slate-400">{((b.average / b.maxMarks) * 100).toFixed(0)}% achievement</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Active Faculty Assignments & Sheet Access Toggles ─────────── */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Active Department Faculty Assignments</span>
            </h3>
            <p className="text-xs text-slate-400">Live subjects, sections, and sheet access controls</p>
          </div>
          <Link to="/hod/faculty/assignments" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.recentAssignments?.map((assign) => (
            <div key={assign.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{assign.facultyName}</h4>
                  <p className="text-[11px] text-slate-400">{assign.email}</p>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Sem {assign.semester} • {assign.section}
                </span>
              </div>

              <div className="mt-3 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 font-medium text-[10px] block">Subject:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{assign.subjectName}</span>
                <span className="text-[10px] text-slate-400 font-mono ml-1.5">({assign.subjectCode})</span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-semibold">Sheet Access:</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    assign.attendanceAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    Attn: {assign.attendanceAccess ? 'ON' : 'OFF'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    assign.marksAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    Marks: {assign.marksAccess ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HodDashboardPage;
