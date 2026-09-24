import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  FileSpreadsheet,
  AlertTriangle,
  Lock,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  BookOpen,
} from 'lucide-react';
import hodService, { HodSubjectItem } from '../../services/hod.service';

export const HodFacultyManagePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any | null>(null);
  const [subjects, setSubjects] = useState<HodSubjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'assignment' | 'access' | 'credentials' | 'activity'>('profile');

  // Temporary Password Generation
  const [resettingPassword, setResettingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Status Toggle
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Assignment Edit State
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('5');
  const [selectedSection, setSelectedSection] = useState('A');
  const [updatingAssignment, setUpdatingAssignment] = useState(false);

  useEffect(() => {
    if (id) {
      loadFacultyDetails();
      hodService.getSubjects().then((res) => setSubjects(res)).catch(() => {});
    }
  }, [id]);

  const loadFacultyDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await hodService.getFacultyDetail(id);
      setData(res);
      if (res.assignments?.length > 0) {
        setSelectedSubjectId(res.assignments[0].subjectId);
        setSelectedSemester(String(res.assignments[0].semester));
        setSelectedSection(res.assignments[0].section);
      }
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
      loadFacultyDetails();
    } catch (err) {
      alert('Failed to update sheet access.');
    }
  };

  const handleResetPassword = async () => {
    if (!id) return;
    setResettingPassword(true);
    try {
      const res = await hodService.resetFacultyPassword(id);
      setGeneratedPassword(res.temporaryPassword);
    } catch (err) {
      alert('Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleAccountStatus = async (currentStatus: string) => {
    if (!id) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to ${newStatus === 'ACTIVE' ? 'activate' : 'deactivate'} this faculty account? Past attendance, marks, and audit history will remain intact.`)) {
      return;
    }

    setTogglingStatus(true);
    try {
      await hodService.toggleFacultyStatus(id, newStatus);
      loadFacultyDetails();
    } catch (err) {
      alert('Failed to update faculty account status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSaveAssignment = async (assignmentId: string) => {
    setUpdatingAssignment(true);
    try {
      await hodService.updateFacultyAssignment(assignmentId, {
        subjectId: selectedSubjectId,
        semester: Number(selectedSemester),
        section: selectedSection,
      });
      setEditingAssignmentId(null);
      loadFacultyDetails();
    } catch (err) {
      alert('Failed to update assignment.');
    } finally {
      setUpdatingAssignment(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-xs font-bold">Loading faculty details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center rounded-3xl bg-rose-50 border border-rose-200">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-800">{error || 'Faculty member not found.'}</p>
        <Link to="/hod/faculty" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Faculty List
        </Link>
      </div>
    );
  }

  const { teacher, assignments, authorizationHistory, auditHistory } = data;
  const isAccountActive = teacher.accountStatus === 'ACTIVE';

  return (
    <div className="space-y-6">
      
      {/* ── Breadcrumb & Back ────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/hod/faculty"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Faculty List</span>
        </Link>
      </div>

      {/* ── Faculty Hero Card ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-white">
              {teacher.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {teacher.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isAccountActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {teacher.accountStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {teacher.designation} • {teacher.email} • {teacher.phone || 'No phone'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleToggleAccountStatus(teacher.accountStatus)}
              disabled={togglingStatus}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                isAccountActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {isAccountActive ? 'Soft Deactivate Faculty' : 'Reactivate Faculty'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 overflow-x-auto text-xs font-bold">
          {(['profile', 'assignment', 'access', 'credentials', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl capitalize transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {tab === 'credentials' ? 'Credentials & Passwords' : tab === 'access' ? 'Sheet Access' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        
        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Faculty Profile Details
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 font-medium">Full Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{teacher.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 font-medium">Designation:</span>
                <span className="font-bold text-slate-900 dark:text-white">{teacher.designation}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{teacher.email}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-500 font-medium">Joining Date:</span>
                <span className="font-bold text-slate-900 dark:text-white">{teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Assignment */}
        {activeTab === 'assignment' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
                  Assigned Teaching Workload
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update subject, semester, or section assignments directly.
                </p>
              </div>
            </div>

            {assignments && assignments.length > 0 ? (
              <div className="space-y-3">
                {assignments.map((assign: any) => (
                  <div key={assign.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    {editingAssignmentId === assign.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
                            <select
                              value={selectedSubjectId}
                              onChange={(e) => setSelectedSubjectId(e.target.value)}
                              className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                            >
                              {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Semester</label>
                            <select
                              value={selectedSemester}
                              onChange={(e) => setSelectedSemester(e.target.value)}
                              className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                                <option key={s} value={s}>Semester {s}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Section</label>
                            <select
                              value={selectedSection}
                              onChange={(e) => setSelectedSection(e.target.value)}
                              className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 border text-xs font-semibold"
                            >
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingAssignmentId(null)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveAssignment(assign.id)}
                            disabled={updatingAssignment}
                            className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {assign.subject?.name || 'Assigned Subject'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Code: {assign.subject?.code} • Sem {assign.semester} • Section {assign.section}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingAssignmentId(assign.id);
                            setSelectedSubjectId(assign.subjectId);
                            setSelectedSemester(String(assign.semester));
                            setSelectedSection(assign.section);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs"
                        >
                          Reassign
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No teaching assignments recorded.</p>
            )}
          </div>
        )}

        {/* Tab 3: Sheet Access */}
        {activeTab === 'access' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Google Sheet Access Permissions
            </h3>
            <p className="text-xs text-slate-500">
              Instant toggles controlling attendance recording and marks submission permissions.
            </p>

            <div className="space-y-3">
              {assignments?.map((assign: any) => (
                <div key={assign.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {assign.subject?.name} (Sem {assign.semester} • {assign.section})
                    </h4>
                    <p className="text-[11px] text-slate-400">Assignment ID: {assign.id.substring(0, 8)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Attendance Access Button */}
                    <button
                      onClick={() => handleToggleAccess(assign.id, assign.attendanceAccess, assign.marksAccess, 'attn')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        assign.attendanceAccess
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Attendance Sheet: {assign.attendanceAccess ? 'ENABLED' : 'DISABLED'}
                    </button>

                    {/* Marks Access Button */}
                    <button
                      onClick={() => handleToggleAccess(assign.id, assign.attendanceAccess, assign.marksAccess, 'marks')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        assign.marksAccess
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Marks Sheet: {assign.marksAccess ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Credentials */}
        {activeTab === 'credentials' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Credential Controls
            </h3>
            <p className="text-xs text-slate-500">
              Reset temporary login credentials. The password hash is securely updated in the database.
            </p>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Reset Temporary Password</p>
                  <p className="text-[11px] text-slate-400">Generates a random secure temporary password</p>
                </div>
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                >
                  {resettingPassword ? 'Generating...' : 'Generate New Password'}
                </button>
              </div>

              {generatedPassword && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 flex items-center justify-between">
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
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-600 shadow-xs"
                    title="Copy password"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Activity Audit Log */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Faculty Lifecycle Audit History (Item 15)
            </h3>

            {auditHistory && auditHistory.length > 0 ? (
              <div className="space-y-2">
                {auditHistory.map((item: any) => (
                  <div key={item.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.action}</p>
                      <p className="text-[10px] text-slate-400">IP: {item.ipAddress} • {item.userAgent?.substring(0, 40)}...</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No recorded lifecycle transitions yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HodFacultyManagePage;
