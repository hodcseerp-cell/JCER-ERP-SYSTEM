import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Settings2,
  Key,
  ShieldCheck,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  BookOpen,
  Plus,
  Trash2,
  Mail,
  Phone,
  Building2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import hodService, { HodSubjectItem } from '../../services/hod.service';

export const HodFacultyManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<HodSubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Temporary Password Generation
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Status Toggle
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Quick Assign Subject Modal in Detail Page
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newSemester, setNewSemester] = useState<string>('1');
  const [newCycle, setNewCycle] = useState<'P_CYCLE' | 'C_CYCLE' | ''>('P_CYCLE');
  const [newSubjectId, setNewSubjectId] = useState<string>('');
  const [newAcademicYear, setNewAcademicYear] = useState<string>('2026-27');
  const [attendanceAccess, setAttendanceAccess] = useState<boolean>(true);
  const [marksAccess, setMarksAccess] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadFacultyDetails();
      hodService.getSubjects().then((res) => setSubjects(res || [])).catch(() => {});
    }
  }, [id]);

  const loadFacultyDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await hodService.getFacultyDetail(id);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load faculty details:', err);
      setError('Faculty member not found in your department.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccess = async (assignmentId: string, currentAtt: boolean, currentMarks: boolean, field: 'attn' | 'marks') => {
    try {
      await hodService.toggleFacultyAccess(assignmentId, {
        attendanceAccess: field === 'attn' ? !currentAtt : currentAtt,
        marksAccess: field === 'marks' ? !currentMarks : currentMarks,
      });
      toast.success('Access permissions updated.');
      loadFacultyDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update access toggle.');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to remove this subject allocation?')) return;
    try {
      await hodService.deleteFacultyAssignment(assignmentId, id);
      toast.success('Assignment removed.');
      loadFacultyDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete assignment.');
    }
  };

  const handleQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newSubjectId) {
      setAssignError('Please select a master subject.');
      return;
    }

    setAssigning(true);
    setAssignError(null);
    try {
      await hodService.assignFacultySubject(id, {
        subjectId: newSubjectId,
        semester: Number(newSemester),
        cycle: newCycle || undefined,
        academicYear: newAcademicYear,
        attendanceAccess,
        marksAccess,
      });

      toast.success('Subject assigned successfully.');
      setShowAssignModal(false);
      setNewSubjectId('');
      loadFacultyDetails();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to assign subject.';
      setAssignError(msg);
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  const handleResetPassword = async () => {
    if (!id) return;
    setResettingPassword(true);
    try {
      const res = await hodService.resetFacultyPassword(id);
      setGeneratedPassword(res.temporaryPassword);
      toast.success('Temporary password generated successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleAccountStatus = async (currentStatus: string) => {
    if (!id) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    setTogglingStatus(true);
    try {
      await hodService.toggleFacultyStatus(id, newStatus);
      toast.success(`Faculty account status updated to ${newStatus}.`);
      loadFacultyDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update faculty account status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-neutral-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0c1a40] border-t-transparent" />
        <p className="mt-3 text-xs font-bold">Loading faculty details & authorization timeline...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-800 dark:text-rose-300">{error || 'Faculty member not found.'}</p>
        <Link to="/hod/faculty" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Faculty List
        </Link>
      </div>
    );
  }

  const { teacher, assignments, authorizationHistory, timeline } = data;
  const isAccountActive = teacher.accountStatus === 'ACTIVE';

  const deanReq = authorizationHistory?.find((r: any) => r.sequence === 1 || r.authority === 'DEAN') || timeline?.dean;
  const principalReq = authorizationHistory?.find((r: any) => r.sequence === 2 || r.authority === 'PRINCIPAL') || timeline?.principal;

  const isFullyApproved = teacher.accountStatus === 'ACTIVE' && (deanReq?.status === 'APPROVED') && (principalReq?.status === 'APPROVED');
  const isRejected = deanReq?.status === 'REJECTED' || principalReq?.status === 'REJECTED';

  const isAppliedScience =
    teacher.department?.toLowerCase().includes('applied') ||
    teacher.department?.toLowerCase().includes('science') ||
    teacher.cycle !== undefined;

  // Filter master subjects for quick assign modal
  const filteredModalSubjects = subjects.filter((s) => {
    if (s.status && s.status !== 'ACTIVE') return false;
    if (newSemester && String(s.semester) !== String(newSemester)) return false;
    if (isAppliedScience && newCycle && s.cycle && s.cycle !== newCycle) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* ── Breadcrumb & Back ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/hod/faculty"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-[#0c1a40] dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Faculty List</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFacultyDetails()}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Details</span>
          </button>
        </div>
      </div>

      {/* ── 1. FACULTY HERO & PROFILE CARD (Section 13) ───────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white flex items-center justify-center font-black text-2xl shadow-md ring-4 ring-neutral-100 dark:ring-neutral-800">
              {teacher.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  {teacher.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isAccountActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {teacher.accountStatus === 'ACTIVE' ? 'Active Account' : 'Pending Authorization'}
                </span>
                {teacher.cycle && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    teacher.cycle === 'P_CYCLE' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                  }`}>
                    {teacher.cycle === 'P_CYCLE' ? 'P Cycle' : 'C Cycle'}
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">{teacher.designation}</span>
                <span>•</span>
                <span className="font-mono">{teacher.email}</span>
                <span>•</span>
                <span>{teacher.phone || 'No phone provided'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleToggleAccountStatus(teacher.accountStatus)}
              disabled={togglingStatus}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                isAccountActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isAccountActive ? 'Deactivate Faculty' : 'Activate Faculty'}
            </button>

            <button
              onClick={handleResetPassword}
              disabled={resettingPassword}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{resettingPassword ? 'Generating...' : 'Reset Password'}</span>
            </button>
          </div>
        </div>

        {/* Temporary Password Box */}
        {generatedPassword && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">New Temporary Password:</span>
              <span className="text-sm font-mono font-black text-emerald-950 dark:text-emerald-100">{generatedPassword}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-2 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shadow-xs hover:bg-neutral-50"
              title="Copy password"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Profile Details Grid */}
        <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
            <span className="text-neutral-400 font-medium block text-[10px] uppercase tracking-wider">Department</span>
            <span className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5 block">
              {teacher.department || 'Applied Science & Humanities'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
            <span className="text-neutral-400 font-medium block text-[10px] uppercase tracking-wider">Designation</span>
            <span className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5 block">
              {teacher.designation || 'Assistant Professor'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
            <span className="text-neutral-400 font-medium block text-[10px] uppercase tracking-wider">Joining Date</span>
            <span className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5 block">
              {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
            <span className="text-neutral-400 font-medium block text-[10px] uppercase tracking-wider">Account Status</span>
            <span className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5 block">
              {teacher.accountStatus}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. VERTICAL TWO-STAGE APPROVAL TIMELINE (Section 3, 5, 13) ───────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
              Authorization Workflow
            </span>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
              Faculty Authorization Timeline
            </h3>
          </div>

          <div>
            {isFullyApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ✓ FACULTY FULLY AUTHORIZED
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                AUTHORIZATION REJECTED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                AWAITING AUTHORIZATION
              </span>
            )}
          </div>
        </div>

        {/* Vertical Timeline Nodes */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
          
          {/* Step 1: Dean Academics */}
          <div className="relative">
            <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-neutral-900 ${
              deanReq?.status === 'APPROVED'
                ? 'bg-emerald-500 text-white'
                : deanReq?.status === 'REJECTED'
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              {deanReq?.status === 'APPROVED' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : deanReq?.status === 'REJECTED' ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                    ● Stage 1: Dean Academics
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    deanReq?.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : deanReq?.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {deanReq?.status === 'APPROVED' ? '✓ APPROVED' : deanReq?.status === 'REJECTED' ? '✗ REJECTED' : '⏳ PENDING'}
                  </span>
                </div>

                {deanReq?.decidedAt && (
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {new Date(deanReq.decidedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {deanReq?.status === 'APPROVED' ? (
                <div className="text-xs text-neutral-700 dark:text-neutral-300 pt-1">
                  <span className="text-neutral-400">Approved by: </span>
                  <strong className="text-neutral-900 dark:text-white">{deanReq.decidedByName || 'Dean Academics'}</strong>
                  <span className="text-neutral-400 ml-2">({deanReq.decidedByRole || 'Dean Academics'})</span>
                </div>
              ) : deanReq?.status === 'REJECTED' ? (
                <div className="text-xs text-rose-700 dark:text-rose-300 pt-1">
                  <span className="font-bold">Rejected by: </span>
                  <span>{deanReq.decidedByName || 'Dean Academics'}</span>
                  {deanReq.rejectionReason && (
                    <div className="mt-1 p-2 rounded-lg bg-rose-100/60 dark:bg-rose-950/60 text-[11px] text-rose-900 dark:text-rose-200">
                      Reason: {deanReq.rejectionReason}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Awaiting Dean Academics authorization review.
                </p>
              )}
            </div>
          </div>

          {/* Step 2: Principal */}
          <div className="relative">
            <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-neutral-900 ${
              principalReq?.status === 'APPROVED'
                ? 'bg-emerald-500 text-white'
                : principalReq?.status === 'REJECTED'
                ? 'bg-rose-500 text-white'
                : principalReq?.status === 'PENDING'
                ? 'bg-purple-500 text-white'
                : 'bg-neutral-300 text-neutral-600 dark:bg-neutral-700'
            }`}>
              {principalReq?.status === 'APPROVED' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : principalReq?.status === 'REJECTED' ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : principalReq?.status === 'PENDING' ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                    ● Stage 2: Principal
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    principalReq?.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : principalReq?.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : principalReq?.status === 'PENDING'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}>
                    {principalReq?.status === 'APPROVED'
                      ? '✓ APPROVED'
                      : principalReq?.status === 'REJECTED'
                      ? '✗ REJECTED'
                      : principalReq?.status === 'PENDING'
                      ? '⏳ PENDING'
                      : '🔒 LOCKED'}
                  </span>
                </div>

                {principalReq?.decidedAt && (
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {new Date(principalReq.decidedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {principalReq?.status === 'APPROVED' ? (
                <div className="text-xs text-neutral-700 dark:text-neutral-300 pt-1">
                  <span className="text-neutral-400">Approved by: </span>
                  <strong className="text-neutral-900 dark:text-white">{principalReq.decidedByName || 'Principal'}</strong>
                  <span className="text-neutral-400 ml-2">({principalReq.decidedByRole || 'Principal'})</span>
                </div>
              ) : principalReq?.status === 'REJECTED' ? (
                <div className="text-xs text-rose-700 dark:text-rose-300 pt-1">
                  <span className="font-bold">Rejected by: </span>
                  <span>{principalReq.decidedByName || 'Principal'}</span>
                  {principalReq.rejectionReason && (
                    <div className="mt-1 p-2 rounded-lg bg-rose-100/60 dark:bg-rose-950/60 text-[11px] text-rose-900 dark:text-rose-200">
                      Reason: {principalReq.rejectionReason}
                    </div>
                  )}
                </div>
              ) : principalReq?.status === 'PENDING' ? (
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Dean approved. Awaiting final Principal authorization sign-off.
                </p>
              ) : (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Locked until Dean Academics completes Stage 1 approval.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. TEACHING ASSIGNMENTS (Section 9, 13) ───────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
              Teaching Workload
            </span>
            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
              Teaching Assignments ({assignments?.length || 0})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/hod/faculty/assignments?facultyId=${teacher.id}`}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] hover:from-[#0a1533] hover:to-[#142c6b] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Assign Master Subject</span>
            </Link>
          </div>
        </div>

        {assignments && assignments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((alloc: any, idx: number) => {
              const cycle = alloc.subjectCycle || alloc.cycle || alloc.subject?.cycle;
              return (
                <div
                  key={alloc.id || idx}
                  className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0c1a40] text-white">
                      Assignment #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Semester {alloc.semester}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">
                      {alloc.subject?.name || alloc.subjectName || 'Subject Name'}
                    </h4>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Code: {alloc.subject?.code || alloc.subjectCode}</span>
                      {cycle && (
                        <span className={`px-2 py-0.2 rounded text-[10px] font-black ${
                          cycle === 'P_CYCLE' ? 'bg-amber-100 text-amber-800' : 'bg-teal-100 text-teal-800'
                        }`}>
                          {cycle === 'P_CYCLE' ? 'P Cycle' : 'C Cycle'}
                        </span>
                      )}
                      <span>• AY: {alloc.academicYear || '2026-27'}</span>
                    </div>
                  </div>

                  {/* Permissions Toggles */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAccess(alloc.id, alloc.attendanceAccess, alloc.marksAccess, 'attn')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          alloc.attendanceAccess
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-neutral-200 text-neutral-500 line-through'
                        }`}
                        title="Toggle attendance access"
                      >
                        {alloc.attendanceAccess ? '✓ Attendance' : '✗ Attendance'}
                      </button>

                      <button
                        onClick={() => handleToggleAccess(alloc.id, alloc.attendanceAccess, alloc.marksAccess, 'marks')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                          alloc.marksAccess
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-neutral-200 text-neutral-500 line-through'
                        }`}
                        title="Toggle marks & bit-wise access"
                      >
                        {alloc.marksAccess ? '✓ Marks & Bit-Wise' : '✗ Marks & Bit-Wise'}
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveAssignment(alloc.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors"
                      title="Remove Assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 text-center space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              No master subjects assigned yet.
            </p>
            <p className="text-[11px] text-neutral-400">
              Go to Faculty Assignments to allocate curriculum cycles and master subjects.
            </p>
            <Link
              to={`/hod/faculty/assignments?facultyId=${teacher.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c1a40] text-white text-xs font-bold hover:bg-[#142c6b] transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Master Subject</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HodFacultyManagePage;
