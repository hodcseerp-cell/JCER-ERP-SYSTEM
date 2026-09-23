import React, { useState, useEffect } from 'react';
import { Plus, Layers, Edit3, X, Calendar, AlertCircle } from 'lucide-react';
import deanService, { SemesterRecord, AcademicYearRecord } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const SemestersPage: React.FC = () => {
  const [semesters, setSemesters] = useState<SemesterRecord[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSem, setEditingSem] = useState<SemesterRecord | null>(null);
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [semesterName, setSemesterName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ACTIVE');
  const [saving, setSaving] = useState(false);

  const fetchYearsAndSemesters = async () => {
    try {
      setLoading(true);
      const yrs = await deanService.getAcademicYears();
      setAcademicYears(yrs);
      const activeYr = yrs.find((y) => y.isCurrent)?.year || '2026-27';
      setSelectedYear(activeYr);

      const sems = await deanService.getSemesters({ academicYear: activeYr });
      setSemesters(sems);
    } catch (err) {
      toast.error('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearsAndSemesters();
  }, []);

  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    try {
      setLoading(true);
      const sems = await deanService.getSemesters({ academicYear: year });
      setSemesters(sems);
    } catch (err) {
      toast.error('Failed to load semesters for selected year');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSem(null);
    setSemesterNumber(1);
    setSemesterName('1st Semester');
    setStartDate('2026-08-01');
    setEndDate('2026-12-31');
    setStatus('ACTIVE');
    setModalOpen(true);
  };

  const openEditModal = (sem: SemesterRecord) => {
    setEditingSem(sem);
    setSemesterNumber(sem.semesterNumber);
    setSemesterName(sem.semesterName);
    setStartDate(sem.startDate);
    setEndDate(sem.endDate);
    setStatus(sem.status);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterNumber || !startDate || !endDate) {
      toast.error('Please enter all required semester details');
      return;
    }

    try {
      setSaving(true);
      if (editingSem) {
        await deanService.updateSemester(editingSem.id, {
          startDate,
          endDate,
          status,
        });
        toast.success(`Semester ${semesterNumber} updated successfully.`);
      } else {
        await deanService.createSemester({
          semesterNumber,
          semesterName: semesterName || `Semester ${semesterNumber}`,
          academicYear: selectedYear,
          startDate,
          endDate,
          status,
        });
        toast.success(`Semester ${semesterNumber} created successfully.`);
      }
      setModalOpen(false);
      handleYearChange(selectedYear);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save semester');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── TOP CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">
            Filter Academic Year:
          </span>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 focus:outline-none"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.year}>
                {y.year} {y.isCurrent ? '(Current Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Semester</span>
        </button>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            Semesters Structure ({selectedYear})
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Term durations, start/end dates, and instructional periods for odd & even semesters.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Semester Number</th>
                <th className="py-3 px-6 font-semibold">Semester Name</th>
                <th className="py-3 px-6 font-semibold">Academic Year</th>
                <th className="py-3 px-6 font-semibold">Start Date</th>
                <th className="py-3 px-6 font-semibold">End Date</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-28 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : semesters.length ? (
                semesters.map((sem) => (
                  <tr key={sem.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6 font-extrabold text-neutral-900 dark:text-white">
                      Semester {sem.semesterNumber}
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-800 dark:text-neutral-200">
                      {sem.semesterName}
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                      {sem.academicYear}
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                      {new Date(sem.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                      {new Date(sem.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          sem.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : sem.status === 'UPCOMING'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        {sem.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openEditModal(sem)}
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
                    No semesters configured for {selectedYear}.
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
                {editingSem ? `Edit Semester ${editingSem.semesterNumber}` : 'Add Semester'}
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
                  Semester Number (1 - 8) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  disabled={Boolean(editingSem)}
                  value={semesterNumber}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    setSemesterNumber(num);
                    setSemesterName(`${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Semester`);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Semester Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5th Semester"
                  value={semesterName}
                  onChange={(e) => setSemesterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
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
                  {saving ? 'Saving...' : editingSem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SemestersPage;
