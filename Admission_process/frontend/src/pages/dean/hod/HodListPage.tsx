import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, UserCheck, Eye, History, UserPlus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import deanService, { HodRecord, DepartmentRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const HodListPage: React.FC = () => {
  const navigate = useNavigate();
  const [hods, setHods] = useState<HodRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [selectedHodToDelete, setSelectedHodToDelete] = useState<HodRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchDependencies = async () => {
    try {
      const depts = await deanService.getDepartments();
      setDepartments(depts);
    } catch (err) {
      toast.error('Failed to load departments');
    }
  };

  const fetchHods = async () => {
    try {
      setLoading(true);
      const data = await deanService.getHods({
        search: search || undefined,
        departmentId: selectedDept,
        status: selectedStatus,
      });
      setHods(data);
    } catch (err) {
      toast.error('Failed to load HODs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (hod: HodRecord) => {
    setSelectedHodToDelete(hod);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedHodToDelete) return;
    try {
      setIsDeleting(true);
      await deanService.deleteHod(selectedHodToDelete.id);
      toast.success(`HOD ${selectedHodToDelete.name} deleted successfully`);
      setDeleteModalOpen(false);
      setSelectedHodToDelete(null);
      fetchHods();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete HOD';
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchHods();
  }, [selectedDept, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHods();
  };

  return (
    <div className="space-y-6">

      {/* ── TOP CONTROLS & ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by HOD name or email..."
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
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/dean/hods/history')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all"
          >
            <History className="w-4 h-4" />
            <span>HOD History</span>
          </button>

          <button
            onClick={() => navigate('/dean/hods/create')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create HOD</span>
          </button>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Heads of Department (HOD) Directory</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Active and past academic department heads appointed by Dean Academics.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">HOD Name</th>
                <th className="py-3 px-6 font-semibold">Department</th>
                <th className="py-3 px-6 font-semibold">Email</th>
                <th className="py-3 px-6 font-semibold">Academic Year</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold">Tenure Start</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-24 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : hods.length ? (
                hods.map((h) => (
                  <tr key={h.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs overflow-hidden">
                          {h.profileImage ? (
                            <img src={h.profileImage} alt={h.name} className="w-full h-full object-cover" />
                          ) : (
                            h.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900 dark:text-white block">{h.name}</span>
                          <span className="text-[10px] text-neutral-400">{h.phone || 'Phone not set'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-800 dark:text-neutral-200">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                        {h.departmentCode || 'CSE'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-600 dark:text-neutral-400">
                      {h.email}
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-700 dark:text-neutral-300">
                      {h.academicYear}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          h.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-500">
                      {h.tenureStartDate ? new Date(h.tenureStartDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => navigate(`/dean/hods/${h.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-[11px] transition-all flex items-center space-x-1"
                          title="View HOD Details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => navigate(`/dean/hods/assignments?hodUserId=${h.userId}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-[11px] transition-all flex items-center space-x-1"
                          title="Assign Department"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Assign</span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(h)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-[11px] transition-all flex items-center space-x-1"
                          title="Delete HOD"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-400">
                    No HOD records found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteModalOpen && selectedHodToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Delete HOD Record
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Are you sure you want to permanently delete this Head of Department? This action will remove this record and associated data from the database.
                </p>

                <div className="mt-4 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Name:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{selectedHodToDelete.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Department:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {selectedHodToDelete.departmentCode ? `${selectedHodToDelete.departmentCode} - ${selectedHodToDelete.departmentName || ''}` : selectedHodToDelete.departmentName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 font-medium">Email:</span>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">{selectedHodToDelete.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSelectedHodToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
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

export default HodListPage;
