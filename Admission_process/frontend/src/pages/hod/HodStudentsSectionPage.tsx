import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Layers,
  Users,
  PlusCircle,
  ArrowUpRight,
  UserPlus,
  RefreshCw,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Trash2,
  Info,
} from 'lucide-react';
import { RootState } from '../../store';
import hodService, { HodSectionItem } from '../../services/hod.service';

export const HodStudentsSectionPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const deptCode = user?.department?.code || 'ECE';
  const activeAY = '2026-27';

  const [searchParams, setSearchParams] = useSearchParams();
  const initialSem = searchParams.get('semester') ? Number(searchParams.get('semester')) : 1;

  const [selectedSemester, setSelectedSemester] = useState<number>(initialSem >= 1 && initialSem <= 8 ? initialSem : 1);
  const [sections, setSections] = useState<HodSectionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [semesterStats, setSemesterStats] = useState<{ totalStudents: number; allocatedCount: number; unallocatedCount: number }>({
    totalStudents: 0,
    allocatedCount: 0,
    unallocatedCount: 0,
  });

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<HodSectionItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formCapacity, setFormCapacity] = useState<number>(60);
  const [formClassroom, setFormClassroom] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Sync URL query params with state
  useEffect(() => {
    const semParam = searchParams.get('semester');
    if (semParam) {
      const s = Number(semParam);
      if (s >= 1 && s <= 8 && s !== selectedSemester) {
        setSelectedSemester(s);
      }
    }
  }, [searchParams]);

  // Fetch sections and semester student metrics
  const loadData = async () => {
    setLoading(true);
    setFormError(null);
    try {
      // 1. Fetch sections for current semester & academic year
      const sectionData = await hodService.getSections(selectedSemester, activeAY);
      setSections(sectionData || []);

      // 2. Fetch all students for this semester to get total, allocated, and unallocated counts
      const studentsRes = await hodService.getStudents({
        semester: selectedSemester,
        academicYear: activeAY,
        limit: 1, // we just need pagination.total
      });
      const totalInSem = studentsRes.pagination?.total || 0;

      // Count allocated across returned sections
      const allocatedInSem = (sectionData || []).reduce((acc, s) => acc + (s.studentCount || 0), 0);
      const unallocatedInSem = Math.max(0, totalInSem - allocatedInSem);

      setSemesterStats({
        totalStudents: totalInSem,
        allocatedCount: allocatedInSem,
        unallocatedCount: unallocatedInSem,
      });
    } catch (err: any) {
      console.error('Failed to load sections data:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to fetch section allocations.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSemester]);

  // Handle Semester Switch
  const handleSelectSemester = (sem: number) => {
    setSelectedSemester(sem);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('semester', sem.toString());
    setSearchParams(newParams, { replace: true });
  };

  // Open Create Section Modal with sequential name suggestion
  const handleOpenCreateModal = () => {
    setFormError(null);
    const existingNames = sections.map((s) => s.name.toUpperCase().trim());
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let suggestedLetter = 'A';
    for (const letter of alphabet) {
      const candidate1 = `SECTION ${letter}`;
      const candidate2 = letter;
      if (!existingNames.includes(candidate1) && !existingNames.includes(candidate2)) {
        suggestedLetter = letter;
        break;
      }
    }

    setFormName(`Section ${suggestedLetter}`);
    setFormCapacity(60);
    setFormClassroom('');
    setFormDescription('');
    setCreateModalOpen(true);
  };

  // Handle Create Section Submit
  const handleCreateSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Section name is required.');
      return;
    }
    if (!formCapacity || formCapacity <= 0) {
      setFormError('Section capacity must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await hodService.createSection({
        name: formName.trim(),
        semester: selectedSemester,
        academicYear: activeAY,
        capacity: formCapacity,
        classroom: formClassroom.trim() || undefined,
        description: formDescription.trim() || undefined,
      });

      setNotification({
        type: 'success',
        message: `Section "${formName.trim()}" created successfully for Semester ${selectedSemester}.`,
      });
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Create section failed:', err);
      setFormError(err.response?.data?.error || 'Failed to create section. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Section Modal
  const handleOpenEditModal = (sec: HodSectionItem) => {
    setActiveSection(sec);
    setFormName(sec.name);
    setFormCapacity(sec.capacity || 60);
    setFormClassroom(sec.classroom || '');
    setFormDescription(sec.description || '');
    setFormError(null);
    setEditModalOpen(true);
  };

  // Handle Edit Section Submit
  const handleEditSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSection) return;

    if (!formName.trim()) {
      setFormError('Section name is required.');
      return;
    }
    if (!formCapacity || formCapacity <= 0) {
      setFormError('Section capacity must be greater than zero.');
      return;
    }
    if (formCapacity < activeSection.studentCount) {
      setFormError(`Capacity cannot be lower than currently allocated students (${activeSection.studentCount}).`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await hodService.updateSection(activeSection.id, {
        name: formName.trim(),
        capacity: formCapacity,
        classroom: formClassroom.trim() || '',
        description: formDescription.trim() || '',
      });

      setNotification({
        type: 'success',
        message: `Section "${formName.trim()}" updated successfully.`,
      });
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Update section failed:', err);
      setFormError(err.response?.data?.error || 'Failed to update section.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (sec: HodSectionItem) => {
    setActiveSection(sec);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!activeSection) return;
    setSubmitting(true);
    try {
      await hodService.deleteSection(activeSection.id);
      setNotification({
        type: 'success',
        message: `Section "${activeSection.name}" has been removed.`,
      });
      setDeleteModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Delete section failed:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to delete section.',
      });
      setDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* ── HEADER & ACTIONS ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                Section Allocation
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Create sections and allocate students semester-wise for the selected academic year.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Locked Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300">
            <Building2 size={13} className="text-neutral-500" />
            <span>Dept: {deptCode}</span>
            <span className="text-[10px] text-neutral-400 font-normal">(Locked)</span>
          </div>

          {/* Academic Year Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300">
            <Calendar size={13} className="text-neutral-500" />
            <span>AY: {activeAY}</span>
          </div>

          {/* Create Section Trigger */}
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.01] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} />
            <span>Create Section</span>
          </button>

          {/* All Students Directory */}
          <Link
            to="/hod/students"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Users size={13} className="text-neutral-500" />
            <span>Students Directory</span>
          </Link>

          {/* Refresh */}
          <button
            onClick={loadData}
            title="Refresh Sections"
            className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── SEMESTER SELECTOR TABS ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          Select Semester
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <button
              key={s}
              onClick={() => handleSelectSemester(s)}
              className={`px-4 py-2.5 rounded-xl border text-center transition-all duration-200 shrink-0 min-w-[90px] h-10 flex items-center justify-center text-xs font-black shadow-sm cursor-pointer ${
                selectedSemester === s
                  ? 'bg-blue-600 border-blue-700 text-white shadow-blue-500/10'
                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:scale-[1.01]'
              }`}
            >
              <span>Semester {s}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── SEMESTER COHORT METRICS BAR ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block mb-1">
            Total Semester Students
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">
              {semesterStats.totalStudents}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">students</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
            Allocated Students
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 leading-none">
              {semesterStats.allocatedCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">in sections</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
            Unallocated Students
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300 leading-none">
              {semesterStats.unallocatedCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">awaiting</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
            Active Sections
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 leading-none">
              {sections.length}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">divisions</span>
          </div>
        </div>
      </div>

      {/* ── SECTION CONTENT AREA ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs font-bold text-neutral-500">Loading semester {selectedSemester} sections...</p>
        </div>
      ) : sections.length === 0 ? (
        /* ── 3. EMPTY STATE: EXACT SPECIFICATION ── */
        <div className="p-12 md:p-16 text-center rounded-3xl bg-white dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-800 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Layers size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">
              No sections created yet
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Create sections to begin allocating students for this semester.
            </p>
          </div>
          <div>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02] inline-flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>+ Create Section</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── 5. SECTION LIST: EXACT SPECIFICATION ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((sec) => {
            const capacity = sec.capacity || 60;
            const allocated = sec.studentCount || 0;
            const available = Math.max(0, capacity - allocated);
            const fillRate = capacity > 0 ? Math.min(100, Math.round((allocated / capacity) * 100)) : 0;
            const isFull = available === 0;

            return (
              <div
                key={sec.id}
                className="rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[11px]">
                      <Layers size={12} />
                      <span>Semester {sec.semester}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {sec.classroom && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          Room: {sec.classroom}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-neutral-400">
                        {sec.academicYear}
                      </span>
                    </div>
                  </div>

                  {/* Section Title & Metrics */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                        {sec.name}
                      </h3>
                      <button
                        onClick={() => handleOpenEditModal(sec)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Edit Section Details"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>

                    {sec.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">
                        {sec.description}
                      </p>
                    )}
                  </div>

                  {/* Capacity Distribution Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 block uppercase">Capacity</span>
                      <span className="text-sm font-black text-neutral-900 dark:text-white">{capacity}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 block uppercase">Allocated</span>
                      <span className="text-sm font-black text-blue-700 dark:text-blue-300">{allocated}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">Available</span>
                      <span className={`text-sm font-black ${isFull ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {available}
                      </span>
                    </div>
                  </div>

                  {/* Fill Rate Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-neutral-400">Classroom Fill Rate</span>
                      <span className={isFull ? 'text-rose-600 font-black' : 'text-blue-600 dark:text-blue-400'}>
                        {fillRate}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isFull
                            ? 'bg-rose-500'
                            : fillRate > 80
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, fillRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions: View Students, Allocate Students, Manage */}
                <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <Link
                    to={`/hod/students/sections/${sec.id}`}
                    className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1"
                  >
                    <span>View Students</span>
                    <ArrowUpRight size={12} />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/hod/students/sections/${sec.id}/allocate`}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1"
                    >
                      <UserPlus size={13} />
                      <span>Allocate</span>
                    </Link>

                    {allocated === 0 && (
                      <button
                        onClick={() => handleOpenDeleteModal(sec)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        title="Delete empty section"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE SECTION MODAL ──────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Create Section
                </h3>
                <p className="text-xs text-neutral-500">
                  Semester {selectedSemester} • Academic Year {activeAY}
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Section Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Section A"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Suggested sequentially (e.g. Section A, Section B). Can be renamed.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Section Capacity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={250}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Maximum student seats for this division (default 60).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Classroom / Room <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 304, LH-1"
                  value={formClassroom}
                  onChange={(e) => setFormClassroom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional division notes or batch details..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Section</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT SECTION MODAL ────────────────────────────────────────────────── */}
      {editModalOpen && activeSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  Manage Section
                </h3>
                <p className="text-xs text-neutral-500">
                  Update details for {activeSection.name}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-neutral-700"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Section Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Section Capacity (Currently Allocated: {activeSection.studentCount})
                </label>
                <input
                  type="number"
                  required
                  min={activeSection.studentCount || 1}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Classroom / Room
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 304"
                  value={formClassroom}
                  onChange={(e) => setFormClassroom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE SECTION MODAL ──────────────────────────────────────────────── */}
      {deleteModalOpen && activeSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-sm w-full p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                Delete {activeSection.name}?
              </h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to remove this section? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodStudentsSectionPage;
