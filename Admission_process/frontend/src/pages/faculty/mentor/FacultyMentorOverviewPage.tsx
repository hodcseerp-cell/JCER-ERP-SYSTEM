import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import {
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  BookOpen,
  CalendarCheck,
  Award,
  ChevronRight,
  TrendingDown,
  UserX,
} from 'lucide-react';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import mentorService, { FacultyMentorOverviewData } from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const FacultyMentorOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { academicYear } = useAcademicYear();

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<FacultyMentorOverviewData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await mentorService.getMentorDashboardOverview(academicYear);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load mentor overview:', err);
      toast.error(err.response?.data?.error || 'Failed to load Mentor Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [academicYear]);

  const facultyName = user?.name || 'Faculty Mentor';
  const deptName = user?.department?.name || 'Academic Department';
  const deptCode = user?.department?.code || '—';

  const myMenteesCount = data?.myMenteesCount || 0;
  const lowAttendanceCount = data?.lowAttendanceCount || 0;
  const followUpsCount = data?.followUpsCount || 0;
  const attentionCount = data?.attentionCount || 0;

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/mentor/mentees?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/mentor/mentees');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ── TOP ACTION & STATUS BAR ── */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 shadow-xs text-xs font-semibold text-slate-700 dark:text-neutral-300">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Mentor: <strong className="text-slate-900 dark:text-white font-bold">{facultyName}</strong> ({deptCode})</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 text-slate-600 dark:text-neutral-300 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Refresh Overview Data"
          >
            <RefreshCw className={`size-3.5 text-indigo-600 dark:text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. My Mentees */}
        <Link
          to="/mentor/mentees"
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm relative overflow-hidden group hover:border-indigo-500/50 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              My Mentees
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : myMenteesCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 flex items-center gap-1">
            <span>Actively assigned students</span>
            <ArrowRight className="size-3 text-indigo-500 group-hover:translate-x-1 transition" />
          </p>
        </Link>

        {/* 2. Attendance Below 85% */}
        <Link
          to="/mentor/attendance?status=BELOW_85"
          className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm relative overflow-hidden group hover:shadow-md transition ${
            lowAttendanceCount > 0
              ? 'border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20'
              : 'border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Attendance &lt; 85%
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${lowAttendanceCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>
            {loading ? '—' : lowAttendanceCount}
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1 font-medium">
            <span>Below institutional threshold (85%)</span>
            <ArrowRight className="size-3 group-hover:translate-x-1 transition" />
          </p>
        </Link>

        {/* 3. Academic Follow-ups */}
        <Link
          to="/mentor/notes"
          className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm relative overflow-hidden group hover:shadow-md transition ${
            followUpsCount > 0
              ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20'
              : 'border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Academic Follow-ups
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${followUpsCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
            {loading ? '—' : followUpsCount}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
            <span>Open or pending action items</span>
            <ArrowRight className="size-3 group-hover:translate-x-1 transition" />
          </p>
        </Link>

        {/* 4. Students Requiring Attention */}
        <Link
          to="/mentor/mentees?sortBy=ATTENTION"
          className="p-5 rounded-2xl border border-purple-500/20 bg-purple-50/40 dark:bg-purple-950/20 backdrop-blur-md shadow-sm relative overflow-hidden group hover:border-purple-500/50 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Needs Attention
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
            {loading ? '—' : attentionCount}
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center gap-1 font-medium">
            <span>Distinct students with alerts</span>
            <ArrowRight className="size-3 group-hover:translate-x-1 transition" />
          </p>
        </Link>
      </div>

      {/* ── QUICK SEARCH & QUICK ACTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Search */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="size-4 text-indigo-500" />
            <span>Quick Mentee Search</span>
          </h2>
          <form onSubmit={handleQuickSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assigned mentee by student name or USN..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
            >
              Search
            </button>
          </form>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-500" />
            <span>Quick Actions</span>
          </h2>
          <div className="flex flex-col gap-2">
            <Link
              to="/mentor/mentees"
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-neutral-300 hover:text-indigo-600 text-xs font-bold flex items-center justify-between transition"
            >
              <span>View All Mentees</span>
              <ChevronRight className="size-4" />
            </Link>
            <Link
              to="/mentor/attendance?status=BELOW_85"
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-neutral-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-neutral-300 hover:text-rose-600 text-xs font-bold flex items-center justify-between transition"
            >
              <span>Review Low Attendance ({lowAttendanceCount})</span>
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── SECTION A & B: STUDENTS REQUIRING ATTENTION & RECENT ACTIVITY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Students Requiring Attention */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-500" />
                <span>Students Requiring Attention</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Mentees with attendance below 85% or open mentoring action plans.
              </p>
            </div>
            <Link
              to="/mentor/mentees?sortBy=ATTENTION"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All Mentees →
            </Link>
          </div>

          <div className="space-y-3">
            {data?.studentsRequiringAttention?.length ? (
              data.studentsRequiringAttention.map((st) => (
                <div
                  key={st.studentId}
                  onClick={() => navigate(`/mentor/mentees/${st.studentId}`)}
                  className="p-4 rounded-xl border border-slate-200/60 dark:border-neutral-800/60 bg-slate-50/40 dark:bg-neutral-800/30 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-neutral-800/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{st.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                        {st.usn} • Sem {st.semester}-{st.section}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {st.hasLowAttendance && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                        <TrendingDown className="size-3" />
                        <span>{st.attendancePercentage !== null ? `${st.attendancePercentage}% Attendance` : 'Low Att.'}</span>
                      </span>
                    )}

                    {st.openFollowUps > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                        <Clock className="size-3" />
                        <span>{st.openFollowUps} Action{st.openFollowUps > 1 ? 's' : ''}</span>
                      </span>
                    )}

                    <ChevronRight className="size-4 text-slate-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-400 dark:text-neutral-500 space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
                <p className="text-xs font-semibold">Great! No mentees currently require urgent attention.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent Mentee Activity */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="size-4 text-indigo-500" />
              <span>Recent Activity</span>
            </h2>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {data?.recentActivity?.length ? (
              data.recentActivity.map((act: any) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/40 dark:bg-neutral-800/20 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{act.student?.user?.name || 'Mentee'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {act.meetingDate ? new Date(act.meetingDate).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-300 line-clamp-2">
                    {act.summary}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {act.concernCategory}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        act.followUpStatus === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {act.followUpStatus}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-neutral-500">
                No recent mentoring activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyMentorOverviewPage;
