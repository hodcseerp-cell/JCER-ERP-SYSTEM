import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  X,
  Sparkles,
  ChevronRight,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'react-toastify';
import mentorService, {
  MentorTransitionItem,
  DepartmentItem,
  EligibleFacultyItem,
} from '../../../services/mentor.service';

interface MentorTransitionsQueueProps {
  onResolved?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const MentorTransitionsQueue: React.FC<MentorTransitionsQueueProps> = ({
  onResolved,
  onClose,
  isModal = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [transitions, setTransitions] = useState<MentorTransitionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Resolution Modal / Drawer for Single or Bulk
  const [resolvingItems, setResolvingItems] = useState<MentorTransitionItem[] | null>(null);
  const [resolutionDecision, setResolutionDecision] = useState<'CONTINUE' | 'ASSIGN_NEW'>('CONTINUE');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [facultyList, setFacultyList] = useState<EligibleFacultyItem[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransitions = async () => {
    setLoading(true);
    try {
      const res = await mentorService.getPendingTransitions({
        search: search.trim() || undefined,
        admissionBatch: selectedBatch === 'ALL' ? undefined : selectedBatch,
        limit: 100,
      });
      setTransitions(res.transitions || []);
      setTotal(res.total || 0);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Failed to load pending transitions:', err);
      toast.error(err.response?.data?.error || 'Failed to load mentor transition records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransitions();
  }, [selectedBatch]);

  // Load departments when opening Assign New modal
  useEffect(() => {
    if (resolvingItems && resolutionDecision === 'ASSIGN_NEW' && departments.length === 0) {
      mentorService.getMentorCoreDepartments().then((depts) => {
        setDepartments(depts || []);
        if (depts && depts.length > 0) {
          setSelectedDeptId(depts[0].id);
        }
      }).catch(console.error);
    }
  }, [resolvingItems, resolutionDecision]);

  // Load eligible faculty when selectedDeptId changes
  useEffect(() => {
    if (selectedDeptId && resolutionDecision === 'ASSIGN_NEW') {
      setLoadingFaculty(true);
      mentorService.getEligibleFaculty(selectedDeptId, facultySearch.trim() || undefined)
        .then((fac) => {
          setFacultyList(fac || []);
          if (fac && fac.length > 0) {
            setSelectedFacultyId(fac[0].facultyId);
          } else {
            setSelectedFacultyId('');
          }
        })
        .catch(console.error)
        .finally(() => setLoadingFaculty(false));
    }
  }, [selectedDeptId, facultySearch, resolutionDecision]);

  // Unique batches from current transition items
  const batches = Array.from(new Set(transitions.map((t) => t.admissionBatch))).filter(Boolean);

  const toggleSelectAll = () => {
    if (selectedIds.length === transitions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transitions.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOpenSingleResolution = (item: MentorTransitionItem) => {
    setResolvingItems([item]);
    setResolutionDecision('CONTINUE');
    setSelectedFacultyId('');
    setNotes('');
  };

  const handleOpenBulkResolution = (decision: 'CONTINUE' | 'ASSIGN_NEW') => {
    const items = transitions.filter((t) => selectedIds.includes(t.id));
    if (items.length === 0) {
      toast.warn('Please select at least one student.');
      return;
    }
    setResolvingItems(items);
    setResolutionDecision(decision);
    setSelectedFacultyId('');
    setNotes('');
  };

  const handleConfirmResolution = async () => {
    if (!resolvingItems || resolvingItems.length === 0) return;

    if (resolutionDecision === 'ASSIGN_NEW' && !selectedFacultyId) {
      toast.error('Please select an eligible faculty member as mentor.');
      return;
    }

    setSubmitting(true);
    try {
      const payloadTransitions = resolvingItems.map((item) => ({
        transitionId: item.id,
        decision: resolutionDecision,
        newFacultyId: resolutionDecision === 'ASSIGN_NEW' ? selectedFacultyId : undefined,
        mentorDepartmentId: resolutionDecision === 'ASSIGN_NEW' ? selectedDeptId : undefined,
        notes: notes.trim() || undefined,
      }));

      const res = await mentorService.resolveTransitions({
        transitions: payloadTransitions,
      });

      toast.success(res.message || `Successfully confirmed mentorship for ${resolvingItems.length} student(s)!`);
      setResolvingItems(null);
      await fetchTransitions();
      if (onResolved) onResolved();
    } catch (err: any) {
      console.error('Failed to resolve mentor transitions:', err);
      toast.error(err.response?.data?.error || 'Failed to confirm mentor transitions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : ''}`}>
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              <span>Phase 2 Mentor Confirmation</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-400 font-semibold">
              Semester 2 → 3 Promotion
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Mentor Transition Queue ({total})
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Students entering Semester 3 require HOD confirmation. Choose to continue their Phase 1 mentor or assign a new mentor for Sem 3–8.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTransitions}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-400 hover:text-slate-700 dark:hover:text-white transition shadow-sm"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search USN or student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTransitions()}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 sm:w-64"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-neutral-400">Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-neutral-800">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {selectedIds.length} Selected:
            </span>
            <button
              onClick={() => handleOpenBulkResolution('CONTINUE')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Continue Previous</span>
            </button>
            <button
              onClick={() => handleOpenBulkResolution('ASSIGN_NEW')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>Assign New Mentor</span>
            </button>
          </div>
        )}
      </div>

      {/* ── QUEUE TABLE ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 dark:text-neutral-300 font-bold border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  >
                    {transitions.length > 0 && selectedIds.length === transitions.length ? (
                      <CheckSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 w-12 text-center">SL</th>
                <th className="py-3 px-4">STUDENT</th>
                <th className="py-3 px-4">USN</th>
                <th className="py-3 px-4">BATCH</th>
                <th className="py-3 px-4">PREVIOUS MENTOR (SEM 1–2)</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60 text-slate-700 dark:text-neutral-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading pending mentor transitions...</span>
                  </td>
                </tr>
              ) : transitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500/70" />
                    <p className="font-semibold text-slate-700 dark:text-neutral-300">
                      No pending mentor transitions!
                    </p>
                    <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">
                      All Semester 3 students have active confirmed mentors.
                    </p>
                  </td>
                </tr>
              ) : (
                transitions.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-neutral-800/30 transition ${
                        isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleSelectOne(item.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.studentName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                          Dept: {item.departmentCode} • Sem {item.semester}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-neutral-300">
                        {item.usn}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 font-mono text-[11px] font-semibold text-slate-700 dark:text-neutral-300">
                          {item.admissionBatch}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.previousMentorName || 'None'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Phase 1 Completed
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          Pending HOD
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenSingleResolution(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
                        >
                          <span>Review</span>
                          <ChevronRight className="size-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RESOLUTION MODAL ── */}
      {resolvingItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Mentorship for Phase 2 (Sem 3–8)
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Resolving {resolvingItems.length} student(s) transitioning to Semester 3.
                </p>
              </div>
              <button
                onClick={() => setResolvingItems(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Target Student Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-800/50 border border-slate-200/60 dark:border-neutral-800 text-xs space-y-2">
              <span className="font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider text-[10px]">
                Students Selected ({resolvingItems.length}):
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                {resolvingItems.map((st) => (
                  <div key={st.id} className="flex items-center justify-between py-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white font-sans">
                      {st.studentName} ({st.usn})
                    </span>
                    <span className="text-slate-500">
                      Prev: <strong className="text-indigo-600 dark:text-indigo-400">{st.previousMentorName}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision Tabs */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wider">
                Select Resolution Action
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setResolutionDecision('CONTINUE')}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    resolutionDecision === 'CONTINUE'
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold">Continue Previous Mentor</span>
                    <CheckCircle2 className={`size-4 ${resolutionDecision === 'CONTINUE' ? 'text-emerald-600' : 'text-slate-300'}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Maintains their Phase 1 mentor across Semester 3 through 8.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionDecision('ASSIGN_NEW')}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    resolutionDecision === 'ASSIGN_NEW'
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold">Assign New Mentor</span>
                    <Sparkles className={`size-4 ${resolutionDecision === 'ASSIGN_NEW' ? 'text-indigo-600' : 'text-slate-300'}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Select a new faculty member from eligible department pool.
                  </p>
                </button>
              </div>

              {/* Assign New Form */}
              {resolutionDecision === 'ASSIGN_NEW' && (
                <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-3.5 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                      Mentor Department
                    </label>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-neutral-300">
                        Select Faculty Mentor
                      </label>
                      <input
                        type="text"
                        placeholder="Search faculty..."
                        value={facultySearch}
                        onChange={(e) => setFacultySearch(e.target.value)}
                        className="px-2 py-0.5 text-[11px] rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 w-36"
                      />
                    </div>

                    {loadingFaculty ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        <RefreshCw className="size-4 animate-spin mx-auto mb-1 text-indigo-500" />
                        Loading eligible faculty...
                      </div>
                    ) : (
                      <select
                        value={selectedFacultyId}
                        onChange={(e) => setSelectedFacultyId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Choose Faculty Mentor --</option>
                        {facultyList.map((f) => (
                          <option key={f.facultyId} value={f.facultyId}>
                            {f.name} ({f.email}) — {f.currentMenteeCount} active mentees
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Reason / Reassignment Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Phase 2 faculty allocation confirmed"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setResolvingItems(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-300 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolution}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Confirm Decision</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorTransitionsQueue;
