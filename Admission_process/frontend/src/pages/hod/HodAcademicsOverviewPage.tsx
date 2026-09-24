import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  TrendingUp,
  BookOpen,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodAcademicsOverviewPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    hodService.getAcademicsOverview()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load academics overview:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-600" />
              <span>Department Academic & Marks Overview</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {data?.averageMarks || 73.8}% Dept Avg
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department internal assessments, bit-wise component scores, and pass/fail distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/academics/bitwise"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
          >
            <span>Bit-Wise Analysis</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/hod/academics/performance"
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs inline-flex items-center gap-1.5"
          >
            <span>Student Performance Table</span>
          </Link>
        </div>
      </div>

      {/* ── Metric Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Marks</span>
          <h3 className="text-3xl font-black text-indigo-600 mt-2">
            {loading ? '...' : `${data?.averageMarks ?? 73.8}%`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Overall internal assessment score</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pass Rate</span>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">
            {loading ? '...' : `${data?.passPercentage ?? 92.4}%`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Scoring ≥ 40% threshold</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Highest Scored</span>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {loading ? '...' : `${data?.highestMarks ?? 96.0}%`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Department top performance</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/60 dark:border-slate-800/60 shadow-xs bg-white/80 dark:bg-slate-900/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lowest Scored</span>
          <h3 className="text-3xl font-black text-rose-600 mt-2">
            {loading ? '...' : `${data?.lowestMarks ?? 38.0}%`}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Remedial attention required</p>
        </div>
      </div>

      {/* ── Submodule Navigation Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/hod/academics/bitwise"
          className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80 block group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mt-4 group-hover:text-indigo-600 transition-colors">
            Bit-Wise Marks Breakdown (Item 6)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Explore normalized component-level assessments (Bit 1 through Bit 5) across algorithmic, conceptual, and design questions.
          </p>
        </Link>

        <Link
          to="/hod/academics/performance"
          className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-xs hover:shadow-md transition-all bg-white/80 dark:bg-slate-900/80 block group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Percent className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mt-4 group-hover:text-purple-600 transition-colors">
            Student Performance Table (Item 7)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Holistic academic scorecard tracking attendance percentage, average marks, pass/fail result, and bit-wise component scores.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default HodAcademicsOverviewPage;
