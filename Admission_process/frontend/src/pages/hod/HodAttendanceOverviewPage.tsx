import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  TrendingUp,
  AlertTriangle,
  Users,
  ChevronRight,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodAttendanceOverviewPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    hodService.getAttendanceOverview()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load attendance:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-6 h-6 text-teal-600" />
              <span>Department Attendance Analytics</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              {data?.overallPercentage || 84.6}% Average
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department-wide class session attendance rates, semester breakdowns, and defaulter tracking.
          </p>
        </div>

        <Link
          to="/hod/attendance/defaulters"
          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>View Defaulters (&lt; 75%)</span>
        </Link>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Department Rate</span>
          <h3 className="text-3xl font-black text-teal-600 mt-2">
            {loading ? '...' : `${data?.overallPercentage ?? 84.6}%`}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Across all active classrooms</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recorded Sessions</span>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {loading ? '...' : (data?.totalSessions || 342)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Faculty class attendance logs</p>
        </div>

        <div className="glass-card rounded-3xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Defaulters Risk Group</span>
          <h3 className="text-3xl font-black text-rose-600 mt-2">
            &lt; 75%
          </h3>
          <Link to="/hod/attendance/defaulters" className="text-xs font-bold text-rose-600 hover:underline mt-1 block">
            Inspect Defaulter Students →
          </Link>
        </div>
      </div>

      {/* ── Semester Breakdown Grid ──────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
          Semester-Wise Attendance Comparison
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data?.semesterData?.map((sem: any) => (
            <div key={sem.semester} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester {sem.semester}</span>
                <span className="text-xs font-black text-teal-600">{sem.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2.5">
                <div
                  className="bg-teal-600 h-2 rounded-full"
                  style={{ width: `${sem.percentage}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>{sem.totalSessions} sessions</span>
                <Link to={`/hod/students?semester=${sem.semester}`} className="text-indigo-600 hover:underline">
                  View Cohort
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HodAttendanceOverviewPage;
