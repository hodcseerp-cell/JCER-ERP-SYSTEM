import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Users,
  ShieldAlert,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  X,
  FileCheck,
} from 'lucide-react';
import { RootState } from '../../store';
import hodService, { SemesterTransitionSummary } from '../../services/hod.service';

export const HodSemesterTransitionPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [summary, setSummary] = useState<SemesterTransitionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchTransitionSummary();
  }, [academicYear]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchTransitionSummary = async () => {
    setLoading(true);
    try {
      const res = await hodService.getSemesterTransitionSummary(academicYear);
      setSummary(res);
    } catch (err: any) {
      console.error('Failed to load transition summary:', err);
      setNotification({
        type: 'error',
        message: err?.response?.data?.error || 'Failed to load semester transition summary.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTransition = async () => {
    setExecuting(true);
    try {
      const res = await hodService.executeSemesterTransition({
        academicYear,
        branch: selectedBranch !== 'ALL' ? selectedBranch : undefined,
      });

      setNotification({
        type: 'success',
        message: res.message || `Successfully transitioned ${res.transitionedCount} students to Semester 3.`,
      });
      setConfirmModalOpen(false);
      await fetchTransitionSummary();
    } catch (err: any) {
      console.error('Failed to execute transition:', err);
      setNotification({
        type: 'error',
        message: err?.response?.data?.error || 'Failed to execute semester transition.',
      });
    } finally {
      setExecuting(false);
    }
  };

  const isSemesterHandling =
    user?.department?.type === 'SEMESTER_HANDLING' || user?.department?.code === 'AS';

  if (!isSemesterHandling) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-black text-neutral-900 dark:text-white">Applied Science Scope Only</h2>
        <p className="text-xs text-neutral-500 max-w-md mx-auto">
          The Semester 2 &rarr; Semester 3 Transition module is reserved exclusively for the Applied Science Head of Department handling Semesters 1 & 2.
        </p>
        <Link
          to="/hod/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const branchList = summary?.branchBreakdown || [];
  const pendingCount = summary?.readyForTransition ?? 0;
  const transitionedCount = summary?.alreadyTransitioned ?? 0;
  const totalStudents = summary?.totalSem2Students ?? 0;

  return (
    <div className="space-y-6">
      {/* ── NOTIFICATION TOAST ─────────────────────────────────────────────────── */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="text-xs font-bold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── HERO BANNER (Dark Shiny Navy Blue Style) ─────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] p-6 sm:p-8 text-white border border-[#1e3a8a]/40 shadow-[0_16px_36px_rgba(7,14,34,0.35)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-16 left-1/4 w-96 h-40 bg-gradient-to-b from-blue-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-bold text-blue-200">
              <GraduationCap className="w-3.5 h-3.5 text-cyan-300" />
              <span>Applied Science Academic Handover</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Semester 2</span>
              <ArrowRight className="w-6 h-6 text-cyan-400" />
              <span>Semester 3 Transition</span>
            </h2>
            <p className="text-sm text-blue-100/90 max-w-2xl font-medium">
              Handover completed Semester 2 students to their respective parent departmental HODs (CSE, AIML, ECE, ME, CV) for Semester 3 onward.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedBranch('ALL');
                setConfirmModalOpen(true);
              }}
              disabled={loading || pendingCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-emerald-400/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Execute Transition ({pendingCount})</span>
            </button>

            <button
              onClick={fetchTransitionSummary}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all backdrop-blur-md cursor-pointer"
              title="Refresh transition summary"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTER & ACADEMIC YEAR BAR ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>TRANSITION ACADEMIC YEAR</span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-blue-500"
          >
            <option value="2026-27">AY 2026-27</option>
            <option value="2025-26">AY 2025-26</option>
            <option value="2024-25">AY 2024-25</option>
          </select>
        </div>
      </div>

      {/* ── 4 KPI SUMMARY CARDS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Sem 2 Students</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {loading ? '...' : totalStudents}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Across all parent branches</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending Handover</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {loading ? '...' : pendingCount}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Ready for Sem 3 Dept HOD</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Transitioned</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : transitionedCount}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Moved to Semester 3</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Parent Branches</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {loading ? '...' : branchList.length}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Target Department HODs</p>
          </div>
        </div>
      </div>

      {/* ── BRANCH-WISE TRANSITION WORKSPACE CARDS ───────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Parent Department Handover Breakdown</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Review student counts for each parent branch. When transitioned, students retain their original department and start Sem 3 with UNASSIGNED section.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2 text-xs font-bold text-neutral-400">Loading branch summaries...</p>
          </div>
        ) : branchList.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-200 dark:border-neutral-700">
            <Info className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No Semester 2 Cohorts Found</p>
            <p className="text-xs text-neutral-400 mt-1">There are no Semester 2 students currently enrolled for academic year {academicYear}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branchList.map((b) => (
              <div
                key={b.branchCode}
                className="p-5 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                      {b.branchCode}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                        {b.branchName || b.branchCode}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        Target: <span className="font-bold text-neutral-700 dark:text-neutral-300">{b.branchCode} Department HOD</span>
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    b.readyCount === 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {b.readyCount === 0 ? 'COMPLETED' : `${b.readyCount} PENDING`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 block uppercase">Total</span>
                    <span className="text-sm font-black text-neutral-900 dark:text-white">{b.sem2Count}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block uppercase">Pending</span>
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300">{b.readyCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">Ready / Done</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{b.transitionedCount}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-medium text-[11px]">
                    {b.sem2Count} students &rarr; Ready for {b.branchCode} HOD
                  </span>
                  <button
                    onClick={() => {
                      setSelectedBranch(b.branchCode);
                      setConfirmModalOpen(true);
                    }}
                    disabled={b.readyCount === 0}
                    className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Transition {b.branchCode}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TRANSITION EXECUTION CONFIRMATION MODAL ──────────────────────────── */}
      {confirmModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <FileCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Confirm Semester 2 &rarr; Semester 3 Handover
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Academic Year {academicYear} • Scope: {selectedBranch === 'ALL' ? 'All Parent Branches' : `${selectedBranch} Branch`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <Info size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Academic Rules During Semester Transition:</span>
                </p>
                <ul className="list-disc pl-5 space-y-1 font-medium text-[11px] text-amber-800 dark:text-amber-300">
                  <li>
                    <strong>No department change:</strong> CSE students remain CSE, AIML remains AIML.
                  </li>
                  <li>
                    <strong>Semester increment:</strong> Students' semester advances from <strong>Semester 2 to Semester 3</strong>.
                  </li>
                  <li>
                    <strong>Section reset:</strong> Semester 3 sections start as <strong>UNASSIGNED</strong>.
                  </li>
                  <li>
                    <strong>Handover to Department HOD:</strong> The respective departmental HODs (e.g. CSE HOD) will allocate Semester 3 sections.
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTransition}
                  disabled={executing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {executing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing Handover...</span>
                    </>
                  ) : (
                    <span>Confirm & Execute Handover</span>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};

export default HodSemesterTransitionPage;
