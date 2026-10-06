import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  CheckCircle2,
  RefreshCw,
  Search,
  BookOpen,
} from 'lucide-react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import mentorService, { MentorOverviewData } from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const HodMentorOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MentorOverviewData | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await mentorService.getHodOverview(academicYear);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load mentor overview:', err);
      toast.error(err.response?.data?.error || 'Failed to load Mentor Management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [academicYear]);

  const summary = data?.summary || {
    totalStudents: 0,
    assignedStudents: 0,
    unassignedStudents: 0,
    activeMentors: 0,
  };

  const coveragePercent = summary.totalStudents > 0
    ? Math.round((summary.assignedStudents / summary.totalStudents) * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* ── HEADER & SCOPE BADGE ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <UserCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mentor Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Allocate mentors, monitor student coverage, and manage departmental mentoring assignments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm text-xs font-semibold text-slate-700 dark:text-neutral-300">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Scope:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {data?.isSemesterHandling ? 'Applied Science (Sem 1–2)' : `${data?.department?.code || 'Department'} (Sem 3–8)`}
            </span>
          </div>

          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-800 transition shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/hod/mentors/assign"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition transform active:scale-95"
          >
            <Sparkles className="size-4" />
            <span>Assign Mentors</span>
          </Link>
        </div>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Students */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">Total Students</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : summary.totalStudents}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 flex items-center gap-1.5">
            <span>In authorized scope</span>
          </p>
        </div>

        {/* Assigned Students */}
        <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 backdrop-blur-md shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Assigned Students</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
            {loading ? '—' : summary.assignedStudents}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{coveragePercent}% coverage</span>
            <div className="w-20 bg-emerald-200 dark:bg-emerald-900/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${coveragePercent}%` }} />
            </div>
          </div>
        </div>

        {/* Unassigned Students */}
        <div className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm relative overflow-hidden group transition ${
          summary.unassignedStudents > 0
            ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20'
            : 'border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Unassigned Students</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserX className="size-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${summary.unassignedStudents > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
            {loading ? '—' : summary.unassignedStudents}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            {summary.unassignedStudents > 0 ? 'Needs allocation' : 'All students allocated'}
          </p>
        </div>

        {/* Active Faculty Mentors */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm relative overflow-hidden group hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">Active Mentors</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <GraduationCap className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : summary.activeMentors}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
            Available eligible faculty pool
          </p>
        </div>
      </div>

      {/* ── QUICK ACTIONS BAR ── */}
      <div className="p-6 rounded-2xl border border-indigo-100 dark:border-indigo-950/40 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-neutral-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-500" />
            <span>Ready to allocate or review mentors?</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Select unassigned students semester-wise, pick eligible faculty from their core departments, and save bulk assignments.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/hod/mentors/assign"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <UserCheck className="size-4" />
            <span>Assign Mentors</span>
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            to="/hod/mentors/allocations"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-bold transition shadow-sm"
          >
            <Layers className="size-4 text-slate-500" />
            <span>View All Allocations</span>
          </Link>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Semester Allocation Progress */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="size-4 text-indigo-500" />
                <span>Semester-wise Allocation Progress</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Student mentor coverage across your authorized semesters.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 dark:text-neutral-300 font-bold border-b border-slate-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4 text-right">Total Students</th>
                  <th className="py-3 px-4 text-right">Assigned</th>
                  <th className="py-3 px-4 text-right">Unassigned</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-slate-700 dark:text-neutral-300">
                {data?.semesterProgress?.length ? (
                  data.semesterProgress.map((row) => (
                    <tr key={row.semester} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {row.semesterLabel}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium">{row.totalStudents}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {row.assignedStudents}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {row.unassignedStudents}
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                row.progress === 100
                                  ? 'bg-emerald-500'
                                  : row.progress > 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${row.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-neutral-400 w-8 text-right">
                            {row.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          to={`/hod/mentors/assign?semester=${row.semester}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[11px] font-bold transition"
                        >
                          <span>Allocate</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-neutral-500">
                      No semester progress records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Students awaiting allocation list preview */}
          {data?.unassignedStudentsDetailed && data.unassignedStudentsDetailed.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  Students Awaiting Mentor Allocation (Recent)
                </h3>
                <Link
                  to="/hod/mentors/assign"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View All Unassigned →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.unassignedStudentsDetailed.slice(0, 6).map((st: any) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-slate-200/60 dark:border-neutral-800/60 bg-slate-50/50 dark:bg-neutral-800/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{st.user?.name || 'Student'}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">{st.usn || 'USN Pending'}</div>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                        Sem {st.semester} - Sec {st.section || 'A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Mentor Workload & Recent Assignments */}
        <div className="space-y-6">
          {/* Mentor Workload Card */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="size-4 text-purple-500" />
                <span>Mentor Workloads</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-neutral-400">
                {data?.facultyWorkloadList?.length || 0} Mentors
              </span>
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {data?.facultyWorkloadList?.length ? (
                data.facultyWorkloadList.map((fw) => (
                  <div
                    key={fw.facultyId}
                    className="p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-800/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{fw.facultyName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
                        Dept: {fw.departmentCode}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                        {fw.menteeCount} Mentees
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500">
                  No active mentor assignments found.
                </div>
              )}
            </div>
          </div>

          {/* Recent Assignment History Preview */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="size-4 text-indigo-500" />
                <span>Recent Allocations</span>
              </h2>
              <Link
                to="/hod/mentors/allocations"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {data?.recentAssignments?.length ? (
                data.recentAssignments.map((ra: any) => (
                  <div
                    key={ra.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/30 dark:bg-neutral-800/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{ra.student?.user?.name || 'Student'}</span>
                      <span className="text-[11px] font-mono font-normal text-slate-500 dark:text-neutral-400">
                        {ra.student?.usn || ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400">
                      <span>Mentor: <strong className="text-indigo-600 dark:text-indigo-400">{ra.faculty?.name || '—'}</strong></span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        {ra.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-neutral-500">
                  No recent allocations recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodMentorOverviewPage;
