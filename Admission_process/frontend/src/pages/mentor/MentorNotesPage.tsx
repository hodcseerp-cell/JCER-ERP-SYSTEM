import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  X,
  Edit,
  Sparkles,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import mentorService, { MenteeListItem, MentoringRecordItem } from '../../services/mentor.service';
import { toast } from 'react-toastify';

export const MentorNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const [loading, setLoading] = useState<boolean>(true);
  const [mentees, setMentees] = useState<MenteeListItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL');
  const [allRecords, setAllRecords] = useState<MentoringRecordItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Record Session Modal
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [sessionForm, setSessionForm] = useState({
    studentId: '',
    meetingDate: new Date().toISOString().split('T')[0],
    meetingType: 'IN_PERSON',
    concernCategory: 'GENERAL',
    summary: '',
    actionPlan: '',
    followUpDate: '',
    followUpStatus: 'OPEN',
  });

  // Follow-up Status Update Modal
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [targetRecordId, setTargetRecordId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState<boolean>(false);

  const fetchRecordsAndMentees = async () => {
    setLoading(true);
    try {
      const menteesList = await mentorService.getMyMentees({ academicYear });
      setMentees(menteesList);

      // Fetch records for all mentees
      const recordPromises = menteesList.map((m) =>
        mentorService.getMenteeRecords(m.id).catch(() => [])
      );
      const results = await Promise.all(recordPromises);
      const combined = results.flat().sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
      setAllRecords(combined);
    } catch (err: any) {
      console.error('Failed to load mentoring records:', err);
      toast.error('Failed to load mentoring notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordsAndMentees();
  }, [academicYear]);

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.studentId) {
      toast.warn('Please select a student.');
      return;
    }
    if (!sessionForm.summary.trim()) {
      toast.warn('Please provide a meeting summary.');
      return;
    }

    setSavingRecord(true);
    try {
      await mentorService.createMentoringRecord(sessionForm);
      toast.success('Mentoring session recorded successfully.');
      setRecordModalOpen(false);
      setSessionForm({
        studentId: '',
        meetingDate: new Date().toISOString().split('T')[0],
        meetingType: 'IN_PERSON',
        concernCategory: 'GENERAL',
        summary: '',
        actionPlan: '',
        followUpDate: '',
        followUpStatus: 'OPEN',
      });
      fetchRecordsAndMentees();
    } catch (err: any) {
      console.error('Failed to record session:', err);
      toast.error(err.response?.data?.error || 'Failed to record session.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStatus(true);
    try {
      await mentorService.updateFollowUpStatus(targetRecordId, {
        followUpStatus: newStatus,
        resolutionNotes,
      });
      toast.success('Follow-up status updated.');
      setStatusModalOpen(false);
      setResolutionNotes('');
      fetchRecordsAndMentees();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSavingStatus(false);
    }
  };

  // Filtered records
  const filteredRecords = allRecords.filter((rec) => {
    if (selectedStudentId !== 'ALL' && rec.studentId !== selectedStudentId) return false;
    if (statusFilter !== 'ALL' && rec.followUpStatus !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && rec.concernCategory !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSummary = rec.summary?.toLowerCase().includes(q);
      const matchAction = rec.actionPlan?.toLowerCase().includes(q);
      const student = mentees.find((m) => m.id === rec.studentId);
      const matchStudent = student?.name.toLowerCase().includes(q) || student?.usn.toLowerCase().includes(q);
      if (!matchSummary && !matchAction && !matchStudent) return false;
    }
    return true;
  });

  const openFollowUps = allRecords.filter((r) => r.followUpStatus === 'OPEN' || r.followUpStatus === 'IN_PROGRESS');
  const resolvedCount = allRecords.filter((r) => r.followUpStatus === 'RESOLVED');

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <FileText className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mentoring Notes &amp; Follow-up Actions
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Log formal mentoring sessions, track academic/attendance action items, and manage follow-up resolutions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (mentees.length > 0) {
                setSessionForm((prev) => ({ ...prev, studentId: mentees[0].id }));
              }
              setRecordModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <Plus className="size-4" />
            <span>Record Session</span>
          </button>

          <button
            onClick={fetchRecordsAndMentees}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
            title="Refresh Notes"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── SUMMARY STATS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Total Meetings Logged
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileText className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {loading ? '—' : allRecords.length}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">Documented mentoring interactions</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Open Follow-ups
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-300 tracking-tight">
            {loading ? '—' : openFollowUps.length}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            Pending student action plans
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Resolved Follow-ups
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight">
            {loading ? '—' : resolvedCount.length}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            Successfully closed mentoring cases
          </p>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes or student..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Mentees ({mentees.length})</option>
              {mentees.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.usn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Follow-up Statuses</option>
              <option value="OPEN">Open Actions</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="NO_ACTION_REQUIRED">No Action Required</option>
            </select>
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Concern Categories</option>
              <option value="ACADEMIC">Academic Progress</option>
              <option value="ATTENDANCE">Attendance Shortage</option>
              <option value="CAREER">Career &amp; Placements</option>
              <option value="DISCIPLINARY">Disciplinary</option>
              <option value="PERSONAL">Personal Well-being</option>
              <option value="GENERAL">General Guidance</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── RECORDS FEED ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400 dark:text-neutral-500">
            <RefreshCw className="size-6 mx-auto animate-spin mb-2" />
            <span>Loading mentoring records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-12 text-center text-slate-400 dark:text-neutral-500 space-y-3">
            <FileText className="size-10 mx-auto text-slate-300 dark:text-neutral-600" />
            <p className="text-sm font-semibold">No mentoring records match the current filters.</p>
            <button
              onClick={() => setRecordModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Record First Session
            </button>
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const student = mentees.find((m) => m.id === rec.studentId);
            return (
              <div
                key={rec.id}
                className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4 hover:border-indigo-500/40 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-neutral-800/60 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => student && navigate(`/mentor/mentees/${student.id}`)}
                          className="font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 hover:underline cursor-pointer"
                        >
                          {student?.name || 'Student Mentee'}
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-semibold">
                          ({student?.usn || '—'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Meeting Date: <strong>{new Date(rec.meetingDate).toLocaleDateString()}</strong> • Type:{' '}
                        <strong>{rec.meetingType.replace('_', ' ')}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      {rec.concernCategory}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        rec.followUpStatus === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : rec.followUpStatus === 'OPEN'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}
                    >
                      {rec.followUpStatus.replace('_', ' ')}
                    </span>

                    {rec.followUpStatus !== 'RESOLVED' && (
                      <button
                        onClick={() => {
                          setTargetRecordId(rec.id);
                          setNewStatus('RESOLVED');
                          setStatusModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[11px] font-bold transition"
                      >
                        <Edit className="size-3" />
                        <span>Update Status</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discussion Summary</h4>
                  <p className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed bg-slate-50/50 dark:bg-neutral-800/30 p-3 rounded-xl">
                    {rec.summary}
                  </p>
                </div>

                {rec.actionPlan && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      <span>Agreed Action Plan &amp; Follow-up</span>
                    </h4>
                    <p className="text-xs text-slate-800 dark:text-neutral-200 leading-relaxed bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 p-3 rounded-xl">
                      {rec.actionPlan}
                      {rec.followUpDate && (
                        <span className="block mt-1 font-semibold text-[11px] text-amber-700 dark:text-amber-300">
                          Target Follow-up Date: {new Date(rec.followUpDate).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {rec.resolutionNotes && (
                  <div className="space-y-1 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 p-3 rounded-xl">
                    <h4 className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5" />
                      <span>Resolution Notes</span>
                    </h4>
                    <p className="text-xs text-slate-800 dark:text-neutral-200">{rec.resolutionNotes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── RECORD SESSION MODAL ── */}
      {recordModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="size-4 text-indigo-500" />
                <span>Record Mentoring Session</span>
              </h3>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Select Student Mentee *
                </label>
                <select
                  value={sessionForm.studentId}
                  onChange={(e) => setSessionForm({ ...sessionForm, studentId: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Mentee --</option>
                  {mentees.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.usn}) — Sem {m.semester} ({m.section})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    value={sessionForm.meetingDate}
                    onChange={(e) => setSessionForm({ ...sessionForm, meetingDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Meeting Type
                  </label>
                  <select
                    value={sessionForm.meetingType}
                    onChange={(e) => setSessionForm({ ...sessionForm, meetingType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="IN_PERSON">In-Person</option>
                    <option value="ONLINE">Online (Teams/Meet)</option>
                    <option value="PHONE">Phone Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Concern Category
                  </label>
                  <select
                    value={sessionForm.concernCategory}
                    onChange={(e) => setSessionForm({ ...sessionForm, concernCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="GENERAL">General Guidance</option>
                    <option value="ACADEMIC">Academic Performance</option>
                    <option value="ATTENDANCE">Attendance Shortage</option>
                    <option value="CAREER">Career / Internship</option>
                    <option value="PERSONAL">Personal Well-being</option>
                    <option value="DISCIPLINARY">Disciplinary</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Meeting Summary &amp; Observations *
                </label>
                <textarea
                  rows={3}
                  value={sessionForm.summary}
                  onChange={(e) => setSessionForm({ ...sessionForm, summary: e.target.value })}
                  placeholder="Summarize key points discussed during the session..."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Agreed Action Plan (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sessionForm.actionPlan}
                  onChange={(e) => setSessionForm({ ...sessionForm, actionPlan: e.target.value })}
                  placeholder="Specific actions the student agreed to take (e.g. attend remedial sessions, submit assignments)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={sessionForm.followUpDate}
                    onChange={(e) => setSessionForm({ ...sessionForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                    Follow-up Status
                  </label>
                  <select
                    value={sessionForm.followUpStatus}
                    onChange={(e) => setSessionForm({ ...sessionForm, followUpStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPEN">Open (Action Pending)</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved Immediately</option>
                    <option value="NO_ACTION_REQUIRED">No Action Required</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {savingRecord ? 'Saving...' : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STATUS UPDATE MODAL ── */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span>Update Action Plan Status</span>
            </h3>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="RESOLVED">Resolved (Completed)</option>
                  <option value="IN_PROGRESS">In Progress (Ongoing)</option>
                  <option value="OPEN">Re-Open Action</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1">
                  Resolution Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail how this concern was addressed or what improvement was observed..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-800 dark:text-neutral-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {savingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorNotesPage;
