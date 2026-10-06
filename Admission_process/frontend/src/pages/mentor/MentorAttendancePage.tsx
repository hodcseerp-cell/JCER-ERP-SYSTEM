import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Eye,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import mentorService, { MenteeListItem } from '../../services/mentor.service';
import { toast } from 'react-toastify';

export const MentorAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const [loading, setLoading] = useState<boolean>(true);
  const [mentees, setMentees] = useState<MenteeListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchMentees = async () => {
    setLoading(true);
    try {
      const data = await mentorService.getMyMentees({
        search: searchQuery,
        semester: semesterFilter !== 'ALL' ? Number(semesterFilter) : undefined,
        attendanceStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
        academicYear,
      });
      setMentees(data);
    } catch (err: any) {
      console.error('Failed to load mentee attendance:', err);
      toast.error('Failed to load mentee attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, [academicYear, semesterFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMentees();
  };

  // Metrics
  const totalMentees = mentees.length;
  const lowAttendanceList = mentees.filter((m) => m.attendance.status === 'NEEDS_ATTENTION');
  const regularAttendanceList = mentees.filter((m) => m.attendance.status === 'MEETS_THRESHOLD');
  const noRecordsList = mentees.filter((m) => m.attendance.status === 'NO_RECORDS');

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mentee Attendance Monitoring
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Track attended sessions, identify attendance shortages (<span className="text-rose-600 font-bold">&lt; 85%</span>), and view subject-wise breakdowns.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMentees}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
            title="Refresh Records"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Total Mentees
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : totalMentees}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">Active assigned mentees</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Attendance &lt; 85%
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-700 dark:text-rose-300 tracking-tight">
            {loading ? '—' : lowAttendanceList.length}
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
            Requires immediate mentoring intervention
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Attendance &ge; 85%
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
            {loading ? '—' : regularAttendanceList.length}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            Meets institutional threshold
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              No Attendance Records
            </span>
            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <CalendarCheck className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : noRecordsList.length}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">No conducted sessions recorded</p>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or USN..."
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

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Attendance Statuses</option>
              <option value="BELOW_85">Below 85% (Low Attendance)</option>
              <option value="ABOVE_85">85% and Above (Regular)</option>
              <option value="NO_RECORDS">No Records</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSemesterFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-xs font-bold transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* ── MENTEES ATTENDANCE TABLE ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/40 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">USN</th>
                <th className="py-3.5 px-4">Sem &amp; Sec</th>
                <th className="py-3.5 px-4">Conducted</th>
                <th className="py-3.5 px-4">Attended</th>
                <th className="py-3.5 px-4">Attendance %</th>
                <th className="py-3.5 px-4">Threshold Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    <RefreshCw className="size-6 mx-auto animate-spin mb-2" />
                    <span>Loading mentee attendance records...</span>
                  </td>
                </tr>
              ) : mentees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No mentees match the selected attendance filter.
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
                          <div className="text-[10px] text-slate-400">{st.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-neutral-300">
                      {st.usn}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-neutral-300">
                      Sem {st.semester} • {st.section}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {st.attendance.totalConducted} classes
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {st.attendance.totalAttended} classes
                    </td>
                    <td className="py-3.5 px-4">
                      {st.attendance.attendancePercentage !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`font-black font-mono text-xs ${
                            st.attendance.attendancePercentage < 85
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {st.attendance.attendancePercentage}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                st.attendance.attendancePercentage < 85 ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(st.attendance.attendancePercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No Records</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {st.attendance.status === 'MEETS_THRESHOLD' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                          <CheckCircle2 className="size-3" />
                          <span>Meets 85%</span>
                        </span>
                      )}
                      {st.attendance.status === 'NEEDS_ATTENTION' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                          <AlertTriangle className="size-3" />
                          <span>Needs Attention</span>
                        </span>
                      )}
                      {st.attendance.status === 'NO_RECORDS' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 font-semibold text-[10px]">
                          <span>No Conducted Sessions</span>
                        </span>
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
                        <span>Breakdown</span>
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

export default MentorAttendancePage;
