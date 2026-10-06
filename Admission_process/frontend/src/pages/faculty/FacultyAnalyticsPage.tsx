import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import facultyService, { FacultyAnalyticsData } from '../../services/faculty.service';
import { useAcademicYear } from '../../context/AcademicYearContext';

export const FacultyAnalyticsPage: React.FC = () => {
  const { academicYear } = useAcademicYear();
  const [data, setData] = useState<FacultyAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await facultyService.getAnalytics(academicYear);
      setData(res);
    } catch (err) {
      console.error('Failed to load faculty analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Academic Analytics Engine
            </span>
            <div className="text-3xl font-black mt-0.5">
              {data?.assignedCount ?? 0}{' '}
              <span className="text-sm font-semibold text-neutral-400">assigned courses</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadAnalytics()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 shadow-xs flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>{data?.termStatus || 'AY 2026-27 Active Term'}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-2" />
          <p className="text-xs font-semibold">Calculating course performance and analytics...</p>
        </div>
      ) : (
        /* ── 4 Main Analytics Sections ───────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Subject Attendance Performance */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                  ATTENDANCE
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Performance
                </span>
              </div>

              <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
                Course Attendance Overview
              </h3>
              <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                Calculated class session attendance rates across your assigned course offerings.
              </p>

              <div className="mt-5 space-y-3">
                {data?.subjectAttendanceStats?.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">No assigned subjects found.</p>
                ) : (
                  data?.subjectAttendanceStats?.map((s) => (
                    <div
                      key={s.assignmentId}
                      className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60"
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-neutral-900 dark:text-white">
                          {s.subjectName} ({s.subjectCode})
                        </span>
                        <span
                          className={`${
                            s.attendancePercentage >= 75
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {s.attendancePercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(s.attendancePercentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1.5">
                        <span>Sem {s.semester} • {s.section}</span>
                        <span>{s.totalStudents} enrolled</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Threshold: {data?.subjectAttendanceStats?.[0]?.threshold || 85}%</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {data?.subjectAttendanceStats?.length || 0} active rosters
              </span>
            </div>
          </div>

          {/* Section 2: Defaulter Breakdown */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                  DEFAULTER ALERTS
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Below {data?.subjectAttendanceStats?.[0]?.threshold || 85}%
                </span>
              </div>

              <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
                Attendance Shortage Defaulters
              </h3>
              <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                Students requiring remediation or parent notification in your assigned sections.
              </p>

              <div className="mt-5">
                {data?.defaulters?.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      No Attendance Defaulters
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      All enrolled students in your batches maintain &ge; 75% attendance.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {data?.defaulters?.map((d, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white">
                            {d.studentName} ({d.usn})
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {d.subjectCode} • {d.presentClasses}/{d.totalClasses} classes attended
                          </div>
                        </div>
                        <span className="font-black text-amber-700 dark:text-amber-400 font-mono">
                          {d.attendancePercentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Defaulters Found</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {data?.defaultersCount ?? 0} students
              </span>
            </div>
          </div>



          {/* Section 4: Course Outcomes & Scope */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                  CURRICULUM
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Assigned Scope
                </span>
              </div>

              <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
                Teaching Allocation Summary
              </h3>
              <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                Departmental cohort alignment and curriculum summary.
              </p>

              <div className="mt-5 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Department Scope</span>
                  <span className="font-bold text-neutral-900 dark:text-white">CSE</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Academic Year</span>
                  <span className="font-bold text-neutral-900 dark:text-white">2026-27</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Assigned Courses</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {data?.assignedCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Defaulter Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {data?.defaultersCount === 0 ? '0% (Excellent)' : `${data?.defaultersCount} students`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Security Isolation</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">Assignment Scoped</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAnalyticsPage;
