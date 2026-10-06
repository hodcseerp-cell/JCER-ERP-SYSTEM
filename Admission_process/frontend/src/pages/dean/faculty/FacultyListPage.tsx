import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  FileCheck2,
  Trash2,
  Eye,
  AlertTriangle,
  AlertCircle,
  X,
  Archive,
  BookOpen,
  Calendar,
  CheckCircle2,
  Layers,
  GraduationCap,
  History,
  ShieldAlert,
  KeyRound,
  Copy,
  Download,
  Check,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Clock,
  ClipboardList
} from 'lucide-react';
import deanService, { FacultyRecord, DepartmentRecord, FacultyProfileResponse } from '../../../services/dean.service';
import Skeleton from '../../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const FacultyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Delete / Archive Modal State
  const [facultyToDelete, setFacultyToDelete] = useState<FacultyRecord | null>(null);
  const [deleteInputText, setDeleteInputText] = useState<string>('');
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  // View Profile Modal State
  const [facultyToView, setFacultyToView] = useState<FacultyRecord | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Regeneration Modal State
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<boolean>(false);
  const [regenerateInputText, setRegenerateInputText] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [regeneratedCredentials, setRegeneratedCredentials] = useState<{
    facultyName: string;
    loginEmail: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);

  const fetchDependencies = async () => {
    try {
      const depts = await deanService.getDepartments();
      setDepartments(depts);
    } catch (err: any) {
      console.warn('Failed to load departments:', err);
    }
  };

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await deanService.getFacultyList({
        search: search.trim() || undefined,
        departmentId: selectedDept,
        status: selectedStatus,
      });
      setFaculty(Array.isArray(data) ? data : []);
      setFetchError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unable to load faculty directory.';
      setFetchError(msg);
      toast.error('Unable to load faculty directory.', { toastId: 'dean-faculty-load-error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [selectedDept, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFaculty();
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (fac: FacultyRecord) => {
    setFacultyToDelete(fac);
    setDeleteInputText('');
  };

  const handleCloseDeleteModal = () => {
    setFacultyToDelete(null);
    setDeleteInputText('');
    setIsArchiving(false);
  };

  // Execute Non-Destructive Soft-Delete / Archive
  const handleConfirmArchive = async () => {
    if (!facultyToDelete || deleteInputText !== 'DELETE') return;

    try {
      setIsArchiving(true);
      await deanService.archiveFaculty(facultyToDelete.id);
      toast.success('Faculty archived successfully.');
      // Remove from active list immediately without full page reload
      setFaculty((prev) => prev.filter((f) => f.id !== facultyToDelete.id));
      handleCloseDeleteModal();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to archive faculty.';
      toast.error(errMsg);
    } finally {
      setIsArchiving(false);
    }
  };

  // Open Faculty Profile Modal
  const handleOpenViewModal = async (fac: FacultyRecord) => {
    setFacultyToView(fac);
    setViewLoading(true);
    setFacultyProfile(null);
    setProfileError(null);
    try {
      const data = await deanService.getFacultyProfile(fac.id);
      setFacultyProfile(data);
    } catch (err: any) {
      console.error('Error loading faculty profile:', err);
      setProfileError('Unable to load faculty profile. Please try again.');
      toast.error('Unable to load faculty profile. Please try again.');
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseViewModal = () => {
    setFacultyToView(null);
    setFacultyProfile(null);
    setProfileError(null);
    setViewLoading(false);
    setShowRegenerateConfirm(false);
    setRegenerateInputText('');
  };

  // Handle Password Regeneration
  const handleOpenRegenerateModal = () => {
    setShowRegenerateConfirm(true);
    setRegenerateInputText('');
  };

  const handleCloseRegenerateModal = () => {
    setShowRegenerateConfirm(false);
    setRegenerateInputText('');
    setIsRegenerating(false);
  };

  const handleConfirmRegenerate = async () => {
    if (!facultyToView || regenerateInputText !== 'REGENERATE') return;

    try {
      setIsRegenerating(true);
      const res = await deanService.regenerateFacultyPassword(facultyToView.id);
      setRegeneratedCredentials(res);
      setShowRegenerateConfirm(false);
      toast.success('Password regenerated successfully.');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to regenerate password.';
      toast.error(errMsg);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyPassword = () => {
    if (!regeneratedCredentials?.temporaryPassword) return;
    navigator.clipboard.writeText(regeneratedCredentials.temporaryPassword);
    setCopiedPassword(true);
    toast.success('Temporary password copied to clipboard!');
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleDownloadCredentials = () => {
    if (!regeneratedCredentials) return;
    const content = `JCER ERP - FACULTY CREDENTIALS\n` +
      `----------------------------------------\n` +
      `Faculty Name: ${regeneratedCredentials.facultyName}\n` +
      `Login Email: ${regeneratedCredentials.loginEmail}\n` +
      `Temporary Password: ${regeneratedCredentials.temporaryPassword}\n` +
      `Generated Date: ${new Date().toLocaleString()}\n` +
      `Security Notice: Faculty must change this temporary password upon first login.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Credentials_${regeneratedCredentials.loginEmail.split('@')[0]}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Credentials downloaded successfully.');
  };

  return (
    <div className="space-y-6">

      {/* ── TOP FILTERS & QUICK ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search faculty by name, email, or designation..."
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
            <option value="INACTIVE">Inactive / Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            type="submit"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => navigate('/dean/faculty/create')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Create Faculty</span>
          </button>
          <button
            onClick={() => navigate('/dean/faculty/bulk-import')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => navigate('/dean/faculty/archived')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            <span>Archived Faculty</span>
          </button>
          <button
            onClick={() => navigate('/dean/faculty/assignments')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer"
          >
            <span>Assignments View</span>
          </button>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">College Teaching Faculty Directory</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Active faculty members, department designations, assigned curriculum subjects, and tenure start dates.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            Total Active Faculty: {faculty.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Faculty Name</th>
                <th className="py-3 px-6 font-semibold">Department</th>
                <th className="py-3 px-6 font-semibold">Official Email</th>
                <th className="py-3 px-6 font-semibold">Designation</th>
                <th className="py-3 px-6 font-semibold">Assigned Subjects</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold">Joining Date</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-28 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-20 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : faculty.length ? (
                faculty.map((fac) => (
                  <tr key={fac.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs overflow-hidden">
                          {fac.profileImage ? (
                            <img src={fac.profileImage} alt={fac.name} className="w-full h-full object-cover" />
                          ) : (
                            fac.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900 dark:text-white block">{fac.name}</span>
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
                    <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium max-w-[200px] truncate">
                      {fac.subjects}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          fac.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {fac.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-500">
                      {fac.joiningDate ? new Date(fac.joiningDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenViewModal(fac)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-neutral-700 hover:text-indigo-600 dark:text-neutral-300 dark:hover:text-indigo-400 font-bold text-[11px] transition-all cursor-pointer"
                          title="View Faculty Profile & Academic Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(fac)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-[11px] transition-all border border-rose-200/60 dark:border-rose-900/40 cursor-pointer"
                          title="Delete / Archive Faculty"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400 space-y-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-rose-500" />
                      <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">Unable to load faculty directory</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">{fetchError}</p>
                      <button
                        onClick={fetchFaculty}
                        className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-neutral-400">
                    No active faculty records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2-STEP CONFIRMATION MODAL BEFORE ARCHIVE / DELETE ── */}
      {facultyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">Delete Faculty?</h3>
                  <p className="text-xs text-neutral-500">Non-destructive soft-delete & archive protocol</p>
                </div>
              </div>
              <button
                onClick={handleCloseDeleteModal}
                disabled={isArchiving}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content info */}
            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
              <p>
                You are about to remove <strong className="text-neutral-900 dark:text-white font-bold">{facultyToDelete.name}</strong> ({facultyToDelete.email}) from the active Faculty Directory.
              </p>
              <p className="text-neutral-500 dark:text-neutral-400">
                This will deactivate the faculty login account and remove the faculty from active teaching allocation dropdowns.
              </p>

              {/* Data Safety Preservation Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Academic History is Preserved</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                  Existing academic records such as:
                </p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1 font-medium text-amber-900 dark:text-amber-200">
                  <li>Attendance sessions & student attendance records</li>
                  <li>Continuous Internal Evaluation (CIE) & marks</li>
                  <li>Curriculum assessments & components</li>
                  <li>Faculty assignments & teaching history</li>
                  <li>System audit logs</li>
                </ul>
                <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 pt-1">
                  The faculty will be safely archived and accessible anytime under <span className="underline font-bold">Archived Faculty</span>.
                </p>
              </div>

              {/* Step 2 Confirmation Input */}
              <div className="pt-2 space-y-2">
                <label className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  To confirm removal, type <span className="font-extrabold text-rose-600 dark:text-rose-400 tracking-wider">DELETE</span> in the box below:
                </label>
                <input
                  type="text"
                  value={deleteInputText}
                  onChange={(e) => setDeleteInputText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  disabled={isArchiving}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={handleCloseDeleteModal}
                disabled={isArchiving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                disabled={deleteInputText !== 'DELETE' || isArchiving}
                className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  deleteInputText === 'DELETE' && !isArchiving
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 cursor-pointer'
                    : 'bg-neutral-400 dark:bg-neutral-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isArchiving ? 'Archiving Faculty...' : 'Delete Faculty'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── FACULTY PROFILE MODAL ── */}
      {facultyToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-3xl max-h-[92vh] rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 font-extrabold flex items-center justify-center text-lg overflow-hidden border border-indigo-500/20 shrink-0">
                  {facultyToView.profileImage ? (
                    <img src={facultyToView.profileImage} alt={facultyToView.name} className="w-full h-full object-cover" />
                  ) : (
                    facultyToView.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                      {facultyToView.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {facultyProfile?.faculty.status || facultyToView.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    {facultyToView.designation} • {facultyToView.departmentCode} Department
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-neutral-400 font-medium">Loading faculty profile...</p>
              </div>
            ) : profileError ? (
              <div className="py-12 text-center space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{profileError}</p>
                <button
                  onClick={() => handleOpenViewModal(facultyToView)}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold"
                >
                  Try Again
                </button>
              </div>
            ) : facultyProfile ? (
              <div className="space-y-6">

                {/* 1. PERSONAL INFORMATION */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    PERSONAL INFORMATION
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">First Name</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{facultyProfile.faculty.firstName || facultyProfile.faculty.name.split(' ')[0]}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Last Name</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{facultyProfile.faculty.lastName || facultyProfile.faculty.name.split(' ').slice(1).join(' ') || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Official College Email</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{facultyProfile.faculty.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Phone Number</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{facultyProfile.faculty.phone || 'Phone not set'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. ACADEMIC INFORMATION */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    ACADEMIC INFORMATION
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Core Department (Permanent)</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {facultyProfile.faculty.coreDepartment.name} ({facultyProfile.faculty.coreDepartment.code})
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Academic Designation</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{facultyProfile.faculty.designation}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Joining Date</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {facultyProfile.faculty.joiningDate ? new Date(facultyProfile.faculty.joiningDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Faculty Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{facultyProfile.faculty.status}</span>
                    </div>
                  </div>
                </div>

                {/* 3. LOGIN INFORMATION & REGENERATE PASSWORD */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    LOGIN INFORMATION
                  </h4>
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold">Login Email</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{facultyProfile.account.email}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] uppercase font-bold">Account Status</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{facultyProfile.account.status}</span>
                      </div>
                    </div>

                    <div>
                      {facultyProfile.faculty.status === 'ARCHIVED' ? (
                        <span className="text-[11px] text-neutral-400 italic">
                          Password regeneration is unavailable while archived.
                        </span>
                      ) : (
                        <button
                          onClick={handleOpenRegenerateModal}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Regenerate Password</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. TEACHING INFORMATION (CURRENT ASSIGNMENTS) */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                    <span>TEACHING INFORMATION</span>
                    <span className="text-[10px] font-bold text-neutral-500 lowercase">({facultyProfile.teachingAssignments.length} assigned)</span>
                  </h4>
                  {facultyProfile.teachingAssignments.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-neutral-200/70 dark:border-neutral-700/70">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/70 dark:border-neutral-700/70 text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">AY</th>
                            <th className="py-2.5 px-3">Teaching Dept</th>
                            <th className="py-2.5 px-3">Semester</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3 text-center">Section</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {facultyProfile.teachingAssignments.map((a) => (
                            <tr key={a.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                              <td className="py-2.5 px-3 font-semibold text-neutral-700 dark:text-neutral-300">{a.academicYear}</td>
                              <td className="py-2.5 px-3 font-bold text-neutral-800 dark:text-neutral-200">{a.teachingDepartmentCode || a.teachingDepartment}</td>
                              <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">Semester {a.semester}</td>
                              <td className="py-2.5 px-3 font-medium text-neutral-900 dark:text-white">{a.subject} ({a.subjectCode})</td>
                              <td className="py-2.5 px-3 text-center font-bold">{a.section}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-neutral-700/60 text-center text-neutral-400 text-xs">
                      No current teaching assignments.
                    </div>
                  )}
                </div>

                {/* 5. ATTENDANCE HISTORY */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                    <span>ATTENDANCE HISTORY</span>
                    <span className="text-[10px] font-bold text-neutral-500 lowercase">({facultyProfile.attendanceHistory.length} sessions)</span>
                  </h4>
                  {facultyProfile.attendanceHistory.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 max-h-48">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/70 dark:border-neutral-700/70 text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3 text-center">Sec</th>
                            <th className="py-2.5 px-3 text-center">Period</th>
                            <th className="py-2.5 px-3 text-center text-emerald-600">Present</th>
                            <th className="py-2.5 px-3 text-center text-rose-600">Absent</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {facultyProfile.attendanceHistory.map((s) => (
                            <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                              <td className="py-2 px-3 text-neutral-700 dark:text-neutral-300 font-medium">{s.date}</td>
                              <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-white">{s.subject} ({s.subjectCode})</td>
                              <td className="py-2 px-3 text-center font-bold">{s.section}</td>
                              <td className="py-2 px-3 text-center font-mono">P-{s.period}</td>
                              <td className="py-2 px-3 text-center font-bold text-emerald-600">{s.present}</td>
                              <td className="py-2 px-3 text-center font-bold text-rose-600">{s.absent}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-neutral-700/60 text-center text-neutral-400 text-xs">
                      No attendance records found.
                    </div>
                  )}
                </div>

                {/* 6. MARKS / ASSESSMENT HISTORY */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                    <span>MARKS / ASSESSMENT HISTORY</span>
                    <span className="text-[10px] font-bold text-neutral-500 lowercase">({facultyProfile.marksHistory.length} records)</span>
                  </h4>
                  {facultyProfile.marksHistory.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 max-h-48">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200/70 dark:border-neutral-700/70 text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3 text-center">Sec</th>
                            <th className="py-2.5 px-3">Assessment</th>
                            <th className="py-2.5 px-3 text-center">Max Marks</th>
                            <th className="py-2.5 px-3 text-center">Academic Year</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {facultyProfile.marksHistory.map((m) => (
                            <tr key={m.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                              <td className="py-2 px-3 font-semibold text-neutral-900 dark:text-white">{m.subject} ({m.subjectCode})</td>
                              <td className="py-2 px-3 text-center font-bold">{m.section}</td>
                              <td className="py-2 px-3 text-neutral-700 dark:text-neutral-300">{m.assessment}</td>
                              <td className="py-2 px-3 text-center font-bold text-indigo-600">{m.maxMarks}</td>
                              <td className="py-2 px-3 text-center text-neutral-500">{m.academicYear}</td>
                              <td className="py-2 px-3 text-center font-bold text-[10px] text-neutral-500">{m.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-neutral-700/60 text-center text-neutral-400 text-xs">
                      No marks or assessment records found.
                    </div>
                  )}
                </div>

              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={handleCloseViewModal}
                className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── REGENERATE PASSWORD CONFIRMATION MODAL ── */}
      {showRegenerateConfirm && facultyToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-5">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">Regenerate Password?</h3>
                  <p className="text-xs text-neutral-500">Security credential refresh protocol</p>
                </div>
              </div>
              <button
                onClick={handleCloseRegenerateModal}
                disabled={isRegenerating}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
              <p>
                This will invalidate the faculty's current password and generate a new temporary password.
              </p>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-1">
                <p><strong>Faculty:</strong> {facultyToView.name}</p>
                <p><strong>Login Email:</strong> {facultyToView.email}</p>
              </div>

              <div className="pt-2 space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  Type <span className="font-extrabold text-amber-600 tracking-wider">REGENERATE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={regenerateInputText}
                  onChange={(e) => setRegenerateInputText(e.target.value)}
                  placeholder="Type REGENERATE to confirm"
                  disabled={isRegenerating}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={handleCloseRegenerateModal}
                disabled={isRegenerating}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={regenerateInputText !== 'REGENERATE' || isRegenerating}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                  regenerateInputText === 'REGENERATE' && !isRegenerating
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 cursor-pointer'
                    : 'bg-neutral-400 dark:bg-neutral-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Password'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── REGENERATE PASSWORD RESULT MODAL ── */}
      {regeneratedCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 border border-emerald-500/30 dark:border-emerald-500/30 shadow-2xl p-6 space-y-5">
            
            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">Password Regenerated</h3>
                <p className="text-xs text-neutral-500">New temporary credentials generated</p>
              </div>
            </div>

            {/* Credentials Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Faculty Name</span>
                <span className="font-extrabold text-neutral-900 dark:text-white text-sm">{regeneratedCredentials.facultyName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Login Email</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{regeneratedCredentials.loginEmail}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">New Temporary Password</span>
                <div className="mt-1 flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-500/40">
                  <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {regeneratedCredentials.temporaryPassword}
                  </span>
                  <button
                    onClick={handleCopyPassword}
                    className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-neutral-700 hover:text-emerald-600 transition-colors"
                    title="Copy Password"
                  >
                    {copiedPassword ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Please share these temporary credentials securely with the faculty member. They will be forced to change this password on first login.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleDownloadCredentials}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Credentials</span>
              </button>
              <button
                onClick={() => setRegeneratedCredentials(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FacultyListPage;
