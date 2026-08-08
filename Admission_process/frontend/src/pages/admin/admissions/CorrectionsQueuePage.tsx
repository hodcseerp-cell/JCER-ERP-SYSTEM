import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import admissionService, { AdmissionApplication } from '../../../services/admission.service';
import {
  AlertTriangle, Search, RefreshCw, Eye, Clock, FileText,
  User, ChevronRight, CheckCircle2, X, BookOpen, Home,
  GraduationCap, FolderOpen, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// ─── Section meta ──────────────────────────────────────────────────────────────
const SECTION_META: Record<string, { label: string; Icon: React.ElementType; cls: string }> = {
  personal:  { label: 'Personal Details',  Icon: User,          cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  parent:    { label: 'Parent / Guardian', Icon: Users,         cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  address:   { label: 'Address',           Icon: Home,          cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  academic:  { label: 'Academic Details',  Icon: GraduationCap, cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  documents: { label: 'Documents',         Icon: FolderOpen,    cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  admission: { label: 'Admission Info',    Icon: BookOpen,      cls: 'bg-teal-100 text-teal-700 border-teal-200' },
};

// ─── Individual correction card ─────────────────────────────────────────────────
interface CorrectionCardProps {
  app: AdmissionApplication;
  onReview: (id: string) => void;
}

const CorrectionCard: React.FC<CorrectionCardProps> = ({ app, onReview }) => {
  const pd = app.studentpersonaldetails;
  const studentName = pd
    ? `${pd.firstName || ''} ${pd.middleName ? pd.middleName + ' ' : ''}${pd.lastName || ''}`.trim()
    : `${app.user?.firstName || ''} ${app.user?.lastName || ''}`.trim() || 'Unknown Student';

  const sections: string[] = Array.isArray(app.correctionRequestedSections)
    ? (app.correctionRequestedSections as string[]).filter(Boolean)
    : [];

  const sentAt = app.correctionRequestedAt
    ? format(new Date(app.correctionRequestedAt), 'dd MMM yyyy, hh:mm a')
    : app.updatedAt
    ? format(new Date(app.updatedAt), 'dd MMM yyyy, hh:mm a')
    : '—';

  return (
    <div className="bg-white border border-amber-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-amber-50 bg-gradient-to-r from-amber-50/70 to-orange-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-700 font-black text-sm">
            {studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-extrabold text-neutral-900 uppercase tracking-tight leading-none">{studentName}</p>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{app.applicationNumber}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-black rounded-full uppercase tracking-wide flex items-center gap-1">
          <AlertTriangle size={9} /> Correction Req.
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3.5 flex-1">

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-[11px] text-neutral-500 font-semibold">
          <span className="flex items-center gap-1.5">
            <BookOpen size={11} className="text-indigo-400" />
            {app.branch?.code || '—'} · {app.admissionType || '—'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={11} className="text-amber-400" />
            Sent: {sentAt}
          </span>
        </div>

        {/* Flagged sections */}
        {sections.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5">Sections flagged for correction:</p>
            <div className="flex flex-wrap gap-1.5">
              {sections.map(sec => {
                const m = SECTION_META[sec] || { label: sec, Icon: FileText, cls: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
                const Icon = m.Icon;
                return (
                  <span key={sec} className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-[10px] font-extrabold ${m.cls}`}>
                    <Icon size={9} /> {m.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin remarks preview */}
        {app.adminRemarks && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Correction notes sent to student:</p>
            <p className="text-xs text-amber-900 font-semibold leading-relaxed whitespace-pre-line line-clamp-3">
              {app.adminRemarks}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between gap-3">
        <p className="text-[10px] text-neutral-400 font-semibold truncate">{app.user?.email || '—'}</p>
        <button
          onClick={() => onReview(app.id)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-[11px] font-extrabold rounded-xl transition-all shadow-sm shadow-amber-200 flex-shrink-0"
        >
          <Eye size={12} /> Review
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

// ─── Skeleton loader ────────────────────────────────────────────────────────────
const CardSkeleton: React.FC = () => (
  <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-16 bg-amber-50" />
    <div className="p-5 space-y-3">
      <div className="h-3 bg-neutral-100 rounded-full w-2/3" />
      <div className="flex gap-2">
        <div className="h-6 bg-neutral-100 rounded-full w-24" />
        <div className="h-6 bg-neutral-100 rounded-full w-20" />
      </div>
      <div className="h-16 bg-amber-50 rounded-xl" />
    </div>
    <div className="h-12 bg-neutral-50 border-t border-neutral-100" />
  </div>
);

// ─── Main page ──────────────────────────────────────────────────────────────────
const CorrectionsQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const [stats, setStats] = useState({
    submitted: 0,
    resubmitted: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    enrolled: 0,
    correctionRequired: 0,
    total: 0
  });

  const loadStats = useCallback(async () => {
    try {
      const statsData = await admissionService.getStats();
      if (statsData) setStats(statsData as any);
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  }, []);

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    try {
      const result = await admissionService.listApplications({
        status: 'CORRECTION_REQUIRED',
        search: search || undefined,
        page,
        limit: LIMIT,
        sortBy: 'date',
        sortOrder: 'DESC',
        includeFullDetails: true,
      });
      setApps(result.applications || []);
      setTotal(result.total || 0);
    } catch {
      toast.error('Failed to load correction requests');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchCorrections(), loadStats()]);
  }, [fetchCorrections, loadStats]);

  useEffect(() => { 
    fetchCorrections();
    loadStats();
  }, [fetchCorrections, loadStats]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchCorrections();
      loadStats();
    };
    window.addEventListener('admissions-updated', handleUpdate);
    return () => window.removeEventListener('admissions-updated', handleUpdate);
  }, [fetchCorrections, loadStats]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const getRouteForStatus = (tabStatus: string) => {
    switch (tabStatus) {
      case 'QUEUE': return '/admin/admissions/queue';
      case 'RESUBMITTED': return '/admin/admissions/resubmitted';
      case 'CORRECTION_REQUIRED': return '/admin/admissions/corrections';
      case 'APPROVED': return '/admin/admissions/verified';
      case 'ENROLLED': return '/admin/admissions/enrolled';
      case 'REJECTED': return '/admin/admissions/rejected';
      case 'ALL': return '/admin/admissions/history';
      default: return '/admin/admissions/queue';
    }
  };

  const tabs = [
    { name: "Queue", status: "QUEUE", count: stats.submitted + stats.underReview, color: "bg-amber-500" },
    { name: "Resubmitted", status: "RESUBMITTED", count: stats.resubmitted || 0, color: "bg-purple-500" },
    { name: "Corrections", status: "CORRECTION_REQUIRED", count: stats.correctionRequired || 0, color: "bg-orange-500" },
    { name: "Verified", status: "APPROVED", count: stats.approved, color: "bg-indigo-500" },
    { name: "Enrolled", status: "ENROLLED", count: stats.enrolled, color: "bg-emerald-500" },
    { name: "Rejected", status: "REJECTED", count: stats.rejected, color: "bg-rose-500" },
    { name: "History", status: "ALL", count: stats.total, color: "bg-neutral-500" }
  ];

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl pb-12">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-neutral-900 dark:text-white">Admissions Pipeline</h2>
          <p className="text-sm font-semibold text-neutral-500">Manage, verify, and enroll student applications through stages.</p>
        </div>
        <button onClick={handleRefresh} className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 transition-colors shadow-sm self-start md:self-auto flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Stage Tab View */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
        {tabs.map((tab) => {
          const isActive = tab.status === 'CORRECTION_REQUIRED';
          return (
            <button
              key={tab.name}
              onClick={() => {
                navigate(getRouteForStatus(tab.status));
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col justify-between h-24 ${
                isActive 
                  ? 'bg-neutral-900 border-neutral-950 dark:bg-white dark:border-white text-white dark:text-neutral-900' 
                  : 'bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-900 dark:border-neutral-800'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{tab.name}</span>
                <span className={`w-2 h-2 rounded-full ${tab.color}`} />
              </div>
              <div className="flex items-baseline gap-1 mt-auto">
                <span className="text-2xl font-black leading-none">{tab.count}</span>
                <span className="text-[10px] font-bold opacity-60">apps</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200/60 dark:border-neutral-800 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100 leading-none">Correction Requests</h2>
              {total > 0 && (
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-0.5">
                  {total} application{total !== 1 ? 's' : ''} awaiting student resubmission
                </p>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-400 font-semibold pl-0.5">
            Applications returned to students for correction — shown here until resubmitted
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCorrections}
            className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search student or App ID…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs font-semibold border border-neutral-200 rounded-xl bg-white text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 w-56 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
                <X size={12} />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Awaiting Student',  value: total,           color: 'text-amber-600',   bg: 'bg-amber-50  border-amber-200'   },
          { label: 'Showing This Page', value: apps.length,     color: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-200'  },
          { label: 'Total Pages',       value: totalPages || 1, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3.5 ${s.bg}`}>
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200">
              {search ? 'No matching results' : 'No Pending Corrections'}
            </p>
            <p className="text-xs text-neutral-400 font-semibold mt-1">
              {search
                ? `No applications found for "${search}"`
                : 'Great — no applications are waiting for student corrections right now.'}
            </p>
          </div>
          {search && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }}
              className="text-xs font-bold text-amber-600 hover:underline">Clear search</button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {apps.map(app => (
              <CorrectionCard
                key={app.id}
                app={app}
                onReview={id => navigate(`/admin/admissions/review/${id}`)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 text-xs font-bold border border-neutral-200 rounded-xl hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                ← Previous
              </button>
              <span className="text-xs font-semibold text-neutral-500">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 text-xs font-bold border border-neutral-200 rounded-xl hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CorrectionsQueuePage;
