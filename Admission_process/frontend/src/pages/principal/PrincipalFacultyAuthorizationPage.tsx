import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  Filter,
  Users,
  Clock,
  UserCheck,
  X,
  FileCheck2,
  BookOpen,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import principalService, {
  FacultyAuthRequest,
  DepartmentRecord,
  AcademicYearRecord,
  FacultyAuthDetailResponse,
} from '../../services/principal.service';
import Skeleton from '../../components/common/Skeleton';
import { toast } from 'react-toastify';

export const PrincipalFacultyAuthorizationPage: React.FC = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState<FacultyAuthRequest[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedAuthority, setSelectedAuthority] = useState<string>('PRINCIPAL');
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');

  // Modal States
  const [approveModal, setApproveModal] = useState<FacultyAuthRequest | FacultyAuthDetailResponse | null>(null);
  const [rejectModal, setRejectModal] = useState<FacultyAuthRequest | FacultyAuthDetailResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionProcessing, setActionProcessing] = useState<boolean>(false);

  // Quick View Details Modal
  const [viewDetailModal, setViewDetailModal] = useState<FacultyAuthDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const fetchDependencies = async () => {
    try {
      const [depts, yrs] = await Promise.all([
        principalService.getDepartments().catch(() => []),
        principalService.getAcademicYears().catch(() => []),
      ]);
      setDepartments(depts || []);
      setAcademicYears(yrs || []);
      const activeYr = yrs?.find((y) => y.isCurrent)?.year || '2026-27';
      setSelectedYear(activeYr);
    } catch (err) {
      console.warn('Could not load filter dependencies for Principal authorization:', err);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await principalService.getFacultyAuthorizations({
        search: search.trim() || undefined,
        departmentId: selectedDept,
        status: selectedStatus,
        authority: selectedAuthority,
        academicYear: selectedYear,
      });
      setRequests(Array.isArray(data) ? data : []);
      window.dispatchEvent(new CustomEvent('faculty-auth-changed'));
    } catch (err) {
      console.warn('Could not load faculty authorization requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [selectedDept, selectedStatus, selectedAuthority, selectedYear]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleOpenDetailModal = async (id: string) => {
    try {
      setLoadingDetail(true);
      const detail = await principalService.getFacultyAuthorizationById(id);
      setViewDetailModal(detail);
    } catch (err) {
      toast.error('Unable to fetch faculty request details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!approveModal) return;
    try {
      setActionProcessing(true);
      const res = await principalService.approveFacultyAuthorization(approveModal.id);
      toast.success(res?.message || 'Faculty approved successfully. Faculty account is now active.');
      setApproveModal(null);
      if (viewDetailModal?.id === approveModal.id) {
        setViewDetailModal(null);
      }
      window.dispatchEvent(new CustomEvent('faculty-auth-changed'));
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to approve faculty request');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      toast.error('Please provide a reason for rejecting the authorization request.');
      return;
    }

    try {
      setActionProcessing(true);
      const res = await principalService.rejectFacultyAuthorization(rejectModal.id, rejectionReason.trim());
      toast.success(res?.message || 'Faculty authorization request rejected.');
      setRejectModal(null);
      setRejectionReason('');
      if (viewDetailModal?.id === rejectModal.id) {
        setViewDetailModal(null);
      }
      window.dispatchEvent(new CustomEvent('faculty-auth-changed'));
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reject faculty request');
    } finally {
      setActionProcessing(false);
    }
  };

  // KPI counts
  const totalCount = requests.length;
  const pendingPrincipalCount = requests.filter((r) => r.status === 'PENDING' && r.authority === 'PRINCIPAL').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">

      {/* ── HEADER BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                Faculty Authorization Queue
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Review and ratify HOD faculty onboarding requests, credentials, and institutional teaching assignments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchRequests()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Total in Scope</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
            {loading ? <Skeleton className="h-7 w-12" /> : totalCount}
          </div>
          <span className="text-[10px] text-neutral-400 font-medium mt-0.5 block">Filtered requests</span>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300">
              Pending Principal Sign-off
            </span>
            <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-950 dark:text-orange-200 mt-1">
            {loading ? <Skeleton className="h-7 w-12" /> : pendingPrincipalCount}
          </div>
          <span className="text-[10px] text-orange-600/80 dark:text-orange-400/80 font-medium mt-0.5 block">
            Awaiting direct ratification
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
            {loading ? <Skeleton className="h-7 w-12" /> : approvedCount}
          </div>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-0.5 block">
            Active faculty accounts
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-950 dark:text-rose-200 mt-1">
            {loading ? <Skeleton className="h-7 w-12" /> : rejectedCount}
          </div>
          <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-0.5 block">
            Returned to HOD
          </span>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search faculty by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Authority Filter */}
          <select
            value={selectedAuthority}
            onChange={(e) => setSelectedAuthority(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="ALL">All Authorities</option>
            <option value="PRINCIPAL">Principal Queue (Direct)</option>
            <option value="DEAN">Dean Academics Queue</option>
          </select>

          {/* Academic Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {academicYears.length > 0 ? (
              academicYears.map((y) => (
                <option key={y.id} value={y.year}>
                  AY: {y.year}
                </option>
              ))
            ) : (
              <option value="2026-27">AY: 2026-27</option>
            )}
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white transition-all shadow-xs flex items-center space-x-1"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </form>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span>Authorization Requests</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Institutional queue of teaching faculty submissions requiring executive authorization.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {requests.length} {requests.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-neutral-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-semibold">Faculty Candidate</th>
                <th className="py-3 px-6 font-semibold">Department</th>
                <th className="py-3 px-6 font-semibold">Assigned Subject</th>
                <th className="py-3 px-6 font-semibold text-center">Semester</th>
                <th className="py-3 px-6 font-semibold">Authority</th>
                <th className="py-3 px-6 font-semibold">Submitted By</th>
                <th className="py-3 px-6 font-semibold">Submitted On</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="w-36 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-16 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-32 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-14 h-4 mx-auto" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-24 h-4" /></td>
                    <td className="py-4 px-6"><Skeleton className="w-20 h-4" /></td>
                    <td className="py-4 px-6 text-center"><Skeleton className="w-16 h-4 mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="w-28 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : requests.length > 0 ? (
                requests.map((reqItem) => {
                  const isPrincipalActionable = reqItem.status === 'PENDING' && reqItem.authority === 'PRINCIPAL';
                  const isAwaitingDean = reqItem.status === 'PENDING' && reqItem.authority === 'DEAN';

                  return (
                    <tr
                      key={reqItem.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      {/* Candidate Name & Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 font-bold flex items-center justify-center text-xs overflow-hidden border border-orange-200/50 dark:border-orange-800/40">
                            {reqItem.profileImage ? (
                              <img
                                src={reqItem.profileImage}
                                alt={reqItem.facultyName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              reqItem.facultyName.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-neutral-900 dark:text-white block">
                              {reqItem.facultyName}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              {reqItem.email}
                            </span>
                            {reqItem.designation && (
                              <span className="text-[9px] text-neutral-500 font-medium block">
                                {reqItem.designation}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-6 font-bold text-neutral-800 dark:text-neutral-200">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 text-[11px]">
                          {reqItem.departmentCode || 'DEP'}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-neutral-900 dark:text-white block">
                          {reqItem.subjectName}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-semibold">
                          {reqItem.subjectCode}
                        </span>
                      </td>

                      {/* Semester */}
                      <td className="py-4 px-6 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                        <span>Sem {reqItem.semester}</span>
                      </td>

                      {/* Authority */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            reqItem.authority === 'PRINCIPAL'
                              ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-800/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30'
                          }`}
                        >
                          {reqItem.authority === 'PRINCIPAL' ? 'Principal Office' : 'Dean Academics'}
                        </span>
                      </td>

                      {/* Submitted By */}
                      <td className="py-4 px-6 text-neutral-600 dark:text-neutral-400 font-medium">
                        {reqItem.createdBy}
                      </td>

                      {/* Submitted On */}
                      <td className="py-4 px-6 text-neutral-500 font-medium text-[11px]">
                        {new Date(reqItem.createdDate).toLocaleDateString()}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              reqItem.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                                : reqItem.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {reqItem.status}
                          </span>
                          {reqItem.decidedBy && (
                            <span className="text-[9px] text-neutral-400 font-normal mt-0.5">
                              by {reqItem.decidedBy}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(reqItem.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-[11px] transition-all flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {isPrincipalActionable && (
                            <>
                              <button
                                onClick={() => setApproveModal(reqItem)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-all flex items-center space-x-1 border border-emerald-500/20"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModal(reqItem);
                                  setRejectionReason('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-[11px] transition-all flex items-center space-x-1 border border-rose-500/20"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {isAwaitingDean && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-2 py-1 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                              Awaiting Dean
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400 space-y-2">
                    <ShieldCheck className="w-8 h-8 mx-auto opacity-30 text-neutral-400" />
                    <p className="text-sm font-semibold">No data found</p>
                    <p className="text-xs text-neutral-400">
                      No faculty authorization requests match your current filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAILS MODAL ── */}
      {viewDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                    Faculty Candidate Details
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Comprehensive credentials & teaching assignment breakdown
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewDetailModal(null)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold flex items-center justify-center text-base overflow-hidden border border-orange-300/40">
                    {viewDetailModal.faculty?.profileImage ? (
                      <img
                        src={viewDetailModal.faculty.profileImage}
                        alt={viewDetailModal.facultyName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      viewDetailModal.facultyName?.charAt(0) || 'F'
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-neutral-900 dark:text-white text-sm">
                      {viewDetailModal.facultyName}
                    </h4>
                    <span className="text-xs text-neutral-400 font-medium">{viewDetailModal.email}</span>
                    {viewDetailModal.phone && (
                      <span className="text-xs text-neutral-400 font-medium block">
                        Phone: {viewDetailModal.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      viewDetailModal.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : viewDetailModal.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {viewDetailModal.status}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-semibold block">
                    Authority: {viewDetailModal.authority}
                  </span>
                </div>
              </div>

              {/* Department & Academic Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Department</span>
                  <span className="text-xs font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
                    {viewDetailModal.department?.name || viewDetailModal.departmentName} ({viewDetailModal.departmentCode || viewDetailModal.department?.code})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Designation</span>
                  <span className="text-xs font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
                    {viewDetailModal.designation || 'Assistant Professor'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Academic Year</span>
                  <span className="text-xs font-extrabold text-neutral-900 dark:text-white mt-0.5 block">
                    {viewDetailModal.academicYear}
                  </span>
                </div>
              </div>

              {/* Submitting HOD & Timeline */}
              <div className="p-3.5 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/30 border border-neutral-100 dark:border-neutral-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-medium">Submitted by:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {viewDetailModal.createdByHOD
                      ? `${viewDetailModal.createdByHOD.firstName} ${viewDetailModal.createdByHOD.lastName}`
                      : viewDetailModal.createdBy || 'HOD'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-medium">Submission Date:</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {new Date(viewDetailModal.createdDate).toLocaleString()}
                  </span>
                </div>
                {viewDetailModal.decidedBy && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-medium">Decided by:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {typeof viewDetailModal.decidedBy === 'string'
                        ? viewDetailModal.decidedBy
                        : `${viewDetailModal.decidedBy?.firstName || ''} ${viewDetailModal.decidedBy?.lastName || ''}`}
                    </span>
                  </div>
                )}
                {viewDetailModal.decidedAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-medium">Decision Date:</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {new Date(viewDetailModal.decidedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {viewDetailModal.rejectionReason && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300">
                    <span className="font-bold block">Rejection Reason:</span>
                    <span>{viewDetailModal.rejectionReason}</span>
                  </div>
                )}
              </div>

              {/* Teaching Assignments Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                  Assigned Curriculum Offerings ({viewDetailModal.assignments?.length || 1})
                </h5>
                <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                        <th className="py-2.5 px-4 font-semibold">Subject</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Semester</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Type</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {viewDetailModal.assignments && viewDetailModal.assignments.length > 0 ? (
                        viewDetailModal.assignments.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td className="py-3 px-4">
                              <span className="font-bold text-neutral-900 dark:text-white block">
                                {item.subjectName}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-semibold">{item.subjectCode}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                              Sem {item.semester}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold">
                                {item.subjectType || 'Theory'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    item.attendanceAccess
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                      : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                                  }`}
                                >
                                  Att
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    item.marksAccess
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                      : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                                  }`}
                                >
                                  Marks
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    item.googleSheetsAccess
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                                      : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                                  }`}
                                >
                                  Sheets
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                            {viewDetailModal.subjectName} ({viewDetailModal.subjectCode})
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            Sem {viewDetailModal.semester}
                          </td>
                          <td className="py-3 px-4 text-center">Theory</td>
                          <td className="py-3 px-4 text-center text-neutral-400">Full Standard Access</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/30">
              <button
                onClick={() => setViewDetailModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                Close
              </button>

              {viewDetailModal.status === 'PENDING' && viewDetailModal.authority === 'PRINCIPAL' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setRejectModal(viewDetailModal);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 transition-all flex items-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => setApproveModal(viewDetailModal)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Activate</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVE CONFIRMATION MODAL ── */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                Ratify & Activate Faculty
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You are approving the appointment and curriculum authorization for:
              </p>
              <p className="text-sm font-black text-orange-600 dark:text-orange-400 pt-1">
                {approveModal.facultyName} ({approveModal.departmentCode})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs space-y-1.5 text-neutral-600 dark:text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-400 font-medium">Designation:</span>
                <span className="font-bold">{approveModal.designation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-medium">Assigned Subject:</span>
                <span className="font-bold">{approveModal.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400 font-medium">Academic Year:</span>
                <span className="font-bold">{approveModal.academicYear}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
              Upon approval, the candidate's account will immediately transition to <strong>ACTIVE</strong> status and teaching assignments will be enabled.
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                {actionProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT CONFIRMATION MODAL ── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                Reject Faculty Request
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You are rejecting the registration for <strong>{rejectModal.facultyName}</strong>. Please provide a formal reason for the HOD.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Specify the reason (e.g. Credential mismatch, workload surplus, incorrect designation)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectionReason('');
                }}
                disabled={actionProcessing}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionProcessing || !rejectionReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                {actionProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
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

export default PrincipalFacultyAuthorizationPage;
