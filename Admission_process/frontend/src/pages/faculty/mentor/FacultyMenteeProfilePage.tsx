import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  ArrowLeft,
  CalendarCheck,
  Award,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Plus,
  Edit,
  TrendingDown,
  TrendingUp,
  FileText,
  ShieldCheck,
  X,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import mentorService, {
  MenteeProfileData,
  MenteeAcademicPerformanceData,
  MenteeAttendanceDetailsData,
  MentoringRecordItem,
} from '../../../services/mentor.service';
import { toast } from 'react-toastify';

export const FacultyMenteeProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACADEMICS' | 'ATTENDANCE' | 'RECORDS'>('OVERVIEW');

  // Profile Data
  const [loading, setLoading] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<MenteeProfileData | null>(null);

  // Tab B: Academics Data
  const [loadingAcademics, setLoadingAcademics] = useState<boolean>(false);
  const [academicsData, setAcademicsData] = useState<MenteeAcademicPerformanceData | null>(null);

  // Tab C: Attendance Data
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [attendanceData, setAttendanceData] = useState<MenteeAttendanceDetailsData | null>(null);
  const [selectedAttendanceSem, setSelectedAttendanceSem] = useState<number | string>('');

  // Tab D: Mentoring Records Data
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [records, setRecords] = useState<MentoringRecordItem[]>([]);

  // Record Session Modal State
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [sessionForm, setSessionForm] = useState({
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

  // 1. Fetch Profile Overview
  const fetchProfile = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await mentorService.getMenteeProfile(studentId);
      setProfileData(data);
      if (!selectedAttendanceSem) {
        setSelectedAttendanceSem(data.student.semester);
      }
    } catch (err: any) {
      console.error('Failed to load mentee profile:', err);
      toast.error(err.response?.data?.error || 'Failed to load mentee profile.');
      navigate('/mentor/mentees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [studentId]);

  // 2. Fetch Tab B: Academics
  useEffect(() => {
    if (activeTab === 'ACADEMICS' && studentId) {
      const loadAcademics = async () => {
        setLoadingAcademics(true);
        try {
          const res = await mentorService.getMenteeAcademics(studentId);
          setAcademicsData(res);
        } catch (err) {
          console.error('Failed to load academics:', err);
        } finally {
          setLoadingAcademics(false);
        }
      };
      loadAcademics();
    }
  }, [activeTab, studentId]);

  // 3. Fetch Tab C: Attendance
  useEffect(() => {
    if (activeTab === 'ATTENDANCE' && studentId) {
      const loadAttendance = async () => {
        setLoadingAttendance(true);
        try {
          const res = await mentorService.getMenteeAttendance(studentId, selectedAttendanceSem);
          setAttendanceData(res);
        } catch (err) {
          console.error('Failed to load attendance:', err);
        } finally {
          setLoadingAttendance(false);
        }
      };
      loadAttendance();
    }
  }, [activeTab, studentId, selectedAttendanceSem]);

  // 4. Fetch Tab D: Records
  const fetchRecords = async () => {
    if (!studentId) return;
    setLoadingRecords(true);
    try {
      const res = await mentorService.getMenteeRecords(studentId);
      setRecords(res);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'RECORDS') {
      fetchRecords();
    }
  }, [activeTab, studentId]);

  // Handle Create Record
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !sessionForm.summary.trim()) {
      toast.error('Please enter a session summary.');
      return;
    }

    setSavingRecord(true);
    try {
      await mentorService.createMentoringRecord({
        studentId,
        meetingDate: sessionForm.meetingDate,
        meetingType: sessionForm.meetingType,
        concernCategory: sessionForm.concernCategory,
        summary: sessionForm.summary,
        actionPlan: sessionForm.actionPlan || undefined,
        followUpDate: sessionForm.followUpDate || undefined,
        followUpStatus: sessionForm.followUpStatus,
      });

      toast.success('Mentoring session recorded successfully!');
      setRecordModalOpen(false);
      setSessionForm({
        meetingDate: new Date().toISOString().split('T')[0],
        meetingType: 'IN_PERSON',
        concernCategory: 'GENERAL',
        summary: '',
        actionPlan: '',
        followUpDate: '',
        followUpStatus: 'OPEN',
      });
      fetchRecords();
      fetchProfile();
    } catch (err: any) {
      console.error('Failed to record session:', err);
      toast.error(err.response?.data?.error || 'Failed to record session.');
    } finally {
      setSavingRecord(false);
    }
  };

  // Handle Update Follow-up Status
  const handleUpdateStatus = async () => {
    if (!targetRecordId) return;
    setSavingStatus(true);
    try {
      await mentorService.updateFollowUpStatus(targetRecordId, {
        followUpStatus: newStatus,
        resolutionNotes,
      });
      toast.success('Follow-up status updated!');
      setStatusModalOpen(false);
      setResolutionNotes('');
      fetchRecords();
      fetchProfile();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error(err.response?.data?.error || 'Failed to update follow-up.');
    } finally {
      setSavingStatus(false);
    }
  };

  const student = profileData?.student;
  const summaryCards = profileData?.summaryCards;

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/mentor/mentees"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:border-neutral-200 border-2 border-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Back to My Mentees"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>

          <div className="flex items-center gap-3.5">
            <div className="size-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-indigo-500/20">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {student?.name || 'Student Profile'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold">
                  {student?.usn}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                <span>{student?.department} ({student?.departmentCode})</span>
                <span>•</span>
                <span>Semester {student?.semester} - Section {student?.section}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRecordModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
          >
            <Plus className="size-4" />
            <span>Record Mentoring Session</span>
          </button>
        </div>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Attendance */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Current Attendance
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarCheck className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {summaryCards?.attendance?.totalConducted ? `${summaryCards.attendance.attendancePercentage}%` : 'No Records'}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 font-medium">
            {summaryCards?.attendance?.totalConducted
              ? `${summaryCards.attendance.totalAttended} / ${summaryCards.attendance.totalConducted} classes attended`
              : 'No sessions conducted'}
          </p>
        </div>

        {/* 2. Latest Academic Result */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Latest Result
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Award className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {summaryCards?.latestResult?.averageCie ? `${summaryCards.latestResult.averageCie}/50` : 'Awaiting'}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
            {summaryCards?.latestResult?.displayString || 'Awaiting Results'}
          </p>
        </div>

        {/* 3. Completed Semesters */}
        <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Completed Semesters
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BookOpen className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {summaryCards?.completedSemesters ?? '—'}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2">
            Current Semester: {student?.semester}
          </p>
        </div>

        {/* 4. Open Follow-ups */}
        <div className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm ${
          (summaryCards?.openFollowUps || 0) > 0
            ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20'
            : 'border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Open Follow-ups
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 tracking-tight">
            {summaryCards?.openFollowUps ?? 0}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
            {(summaryCards?.openFollowUps || 0) > 0 ? 'Pending mentoring action' : 'No pending actions'}
          </p>
        </div>
      </div>

      {/* ── PROFILE TABS NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: Sparkles },
          { id: 'ACADEMICS', label: 'Academic Performance', icon: Award },
          { id: 'ATTENDANCE', label: 'Attendance', icon: CalendarCheck },
          { id: 'RECORDS', label: 'Mentoring Records', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      {/* ── TAB A: OVERVIEW ── */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Left 2 Cols: Student Academic Summary */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-500" />
              <span>Academic & Mentoring Overview</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-100 dark:border-neutral-800 space-y-1">
                <span className="text-slate-400 font-medium">Department</span>
                <div className="font-bold text-slate-800 dark:text-neutral-200 text-sm">
                  {student?.department} ({student?.departmentCode})
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-100 dark:border-neutral-800 space-y-1">
                <span className="text-slate-400 font-medium">Cohort / Section</span>
                <div className="font-bold text-slate-800 dark:text-neutral-200 text-sm">
                  Semester {student?.semester} • Section {student?.section}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-100 dark:border-neutral-800 space-y-1">
                <span className="text-slate-400 font-medium">Assigned Faculty Mentor</span>
                <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {profileData?.activeMentor?.facultyName || 'Unassigned'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-100 dark:border-neutral-800 space-y-1">
                <span className="text-slate-400 font-medium">Mentor Core Department</span>
                <div className="font-bold text-slate-800 dark:text-neutral-200 text-sm">
                  {profileData?.activeMentor?.coreDepartment || '—'}
                </div>
              </div>
            </div>

            {/* Recent Mentoring Observations Preview */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recent Mentoring Observations
                </h3>
                <button
                  onClick={() => setActiveTab('RECORDS')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  View All Records →
                </button>
              </div>

              {profileData?.recentMentoringRecords?.length ? (
                profileData.recentMentoringRecords.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/30 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{r.concernCategory} Concern</span>
                      <span className="text-slate-400 font-normal">
                        {r.meetingDate ? new Date(r.meetingDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-neutral-300">{r.summary}</p>
                    {r.actionPlan && (
                      <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200">
                        <strong className="text-[11px] uppercase font-bold block mb-0.5">Agreed Action Plan:</strong>
                        <span>{r.actionPlan}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No mentoring records recorded yet for this mentee.
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Contact & Student Profile Info */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="size-4 text-indigo-500" />
              <span>Mentee Details</span>
            </h2>

            <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-neutral-800">
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Student USN</span>
                <span className="font-mono font-bold text-slate-800 dark:text-neutral-200">{student?.usn}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Roll Number</span>
                <span className="font-bold text-slate-800 dark:text-neutral-200">{student?.rollNumber || '—'}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Email</span>
                <span className="font-medium text-slate-800 dark:text-neutral-200">{student?.email || '—'}</span>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="font-medium text-slate-800 dark:text-neutral-200">{student?.phone || '—'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800">
              <button
                onClick={() => setRecordModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
              >
                + Record Mentoring Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB B: ACADEMIC PERFORMANCE ── */}
      {activeTab === 'ACADEMICS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="size-4 text-emerald-500" />
                <span>Semester-wise Academic Performance</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Integrated CIE marks, assignments, and external examination marks from authoritative marks services.
              </p>
            </div>

            {loadingAcademics ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Loading marks records...</span>
              </div>
            ) : academicsData?.performanceBySemester?.length ? (
              <div className="space-y-6">
                {academicsData.performanceBySemester.map((semGroup) => (
                  <div
                    key={semGroup.semester}
                    className="rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden"
                  >
                    <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Semester {semGroup.semester}</span>
                        {semGroup.isCurrentSemester && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            Current Semester
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {semGroup.subjectsCount} Subject{semGroup.subjectsCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {semGroup.hasRecords ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/50 dark:bg-neutral-800/40 text-slate-500 font-bold border-b border-slate-100 dark:border-neutral-800">
                            <tr>
                              <th className="py-2.5 px-4">Subject</th>
                              <th className="py-2.5 px-3 text-center">CIE 1</th>
                              <th className="py-2.5 px-3 text-center">CIE 2</th>
                              <th className="py-2.5 px-3 text-center">Avg CIE</th>
                              <th className="py-2.5 px-3 text-center">Assignment</th>
                              <th className="py-2.5 px-3 text-center">Final IA (/50)</th>
                              <th className="py-2.5 px-3 text-center">External Exam</th>
                              <th className="py-2.5 px-3 text-center">Total (/150)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                            {semGroup.subjects.map((sub) => (
                              <tr key={sub.subjectId} className="hover:bg-slate-50/40">
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                  <div>{sub.subjectName}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{sub.subjectCode}</div>
                                </td>
                                <td className="py-3 px-3 text-center font-medium">{sub.cie1Marks ?? '—'}</td>
                                <td className="py-3 px-3 text-center font-medium">{sub.cie2Marks ?? '—'}</td>
                                <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                  {sub.cieAverage ?? '—'}
                                </td>
                                <td className="py-3 px-3 text-center font-medium">{sub.assignmentMarks ?? '—'}</td>
                                <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                  {sub.finalInternalMarks ?? '—'}
                                </td>
                                <td className="py-3 px-3 text-center font-medium">{sub.externalMarks ?? '—'}</td>
                                <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white">
                                  {sub.totalMarks ?? '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No marks entries found for Semester {semGroup.semester}.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">No marks records available.</div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB C: ATTENDANCE ── */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="size-4 text-indigo-500" />
                  <span>Subject-wise Attendance Details</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Institutional attendance threshold: <strong>85.0%</strong>
                </p>
              </div>

              {/* Semester Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-neutral-400">Semester:</label>
                <select
                  value={selectedAttendanceSem}
                  onChange={(e) => setSelectedAttendanceSem(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingAttendance ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Loading attendance details...</span>
              </div>
            ) : attendanceData?.subjectWise?.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 font-bold border-b border-slate-200 dark:border-neutral-800">
                    <tr>
                      <th className="py-3 px-4">Subject Code</th>
                      <th className="py-3 px-4">Subject Name</th>
                      <th className="py-3 px-4 text-center">Classes Conducted</th>
                      <th className="py-3 px-4 text-center">Classes Attended</th>
                      <th className="py-3 px-4 text-center">Attendance %</th>
                      <th className="py-3 px-4 text-center">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                    {attendanceData.subjectWise.map((row) => (
                      <tr key={row.subjectId} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {row.subjectCode}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-neutral-200">
                          {row.subjectName}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold">{row.conducted}</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {row.attended}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {row.attendancePercentage}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              row.eligibility === 'MEETS_THRESHOLD'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : row.eligibility === 'NEEDS_ATTENTION'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.eligibility === 'MEETS_THRESHOLD'
                              ? 'Meets Threshold (≥85%)'
                              : row.eligibility === 'NEEDS_ATTENTION'
                              ? 'Needs Attention (<85%)'
                              : 'No Records'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No attendance recorded for Semester {selectedAttendanceSem}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB D: MENTORING RECORDS & FOLLOW-UPS ── */}
      {activeTab === 'RECORDS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="size-4 text-indigo-500" />
                  <span>Mentoring History & Action Plans</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Track mentor meetings, observations, agreed follow-ups, and resolution status.
                </p>
              </div>

              <button
                onClick={() => setRecordModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition active:scale-95"
              >
                <Plus className="size-4" />
                <span>Record Session</span>
              </button>
            </div>

            {loadingRecords ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Loading mentoring records...</span>
              </div>
            ) : records.length > 0 ? (
              <div className="space-y-4">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                          {rec.concernCategory}
                        </span>
                        <span className="text-xs text-slate-500">
                          {rec.meetingType.replace('_', ' ')} • {new Date(rec.meetingDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.followUpStatus === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : rec.followUpStatus === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {rec.followUpStatus}
                        </span>

                        {rec.isOverdue && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Overdue
                          </span>
                        )}

                        {rec.followUpStatus !== 'RESOLVED' && (
                          <button
                            onClick={() => {
                              setTargetRecordId(rec.id);
                              setNewStatus('RESOLVED');
                              setStatusModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 text-[11px] font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-50"
                          >
                            Update Status
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <strong className="text-slate-800 dark:text-neutral-200 font-bold block mb-0.5">Summary / Observations:</strong>
                        <p className="text-slate-600 dark:text-neutral-300 whitespace-pre-wrap">{rec.summary}</p>
                      </div>

                      {rec.actionPlan && (
                        <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200">
                          <strong className="text-[11px] uppercase font-bold block mb-0.5">Agreed Action Plan:</strong>
                          <p className="whitespace-pre-wrap">{rec.actionPlan}</p>
                        </div>
                      )}

                      {rec.followUpDate && (
                        <div className="text-[11px] text-slate-500">
                          Follow-up Target Date: <strong className="text-slate-700 dark:text-neutral-300">{new Date(rec.followUpDate).toLocaleDateString()}</strong>
                        </div>
                      )}

                      {rec.resolutionNotes && (
                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">
                          <strong className="text-[11px] uppercase font-bold block mb-0.5">Resolution Notes:</strong>
                          <p className="whitespace-pre-wrap">{rec.resolutionNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                No mentoring records recorded yet. Click "Record Session" to begin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RECORD MENTORING SESSION MODAL ── */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-indigo-500" />
                  <span>Record Mentoring Session</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Student: {student?.name} ({student?.usn})
                </p>
              </div>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionForm.meetingDate}
                    onChange={(e) => setSessionForm({ ...sessionForm, meetingDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Meeting Type
                  </label>
                  <select
                    value={sessionForm.meetingType}
                    onChange={(e) => setSessionForm({ ...sessionForm, meetingType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                  >
                    <option value="IN_PERSON">In-Person Meeting</option>
                    <option value="ONLINE">Online (Teams / Meet)</option>
                    <option value="PHONE">Phone Call</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                  Concern Category
                </label>
                <select
                  value={sessionForm.concernCategory}
                  onChange={(e) => setSessionForm({ ...sessionForm, concernCategory: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                >
                  <option value="GENERAL">General Progress & Guidance</option>
                  <option value="ACADEMIC">Academic / CIE Marks Improvement</option>
                  <option value="ATTENDANCE">Attendance Shortage Concern</option>
                  <option value="CAREER">Career & Placement Guidance</option>
                  <option value="PERSONAL">Personal / Well-being</option>
                  <option value="DISCIPLINARY">Disciplinary</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                  Meeting Summary & Observations *
                </label>
                <textarea
                  required
                  rows={3}
                  value={sessionForm.summary}
                  onChange={(e) => setSessionForm({ ...sessionForm, summary: e.target.value })}
                  placeholder="Summarize key points discussed during the session..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                  Agreed Action Plan (Optional)
                </label>
                <textarea
                  rows={2}
                  value={sessionForm.actionPlan}
                  onChange={(e) => setSessionForm({ ...sessionForm, actionPlan: e.target.value })}
                  placeholder="Action steps agreed upon by student and mentor..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Follow-up Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={sessionForm.followUpDate}
                    onChange={(e) => setSessionForm({ ...sessionForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Follow-up Status
                  </label>
                  <select
                    value={sessionForm.followUpStatus}
                    onChange={(e) => setSessionForm({ ...sessionForm, followUpStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="NO_ACTION_REQUIRED">No Action Required</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {savingRecord ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>Save Record</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPDATE FOLLOW-UP STATUS MODAL ── */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="size-4 text-indigo-500" />
                <span>Update Follow-up Status</span>
              </h3>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                  Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved / Completed</option>
                  <option value="OPEN">Open</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                  Resolution / Progress Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes explaining how this action item was resolved or progress made..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={handleUpdateStatus}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {savingStatus ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      <span>Save Status</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyMenteeProfilePage;
