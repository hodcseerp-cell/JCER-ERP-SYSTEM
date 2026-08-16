import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, ShieldCheck, CheckCircle2, TrendingUp, 
  Clock, RefreshCw, GraduationCap, Eye, FileText
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import officeService from '../../../services/office.service';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];

const branchNameMap: Record<string, string> = {
  'CSE': 'Computer Science Engineering',
  'CSE-AIML': 'CSE - AI & ML',
  'ECE': 'Electronics & Communication',
  'ME': 'Mechanical Engineering',
  'CV': 'Civil Engineering',
};

interface KPIState {
  value: number;
  change: number | null;
}

interface AnalyticsData {
  period: string;
  range: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
  };
  kpis: {
    totalApplications: KPIState;
    verifiedApplications: KPIState;
    enrolledStudents: KPIState;
    conversionRate: KPIState;
  };
  funnel: {
    submitted: number;
    underReview: number;
    adminVerified: number;
    principalApproved: number;
    enrolled: number;
  };
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
  topPrograms: { name: string; applications: number; percentage: number }[];
}

export const AdminAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Filters
  const [academicYear, setAcademicYear] = useState<string>('2026-2027');
  const [period, setPeriod] = useState<string>('7d');

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await officeService.getAnalyticsData({ academicYear, period });
      setData(res);
      setSecondsAgo(0);
      setError(null);
    } catch (err: any) {
      console.error('Error loading admin analytics:', err);
      setError('Connection issue. Showing cached stats.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and filter change
  useEffect(() => {
    fetchAnalytics(true);
  }, [academicYear, period]);

  // Live timer & auto refresh
  useEffect(() => {
    const secInterval = setInterval(() => {
      setSecondsAgo(prev => prev + 1);
    }, 1000);

    const autoRefreshInterval = setInterval(() => {
      fetchAnalytics(false);
    }, 30000);

    return () => {
      clearInterval(secInterval);
      clearInterval(autoRefreshInterval);
    };
  }, [academicYear, period]);

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  // Helper for trend formatting
  const getPeriodLabel = () => {
    if (period === 'today') return 'Yesterday';
    if (period === '7d') return 'Last 7 days';
    if (period === '30d') return 'Last 30 days';
    return 'Previous Period';
  };

  const getPeriodHeading = () => {
    if (period === 'today') return 'Today';
    if (period === '7d') return 'Last 7 Days';
    if (period === '30d') return 'Last 30 Days';
    return 'Admissions Cycle';
  };

  const formatActivityTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const hours = d.getHours();
      const mins = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHrs = hours % 12 || 12;
      return `${day} ${month} · ${displayHrs}:${mins} ${ampm}`;
    } catch (e) {
      return 'Just now';
    }
  };

  const renderTrendChange = (change: number | null, isPercentagePoint = false) => {
    if (change === null) {
      return (
        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
          New
        </span>
      );
    }
    const unit = isPercentagePoint ? ' pp' : '%';
    if (change > 0) {
      return <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">↑ {change}{unit}</span>;
    }
    if (change < 0) {
      return <span className="text-xs font-bold text-rose-600 dark:text-rose-400">↓ {Math.abs(change)}{unit}</span>;
    }
    return <span className="text-xs font-bold text-slate-400 dark:text-neutral-500">— 0{unit}</span>;
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-md text-left text-xs">
          <p className="font-extrabold text-neutral-800 dark:text-neutral-100 mb-1.5">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 py-0.5 font-bold">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              <span className="text-slate-400 dark:text-neutral-500 uppercase text-[9px]">{item.name}:</span>
              <span className="font-black text-neutral-800 dark:text-neutral-200 ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 pb-12 font-sans animate-fade-in text-neutral-800">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-64 bg-slate-200 rounded animate-pulse" />
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-5 h-32 animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-8 w-8 bg-slate-200 rounded-lg" />
              </div>
              <div className="h-8 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Main Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 h-80 animate-pulse lg:col-span-2" />
          <div className="bg-white border border-slate-100 rounded-2xl p-5 h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalApplications: { value: 0, change: null },
    verifiedApplications: { value: 0, change: null },
    enrolledStudents: { value: 0, change: null },
    conversionRate: { value: 0, change: null }
  };

  const funnel = data?.funnel || {
    submitted: 0,
    underReview: 0,
    adminVerified: 0,
    principalApproved: 0,
    enrolled: 0
  };

  const trend = data?.trend || [];
  const branchPerformance = data?.branchPerformance || [];
  const admissionTypes = data?.admissionTypes || [];
  const categories = data?.categories || [];
  const genders = data?.genders || [];
  const topPrograms = data?.topPrograms || [];
  const recentActivity = data?.recentActivity || [];

  // Drop-off calculations
  const dropOffs = {
    underReview: funnel.submitted > 0 ? Math.round(((funnel.submitted - funnel.underReview) / funnel.submitted) * 100) : 0,
    adminVerified: funnel.underReview > 0 ? Math.round(((funnel.underReview - funnel.adminVerified) / funnel.underReview) * 100) : 0,
    principalApproved: funnel.adminVerified > 0 ? Math.round(((funnel.adminVerified - funnel.principalApproved) / funnel.adminVerified) * 100) : 0,
    enrolled: funnel.principalApproved > 0 ? Math.round(((funnel.principalApproved - funnel.enrolled) / funnel.principalApproved) * 100) : 0,
  };

  const activityIcons: Record<string, any> = {
    'submitted': ClipboardList,
    'verified': ShieldCheck,
    'review': Eye,
    'approved': CheckCircle2,
    'document': FileText,
    'enrolled': GraduationCap,
  };

  const getActivityIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('submit')) return activityIcons.submitted;
    if (act.includes('verify')) return activityIcons.verified;
    if (act.includes('review')) return activityIcons.review;
    if (act.includes('approve')) return activityIcons.approved;
    if (act.includes('document') || act.includes('upload')) return activityIcons.document;
    if (act.includes('enroll')) return activityIcons.enrolled;
    return Clock;
  };

  const getActivityColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('submit')) return 'text-blue-500 bg-blue-50';
    if (act.includes('verify')) return 'text-purple-500 bg-purple-50';
    if (act.includes('review')) return 'text-amber-500 bg-amber-50';
    if (act.includes('approve')) return 'text-green-500 bg-green-50';
    if (act.includes('enroll')) return 'text-emerald-500 bg-emerald-50';
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-full text-slate-800 bg-[#f7f8fc] dark:bg-neutral-950 dark:text-neutral-200 min-h-screen p-4 sm:p-6 lg:p-8 rounded-3xl">
      
      {/* ═══ REAL ANALYTICS HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-neutral-900 pb-4 select-none">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Analytics Overview</h1>
          <p className="text-xs text-slate-500 dark:text-neutral-450 leading-relaxed font-semibold">
            Understand application trends, admission performance, and enrollment conversion in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 text-[10px] font-black uppercase text-slate-500 shadow-xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>Live • Updated {secondsAgo}s ago</span>
          </div>

          {/* Academic Year Selector */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer text-slate-700 dark:text-neutral-300 shadow-xs"
          >
            <option value="2026-2027">2026–2027</option>
            <option value="2027-2028">2027–2028</option>
          </select>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer text-slate-700 dark:text-neutral-300 shadow-xs"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className="p-2 border border-slate-200 dark:border-neutral-850 rounded-xl bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 transition shadow-xs"
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ KPI STATS CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
        
        {/* Card 1: Total Applications */}
        <div className="bg-white dark:bg-neutral-900 border border-[#eceef4] dark:border-neutral-800 rounded-[18px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between group hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Total Applications</span>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white leading-none pt-1">
              {kpis.totalApplications.value.toLocaleString()}
            </h4>
            <div className="pt-2.5 flex items-center gap-1">
              {renderTrendChange(kpis.totalApplications.change)}
              <span className="text-[10px] font-bold text-slate-400">vs previous period</span>
            </div>
            <div className="border-t border-slate-50 dark:border-neutral-800/50 mt-2.5 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {getPeriodLabel()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center shrink-0 shadow-xs self-start">
            <ClipboardList size={20} />
          </div>
        </div>

        {/* Card 2: Verified Applications */}
        <div className="bg-white dark:bg-neutral-900 border border-[#eceef4] dark:border-neutral-800 rounded-[18px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between group hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Verified Applications</span>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white leading-none pt-1">
              {kpis.verifiedApplications.value.toLocaleString()}
            </h4>
            <div className="pt-2.5 flex items-center gap-1">
              {renderTrendChange(kpis.verifiedApplications.change)}
              <span className="text-[10px] font-bold text-slate-400">vs previous period</span>
            </div>
            <div className="border-t border-slate-50 dark:border-neutral-800/50 mt-2.5 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {getPeriodLabel()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-500 flex items-center justify-center shrink-0 shadow-xs self-start">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Card 3: Enrolled Students */}
        <div className="bg-white dark:bg-neutral-900 border border-[#eceef4] dark:border-neutral-800 rounded-[18px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between group hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Enrolled Students</span>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white leading-none pt-1">
              {kpis.enrolledStudents.value.toLocaleString()}
            </h4>
            <div className="pt-2.5 flex items-center gap-1">
              {renderTrendChange(kpis.enrolledStudents.change)}
              <span className="text-[10px] font-bold text-slate-400">vs previous period</span>
            </div>
            <div className="border-t border-slate-50 dark:border-neutral-800/50 mt-2.5 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {getPeriodLabel()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0 shadow-xs self-start">
            <GraduationCap size={20} />
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-white dark:bg-neutral-900 border border-[#eceef4] dark:border-neutral-800 rounded-[18px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex items-center justify-between group hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Conversion Rate</span>
            <h4 className="text-3xl font-black text-slate-900 dark:text-white leading-none pt-1">
              {kpis.conversionRate.value}%
            </h4>
            <div className="pt-2.5 flex items-center gap-1">
              {renderTrendChange(kpis.conversionRate.change, true)}
              <span className="text-[10px] font-bold text-slate-400">vs previous period</span>
            </div>
            <div className="border-t border-slate-50 dark:border-neutral-800/50 mt-2.5 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              {getPeriodLabel()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center shrink-0 shadow-xs self-start">
            <TrendingUp size={20} />
          </div>
        </div>

      </div>

      {/* ═══ MAIN ANALYTICS GRID ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Card A — Application Activity Smooth Line Chart (2/3 width) */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[340px] flex flex-col lg:col-span-2">
          <div className="flex items-center justify-between mb-4 select-none">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Application Activity</h3>
              <p className="text-[10px] font-bold text-slate-400">Admission submissions & audit progression trends</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 px-2 py-0.5 rounded font-black text-slate-500 uppercase shadow-2xs">
                {getPeriodHeading()}
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-h-0">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: -25, right: 5, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.02)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#a3a3a3', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#a3a3a3', fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={5} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} />
                  <Line type="monotone" dataKey="submitted" name="Submitted" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="approved" name="Verified" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="enrolled" name="Enrolled" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none bg-slate-50/50 dark:bg-neutral-800/20 rounded-xl border border-dashed border-slate-200">
                <p className="font-extrabold text-sm text-slate-700 dark:text-neutral-300">No application activity yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-normal">Application activity will appear here once students submit their admission forms.</p>
                <button onClick={() => navigate('/admin/admissions/queue')} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition shadow-sm">
                  View Applications
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card B — Admission Funnel with conversion & drop-offs (1/3 width) */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[340px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Admission Funnel</h3>
            <button onClick={() => navigate('/admin/admissions/queue')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View Details →
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 select-none">
            {funnel.submitted > 0 ? (
              <div className="space-y-4">
                {/* 1. Submitted */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-neutral-300">Submitted</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{funnel.submitted} <span className="text-neutral-400 text-[10px] bg-slate-50 dark:bg-neutral-800 px-1 py-0.2 rounded ml-1">100%</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                {/* 2. Under Review */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-neutral-300">Under Review</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      {funnel.underReview}{' '}
                      <span className="text-neutral-400 text-[10px] bg-slate-50 dark:bg-neutral-800 px-1 py-0.2 rounded ml-1">
                        {funnel.submitted > 0 ? Math.round((funnel.underReview / funnel.submitted) * 100) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400/80 rounded-full" style={{ width: `${funnel.submitted > 0 ? (funnel.underReview / funnel.submitted) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-rose-500/85 pl-1">
                    {dropOffs.underReview > 0 ? `↓ ${dropOffs.underReview}% drop-off` : '— 0% drop-off'}
                  </p>
                </div>

                {/* 3. Admin Verified */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-neutral-300">Admin Verified</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      {funnel.adminVerified}{' '}
                      <span className="text-neutral-400 text-[10px] bg-slate-50 dark:bg-neutral-800 px-1 py-0.2 rounded ml-1">
                        {funnel.submitted > 0 ? Math.round((funnel.adminVerified / funnel.submitted) * 100) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${funnel.submitted > 0 ? (funnel.adminVerified / funnel.submitted) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-rose-500/85 pl-1">
                    {dropOffs.adminVerified > 0 ? `↓ ${dropOffs.adminVerified}% drop-off` : '— 0% drop-off'}
                  </p>
                </div>

                {/* 4. Principal Approved */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-neutral-300">Principal Approved</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      {funnel.principalApproved}{' '}
                      <span className="text-neutral-400 text-[10px] bg-slate-50 dark:bg-neutral-800 px-1 py-0.2 rounded ml-1">
                        {funnel.submitted > 0 ? Math.round((funnel.principalApproved / funnel.submitted) * 100) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${funnel.submitted > 0 ? (funnel.principalApproved / funnel.submitted) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-rose-500/85 pl-1">
                    {dropOffs.principalApproved > 0 ? `↓ ${dropOffs.principalApproved}% drop-off` : '— 0% drop-off'}
                  </p>
                </div>

                {/* 5. Enrolled */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-neutral-300">Enrolled</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">
                      {funnel.enrolled}{' '}
                      <span className="text-neutral-400 text-[10px] bg-slate-50 dark:bg-neutral-800 px-1 py-0.2 rounded ml-1">
                        {funnel.submitted > 0 ? Math.round((funnel.enrolled / funnel.submitted) * 100) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${funnel.submitted > 0 ? (funnel.enrolled / funnel.submitted) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] font-bold text-rose-500/85 pl-1">
                    {dropOffs.enrolled > 0 ? `↓ ${dropOffs.enrolled}% drop-off` : '— 0% drop-off'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-neutral-800/25 border border-dashed border-slate-150 rounded-xl">
                <p className="font-extrabold text-xs text-slate-500">No funnel statistics available</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ═══ DISTRIBUTION ROW ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card C1 — Grouped Horizontal Bar Chart for Branch Performance */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Branch Performance</h3>
            <button onClick={() => navigate('/admin/students')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View All →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 select-none">
            {branchPerformance.length ? (
              branchPerformance.map((branchItem, idx) => {
                const maxVal = Math.max(...branchPerformance.map(b => b.applications)) || 1;
                return (
                  <div key={idx} className="space-y-1.5 border-b border-slate-50 dark:border-neutral-800/40 pb-2.5 last:border-b-0 last:pb-0">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-neutral-200">
                      {branchNameMap[branchItem.name] || branchItem.name}
                    </p>
                    
                    <div className="space-y-1">
                      {/* Applications bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase w-16">Applications</span>
                        <div className="flex-grow h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(branchItem.applications / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-800 dark:text-white w-6 text-right">{branchItem.applications}</span>
                      </div>
                      
                      {/* Verified bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase w-16">Verified</span>
                        <div className="flex-grow h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(branchItem.approved / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-800 dark:text-white w-6 text-right">{branchItem.approved}</span>
                      </div>

                      {/* Enrolled bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase w-16">Enrolled</span>
                        <div className="flex-grow h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(branchItem.enrolled / maxVal) * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-800 dark:text-white w-6 text-right">{branchItem.enrolled}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-neutral-800/25 border border-dashed border-slate-150 rounded-xl">
                <p className="font-extrabold text-xs text-slate-500">No branch statistics available</p>
              </div>
            )}
          </div>
        </div>

        {/* Card C2 — Donut chart for Admission Type */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Admission Type</h3>
            <button onClick={() => navigate('/admin/admissions/queue')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View All →
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
            {admissionTypes.length ? (
              <div className="flex items-center gap-4 w-full h-full">
                {/* Donut ring container */}
                <div className="relative w-1/2 h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={admissionTypes} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={52} 
                        outerRadius={76} 
                        paddingAngle={3}
                      >
                        {admissionTypes.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                      {admissionTypes.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-1.5">Total</span>
                  </div>
                </div>

                {/* Donut legend */}
                <div className="flex flex-col gap-2 w-1/2 select-none">
                  {admissionTypes.map((entry, idx) => {
                    const total = admissionTypes.reduce((acc, curr) => acc + curr.value, 0) || 1;
                    const pct = Math.round((entry.value / total) * 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 truncate leading-none">{entry.name}</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-white mt-1">{entry.value} ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 select-none">No quota distribution data</p>
            )}
          </div>
        </div>

        {/* Card C3 — Donut chart for Category Distribution */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Category Distribution</h3>
            <button onClick={() => navigate('/admin/admissions/queue')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View All →
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
            {categories.length ? (
              <div className="flex items-center gap-4 w-full h-full">
                {/* Donut ring container */}
                <div className="relative w-1/2 h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categories.map(c => ({ name: c.category || 'General', value: c.count }))} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={52} 
                        outerRadius={76} 
                        paddingAngle={3}
                      >
                        {categories.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                      {categories.reduce((acc, curr) => acc + curr.count, 0)}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-1.5">Total</span>
                  </div>
                </div>

                {/* Donut legend */}
                <div className="flex flex-col gap-2 w-1/2 select-none overflow-y-auto max-h-[220px] pr-1">
                  {categories.map((entry, idx) => {
                    const total = categories.reduce((acc, curr) => acc + curr.count, 0) || 1;
                    const pct = Math.round((entry.count / total) * 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 truncate leading-none">{entry.category || 'GM'}</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-white mt-1">{entry.count} ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 select-none">No category distribution data</p>
            )}
          </div>
        </div>

      </div>

      {/* ═══ DETAILED ANALYTICS ROW ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card D1 — Donut chart for Gender Distribution */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Gender Distribution</h3>
            <button onClick={() => navigate('/admin/admissions/queue')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View All →
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
            {genders.length ? (
              <div className="flex items-center gap-4 w-full h-full">
                {/* Donut ring container */}
                <div className="relative w-1/2 h-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={genders} 
                        dataKey="value" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={52} 
                        outerRadius={76} 
                        paddingAngle={3}
                      >
                        {genders.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                      {genders.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mt-1.5">Total</span>
                  </div>
                </div>

                {/* Donut legend */}
                <div className="flex flex-col gap-2.5 w-1/2 select-none">
                  {genders.map((entry, idx) => {
                    const total = genders.reduce((acc, curr) => acc + curr.value, 0) || 1;
                    const pct = Math.round((entry.value / total) * 100);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 truncate leading-none">{entry.name}</span>
                          <span className="text-[10px] font-black text-slate-900 dark:text-white mt-1">{entry.value} ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 select-none">No gender distribution data</p>
            )}
          </div>
        </div>

        {/* Card D2 — Ranked list for Top Programs */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-neutral-850 shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Top Programs</h3>
            <button onClick={() => navigate('/admin/students')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View All →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 select-none">
            {topPrograms.length ? (
              topPrograms.map((program, idx) => {
                const rank = (idx + 1).toString().padStart(2, '0');
                const displayName = branchNameMap[program.name] || program.name;
                return (
                  <div key={idx} className="space-y-1 border-b border-slate-50 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xs font-black text-slate-400 select-none pt-0.5">{rank}</span>
                      <div className="flex-grow space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800 dark:text-neutral-200">{displayName}</span>
                          <span className="font-black text-slate-900 dark:text-white ml-2">{program.applications}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-grow h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${program.percentage}%` }} />
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-400 w-8 text-right shrink-0">{program.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-neutral-800/25 border border-dashed border-slate-150 rounded-xl">
                <p className="font-extrabold text-xs text-slate-500">No applications recorded yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Card D3 — Audit Timeline for Recent Activity */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-[18px] border border-[#eceef4] dark:border-[#eceef4] shadow-[0_4px_20px_rgba(0,0,0,0.01)] h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-xs font-black uppercase text-slate-400 dark:text-neutral-500 tracking-widest">Recent Activity</h3>
            <button onClick={() => navigate('/admin/admissions/history')} className="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-750">
              View All →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative pl-3 select-none">
            {recentActivity.length ? (
              <>
                {/* Timeline vertical bar */}
                <div className="absolute left-6 top-2 bottom-6 w-0.5 bg-slate-100 dark:bg-neutral-800" />
                
                {recentActivity.map((activity, idx) => {
                  const IconComponent = getActivityIcon(activity.action);
                  const colorClasses = getActivityColor(activity.action);
                  
                  return (
                    <div key={idx} className="flex gap-4 items-start relative z-10">
                      {/* Timeline dot */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-100 dark:border-neutral-800 ${colorClasses}`}>
                        <IconComponent size={14} className="stroke-[2.5]" />
                      </div>
                      
                      {/* Description */}
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-neutral-200 capitalize">
                          {activity.action}
                        </p>
                        <p className="text-[10px] font-bold text-slate-450 dark:text-neutral-500 mt-0.5 truncate">
                          {activity.studentName} · {activity.appNumber}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                          {formatActivityTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-neutral-800/25 border border-dashed border-slate-150 rounded-xl">
                <p className="font-extrabold text-xs text-slate-500">No recent activity logs</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminAnalyticsPage;