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
  Calendar,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import hodService, { HodDashboardData } from '../../services/hod.service';

export const HodDashboardPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<HodDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodService.getDashboardData();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load HOD dashboard:', err);
      setError(err?.response?.data?.error || 'Unable to load HOD dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const hodName = data?.hod?.name || user?.name || 'Head of Department';
  const deptName = data?.department?.name || user?.department?.name || 'Department of Computer Science & Engineering';
  const deptCode = data?.department?.code || user?.department?.code || 'CSE';
  const academicYear = data?.academicYear || '2026-27';

  return (
    <div className="space-y-6">
      
      {/* ── Welcome Banner with Department Badge ────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-cyan-400/15 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>{deptCode} • {academicYear}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {hodName} 👋
            </h2>
            <p className="text-sm text-indigo-100 max-w-2xl font-medium">
              Head of <span className="font-bold text-white">{deptName}</span>. Manage your department faculty authorizations, subjects, and academic workloads from this portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/hod/faculty/authorizations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-indigo-800 font-bold text-xs shadow-lg hover:bg-indigo-50 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Faculty Request</span>
            </Link>
            <Link
              to="/hod/department"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white font-bold text-xs transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Department Info</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Faculty */}
        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Department
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faculty Members</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {loading ? '...' : (data?.stats?.facultyCount ?? 0)}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Active teaching staff</span>
            <Link to="/hod/faculty" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1">
              View <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Subjects */}
        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Curriculum
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subjects Offered</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {loading ? '...' : (data?.stats?.subjectsCount ?? 0)}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Theory & Practical</span>
            <Link to="/hod/subjects" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1">
              Catalog <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Active Sections */}
        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              {academicYear}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sections</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {loading ? '...' : (data?.stats?.sectionsCount ?? 0)}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Semesters 1-8</span>
            <Link to="/hod/workload" className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1">
              Workload <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Pending Authorizations */}
        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Pipeline
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Requests</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {loading ? '...' : (data?.stats?.pendingAuthorizations ?? 0)}
            </h3>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Dean/Principal Review</span>
            <Link to="/hod/faculty/authorizations" className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1">
              Review <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Actions Grid ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">
          Quick Actions & Operations
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            to="/hod/faculty/authorizations"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 group-hover:text-indigo-600">
              New Faculty
            </p>
          </Link>

          <Link
            to="/hod/department"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 group-hover:text-blue-600">
              Department
            </p>
          </Link>

          <Link
            to="/hod/faculty"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 group-hover:text-sky-600">
              Faculty List
            </p>
          </Link>

          <Link
            to="/hod/subjects"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 group-hover:text-emerald-600">
              Subjects
            </p>
          </Link>

          <Link
            to="/hod/timetable"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 group-hover:text-purple-600">
              Timetable
            </p>
          </Link>

          <Link
            to="/hod/reports"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 text-center transition-all group"
          >
            <div className="w-10 h-10 mx-auto rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2.5 group-hover:text-rose-600">
              Reports
            </p>
          </Link>
        </div>
      </div>

      {/* ── Upcoming Academic Activities (Clean Empty State) ──────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Upcoming Academic Activities
            </h3>
            <p className="text-xs text-slate-500">
              Department schedules, upcoming assessments, and authorization notices
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            {academicYear}
          </span>
        </div>

        {/* Empty State Presentation */}
        <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mb-3">
            <Calendar className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            No academic activities scheduled yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            There are no upcoming activities, exams, or meetings scheduled for {deptName} at this time.
          </p>
        </div>
      </div>

    </div>
  );
};

export default HodDashboardPage;
