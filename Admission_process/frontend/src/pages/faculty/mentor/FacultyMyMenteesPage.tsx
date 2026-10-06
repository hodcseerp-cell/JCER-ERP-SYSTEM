import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Award,
  CalendarCheck,
  Eye,
} from 'lucide-react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import mentorService, { MenteeListItem } from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const FacultyMyMenteesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { academicYear } = useAcademicYear();

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [semester, setSemester] = useState<string>('ALL');
  const [section, setSection] = useState<string>('ALL');
  const [attendanceStatus, setAttendanceStatus] = useState<string>(
    searchParams.get('attendanceStatus') || 'ALL'
  );
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'ATTENTION');

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [mentees, setMentees] = useState<MenteeListItem[]>([]);

  const fetchMentees = async () => {
    setLoading(true);
    try {
      const data = await mentorService.getMyMentees({
        search: searchQuery,
        semester: semester !== 'ALL' ? Number(semester) : undefined,
        section: section !== 'ALL' ? section : undefined,
        attendanceStatus,
        sortBy,
        academicYear,
      });
      setMentees(data);
    } catch (err: any) {
      console.error('Failed to load mentees:', err);
      toast.error(err.response?.data?.error || 'Failed to load mentees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, [academicYear, semester, section, attendanceStatus, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMentees();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <Link
              to="/mentor/dashboard"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:border-neutral-200 border-2 border-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-neutral-200" />
              <span>Back to Overview</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                My Mentees
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                View your assigned students and monitor their academic progress, attendance, and mentoring records.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
            <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>{mentees.length} Active Mentees</span>
          </div>

          <button
            onClick={fetchMentees}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 transition shadow-sm"
            title="Refresh List"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── FILTER & SORTING CONTROLS ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search by Name or USN */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Search Mentee
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or USN..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Attendance Status
            </label>
            <select
              value={attendanceStatus}
              onChange={(e) => setAttendanceStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Attendance</option>
              <option value="BELOW_85">Below 85% (Needs Attention)</option>
              <option value="ABOVE_85">85% and Above (Eligible)</option>
              <option value="NO_RECORDS">No Records Yet</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ATTENTION">Needs Attention First (Default)</option>
              <option value="NAME">Student Name (A–Z)</option>
              <option value="USN">USN</option>
              <option value="ATTENDANCE">Attendance Percentage</option>
            </select>
          </div>
        </form>
      </div>

      {/* ── MENTEES TABLE ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 dark:text-neutral-300 font-bold border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">USN</th>
                <th className="py-3 px-4 text-center">Sem / Sec</th>
                <th className="py-3 px-4 text-center">Attendance</th>
                <th className="py-3 px-4">Latest Academic Result</th>
                <th className="py-3 px-4 text-center">Follow-ups</th>
                <th className="py-3 px-4">Last Meeting</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-slate-700 dark:text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading assigned mentees...</span>
                  </td>
                </tr>
              ) : mentees.length > 0 ? (
                mentees.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => navigate(`/mentor/mentees/${st.id}`)}
                    className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition cursor-pointer"
                  >
                    {/* Student Name & Avatar */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {st.name.charAt(0)}
                        </div>
                        <div>
                          <div>{st.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">Dept: {st.departmentCode}</div>
                        </div>
                      </div>
                    </td>

                    {/* USN */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-neutral-300">
                      {st.usn}
                    </td>

                    {/* Sem / Sec */}
                    <td className="py-3.5 px-4 text-center font-semibold">
                      Sem {st.semester} - {st.section}
                    </td>

                    {/* Attendance */}
                    <td className="py-3.5 px-4 text-center">
                      {st.attendance.status === 'NO_RECORDS' ? (
                        <span className="text-[11px] text-slate-400 italic">No Records</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            st.attendance.status === 'MEETS_THRESHOLD'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {st.attendance.status === 'MEETS_THRESHOLD' ? (
                            <TrendingUp className="size-3" />
                          ) : (
                            <TrendingDown className="size-3" />
                          )}
                          <span>{st.attendance.attendancePercentage}%</span>
                        </span>
                      )}
                    </td>

                    {/* Latest Result */}
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-medium text-slate-700 dark:text-neutral-300">
                        {st.latestResult?.displayString || 'Awaiting Results'}
                      </span>
                    </td>

                    {/* Open Follow-ups */}
                    <td className="py-3.5 px-4 text-center">
                      {st.openFollowUps > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          <Clock className="size-3" />
                          <span>{st.openFollowUps} Open</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">None</span>
                      )}
                    </td>

                    {/* Last Meeting */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-neutral-400 text-[11px]">
                      {st.lastMeetingDate ? new Date(st.lastMeetingDate).toLocaleDateString() : 'Never'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/mentor/mentees/${st.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-[11px] transition shadow-sm"
                      >
                        <Eye className="size-3" />
                        <span>Profile</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No mentees match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacultyMyMenteesPage;
