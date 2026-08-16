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
import officeService from '../../services/office.service';

const COLORS = ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

interface AnalyticsData {
  kpis: {
    totalApplications: number;
    awaitingPrincipal: number;
    principalApproved: number;
    enrolled: number;
    rejected: number;
    cancelled: number;
  };
  funnel: { stage: string; count: number; percentage: number }[];
  trend: { date: string; submitted: number; approved: number; enrolled: number }[];
  branchPerformance: { name: string; applications: number; approved: number; enrolled: number }[];
  admissionTypes: { name: string; value: number }[];
  categories: { category: string; count: number }[];
  genders: { name: string; value: number }[];
  districts: { district: string; count: number }[];
  overview: { averageDecisionTime: string; approvalRate: string };
  rates: {
    enrollmentRate: string;
    adminVerification: string;
    correctionRate: string;
    rejectionRate: string;
    cancellationRate: string;
  };
  recentActivity: { id: string; appNumber: string; action: string; studentName: string; timestamp: string }[];
  pendingActions: { awaitingApproval: number; readyForEnrollment: number };
}

export const CollegeAnalyticsPage: React.FC = () => {
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
      const res = await officeService.getPrincipalAnalytics(params);
      setData(res);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      setError(null);
    } catch (err: any) {
      console.error('Error loading principal analytics:', err);
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
    awaitingPrincipal: 0,
    principalApproved: 0,
    enrolled: 0,
    rejected: 0,
    cancelled: 0
  };

  const pendingActions = data?.pendingActions || {
    awaitingApproval: 0,
    readyForEnrollment: 0
  };

  const overview = data?.overview || {
    averageDecisionTime: '—',
    approvalRate: '—'
  };

  const kpiStats = [
    { 
      label: 'Total Applications', 
      value: kpis.totalApplications, 
      desc: 'All processed forms',
      icon: ClipboardList, 
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50', 
      path: '/principal/admissions' 
    },
    { 
      label: 'Awaiting Approval', 
      value: kpis.awaitingPrincipal, 
      desc: 'Pending your decision',
      icon: Clock, 
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50', 
      path: '/principal/admissions?status=APPROVED' 
    },
    { 
      label: 'Principal Approved', 
      value: kpis.principalApproved, 
      desc: 'Signed off applications',
      icon: CheckCircle2, 
      color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/50', 
      path: '/principal/admissions?status=PRINCIPAL_APPROVED' 
    },
    { 
      label: 'Enrolled', 
      value: kpis.enrolled, 
      desc: 'Admission Confirmed',
      icon: GraduationCap, 
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50', 
      path: '/principal/admissions?status=ENROLLED' 
    },
    { 
      label: 'Rejected', 
      value: kpis.rejected, 
      desc: 'Returned files',
      icon: XCircle, 
      color: 'text-rose-605 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50', 
      path: '/principal/admissions?status=REJECTED' 
    },
    { 
      label: 'Cancelled', 
      value: kpis.cancelled, 
      desc: 'Withdrawn files',
      icon: Ban, 
      color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800', 
      path: '/principal/admissions' 
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-md text-left text-xs font-semibold">
          <p className="font-extrabold text-neutral-800 dark:text-neutral-100 mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-neutral-450 dark:text-neutral-450 font-bold uppercase text-[9px]">{item.name}:</span>
              <span className="font-black text-neutral-800 dark:text-neutral-200 ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Yield calculation
  const yieldPct = kpis.principalApproved > 0 
    ? ((kpis.enrolled / kpis.principalApproved) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-5 animate-fade-in pb-8 font-sans max-w-full text-neutral-805 dark:text-neutral-200">
      
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
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-600 text-[10px] font-black uppercase">
              <ShieldAlert size={12} className="animate-pulse" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 text-emerald-600 text-[10px] font-black uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping shrink-0" />
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
              <option value="2027-2028">2027–2028</option>
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
        
        {/* Chart 1 — Application Trend Area Chart (2/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[320px] flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-3 select-none">
            <h3 className="text-xs font-black uppercase text-neutral-450 dark:text-neutral-550 tracking-wider">Admission Trend</h3>
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
                  <Area type="monotone" dataKey="approved" name="Principal Approved" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.03)" strokeWidth={2} />
                  <Area type="monotone" dataKey="enrolled" name="Enrolled" stroke="#10b981" fill="rgba(16, 185, 129, 0.03)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 select-none">
                <p className="font-bold text-xs">No activity trend data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 5 — Admission Funnel (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Admission Funnel</h3>
          <div className="flex-1 overflow-y-auto pr-1">
            {data?.funnel.length ? (
              <div className="space-y-4 pt-2">
                {data.funnel
                  .filter(f => f.stage !== 'Under Review')
                  .map((step, idx) => {
                    const funnelStages = data.funnel.filter(f => f.stage !== 'Under Review');
                    const maxCount = funnelStages[0]?.count || 1;
                    const pct = (step.count / maxCount) * 100;
                    const colors = [
                      'bg-blue-500', // Submitted
                      'bg-violet-500', // Admin Verified
                      'bg-indigo-500', // Principal Approved
                      'bg-emerald-500' // Enrolled
                    ];
                    return (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-neutral-750 dark:text-neutral-300 uppercase tracking-wider">{step.stage === 'Admin Verified' ? 'Verified by Admin' : step.stage}</span>
                          <div className="flex items-center gap-1.5 font-black text-neutral-900 dark:text-white">
                            <span>{step.count.toLocaleString()}</span>
                            <span className="text-neutral-450 font-bold text-[9px] bg-neutral-50 dark:bg-neutral-800 px-1 py-0.2 rounded">{step.percentage}%</span>
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
              <div className="h-full flex items-center justify-center text-neutral-450 select-none">
                <p className="font-bold text-xs">No funnel statistics available</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Chart 3 — Branch-wise Enrollment (2/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[300px] flex flex-col lg:col-span-2">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Branch-wise Enrollment</h3>
          <div className="flex-1 min-h-0">
            {data?.branchPerformance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.branchPerformance} margin={{ left: -25, right: 5, top: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={28} iconType="circle" iconSize={5} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar dataKey="enrolled" name="Enrolled" fill="rgba(16, 185, 129, 0.85)" radius={[3, 3, 0, 0]} barSize={16} />
                  <Bar dataKey="applications" name="Applications" fill="rgba(79, 70, 229, 0.15)" radius={[3, 3, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-neutral-450 select-none">
                <p className="font-bold text-xs">No branch statistics available</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2 & 6 — Yield, Approval Rate & Decision Summary (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[300px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Decision Summary</h3>
          
          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="grid grid-cols-2 gap-3 select-none">
              <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/25 flex flex-col justify-between min-h-[66px]">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wide">Approval Rate</span>
                <span className="text-sm font-black text-neutral-805 dark:text-neutral-200 mt-1">{overview.approvalRate}</span>
              </div>
              <div className="p-3 border border-neutral-100 dark:border-neutral-800/80 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/25 flex flex-col justify-between min-h-[66px]">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wide">Enrollment Yield</span>
                <span className="text-sm font-black text-neutral-850 dark:text-neutral-200 mt-1">{yieldPct}%</span>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-neutral-100 dark:border-neutral-850 pt-3 select-none">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-450 uppercase tracking-wide text-[10px]">Pending Decisions</span>
                <span className="font-black text-neutral-900 dark:text-white bg-amber-50 dark:bg-amber-950/20 text-amber-600 px-2 py-0.5 rounded text-[11px]">{pendingActions.awaitingApproval}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-450 uppercase tracking-wide text-[10px]">Principal Approved</span>
                <span className="font-black text-neutral-900 dark:text-white">{kpis.principalApproved}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-450 uppercase tracking-wide text-[10px]">Total Rejected</span>
                <span className="font-black text-neutral-900 dark:text-white">{kpis.rejected}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Chart 4 — Admission Type Donut (1/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[260px] flex flex-col">
          <h3 className="text-xs font-black uppercase text-neutral-455 dark:text-neutral-550 tracking-wider mb-4 select-none">Admission Type</h3>
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

        {/* Action Items required (2/3) */}
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm h-[260px] flex flex-col lg:col-span-2">
          <h3 className="text-xs font-black uppercase text-rose-500 tracking-wider mb-3 flex items-center gap-1.5 select-none">
            <AlertTriangle size={12} className="animate-pulse" /> Pending Decisions Required
          </h3>

          <div className="flex-1 flex flex-col justify-between py-1 select-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/principal/admissions?status=APPROVED')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-850 text-left transition relative overflow-hidden group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black text-neutral-800 dark:text-neutral-250 uppercase tracking-wide">Awaiting Approval</span>
                  <span className="text-[9px] font-bold text-neutral-400 mt-1 truncate">Admissions verified by Admin waiting for your review</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 rounded-lg text-xs font-black">
                    {pendingActions.awaitingApproval}
                  </span>
                  <ArrowUpRight size={13} className="text-neutral-350 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <button 
                onClick={() => navigate('/principal/admissions?status=PRINCIPAL_APPROVED')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-850 text-left transition relative overflow-hidden group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black text-neutral-805 dark:text-neutral-250 uppercase tracking-wide">Approved waiting Enrollment</span>
                  <span className="text-[9px] font-bold text-neutral-400 mt-1 truncate">Approved by you, waiting for final system matriculation</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg text-xs font-black">
                    {pendingActions.readyForEnrollment}
                  </span>
                  <ArrowUpRight size={13} className="text-neutral-350 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </div>

            <div className="mt-4 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-[10px] text-indigo-705 dark:text-indigo-300 font-bold">
              ℹ️ Admissions must follow the institutional workflow. Admin verification and checklist completion is required before any file will appear in your queue.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default CollegeAnalyticsPage;
