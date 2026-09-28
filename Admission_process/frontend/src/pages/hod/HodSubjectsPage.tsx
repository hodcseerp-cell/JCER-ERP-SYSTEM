import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  PlusCircle,
  Users,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  X,
  Trash2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-toastify';
import hodService, { HodSubjectItem } from '../../services/hod.service';

import usePersistentState from '../../hooks/usePersistentState';
import usePersistentFormState from '../../hooks/usePersistentFormState';

export const HodSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<HodSubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Persisted semester filter across tab switches & page refreshes
  const [selectedSemester, setSelectedSemester] = usePersistentState<string>('hod_subjects_semester_filter', 'ALL');

  // Modal to create subject
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  
  // Persisted subject creation form draft
  const {
    formState: subjectForm,
    updateField: updateSubjectField,
    clearDraft: clearSubjectDraft,
  } = usePersistentFormState('hod_create_subject_draft', {
    code: '',
    name: '',
    semester: '3',
    credits: '4',
    type: 'IPCC',
  });

  const { code, name, semester, credits, type } = subjectForm;
  const setCode = (val: string) => updateSubjectField('code', val);
  const setName = (val: string) => updateSubjectField('name', val);
  const setSemester = (val: string) => updateSubjectField('semester', val);
  const setCredits = (val: string) => updateSubjectField('credits', val);
  const setType = (val: string) => updateSubjectField('type', val);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Subject deletion & Academic data protection state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; code: string; name: string } | null>(null);
  const [academicWarning, setAcademicWarning] = useState<{ id: string; code: string; message: string; details?: any } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const data = await hodService.getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
      toast.error('Failed to load department subjects.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setFormError('Subject code and subject name are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await hodService.createSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        semester: Number(semester),
        credits: Number(credits) || 4,
        type: type === 'CC' ? 'CC' : 'IPCC',
      });
      setShowAddModal(false);
      clearSubjectDraft();
      setFormError(null);
      toast.success('Subject created successfully.');
      fetchSubjects();
    } catch (err: any) {
      console.error('Failed to create subject:', err);
      const backendError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to create subject. Please check the inputs and try again.';
      setFormError(backendError);
      toast.error(backendError);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!deleteTarget) return;
    const { id, code: subCode } = deleteTarget;
    setDeletingId(id);
    try {
      await hodService.deleteSubject(id);
      toast.success(`Subject ${subCode} deleted successfully.`);
      setDeleteTarget(null);
      fetchSubjects();
    } catch (err: any) {
      console.error('Failed to delete subject:', err);
      const resData = err?.response?.data;
      if (resData?.code === 'SUBJECT_HAS_ACADEMIC_DATA') {
        setDeleteTarget(null);
        setAcademicWarning({
          id,
          code: subCode,
          message: resData.message || 'Subject cannot be deleted because academic records exist.',
          details: resData.details,
        });
      } else {
        const msg = resData?.message || resData?.error || 'Failed to delete subject. Please try again.';
        toast.error(msg);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeactivateSubject = async () => {
    if (!academicWarning) return;
    setDeactivating(true);
    try {
      await hodService.updateSubject(academicWarning.id, { status: 'INACTIVE' });
      toast.success(`Subject ${academicWarning.code} marked as INACTIVE.`);
      setAcademicWarning(null);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update subject status.');
    } finally {
      setDeactivating(false);
    }
  };

  const filtered = subjects.filter((s) => {
    if (selectedSemester === 'ALL') return true;
    return s.semester === Number(selectedSemester);
  });

  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Admin Style) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Curriculum Offerings
            </span>
            <div className="text-3xl font-black mt-0.5">
              {subjects.length} <span className="text-sm font-semibold text-neutral-400">subjects</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchSubjects()}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] hover:from-[#0a1533] hover:to-[#142c6b] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-[#1e3a8a]/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar (Admin Style - Enlarged) ───────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-6 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-extrabold text-neutral-800 dark:text-neutral-200 tracking-tight">
            Filter by Semester:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedSemester('ALL')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                selectedSemester === 'ALL'
                  ? 'bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white font-bold shadow-md shadow-[#070e22]/25 border border-[#1e3a8a]/50'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent'
              }`}
            >
              All Semesters
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSemester(String(s))}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs ${
                  selectedSemester === String(s)
                    ? 'bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white font-bold shadow-md shadow-[#070e22]/25 border border-[#1e3a8a]/50'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent'
                }`}
              >
                Sem {s}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 self-start sm:self-auto">
          Showing <span className="text-neutral-900 dark:text-white font-black">{filtered.length}</span> {filtered.length === 1 ? 'subject' : 'subjects'}
        </div>
      </div>

      {/* ── Subjects Grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-12 text-center text-neutral-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
          <p className="mt-2 text-xs font-bold">Loading department subjects...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Sem {sub.semester} • {sub.credits} Credits
                  </span>
                </div>

                <h3 className="text-sm font-black text-neutral-900 dark:text-white mt-3">
                  {sub.name}
                </h3>
                <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                  Type: {sub.type}
                </p>

                {/* Assigned Faculty */}
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                    Assigned Teaching Faculty:
                  </span>
                  {sub.assignedFaculty && sub.assignedFaculty.length > 0 ? (
                    <div className="space-y-1">
                      {sub.assignedFaculty.map((f, i) => (
                        <div key={i} className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                          <span>{f.facultyName}</span>
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Sec {f.section}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-rose-500 font-bold italic">Unassigned</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: sub.id, code: sub.code, name: sub.name })}
                  disabled={deletingId === sub.id}
                  className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Delete subject"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <Link
                  to="/hod/faculty/assignments"
                  className="font-bold text-neutral-900 dark:text-white hover:underline flex items-center gap-0.5"
                >
                  <span>Manage Allotment →</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Subjects Found</p>
        </div>
      )}

      {/* ── Add Subject Modal (Admin Style) ─────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Add Department Subject</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Subject Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21CS51"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold focus:ring-2 focus:ring-violet-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-neutral-700 dark:text-neutral-300 font-bold">Course Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="IPCC">IPCC</option>
                  <option value="CC">CC</option>
                </select>
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Subject Delete Modal ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">Delete Subject</h3>
                <p className="text-xs text-neutral-500">{deleteTarget.code} — {deleteTarget.name}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
              Are you sure you want to delete this curriculum offering? This will permanently remove the subject if no student or faculty records are linked.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSubject}
                disabled={Boolean(deletingId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {deletingId ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Academic Protection & Inactive Offer Modal ──────────────────────── */}
      {academicWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">Subject Deletion Blocked</h3>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  CODE: SUBJECT_HAS_ACADEMIC_DATA
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
              The subject <strong className="text-neutral-900 dark:text-white">{academicWarning.code}</strong> cannot be deleted because academic records are actively or historically linked to it (such as faculty assignments, attendance, assessments, or Google Sheets).
            </p>

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs space-y-1.5">
              <div className="font-bold text-neutral-800 dark:text-neutral-200">Recommended Production Action:</div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Marking the subject as <strong>INACTIVE</strong> preserves historical grade sheets and attendance logs while hiding it from future semester assignments.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setAcademicWarning(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDeactivateSubject}
                disabled={deactivating}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {deactivating ? 'Deactivating...' : 'Mark as INACTIVE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodSubjectsPage;
