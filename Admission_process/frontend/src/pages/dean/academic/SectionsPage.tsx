import React, { useState, useEffect } from 'react';
import { Plus, Grid, Edit3, X, AlertCircle } from 'lucide-react';
import deanService, { SectionRecord, DepartmentRecord, AcademicYearRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const SectionsPage: React.FC = () => {
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedSem, setSelectedSem] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionRecord | null>(null);
  const [deptId, setDeptId] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number>(60);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [saving, setSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const [depts, yrs] = await Promise.all([
        deanService.getDepartments(),
        deanService.getAcademicYears(),
      ]);
      setDepartments(depts);
      setAcademicYears(yrs);
      const activeYr = yrs.find((y) => y.isCurrent)?.year || '2026-27';
      setSelectedYear(activeYr);
      if (depts.length > 0) setDeptId(depts[0].id);
    } catch (err) {
      toast.error('Failed to load filter options');
    }
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      const data = await deanService.getSections({
        departmentId: selectedDept,
        semester: selectedSem !== 'ALL' ? Number(selectedSem) : undefined,
        academicYear: selectedYear,
      });
      setSections(data);
    } catch (err) {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchSections();
  }, [selectedDept, selectedSem, selectedYear]);

  const openCreateModal = () => {
    setEditingSection(null);
    if (departments.length > 0) setDeptId(departments[0].id);
    setSemester(1);
    setName('Section A');
    setCapacity(60);
    setStatus('ACTIVE');
    setModalOpen(true);
  };

  const openEditModal = (sec: SectionRecord) => {
    setEditingSection(sec);
    setDeptId(sec.departmentId);
    setSemester(sec.semester);
    setName(sec.name);
    setCapacity(sec.capacity);
    setStatus(sec.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId || !semester || !name) {
      toast.error('Please enter department, semester, and section name');
      return;
    }

    try {
      setSaving(true);
      if (editingSection) {
        await deanService.updateSection(editingSection.id, {
          capacity,
          status,
        });
        toast.success(`Section ${name} updated successfully.`);
      } else {
        await deanService.createSection({
          departmentId: deptId,
          semester,
          academicYear: selectedYear,
          name: name.trim(),
          capacity,
          status,
        });
        toast.success(`Section ${name} created successfully.`);
      }
      setModalOpen(false);
      fetchSections();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── TOP CONTROLS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dept Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.year}>
                  {y.year}
                </option>
              ))}
            </select>
          </div>

        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Section</span>
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Class Sections Directory</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Section divisions mapped by Department, Semester, and Academic Year with capacity constraints.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Department</th>
                <th className="py-3 px-6 font-semibold">Semester</th>
                <th className="py-3 px-6 font-semibold">Section Name</th>
                <th className="py-3 px-6 font-semibold">Academic Year</th>
                <th className="py-3 px-6 font-semibold text-center">Student Capacity</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-12 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : sections.length ? (
                sections.map((sec) => (
                  <tr key={sec.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-neutral-900 dark:text-white">
                      {sec.department?.code || 'CSE'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-800 dark:text-neutral-200">
                      Semester {sec.semester}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-neutral-900 dark:text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                        {sec.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                      {sec.academicYear}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">
                      {sec.capacity} Students
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          sec.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {sec.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openEditModal(sec)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-400">
                    No sections found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {editingSection ? `Edit Section (${editingSection.name})` : 'Add Section'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Department *
                </label>
                <select
                  disabled={Boolean(editingSection)}
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Semester (1 - 8) *
                  </label>
                  <select
                    disabled={Boolean(editingSection)}
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Section Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Section A"
                    disabled={Boolean(editingSection)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Capacity (Students)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingSection ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SectionsPage;
