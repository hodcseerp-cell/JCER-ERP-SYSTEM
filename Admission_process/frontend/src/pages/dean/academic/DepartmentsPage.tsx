import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, UserCheck, Edit3, Eye, X, AlertCircle } from 'lucide-react';
import deanService, { DepartmentRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await deanService.getDepartments({ search: search || undefined });
      setDepartments(data);
    } catch (err) {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDepartments();
  };

  const openCreateModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setModalOpen(true);
  };

  const openEditModal = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      toast.error('Please enter department name and code');
      return;
    }

    try {
      setSaving(true);
      if (editingDept) {
        await deanService.updateDepartment(editingDept.id, { name, code });
        toast.success(`Department ${code} updated successfully.`);
      } else {
        await deanService.createDepartment({ name, code });
        toast.success(`Department ${code} created successfully.`);
      }
      setModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── TOP CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by department name or code (e.g. CSE)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all"
          >
            Search
          </button>
        </form>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Department</span>
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">College Departments Directory</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Overview of engineering disciplines, faculty strengths, appointed HODs, and student enrollments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Department Code</th>
                <th className="py-3 px-6 font-semibold">Department Name</th>
                <th className="py-3 px-6 font-semibold">Assigned HOD</th>
                <th className="py-3 px-6 font-semibold text-center">Faculty Count</th>
                <th className="py-3 px-6 font-semibold text-center">Student Count</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-48 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-8 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-8 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-12 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-24 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : departments.length ? (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-neutral-900 dark:text-white">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                        {dept.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-800 dark:text-neutral-200">
                      {dept.name}
                    </td>
                    <td className="py-4 px-6">
                      {dept.hod ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                            {dept.hod.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white block">{dept.hod.name}</span>
                            <span className="text-[10px] text-neutral-400 block">{dept.hod.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">
                      {dept.facultyCount}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">
                      {dept.studentCount}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {dept.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => navigate(`/dean/academic/departments/${dept.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition-all flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => openEditModal(dept)}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-[11px] transition-all flex items-center space-x-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => navigate(`/dean/hods/assignments?dept=${dept.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[11px] transition-all flex items-center space-x-1"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Assign HOD</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-400">
                    No departments found.
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
                {editingDept ? `Edit Department (${editingDept.code})` : 'Add Department'}
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
                  Department Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science & Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase"
                  required
                />
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
                  {saving ? 'Saving...' : editingDept ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentsPage;
