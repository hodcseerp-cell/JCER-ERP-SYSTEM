import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Users,
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Award,
  CalendarCheck,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import mentorService, { GlobalMentorAnalyticsData } from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const MentorAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<GlobalMentorAnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await mentorService.getGlobalMentorAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load global mentor analytics:', err);
      toast.error(err.response?.data?.error || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format attendance distribution for Recharts Pie/Donut
  const distributionPieData = data
    ? [
        {
          name: '90% – 100% (Excellent)',
          value: data.attendanceDistribution.range90To100,
          color: '#10b981',
        },
        {
          name: '85% – 90% (Eligible)',
          value: data.attendanceDistribution.range85To90,
          color: '#3b82f6',
        },
        {
          name: '75% – 85% (Borderline)',
          value: data.attendanceDistribution.range75To85,
          color: '#f59e0b',
        },
        {
          name: 'Below 75% (Critical)',
          value: data.attendanceDistribution.rangeBelow75,
          color: '#ef4444',
        },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <LineChartIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
            <span>Global Mentee Group Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Cohort-level monitoring across attendance distributions, CIE performance, and intervention needs.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 space-y-3">
          <RefreshCw className="size-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-xs font-semibold">Computing global cohort analytics...</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* ── ROW 1: 5 TOP KPI CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Mentees */}
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Mentees</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {data.totalMentees}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Active assigned cohort</span>
            </div>

            {/* Average Attendance */}
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Attendance</span>
              <div className={`text-2xl font-black mt-1 ${data.averageAttendance >= 85 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {data.averageAttendance}%
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Target: 85% requirement</span>
            </div>

            {/* Below 85% Attendance */}
            <div className="p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/20 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Below 85% Attendance</span>
              <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
                {data.studentsBelow85}
              </div>
              <span className="text-[10px] text-rose-500 mt-1">Requires follow-up</span>
            </div>

            {/* Average Academic Score */}
            <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average CIE Score</span>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {data.averageAcademicScore > 0 ? `${data.averageAcademicScore} / 50` : '—'}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Current semester mean</span>
            </div>

            {/* Students Requiring Attention */}
            <div className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Needing Support</span>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                {data.studentsNeedingAttention}
              </div>
              <span className="text-[10px] text-amber-600 mt-1">Attendance or CIE risk</span>
            </div>
          </div>

          {/* ── ROW 2: MONTHLY TREND LINE & ATTENDANCE DISTRIBUTION DONUT ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Attendance Trend Line Chart */}
            <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                    Monthly Average Attendance Trend
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cohort-wide average attendance across academic months
                  </p>
                </div>
              </div>

              {data.monthlyAttendanceTrend && data.monthlyAttendanceTrend.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyAttendanceTrend} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        unit="%"
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, 'Cohort Average']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <ReferenceLine
                        y={85}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{ value: '85% Target', position: 'top', fill: '#f43f5e', fontSize: 10, fontWeight: 700 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="averageAttendance"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                        name="Average Attendance"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                  No historical session trends recorded yet.
                </div>
              )}
            </div>

            {/* Attendance Distribution Donut Chart */}
            <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                  Attendance Distribution
                </h3>
                <p className="text-xs text-slate-400">
                  Breakdown of mentees across attendance performance tiers
                </p>
              </div>

              {distributionPieData.length > 0 ? (
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {distributionPieData.map((entry, index) => (
                          <Cell key={`dist-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: string) => [`${val} students`, name]}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                  No mentee attendance data available.
                </div>
              )}
            </div>
          </div>

          {/* ── ROW 3: STUDENTS REQUIRING ATTENTION TABLE ── */}
          <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="size-4 text-rose-500" />
                  <span>Mentees Requiring Attendance Intervention (&lt; 85%)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Students currently below institutional eligibility threshold
                </p>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-900">
                {data.lowAttendanceStudents.length} Students
              </span>
            </div>

            {data.lowAttendanceStudents.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-neutral-800 font-bold text-slate-600 border-b border-slate-200 dark:border-neutral-800">
                    <tr>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">USN</th>
                      <th className="py-3 px-4 text-center">Sem / Sec</th>
                      <th className="py-3 px-4 text-center">Overall Attendance</th>
                      <th className="py-3 px-4">Lowest Subject</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                    {data.lowAttendanceStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{st.name}</td>
                        <td className="py-3 px-4 font-mono font-medium">{st.usn}</td>
                        <td className="py-3 px-4 text-center font-medium">Sem {st.semester} - {st.section}</td>
                        <td className="py-3 px-4 text-center font-black text-rose-600">{st.attendancePercentage}%</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{st.primaryLowSubject}</td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            to={`/mentor/mentees/${st.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                          >
                            <span>Profile</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                All assigned mentees currently meet or exceed the 85% attendance requirement.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MentorAnalyticsPage;
