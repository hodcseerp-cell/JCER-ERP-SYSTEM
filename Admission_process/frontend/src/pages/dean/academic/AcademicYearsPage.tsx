import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, CheckCircle2, Clock, Archive, Edit3, X, AlertCircle } from 'lucide-react';
import deanService, { AcademicYearRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const AcademicYearsPage: React.FC = () => {
  const [years, setYears] = useState<AcademicYearRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingYear, setEditingYear] = useState<AcademicYearRecord | null>(null);
  const [formYear, setFormYear] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'UPCOMING' | 'ARCHIVED'>('UPCOMING');
  const [formIsCurrent, setFormIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const data = await deanService.getAcademicYears({
        search: search || undefined,
        status: statusFilter,
      });
      setYears(data);
    } catch (err: any) {
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchYears();
  };

  const openCreateModal = () => {
    setEditingYear(null);
    setFormYear('2026-27');
    setFormStart('2026-07-01');
    setFormEnd('2027-06-30');
    setFormStatus('UPCOMING');
    setFormIsCurrent(false);
    setModalOpen(true);
  };

  const openEditModal = (yr: AcademicYearRecord) => {
    setEditingYear(yr);
    setFormYear(yr.year);
    setFormStart(yr.startDate);
    setFormEnd(yr.endDate);
    setFormStatus(yr.status);
    setFormIsCurrent(yr.isCurrent);
    setModalOpen(true);
  };

  const handleSetCurrentActive = async (yr: AcademicYearRecord) => {
    try {
      setLoading(true);
      await deanService.updateAcademicYear(yr.id, {
        isCurrent: true,
        status: 'ACTIVE',
      });
      toast.success(`Academic Year ${yr.year} is now set as the active institutional session!`);
      window.dispatchEvent(new CustomEvent('academic-year-changed', { detail: { year: yr.year } }));
      await fetchYears();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to set active academic year');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formYear || !formStart || !formEnd) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const willBeCurrent = formIsCurrent || formStatus === 'ACTIVE';
      const finalStatus = willBeCurrent ? 'ACTIVE' : formStatus;

      if (editingYear) {
        await deanService.updateAcademicYear(editingYear.id, {
          startDate: formStart,
          endDate: formEnd,
          status: finalStatus,
          isCurrent: willBeCurrent,
        });
        toast.success(`Academic Year ${formYear} updated successfully.`);
      } else {
        await deanService.createAcademicYear({
          year: formYear.trim(),
          startDate: formStart,
          endDate: formEnd,
          status: finalStatus,
          isCurrent: willBeCurrent,
        });
        toast.success(`Academic Year ${formYear} created successfully.`);
      }

      if (willBeCurrent) {
        window.dispatchEvent(new CustomEvent('academic-year-changed', { detail: { year: formYear } }));
      }
      setModalOpen(false);
      fetchYears();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save academic year');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── HEADER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search academic year (e.g. 2026-27)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </form>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Academic Year</span>
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">College Academic Years</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Define institutional sessions, calendar start/end dates, and the current active session.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Academic Year</th>
                <th className="py-3 px-6 font-semibold">Start Date</th>
                <th className="py-3 px-6 font-semibold">End Date</th>
                <th className="py-3 px-6 font-semibold text-center">Current Active</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-12 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : years.length ? (
                years.map((yr) => (
                  <tr key={yr.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-neutral-900 dark:text-white flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span>{yr.year}</span>
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                      {new Date(yr.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                      {new Date(yr.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {yr.isCurrent ? (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Current Active</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCurrentActive(yr)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 text-[11px] font-bold rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-amber-500 text-neutral-700 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title={`Set ${yr.year} as the active academic year`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-600" />
                          <span>Set as Active</span>
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          yr.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : yr.status === 'UPCOMING'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {yr.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openEditModal(yr)}
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
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    No academic years found.
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
                {editingYear ? `Edit Academic Year (${editingYear.year})` : 'Create Academic Year'}
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
                  Academic Year Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-27"
                  disabled={Boolean(editingYear)}
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => {
                    const nextVal = e.target.value as any;
                    setFormStatus(nextVal);
                    if (nextVal === 'ACTIVE') {
                      setFormIsCurrent(true);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isCurrentYear"
                  checked={formIsCurrent}
                  onChange={(e) => {
                    setFormIsCurrent(e.target.checked);
                    if (e.target.checked) {
                      setFormStatus('ACTIVE');
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isCurrentYear" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Set as Current Institutional Active Session (updates portal headers & dashboard)
                </label>
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
                  {saving ? 'Saving...' : editingYear ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcademicYearsPage;
