import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Users,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Eye,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import mentorService, { MenteeListItem } from '../../services/mentor.service';
import { toast } from 'react-toastify';

export const MentorPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const [loading, setLoading] = useState<boolean>(true);
  const [mentees, setMentees] = useState<MenteeListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');

  const fetchMentees = async () => {
    setLoading(true);
    try {
      const data = await mentorService.getMyMentees({
        search: searchQuery,
        semester: semesterFilter !== 'ALL' ? Number(semesterFilter) : undefined,
        academicYear,
      });
      setMentees(data);
    } catch (err: any) {
      console.error('Failed to load performance data:', err);
      toast.error('Failed to load mentee performance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, [academicYear, semesterFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMentees();
  };

  const totalMentees = mentees.length;
  const withResults = mentees.filter((m) => m.latestResult.status !== 'AWAITING_RESULTS');
  const awaitingResults = mentees.filter((m) => m.latestResult.status === 'AWAITING_RESULTS');

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Award className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mentee Academic Performance
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Review internal assessments (CIE 1, CIE 2, Assignments), IA averages, and semester SGPA history.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMentees}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
            title="Refresh Performance"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 3 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Assigned Cohort
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : totalMentees}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">Active student mentees</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Evaluated Assessments
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
            {loading ? '—' : withResults.length}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            Mentees with published IA marks or SGPA
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Awaiting Results / IA
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tracking-tight">
            {loading ? '—' : awaitingResults.length}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            Current semester assessments in progress
          </p>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or USN..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* ── PERFORMANCE TABLE ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/40 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">USN</th>
                <th className="py-3.5 px-4">Sem &amp; Sec</th>
                <th className="py-3.5 px-4">Latest Result / SGPA</th>
                <th className="py-3.5 px-4">Average CIE</th>
                <th className="py-3.5 px-4">Attendance Health</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    <RefreshCw className="size-6 mx-auto animate-spin mb-2" />
                    <span>Loading academic performance data...</span>
                  </td>
                </tr>
              ) : mentees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No mentees match your search.
                  </td>
                </tr>
              ) : (
                mentees.map((st) => (
                  <tr
                    key={st.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-neutral-800/40 transition group cursor-pointer"
                    onClick={() => navigate(`/mentor/mentees/${st.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                            {st.name}
                          </div>
                          <div className="text-[10px] text-slate-400">{st.department}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-neutral-300">
                      {st.usn}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-neutral-300">
                      Sem {st.semester} • {st.section}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 dark:text-neutral-200">
                        {st.latestResult.displayString}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {st.latestResult.averageCie !== undefined ? `${st.latestResult.averageCie} / 50` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {st.attendance.attendancePercentage !== null ? (
                        <span className={`font-bold font-mono text-xs ${
                          st.attendance.attendancePercentage < 85 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {st.attendance.attendancePercentage}%
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No Records</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/mentor/mentees/${st.id}`);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-neutral-300 hover:text-indigo-600 text-[11px] font-bold transition"
                      >
                        <Eye className="size-3.5" />
                        <span>View Academics</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MentorPerformancePage;
