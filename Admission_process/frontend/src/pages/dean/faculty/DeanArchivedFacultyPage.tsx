import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  Archive,
  RotateCcw,
  Eye,
  ArrowLeft,
  Calendar,
  BookOpen,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  ShieldCheck,
  Award,
  Layers,
  FileCheck2
} from 'lucide-react';
import deanService, { ArchivedFacultyRecord, DepartmentRecord, FacultyProfileResponse } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';
import { ProfileAvatar } from '../../../components/common/ProfileAvatar';

export const DeanArchivedFacultyPage: React.FC = () => {
  const navigate = useNavigate();
  const [archivedFaculty, setArchivedFaculty] = useState<ArchivedFacultyRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Restore Modal State
  const [facultyToRestore, setFacultyToRestore] = useState<ArchivedFacultyRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const fetchDependencies = async () => {
    try {
      const depts = await deanService.getDepartments();
      setDepartments(depts);
    } catch (err) {
      toast.error('Failed to load departments');
    }
  };

  const fetchArchivedFaculty = async () => {
    try {
      setLoading(true);
      const data = await deanService.getArchivedFacultyList({
        search: search || undefined,
        departmentId: selectedDept,
      });
      setArchivedFaculty(data);
    } catch (err) {
      toast.error('Failed to load archived faculty records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchArchivedFaculty();
  }, [selectedDept]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArchivedFaculty();
  };

  // Open Restore Modal
  const handleOpenRestoreModal = (fac: ArchivedFacultyRecord) => {
    setFacultyToRestore(fac);
  };

  const handleCloseRestoreModal = () => {
    setFacultyToRestore(null);
    setIsRestoring(false);
  };

  // Execute Restore
  const handleConfirmRestore = async () => {
    if (!facultyToRestore) return;

    try {
      setIsRestoring(true);
      await deanService.restoreFaculty(facultyToRestore.id);
      toast.success('Faculty restored successfully.');
      // Remove from archived table state immediately
      setArchivedFaculty((prev) => prev.filter((f) => f.id !== facultyToRestore.id));
      handleCloseRestoreModal();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to restore faculty member.';
      toast.error(errMsg);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/dean/faculty')}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Back to Active Faculty Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Archived Faculty Directory</span>
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Preserved academic history, teaching assignments, attendance records, and restore management.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/dean/faculty')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Active Faculty Directory</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search archived faculty by name, email, or designation..."
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

          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            Filter
          </button>
        </form>

        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 self-start lg:self-auto">
          Archived Records: {archivedFaculty.length}
        </span>
      </div>

      {/* ── ARCHIVED FACULTY TABLE ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-6 font-semibold">Faculty Name</th>
                <th className="py-3.5 px-6 font-semibold">Core Department</th>
                <th className="py-3.5 px-6 font-semibold">Official Email</th>
                <th className="py-3.5 px-6 font-semibold">Designation</th>
                <th className="py-3.5 px-6 font-semibold">Joining Date</th>
                <th className="py-3.5 px-6 font-semibold">Archived Date</th>
                <th className="py-3.5 px-6 font-semibold">Archived By</th>
                <th className="py-3.5 px-6 font-semibold">Previous Assignments</th>
                <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-28 h-4" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-24 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : archivedFaculty.length ? (
                archivedFaculty.map((fac) => (
                  <tr key={fac.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div
                        onClick={() => navigate(`/dean/faculty/${fac.id}`)}
                        className="flex items-center space-x-3 cursor-pointer group"
                      >
                        <ProfileAvatar
                          imageUrl={fac.profileImage}
                          name={fac.name}
                          size="sm"
                          className="opacity-75 group-hover:ring-2 group-hover:ring-indigo-500 transition-all shrink-0"
                        />
                        <div>
                          <span className="font-extrabold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block">
                            {fac.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">{fac.phone || 'Phone not set'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-800 dark:text-neutral-200">
                      <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                        {fac.departmentCode}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-neutral-600 dark:text-neutral-400">
                      {fac.email}
                    </td>
                    <td className="py-4 px-6 font-semibold text-neutral-700 dark:text-neutral-300">
                      {fac.designation}
                    </td>
                    <td className="py-4 px-6 text-neutral-500">
                      {fac.joiningDate ? new Date(fac.joiningDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-rose-600 dark:text-rose-400 font-medium">
                      {fac.archivedAt ? new Date(fac.archivedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-300 font-medium">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px]">
                        {fac.archivedBy}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium max-w-[200px] truncate" title={fac.previousSubjects}>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 mr-1">[{fac.totalAssignments}]</span>
                      {fac.previousSubjects}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => navigate(`/dean/faculty/${fac.id}`)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-neutral-700 hover:text-indigo-600 dark:text-neutral-300 dark:hover:text-indigo-400 font-bold text-[11px] transition-all cursor-pointer"
                          title="View Full Historical Profile & Teaching Records"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>History</span>
                        </button>
                        <button
                          onClick={() => handleOpenRestoreModal(fac)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] transition-all border border-emerald-200/60 dark:border-emerald-900/40 cursor-pointer"
                          title="Restore Faculty Account & Allocation Access"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 space-y-2">
                    <Archive className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600" />
                    <p className="text-xs font-semibold">No archived faculty records found.</p>
                    <p className="text-[11px] text-neutral-500">Deleted faculty will be safely preserved in this directory.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RESTORE CONFIRMATION MODAL ── */}
      {facultyToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">Restore Faculty?</h3>
                  <p className="text-xs text-neutral-500">Reactivate faculty account & teaching allocation access</p>
                </div>
              </div>
              <button
                onClick={handleCloseRestoreModal}
                disabled={isRestoring}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
              <p>
                You are about to restore <strong className="text-neutral-900 dark:text-white font-bold">{facultyToRestore.name}</strong> ({facultyToRestore.email}) to active status.
              </p>
              
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Account Restoration Effects</span>
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-1 pl-1 font-medium text-emerald-800 dark:text-emerald-200">
                  <li>Faculty login credentials will be reactivated with their existing password.</li>
                  <li>Faculty will reappear in the active Faculty Directory and Teaching Allocation dropdowns.</li>
                  <li>Historical assignments remain intact; new teaching sections can be assigned through Teaching Allocation.</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={handleCloseRestoreModal}
                disabled={isRestoring}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isRestoring ? 'Restoring Faculty...' : 'Restore Faculty'}</span>
              </button>
            </div>

          </div>
        </div>
      )}



    </div>
  );
};

export default DeanArchivedFacultyPage;

