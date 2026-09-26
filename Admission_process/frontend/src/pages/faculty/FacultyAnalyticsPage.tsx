import React from 'react';
import {
  BarChart3,
  CalendarCheck,
  Award,
  TrendingUp,
  BookOpen,
  PieChart,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const FacultyAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Matching HOD Metric Header Style) ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Academic Analytics Engine
            </span>
            <div className="text-3xl font-black mt-0.5">
              4 <span className="text-sm font-semibold text-neutral-400">modules</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 shadow-xs flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>AY 2026-27 Active Term</span>
          </div>
        </div>
      </div>

      {/* ── 4 Main Analytics Sections (Matching HOD Card Architecture) ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 1: Attendance Overview */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                ATTENDANCE
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Analytics Module
              </span>
            </div>

            <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
              Attendance Overview
            </h3>
            <p className="text-xs text-neutral-400 font-semibold mt-0.5">
              Class session attendance rates, threshold alerts (85% / 75%), and defaulter breakdowns.
            </p>

            <div className="mt-6 p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Attendance Distribution Metric
              </p>
              <p className="text-[11px] text-neutral-400 max-w-xs">
                Visual attendance trends and session completion metrics will be calculated here.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Scope: Assigned Batches</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">2 Sections</span>
          </div>
        </div>

        {/* Section 2: Marks Overview */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                CONTINUOUS EVALUATION
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Analytics Module
              </span>
            </div>

            <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
              Marks Overview
            </h3>
            <p className="text-xs text-neutral-400 font-semibold mt-0.5">
              Internal assessment score distributions, average attainment, and CIE progress indicators.
            </p>

            <div className="mt-6 p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                IA Evaluation Performance
              </p>
              <p className="text-[11px] text-neutral-400 max-w-xs">
                Question-wise bit attainment, median scores, and CIE score spreads will be calculated here.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Evaluation: IA-1 & IA-2</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">CIE Active</span>
          </div>
        </div>

        {/* Section 3: Subject Performance */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                COURSE OUTCOMES
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Analytics Module
              </span>
            </div>

            <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
              Subject Performance
            </h3>
            <p className="text-xs text-neutral-400 font-semibold mt-0.5">
              Course-level pass projections, syllabus coverage tracking, and learning outcome attainment.
            </p>

            <div className="mt-6 p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Course Outcome Attainment
              </p>
              <p className="text-[11px] text-neutral-400 max-w-xs">
                Subject-wise performance bands, syllabus delivery logs, and attainment will be shown here.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Offerings: BCS301, BCS401</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">2 Courses</span>
          </div>
        </div>

        {/* Section 4: Student Performance */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                INDIVIDUAL PROGRESS
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Analytics Module
              </span>
            </div>

            <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
              Student Performance
            </h3>
            <p className="text-xs text-neutral-400 font-semibold mt-0.5">
              Student risk indicators, continuous assessment trends, and personalized progress bands.
            </p>

            <div className="mt-6 p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Student Progress Tracking
              </p>
              <p className="text-[11px] text-neutral-400 max-w-xs">
                Grade distributions, at-risk flags, and high achiever analysis will appear here.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Enrolled Students</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">120 Total</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default FacultyAnalyticsPage;
