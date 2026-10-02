import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Layers,
  RefreshCw,
  BookOpen,
  UserMinus,
  ShieldAlert,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import hodService, { HodFacultyItem } from '../../services/hod.service';

export const HodFacultyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<HodFacultyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // HOD Context & Modal States
  const [hodDeptCode, setHodDeptCode] = useState<string>('DEPT');
  const [removeModalFaculty, setRemoveModalFaculty] = useState<HodFacultyItem | null>(null);
  const [deactivateModalFaculty, setDeactivateModalFaculty] = useState<HodFacultyItem | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchFaculty();
  }, []);

  // Auto-dismiss notification toast
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchFaculty = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await hodService.getFacultyList();
      setFaculty(data);
      if ((data as any).hodDepartment?.code) {
        setHodDeptCode((data as any).hodDepartment.code);
      }
    } catch (err: any) {
      console.error('Failed to load faculty:', err);
      setError('Unable to load department faculty list.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemoveFromDept = async () => {
    if (!removeModalFaculty) return;
    setActionSubmitting(true);
    try {
      const res = await hodService.removeFacultyFromTeachingDepartment(removeModalFaculty.id);
      setNotification({
        type: 'success',
        message: res.message || `Faculty removed from ${hodDeptCode} teaching assignments successfully.`,
      });
      setRemoveModalFaculty(null);
      fetchFaculty();
    } catch (err: any) {
      console.error('Remove from department error:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || `Failed to remove faculty from ${hodDeptCode}.`,
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleConfirmDeactivateFaculty = async () => {
    if (!deactivateModalFaculty) return;
    setActionSubmitting(true);
    try {
      const res = await hodService.deactivateFaculty(deactivateModalFaculty.id);
      setNotification({
        type: 'success',
        message: res.message || 'Faculty account deactivated successfully.',
      });
      setDeactivateModalFaculty(null);
      fetchFaculty();
    } catch (err: any) {
      console.error('Deactivate faculty error:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to deactivate faculty account.',
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  const filteredFaculty = faculty.filter((f) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      f.name.toLowerCase().includes(term) ||
      f.email.toLowerCase().includes(term) ||
      (f.designation && f.designation.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') {
      return f.accountStatus === 'ACTIVE';
    } else if (statusFilter === 'PENDING') {
      return f.accountStatus === 'PENDING_AUTHORIZATION' || f.authorizationStatus === 'PENDING';
    } else if (statusFilter === 'REJECTED') {
      return f.authorizationStatus === 'REJECTED';
    }
    return true;
  });

  const getApprovalBadge = (member: HodFacultyItem) => {
    const isApproved = member.authorizationStatus === 'APPROVED' && member.accountStatus === 'ACTIVE';
    const isRejected = member.authorizationStatus === 'REJECTED';
    const dean = member.deanApproval;
    const principal = member.principalApproval;

    if (isApproved) {
      const approver = principal?.decidedByName || dean?.decidedByName;
      return (
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            FULLY APPROVED
          </span>
          {approver && (
            <div className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
              Approved by {approver}
            </div>
          )}
        </div>
      );
    }

    if (isRejected) {
      const rejecter = member.rejectedByName || dean?.decidedByName || principal?.decidedByName;
      return (
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" />
            REJECTED
          </span>
          {rejecter && (
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
              By {rejecter}
            </div>
          )}
        </div>
      );
    }

    if (dean?.status === 'APPROVED' && principal?.status === 'PENDING') {
      return (
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
            <Clock className="w-3 h-3 text-purple-600" />
            PENDING PRINCIPAL
          </span>
          {dean.decidedByName && (
            <div className="text-[10px] text-neutral-500 font-medium mt-0.5">
              Dean ({dean.decidedByName}) ✓
            </div>
          )}
        </div>
      );
    }

    if (dean?.status === 'PENDING') {
      return (
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            PENDING DEAN
          </span>
          <div className="text-[10px] text-neutral-400 font-medium mt-0.5">
            Stage 1 of 2
          </div>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
        <Clock className="w-3 h-3 text-amber-600" />
        {member.approvalSummary || 'Awaiting Approval'}
      </span>
    );
  };

  const getAccountStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      );
    }
    if (status === 'PENDING_AUTHORIZATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pending Authorization
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
        Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Notification Banner Toast ───────────────────────────────────────── */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#070e22] text-white rounded-2xl px-5 py-3 shadow-sm border border-[#1e3a8a]/30">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
              Teaching Faculty
            </span>
            <div className="text-2xl font-black mt-0.5">
              {faculty.length} <span className="text-xs font-semibold text-neutral-400">members</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
              Faculty Management
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Manage teaching staff profiles, track authorization, and manage department teaching assignments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchFaculty()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/hod/faculty/assignments"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#0c1a40] dark:text-blue-400" />
            <span>Faculty Assignments</span>
          </Link>

          <Link
            to="/hod/faculty/create"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] hover:from-[#0a1533] hover:to-[#142c6b] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-[#1e3a8a]/40"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Faculty</span>
          </Link>
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search faculty by name, email, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0c1a40]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 text-[11px] font-bold">
            {(['ALL', 'ACTIVE', 'PENDING', 'REJECTED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === filter
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-black'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {filter === 'ALL' ? 'All Faculty' : filter === 'ACTIVE' ? 'Active' : filter === 'PENDING' ? 'Pending' : 'Rejected'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Faculty Table ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">Faculty</th>
                <th className="py-3.5 px-4">Core Department</th>
                <th className="py-3.5 px-4 text-center">Teaching Subjects</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Approval</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0c1a40] border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading department faculty...</p>
                  </td>
                </tr>
              ) : filteredFaculty.length > 0 ? (
                filteredFaculty.map((member) => {
                  const isApproved = member.authorizationStatus === 'APPROVED' && member.accountStatus === 'ACTIVE';
                  const subjectsCount = member.assignedSubjectsCount ?? member.hodAssignments?.length ?? member.assignments?.length ?? 0;
                  const hasHodAssignments = (member.hodAssignments?.length || member.assignedSubjectsCount || 0) > 0;
                  const isCoreDeptHod = member.isCoreDepartment ?? false;

                  return (
                    <tr key={member.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      {/* Faculty Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-[#0c1a40] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <span>{member.name}</span>
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Core Department */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-900 dark:text-white block">
                          {member.coreDepartmentName || member.departmentName || 'Academic Department'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          ({member.coreDepartmentCode || member.departmentCode || 'DEPT'})
                        </span>
                      </td>

                      {/* Subjects Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-black ${
                          subjectsCount > 0
                            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60'
                            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>
                          {subjectsCount} in {hodDeptCode}
                        </span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {getAccountStatusBadge(member.accountStatus)}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        {getApprovalBadge(member)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                          <Link
                            to={`/hod/faculty/${member.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-900 hover:text-white dark:bg-neutral-800 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 text-neutral-800 dark:text-neutral-200 font-bold text-[11px] transition-all"
                            title="View Faculty Profile & Authorization"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </Link>

                          {isApproved && (
                            <Link
                              to={`/hod/faculty/assignments?facultyId=${member.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-[#0c1a40] hover:text-white dark:bg-blue-950/60 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200/60 dark:border-blue-800/60 transition-all"
                              title="Assign Subjects to Faculty"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Assign</span>
                            </Link>
                          )}

                          {/* Remove from Teaching Department (Shown if faculty has active assignments in this HOD's dept) */}
                          {hasHodAssignments && (
                            <button
                              type="button"
                              onClick={() => setRemoveModalFaculty(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white dark:bg-amber-950/60 dark:hover:bg-amber-600 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200/60 dark:border-amber-800/60 transition-all cursor-pointer"
                              title={`Remove ${member.name} from ${hodDeptCode} teaching assignments`}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Remove from {hodDeptCode}</span>
                            </button>
                          )}

                          {/* Deactivate Faculty Identity (Shown ONLY to Core Department HOD when account is Active) */}
                          {isCoreDeptHod && member.accountStatus === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => setDeactivateModalFaculty(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/60 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200/60 dark:border-rose-800/60 transition-all cursor-pointer"
                              title="Deactivate Faculty Account across system"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Deactivate Faculty</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Faculty Found</p>
                    <p className="text-xs text-neutral-400 mt-1">Click "Create Faculty" to create a faculty account and submit for authorization.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: REMOVE FACULTY FROM TEACHING DEPARTMENT CONFIRMATION ─────── */}
      {removeModalFaculty &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Remove Faculty from {hodDeptCode}?
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      Remove teaching assignments for {hodDeptCode} department.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveModalFaculty(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
                  <div className="font-black text-neutral-900 dark:text-white text-sm">{removeModalFaculty.name}</div>
                  <div className="text-neutral-500 font-medium">
                    Core Department: <strong className="text-neutral-800 dark:text-neutral-200">{removeModalFaculty.coreDepartmentName || removeModalFaculty.departmentName || 'Academic Department'} ({removeModalFaculty.coreDepartmentCode || removeModalFaculty.departmentCode || 'DEPT'})</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                    Current {hodDeptCode} Teaching Assignments to be Removed:
                  </label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(removeModalFaculty.hodAssignments || removeModalFaculty.assignments || []).map((asg: any) => (
                      <div
                        key={asg.id}
                        className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between"
                      >
                        <span>• {asg.subjectName || asg.subjectCode} ({asg.subjectCode})</span>
                        <span className="text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                          Semester {asg.semester} — Section {asg.section}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This action will remove <strong>only the {hodDeptCode} teaching assignments</strong>. The faculty member will remain active in other departments and their faculty account will not be deleted.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRemoveModalFaculty(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={handleConfirmRemoveFromDept}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                >
                  {actionSubmitting ? 'Removing...' : `Remove from ${hodDeptCode}`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── MODAL 2: DEACTIVATE FACULTY IDENTITY CONFIRMATION ─────────────────── */}
      {deactivateModalFaculty &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      Deactivate Faculty Account?
                    </h3>
                    <p className="text-xs text-neutral-500 font-medium">
                      Global faculty-level deactivation across the ERP system.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeactivateModalFaculty(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
                  <div className="font-black text-neutral-900 dark:text-white text-sm">{deactivateModalFaculty.name}</div>
                  <div className="text-neutral-500 font-medium">
                    Core Department: <strong className="text-neutral-800 dark:text-neutral-200">{deactivateModalFaculty.coreDepartmentName || deactivateModalFaculty.departmentName || 'Academic Department'} ({deactivateModalFaculty.coreDepartmentCode || deactivateModalFaculty.departmentCode || 'DEPT'})</strong>
                  </div>
                </div>

                {(deactivateModalFaculty.allActiveAssignments || []).length > 0 && (
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                      Active Teaching Assignments Across Departments:
                    </label>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {(deactivateModalFaculty.allActiveAssignments || []).map((asg: any) => (
                        <div
                          key={asg.id}
                          className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center justify-between"
                        >
                          <span>[{asg.departmentCode || 'DEPT'}] {asg.subjectName || asg.subjectCode}</span>
                          <span className="text-[11px] font-bold bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                            Sem {asg.semester} — Sec {asg.section}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This is a faculty-level action and will <strong>deactivate the faculty account across the system</strong>. The faculty's historical academic records (attendance, marks, assessments) will be preserved.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDeactivateModalFaculty(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={handleConfirmDeactivateFaculty}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50"
                >
                  {actionSubmitting ? 'Deactivating...' : 'Deactivate Faculty'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HodFacultyListPage;
