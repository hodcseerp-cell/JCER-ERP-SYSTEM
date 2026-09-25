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
  RefreshCw,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodAttendanceOverviewPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAttendance = () => {
    setLoading(true);
    hodService.getAttendanceOverview()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load attendance:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Admin Style) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 shadow-sm border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
              Overall Rate
            </span>
            <div className="text-2xl font-black mt-0.5">
              {data?.overallPercentage ?? 0}% <span className="text-xs font-semibold text-neutral-400">average</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              Attendance Analytics
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Department-wide class session attendance rates, semester breakdowns, and defaulter tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAttendance()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/hod/attendance/defaulters"
            className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>View Defaulters (&lt; 75%)</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Overall Department Rate</span>
          <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {loading ? '...' : `${data?.overallPercentage ?? 0}%`}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Across all active classrooms</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total Recorded Sessions</span>
          <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-2">
            {loading ? '...' : (data?.totalSessions ?? 0)}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Faculty class attendance logs</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Defaulters Risk Group</span>
          <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
            &lt; 75%
          </h3>
          <Link to="/hod/attendance/defaulters" className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline mt-1 block">
            Inspect Defaulter Students →
          </Link>
        </div>
      </div>

      {/* ── Semester Breakdown Grid ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Semester-Wise Attendance Comparison
        </h3>

        {data?.semesterData && data.semesterData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.semesterData.map((sem: any) => (
              <div key={sem.semester} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Semester {sem.semester}</span>
                  <span className="text-xs font-black text-neutral-900 dark:text-white font-mono">{sem.percentage}%</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mt-2.5 overflow-hidden">
                  <div
                    className="bg-neutral-900 dark:bg-neutral-100 h-2 rounded-full"
                    style={{ width: `${sem.percentage}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500 font-semibold">
                  <span>{sem.totalSessions} sessions</span>
                  <Link to={`/hod/students?semester=${sem.semester}`} className="text-neutral-900 dark:text-white font-bold hover:underline">
                    View Cohort →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-400">No semester attendance records recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HodAttendanceOverviewPage;
