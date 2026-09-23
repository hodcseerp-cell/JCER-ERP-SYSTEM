import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Edit3, X, AlertCircle } from 'lucide-react';
import deanService, { SubjectRecord, DepartmentRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedSem, setSelectedSem] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [credits, setCredits] = useState<number>(4);
  const [type, setType] = useState<'Theory' | 'Practical' | 'Project' | 'Elective' | 'Seminar'>('Theory');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [saving, setSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const depts = await deanService.getDepartments();
      setDepartments(depts);
      if (depts.length > 0) setDepartmentId(depts[0].id);
    } catch (err) {
      toast.error('Failed to load departments');
    }
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const data = await deanService.getSubjects({
        search: search || undefined,
        departmentId: selectedDept,
        semester: selectedSem !== 'ALL' ? Number(selectedSem) : undefined,
        type: selectedType,
      });
      setSubjects(data);
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [selectedDept, selectedSem, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubjects();
  };

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setSemester(1);
    if (departments.length > 0) setDepartmentId(departments[0].id);
    setCredits(4);
    setType('Theory');
    setStatus('ACTIVE');
    setModalOpen(true);
  };

  const openEditModal = (sub: SubjectRecord) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setSemester(sub.semester);
    setDepartmentId(sub.departmentId || (departments.length > 0 ? departments[0].id : ''));
    setCredits(sub.credits);
    setType(sub.type);
    setStatus(sub.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !semester) {
      toast.error('Please enter subject name, code, and semester');
      return;
    }

    try {
      setSaving(true);
      if (editingSubject) {
        await deanService.updateSubject(editingSubject.id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          semester,
          departmentId: departmentId || null,
          credits,
          type,
          status,
        });
        toast.success(`Subject ${code} updated successfully.`);
      } else {
        await deanService.createSubject({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          semester,
          departmentId: departmentId || null,
          credits,
          type,
          status,
        });
        toast.success(`Subject ${code} created successfully.`);
      }
      setModalOpen(false);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── TOP FILTERS & ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 flex-1">
          
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by code or title (e.g. CS501)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>

          <select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="Theory">Theory</option>
            <option value="Practical">Practical</option>
            <option value="Project">Project</option>
            <option value="Elective">Elective</option>
            <option value="Seminar">Seminar</option>
          </select>

          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            Filter
          </button>
        </form>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Subject</span>
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Curriculum Subjects Directory</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            VTU / Autonomous curriculum subjects, credits, syllabus categories, and department allocations.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Subject Code</th>
                <th className="py-3 px-6 font-semibold">Subject Name</th>
                <th className="py-3 px-6 font-semibold">Department</th>
                <th className="py-3 px-6 font-semibold text-center">Semester</th>
                <th className="py-3 px-6 font-semibold text-center">Credits</th>
                <th className="py-3 px-6 font-semibold text-center">Type</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-48 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-8 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-8 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-14 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : subjects.length ? (
                subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-neutral-900 dark:text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                        {sub.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-800 dark:text-neutral-200">
                      {sub.name}
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-600 dark:text-neutral-400">
                      {sub.department?.code || 'Core / General'}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">
                      Sem {sub.semester}
                    </td>
                    <td className="py-4 px-6 text-center font-extrabold text-neutral-900 dark:text-white">
                      {sub.credits}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          sub.type === 'Theory'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : sub.type === 'Practical'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : sub.type === 'Elective'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {sub.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {sub.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openEditModal(sub)}
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
                  <td colSpan={8} className="py-10 text-center text-neutral-400">
                    No curriculum subjects found for selected filters.
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
                {editingSubject ? `Edit Subject (${editingSubject.code})` : 'Add Subject'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS501"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Big Data Analytics"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  >
                    <option value="">Core / College-Wide</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Semester (1 - 8) *
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Practical">Practical</option>
                    <option value="Project">Project</option>
                    <option value="Elective">Elective</option>
                    <option value="Seminar">Seminar</option>
                  </select>
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
                  {saving ? 'Saving...' : editingSubject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubjectsPage;
