import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  TrendingUp,
  AlertTriangle,
  Award,
  CalendarCheck,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { MenteeAnalyticsData } from '../../services/mentor.service';

interface MenteeAnalyticsDashboardProps {
  analytics: MenteeAnalyticsData;
  threshold?: number;
}

export const MenteeAnalyticsDashboard: React.FC<MenteeAnalyticsDashboardProps> = ({
  analytics,
  threshold = 85.0,
}) => {
  const { summaryCards, riskFactors } = analytics;
  const overallAtt = summaryCards.overallAttendance;
  const avgCie = summaryCards.academicAverage;
  const lowCount = summaryCards.subjectsBelow85;
  const riskLevel = analytics.riskLevelNormalized || (analytics.riskLevel === 'RED' ? 'HIGH' : analytics.riskLevel === 'YELLOW' ? 'MEDIUM' : 'LOW');

  // Chart data normalization
  const donutData = analytics.attendedVsMissedDonut && analytics.attendedVsMissedDonut.length > 0
    ? analytics.attendedVsMissedDonut
    : [
        { name: 'Attended', value: summaryCards.totalAttended ?? 0, color: '#10b981' },
        { name: 'Missed', value: summaryCards.totalMissed ?? 0, color: '#ef4444' },
      ];

  const subjectAttData = analytics.subjectAttendanceBars && analytics.subjectAttendanceBars.length > 0
    ? analytics.subjectAttendanceBars
    : (analytics.subjectPerformance || []).map((s: any) => ({
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        conducted: s.conducted,
        attended: s.attended,
        missed: Math.max(0, s.conducted - s.attended),
        attendancePercentage: s.attendancePercentage,
      }));

  const monthlyGroupedData = analytics.monthlyAttendanceGrouped && analytics.monthlyAttendanceGrouped.length > 0
    ? analytics.monthlyAttendanceGrouped
    : (analytics.attendanceTrend || []).map((m: any) => ({
        month: m.month,
        attended: m.attended ?? 0,
        missed: m.missed ?? 0,
        percentage: m.percentage,
      }));

  const subjectAcademicData = analytics.subjectAcademicBars && analytics.subjectAcademicBars.length > 0
    ? analytics.subjectAcademicBars
    : [];

  const semesterTrendData = analytics.academicTrend && analytics.academicTrend.length > 0
    ? analytics.academicTrend
    : [];

  // Custom tooltips
  const CustomSubjectTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
          <p className="font-bold text-slate-100">{data.subjectCode} - {data.subjectName}</p>
          <div className="flex justify-between gap-4 text-slate-300">
            <span>Conducted:</span>
            <span className="font-bold">{data.conducted}</span>
          </div>
          <div className="flex justify-between gap-4 text-emerald-400">
            <span>Attended:</span>
            <span className="font-bold">{data.attended}</span>
          </div>
          <div className="flex justify-between gap-4 text-rose-400">
            <span>Missed:</span>
            <span className="font-bold">{data.missed}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-indigo-300 font-bold">
            <span>Attendance Rate:</span>
            <span>{data.attendancePercentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* ── ROW 1: 4 KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance */}
        <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overall Attendance</span>
            <CalendarCheck className="size-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <div className={`text-3xl font-black ${overallAtt >= threshold ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
              {overallAtt}%
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="font-semibold">Institutional Threshold:</span>
              <span className="font-bold text-slate-700 dark:text-neutral-300">{threshold}%</span>
            </div>
          </div>
        </div>

        {/* Academic Score (CIE Average) */}
        <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Academic Score (CIE)</span>
            <Award className="size-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {avgCie > 0 ? `${avgCie} / 50` : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Current Semester CIE Mean
            </div>
          </div>
        </div>

        {/* Subjects Below 85% */}
        <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Subjects Below 85%</span>
            <AlertTriangle className={`size-4 ${lowCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2">
            <div className={`text-3xl font-black ${lowCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {lowCount}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {lowCount > 0 ? 'Requires Attendance Follow-up' : 'All Subjects Eligible'}
            </div>
          </div>
        </div>

        {/* Overall Academic Risk Level */}
        <div className="p-5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Academic Risk Level</span>
            {riskLevel === 'HIGH' ? (
              <ShieldAlert className="size-4 text-rose-500" />
            ) : (
              <ShieldCheck className="size-4 text-emerald-500" />
            )}
          </div>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              riskLevel === 'HIGH'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : riskLevel === 'MEDIUM'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}>
              {riskLevel === 'HIGH' ? 'High Risk' : riskLevel === 'MEDIUM' ? 'Medium Risk' : 'Low Risk (Stable)'}
            </span>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Automated Metric
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors Alert Banner (if applicable) */}
      {riskFactors && riskFactors.length > 0 && (
        <div className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-xs flex items-start gap-3">
          <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-900 dark:text-rose-200">
              Academic Intervention Recommended
            </h4>
            <ul className="list-disc list-inside space-y-0.5 text-rose-700 dark:text-rose-300">
              {riskFactors.map((rf, idx) => (
                <li key={idx}>{rf}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── ROW 2: SUBJECT ATTENDANCE BARS & ATTENDED VS MISSED DONUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-Wise Attendance Bar Chart (Span 2) */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                Subject-Wise Attendance
              </h3>
              <p className="text-xs text-slate-400">
                Course attendance rates compared against the 85% requirement
              </p>
            </div>
            <span className="text-xs font-bold text-rose-600 border border-rose-200 dark:border-rose-900 px-2 py-0.5 rounded-md">
              Threshold: 85%
            </span>
          </div>

          {subjectAttData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAttData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="subjectCode"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    unit="%"
                  />
                  <Tooltip content={<CustomSubjectTooltip />} />
                  <ReferenceLine
                    y={threshold}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: `${threshold}% Target`, position: 'top', fill: '#f43f5e', fontSize: 10, fontWeight: 700 }}
                  />
                  <Bar
                    dataKey="attendancePercentage"
                    radius={[6, 6, 0, 0]}
                    name="Attendance %"
                  >
                    {subjectAttData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.attendancePercentage >= threshold ? '#10b981' : '#f43f5e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
              No course attendance records recorded for this semester.
            </div>
          )}
        </div>

        {/* Attended vs Missed Donut Chart (Span 1) */}
        <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
              Attended vs Missed
            </h3>
            <p className="text-xs text-slate-400">
              Total session proportion across semester
            </p>
          </div>

          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: string) => [`${val} sessions`, name]}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Percentage Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {overallAtt}%
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Rate
              </span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs pt-2 border-t border-slate-100 dark:border-neutral-800">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
              <div className="text-[10px] uppercase font-bold text-emerald-600">Attended</div>
              <div className="font-black text-base">{summaryCards.totalAttended ?? 0}</div>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300">
              <div className="text-[10px] uppercase font-bold text-rose-600">Missed</div>
              <div className="font-black text-base">{summaryCards.totalMissed ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: MONTHLY ATTENDANCE LINE GRAPH & GROUPED SESSIONS BAR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Attendance Line Trend */}
        <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                Monthly Attendance Trend
              </h3>
              <p className="text-xs text-slate-400">
                Progression across academic calendar months
              </p>
            </div>
          </div>

          {analytics.attendanceTrend && analytics.attendanceTrend.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.attendanceTrend} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
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
                    formatter={(val: any) => [`${val}%`, 'Attendance Rate']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <ReferenceLine
                    y={threshold}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: '85% Target', position: 'top', fill: '#f43f5e', fontSize: 10, fontWeight: 700 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    name="Attendance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 italic">
              No monthly session trends recorded.
            </div>
          )}
        </div>

        {/* Classes Attended vs Missed (Grouped Bars) */}
        <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
              Classes Attended vs Missed
            </h3>
            <p className="text-xs text-slate-400">
              Monthly breakdown of conducted session attendance
            </p>
          </div>

          {monthlyGroupedData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyGroupedData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="attended" fill="#10b981" radius={[4, 4, 0, 0]} name="Attended" />
                  <Bar dataKey="missed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Missed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 italic">
              No session records available for grouped view.
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 4: ACADEMIC PERFORMANCE CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-Wise Academic Performance (CIE / SEE) */}
        <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
              Subject-Wise Academic Performance
            </h3>
            <p className="text-xs text-slate-400">
              Internal assessment scores per enrolled course
            </p>
          </div>

          {subjectAcademicData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectAcademicData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="subjectCode"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    domain={[0, 50]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="cie" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="CIE (out of 50)" />
                  {subjectAcademicData.some((s: any) => s.see !== null) && (
                    <Bar dataKey="see" fill="#06b6d4" radius={[4, 4, 0, 0]} name="SEE Marks" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 italic">
              No academic records available for this semester.
            </div>
          )}
        </div>

        {/* Semester Performance Trend (Across Semesters) */}
        <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-neutral-200">
              Semester Academic Progression Trend
            </h3>
            <p className="text-xs text-slate-400">
              Longitudinal CIE performance across completed semesters
            </p>
          </div>

          {semesterTrendData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={semesterTrendData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="semester"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    domain={[0, 50]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} / 50`, 'CIE Average']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageMarks"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                    name="CIE Mean"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 italic">
              No multi-semester academic records available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenteeAnalyticsDashboard;
