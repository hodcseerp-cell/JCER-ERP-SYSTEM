import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Users, ShieldCheck, CheckCircle2, Ban, TrendingUp, 
  MapPin, Activity, Clock, ArrowRight, AlertTriangle, RefreshCw, 
  Search, Filter, GraduationCap, ShieldAlert, Check, XCircle, ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, LineChart, Line, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import officeService from '../../../services/office.service';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#06b6d4', '#ec4899'];

interface AnalyticsData {
  kpis: {
    totalApplications: number;
    pendingReview: number;
    underReview: number;
    corrections: number;
    awaitingPrincipal: number;
    enrolled: number;
    cancelled: number;
  };
  funnel: { stage: string; count: number; percentage: number }[];
  trend: { date: string; submitted: number; approved: number; enrolled: number }[];
  branchPerformance: { name: string; applications: number; approved: number; enrolled: number }[];
  admissionTypes: { name: string; value: number }[];
  categories: { category: string; count: number }[];
  genders: { name: string; value: number }[];
  districts: { district: string; count: number }[];
  workload: { averageReviewTime: string };
  rates: {
    enrollmentRate: string;
    adminVerification: string;
    correctionRate: string;
    rejectionRate: string;
    cancellationRate: string;
  };
  recentActivity: { id: string; appNumber: string; action: string; studentName: string; timestamp: string }[];
  pendingActions: { reviewApps: number; correctionResubmissions: number; awaitingPrincipal: number };
}

export const AdminAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Filters
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [period, setPeriod] = useState<string>('cycle');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const params: any = { academicYear, period };
      if (period === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await officeService.getAnalyticsData(params);
      setData(res);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      setError(null);
    } catch (err: any) {
      console.error('Error loading admin analytics:', err);
      setError(`Connection issue. Showing data from ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and filters change
  useEffect(() => {
    fetchAnalytics(true);
  }, [academicYear, period, startDate, endDate]);

  // Polling every 30 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchAnalytics(false);
    }, 30000);

    const secInterval = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(secInterval);
    };
  }, [academicYear, period, startDate, endDate]);

  const kpis = data?.kpis || {
    totalApplications: 0,
    pendingReview: 0,
    underReview: 0,
    corrections: 0,
    awaitingPrincipal: 0,
    enrolled: 0,
    cancelled: 0
  };

  const pendingActions = data?.pendingActions || {
    reviewApps: 0,
    correctionResubmissions: 0,
    awaitingPrincipal: 0
  };

  const rates = data?.rates || {
    enrollmentRate: '—',
    adminVerification: '—',
    correctionRate: '—',
    rejectionRate: '—',
    cancellationRate: '—'
  };

  const kpiStats = [
    { 
      label: 'Total Applications', 
      value: kpis.totalApplications, 
      desc: 'All processed forms',
      icon: ClipboardList, 
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50', 
      path: '/admin/admissions/queue' 
    },
    { 
      label: 'Pending Review', 
      value: kpis.pendingReview, 
      desc: 'Awaiting admin checklist',
      icon: Clock, 
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50', 
      path: '/admin/admissions/queue' 
    },
    { 
      label: 'Under Review', 
      value: kpis.underReview, 
      desc: 'Currently in audit',
      icon: Activity, 
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50', 
      path: '/admin/admissions/queue' 
    },
    { 
      label: 'Correction Required', 
      value: kpis.corrections, 
      desc: 'Sent back to students',
      icon: AlertTriangle, 
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50', 
      path: '/admin/admissions/corrections' 
    },
    { 
      label: 'Awaiting Principal', 
      value: kpis.awaitingPrincipal, 
      desc: 'Admin verified sign-offs',
      icon: ShieldCheck, 
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50', 
      path: '/admin/admissions/verified' 
    },
    { 
      label: 'Enrolled', 
      value: kpis.enrolled, 
      desc: 'ERP Confirmed admissions',
      icon: GraduationCap, 
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50', 
      path: '/admin/admissions/approved' 
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-md text-left text-xs font-semibold">
          <p className="font-extrabold text-neutral-800 dark:text-neutral-100 mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 py-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-neutral-500 dark:text-neutral-450 font-bold uppercase text-[9px]">{item.name}:</span>
              <span className="font-black text-neutral-800 dark:text-neutral-200 ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-fade-in pb-8 font-sans max-w-full text-neutral-800 dark:text-neutral-200">
      
      {/* ═══ TOP HEADER ═══ */}
      <div className="flex flex-row items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-850 pb-3">
        <div className="flex flex-col min-w-0">
          <h2 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-wider leading-none">Admission Analytics</h2>
          <span className="text-[10px] font-black text-neutral-450 dark:text-neutral-500 uppercase tracking-widest mt-1">
            Jain College of Engineering & Research
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 select-none">
          {error ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900 text-rose-600 text-[10px] font-black uppercase">
              <ShieldAlert size={12} className="animate-pulse" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 text-emerald-600 text-[10px] font-black uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>LIVE • Updated {secondsAgo}s ago</span>
            </div>
          )}

          <button 
            onClick={() => fetchAnalytics(true)}
            className="p-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition shadow-sm"
            title="Refresh analytics data"
          >
            <RefreshCw size={12} className={`text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ FILTERS ═══ */}
      <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200/85 dark:border-neutral-800/80 shadow-sm flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-neutral-400" />
          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Filters</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Academic Year */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Year</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer text-neutral-700 dark:text-neutral-300"
            >
              <option value="ALL">All Years</option>
              <option value="2026-2027">2026–2027</option>
              <option value="2025-2026">2025–2026</option>
            </select>
          </div>

          {/* Period */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Period</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer text-neutral-700 dark:text-neutral-300"
            >
              <option value="cycle">Admission Cycle</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {period === 'custom' && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none text-neutral-700 dark:text-neutral-300"
              />
              <span className="text-neutral-400 text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none text-neutral-700 dark:text-neutral-300"
              />
            </div>
          )}
        </div>
      </div>

      {/* ═══ KPI SECTION ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 select-none">
        {kpiStats.map((stat, i) => (
          <button
            key={i}
            onClick={() => navigate(stat.path)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-xl p-3.5 text-left transition hover:scale-[1.01] hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm flex flex-col justify-between h-24 group relative overflow-hidden"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-450 leading-snug">{stat.label}</span>
              <div className={`w-6 h-6 rounded-md ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon size={12} />
              </div>
            </div>
            <div className="mt-auto">
              <h4 className="text-xl font-black text-neutral-900 dark:text-white leading-none">{stat.value.toLocaleString()}</h4>
              <p className="text-[9px] text-neutral-450 dark:text-neutral-500 font-bold mt-1 uppercase tracking-wide truncate">{stat.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ═══ MAIN ANALYTICS GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card A — Application Activity Area Chart (2/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[320px] flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-3 select-none">
            <h3 className="text-xs font-black uppercase text-neutral-450 dark:text-neutral-550 tracking-wider">Application Activity</h3>
            <span className="text-[10px] bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded font-black text-neutral-450 uppercase">{period === 'cycle' ? 'Full Cycle' : period}</span>
          </div>
          
          <div className="flex-1 min-h-0">
            {data?.trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={28} iconType="circle" iconSize={5} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.03)" strokeWidth={2} />
                  <Area type="monotone" dataKey="approved" name="Verified" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.03)" strokeWidth={2} />
                  <Area type="monotone" dataKey="enrolled" name="Enrolled" stroke="#10b981" fill="rgba(16, 185, 129, 0.03)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 select-none">
                <p className="font-bold text-xs">No application activity data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Card B — Admission Funnel (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-450 dark:text-neutral-550 tracking-wider mb-4 select-none">Admission Funnel</h3>
          <div className="flex-1 overflow-y-auto pr-1">
            {data?.funnel.length ? (
              <div className="space-y-3.5">
                {data.funnel.map((step, idx) => {
                  const maxCount = data.funnel[0]?.count || 1;
                  const pct = (step.count / maxCount) * 100;
                  const colors = [
                    'bg-blue-500', // Submitted
                    'bg-blue-400/80', // Under Review
                    'bg-violet-500', // Admin Verified
                    'bg-indigo-500', // Principal Approved
                    'bg-emerald-500' // Enrolled
                  ];
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-extrabold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">{step.stage}</span>
                        <div className="flex items-center gap-1.5 font-black text-neutral-900 dark:text-white">
                          <span>{step.count.toLocaleString()}</span>
                          <span className="text-neutral-400 font-bold text-[9px] bg-neutral-50 dark:bg-neutral-800 px-1 py-0.2 rounded">{step.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 select-none">
                <p className="font-bold text-xs">No funnel statistics available</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Card C — Branch-wise Admissions (Full width) */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[320px] flex flex-col">
        <h3 className="text-xs font-black uppercase text-neutral-450 dark:text-neutral-550 tracking-wider mb-4 select-none">Branch Performance</h3>
        <div className="flex-1 min-h-0">
          {data?.branchPerformance.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchPerformance} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#a3a3a3', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={28} iconType="circle" iconSize={5} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                <Bar dataKey="applications" name="Applications" fill="rgba(59, 130, 246, 0.85)" radius={[3, 3, 0, 0]} barSize={12} />
                <Bar dataKey="approved" name="Verified" fill="rgba(139, 92, 246, 0.85)" radius={[3, 3, 0, 0]} barSize={12} />
                <Bar dataKey="enrolled" name="Enrolled" fill="rgba(16, 185, 129, 0.85)" radius={[3, 3, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 select-none">
              <p className="font-bold text-xs">No branch statistics available</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card D — Admission Type (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[280px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-450 dark:text-neutral-550 tracking-wider mb-4 select-none">Admission Type</h3>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            {data?.admissionTypes.length ? (
              <div className="flex items-center gap-4 w-full h-full">
                <div className="relative w-1/2 h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={data.admissionTypes} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={42} 
                        outerRadius={62} 
                        paddingAngle={3}
                      >
                        {data.admissionTypes.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black uppercase text-neutral-400 leading-none">Total</span>
                    <span className="text-base font-black text-neutral-805 dark:text-neutral-200 mt-1">
                      {data.admissionTypes.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-1/2 select-none">
                  {data.admissionTypes.map((entry, idx) => {
                    const total = data.admissionTypes.reduce((acc, curr) => acc + curr.value, 0) || 1;
                    const pct = Math.round((entry.value / total) * 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-450 truncate">{entry.name}</span>
                          <span className="text-[10px] font-black text-neutral-900 dark:text-white mt-0.5">{entry.value} ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-neutral-400 select-none">No quota distribution data</p>
            )}
          </div>
        </div>

        {/* Card E — Category Distribution (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[280px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-450 dark:text-neutral-550 tracking-wider mb-4 select-none">Category Distribution</h3>
          <div className="flex-1 overflow-y-auto pr-1">
            {data?.categories.length ? (
              <div className="space-y-3">
                {data.categories
                  .sort((a, b) => b.count - a.count)
                  .map((item, idx) => {
                    const maxVal = Math.max(...data.categories.map(c => c.count)) || 1;
                    const total = data.categories.reduce((acc, curr) => acc + curr.count, 0) || 1;
                    const pctBar = (item.count / maxVal) * 100;
                    const pctText = Math.round((item.count / total) * 100);
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-neutral-750 dark:text-neutral-300">{item.category || 'GM'}</span>
                          <span className="font-black text-neutral-900 dark:text-white">{item.count} <span className="text-neutral-455 font-bold text-[9px]">({pctText}%)</span></span>
                        </div>
                        <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-850 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-550 rounded-full" style={{ width: `${pctBar}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-450 select-none">
                <p className="font-bold text-xs">No category metrics available</p>
              </div>
            )}
          </div>
        </div>

        {/* Card F — Gender Representation (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[280px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Gender Distribution</h3>
          <div className="flex-1 overflow-y-auto pr-1">
            {data?.genders.length ? (
              <div className="space-y-3.5 py-1">
                {data.genders.map((entry, idx) => {
                  const total = data.genders.reduce((acc, curr) => acc + curr.value, 0) || 1;
                  const pct = Math.round((entry.value / total) * 100);
                  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-amber-500'];
                  return (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-extrabold text-neutral-700 dark:text-neutral-350">{entry.name}</span>
                        <div className="flex items-center gap-1 font-black text-neutral-900 dark:text-white">
                          <span>{entry.value}</span>
                          <span className="text-[9px] text-neutral-450 font-bold">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[idx % colors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-450 select-none">
                <p className="font-bold text-xs">No gender data available</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card G — District distribution (2/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[280px] flex flex-col lg:col-span-2">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Top districts</h3>
          <div className="flex-1 overflow-y-auto pr-1">
            {data?.districts.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {data.districts
                  .sort((a, b) => b.count - a.count)
                  .map((item, idx) => {
                    const maxVal = Math.max(...data.districts.map(d => d.count)) || 1;
                    const total = data.districts.reduce((acc, curr) => acc + curr.count, 0) || 1;
                    const pctBar = (item.count / maxVal) * 100;
                    const pctText = Math.round((item.count / total) * 100);
                    return (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-neutral-750 dark:text-neutral-300 truncate">{item.district || 'Unspecified'}</span>
                          <span className="font-black text-neutral-900 dark:text-white shrink-0">{item.count} <span className="text-neutral-450 font-bold text-[9px]">({pctText}%)</span></span>
                        </div>
                        <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pctBar}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-450 select-none">
                <p className="font-bold text-xs">No district metrics available</p>
              </div>
            )}
          </div>
        </div>

        {/* Card H — Operational turnaround & rates (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[280px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Admission Processing</h3>
          
          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="p-2 border border-neutral-100 dark:border-neutral-800/80 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/25 flex flex-col justify-between min-h-[56px]">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wide">Avg Review</span>
                <span className="text-xs font-black text-neutral-805 dark:text-neutral-200 mt-1">{data?.workload.averageReviewTime || '—'}</span>
              </div>
              <div className="p-2 border border-neutral-100 dark:border-neutral-800/80 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/25 flex flex-col justify-between min-h-[56px]">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wide">Avg Principal</span>
                <span className="text-xs font-black text-neutral-805 dark:text-neutral-200 mt-1">1.2 days</span>
              </div>
            </div>

            <div className="space-y-2 select-none border-t border-neutral-100 dark:border-neutral-850 pt-2.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-neutral-450 uppercase tracking-wide">Enrollment Yield</span>
                <span className="font-black text-neutral-900 dark:text-white">{rates.enrollmentRate}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-neutral-450 uppercase tracking-wide">Verification Rate</span>
                <span className="font-black text-neutral-900 dark:text-white">{rates.adminVerification}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-neutral-450 uppercase tracking-wide">Correction Rate</span>
                <span className="font-black text-neutral-900 dark:text-white">{rates.correctionRate}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-neutral-450 uppercase tracking-wide">Rejection Rate</span>
                <span className="font-black text-neutral-900 dark:text-white">{rates.rejectionRate}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ═══ BOTTOM SECTION ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Pending Actions required */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[260px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-rose-500 tracking-wider mb-3 flex items-center gap-1.5 select-none">
            <AlertTriangle size={12} className="animate-pulse" /> Pending Actions
          </h3>

          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="space-y-2.5">
              <button 
                onClick={() => navigate('/admin/admissions/queue?status=SUBMITTED')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-850 text-left transition relative overflow-hidden group select-none"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-neutral-800 dark:text-neutral-200">Review Applications</span>
                  <span className="text-[9px] font-bold text-neutral-400 mt-0.5">Submitted application forms awaiting verification</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 rounded-lg text-xs font-black">
                    {pendingActions.reviewApps}
                  </span>
                  <ArrowUpRight size={13} className="text-neutral-350 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button 
                onClick={() => navigate('/admin/admissions/resubmitted')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-850 text-left transition relative overflow-hidden group select-none"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-neutral-800 dark:text-neutral-200">Correction Resubmissions</span>
                  <span className="text-[9px] font-bold text-neutral-400 mt-0.5">Forms corrected by student and resubmitted</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450 rounded-lg text-xs font-black">
                    {pendingActions.correctionResubmissions}
                  </span>
                  <ArrowUpRight size={13} className="text-neutral-350 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button 
                onClick={() => navigate('/admin/admissions/verified')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-850 text-left transition relative overflow-hidden group select-none"
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-neutral-800 dark:text-neutral-200">Principal Pending</span>
                  <span className="text-[9px] font-bold text-neutral-400 mt-0.5">Admin verified awaiting Principal sign-off</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-450 rounded-lg text-xs font-black">
                    {pendingActions.awaitingPrincipal}
                  </span>
                  <ArrowUpRight size={13} className="text-neutral-350 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity audit logs */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm h-[260px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-3 select-none">Recent Activity</h3>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {data?.recentActivity.length ? (
              data.recentActivity.map((act) => (
                <div 
                  key={act.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/10 border border-neutral-100/50 dark:border-neutral-800/30 text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-250 truncate">
                        {act.studentName} {act.action}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400 mt-0.5">
                        {act.appNumber}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold text-neutral-400 shrink-0 select-none ml-2">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs font-bold text-neutral-400 text-center py-6 select-none">No recent activity logs recorded</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminAnalyticsPage;