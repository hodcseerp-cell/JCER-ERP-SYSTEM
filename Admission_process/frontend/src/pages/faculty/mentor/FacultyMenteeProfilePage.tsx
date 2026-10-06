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
  TrendingDown,
  TrendingUp,
  FileText,
  ShieldCheck,
  X,
  Phone,
  Mail,
  Calendar,
  Upload,
  User,
  History,
  LineChart,
  MapPin,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import mentorService, {
  MenteeProfileData,
  MenteeAcademicPerformanceData,
  MenteeAttendanceDetailsData,
  MentoringRecordItem,
  MenteeAnalyticsData,
  ParentImportPreviewData,
} from '../../../services/mentor.service';
import { toast } from 'react-toastify';
import AttendanceCalendar from '../../../components/mentor/AttendanceCalendar';
import MenteeAnalyticsDashboard from '../../../components/mentor/MenteeAnalyticsDashboard';

export const FacultyMenteeProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'ATTENDANCE' | 'ACADEMICS' | 'PERSONAL' | 'NOTES' | 'ANALYTICS' | 'HISTORY'
  >('OVERVIEW');

  // Profile Data
  const [loading, setLoading] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<MenteeProfileData | null>(null);

  // Academics Data
  const [loadingAcademics, setLoadingAcademics] = useState<boolean>(false);
  const [academicsData, setAcademicsData] = useState<MenteeAcademicPerformanceData | null>(null);

  // Attendance Data
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  const [attendanceData, setAttendanceData] = useState<MenteeAttendanceDetailsData | null>(null);
  const [selectedAttendanceSem, setSelectedAttendanceSem] = useState<number | string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  // Mentoring Notes Data
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [records, setRecords] = useState<MentoringRecordItem[]>([]);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<string>('ALL');

  // Analytics Data
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<MenteeAnalyticsData | null>(null);

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

  // Excel Parent Info Import Modal State
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsingImport, setParsingImport] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<ParentImportPreviewData | null>(null);
  const [confirmingImport, setConfirmingImport] = useState<boolean>(false);

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

  // 2. Fetch Academics
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

  // 3. Fetch Attendance
  useEffect(() => {
    if ((activeTab === 'ATTENDANCE' || activeTab === 'OVERVIEW') && studentId) {
      const loadAttendance = async () => {
        setLoadingAttendance(true);
        try {
          const res = await mentorService.getMenteeAttendance(studentId, selectedAttendanceSem);
          setAttendanceData(res);
          if (res.monthlyBreakdown && res.monthlyBreakdown.length > 0 && !selectedMonthKey) {
            setSelectedMonthKey(res.monthlyBreakdown[0].monthKey);
          }
        } catch (err) {
          console.error('Failed to load attendance:', err);
        } finally {
          setLoadingAttendance(false);
        }
      };
      loadAttendance();
    }
  }, [activeTab, studentId, selectedAttendanceSem]);

  // 4. Fetch Notes
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
    if (activeTab === 'NOTES' && studentId) {
      fetchRecords();
    }
  }, [activeTab, studentId]);

  // 5. Fetch Analytics
  useEffect(() => {
    if (activeTab === 'ANALYTICS' && studentId) {
      const loadAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
          const res = await mentorService.getMenteeAnalytics(studentId);
          setAnalyticsData(res);
        } catch (err) {
          console.error('Failed to load analytics:', err);
        } finally {
          setLoadingAnalytics(false);
        }
      };
      loadAnalytics();
    }
  }, [activeTab, studentId]);

  // Handle Create Note
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

  // Handle Excel Upload & Parse
  const handleParseImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please choose an Excel file to upload.');
      return;
    }
    setParsingImport(true);
    try {
      const res = await mentorService.parseParentImport(importFile);
      setImportPreview(res);
      toast.info(`Parsed ${res.totalRows} rows: ${res.validCount} valid, ${res.invalidCount} invalid.`);
    } catch (err: any) {
      console.error('Failed to parse file:', err);
      toast.error(err.response?.data?.error || 'Failed to parse Excel file.');
    } finally {
      setParsingImport(false);
    }
  };

  // Handle Confirm Import
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.validCount === 0) return;
    const validRows = importPreview.preview
      .filter((r) => r.status === 'VALID' && r.studentId)
      .map((r) => ({
        studentId: r.studentId!,
        usn: r.usn,
        parentName: r.parentName,
        parentMobile: r.parentMobile,
        address: r.address,
        emergencyContact: r.emergencyContact,
      }));

    setConfirmingImport(true);
    try {
      const res = await mentorService.confirmParentImport(validRows);
      toast.success(`Successfully updated parent information for ${res.updatedCount} student(s)!`);
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      fetchProfile();
    } catch (err: any) {
      console.error('Failed to confirm import:', err);
      toast.error(err.response?.data?.error || 'Failed to import parent information.');
    } finally {
      setConfirmingImport(false);
    }
  };

  const student = profileData?.student;
  const personalInfo = profileData?.personalInfo;
  const activeMentor = profileData?.activeMentor;
  const summaryCards = profileData?.summaryCards;
  const historyList = profileData?.mentorshipHistory || [];

  const filteredRecords = records.filter((r) => {
    if (selectedNoteCategory === 'ALL') return true;
    return r.concernCategory === selectedNoteCategory;
  });

  const selectedMonthData = attendanceData?.monthlyBreakdown?.find(
    (m) => m.monthKey === selectedMonthKey
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div className="flex items-center gap-4">
          <Link
            to="/mentor/mentees"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Back to My Mentees"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back</span>
          </Link>

          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
              {student?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {student?.name || 'Student Profile'}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold">
                  {student?.usn}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 flex flex-wrap items-center gap-2 mt-0.5 font-medium">
                <span>{student?.department}</span>
                <span>•</span>
                <span>Batch: <strong className="text-slate-800 dark:text-neutral-200">{student?.admissionBatch || '—'}</strong></span>
                <span>•</span>
                <span>Semester {student?.semester} - Section {student?.section}</span>
                <span>•</span>
                <span>Mentor: <strong className="text-indigo-600 dark:text-indigo-400">{activeMentor?.facultyName || 'Assigned'}</strong></span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {student?.mentorshipPhase || 'Semester 1–2'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Record Mentor Note</span>
          </button>
        </div>
      </div>

      {/* ── 7 PROFILE TABS NAVIGATION ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-neutral-800 overflow-x-auto custom-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: Sparkles },
          { id: 'ATTENDANCE', label: 'Attendance', icon: CalendarCheck },
          { id: 'ACADEMICS', label: 'Academic Performance', icon: Award },
          { id: 'PERSONAL', label: 'Personal Information', icon: User },
          { id: 'NOTES', label: 'Mentor Notes', icon: FileText },
          { id: 'ANALYTICS', label: 'Analytics', icon: LineChart },
          { id: 'HISTORY', label: 'Mentor History', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Attendance */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Overall Attendance
                </span>
                <CalendarCheck className="size-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {summaryCards?.attendance?.totalConducted ? `${summaryCards.attendance.attendancePercentage}%` : 'No Records'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {summaryCards?.attendance?.totalConducted
                  ? `${summaryCards.attendance.totalAttended} of ${summaryCards.attendance.totalConducted} classes attended`
                  : 'No sessions recorded yet'}
              </p>
            </div>

            {/* Current Semester */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Semester
                </span>
                <BookOpen className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                Semester {student?.semester}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Section: {student?.section || '—'}
              </p>
            </div>

            {/* Admission Batch */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Admission Batch
                </span>
                <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {student?.admissionBatch || '2026-27'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Cohort Identity (Stable)
              </p>
            </div>

            {/* Academic Standing */}
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Academic Status
                </span>
                <Award className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {(summaryCards?.attendance?.attendancePercentage ?? 100) >= 85 ? 'Good Standing' : 'Needs Attention'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {summaryCards?.latestResult?.displayString || 'Awaiting Results'}
              </p>
            </div>
          </div>

          {/* Quick Details Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Mentor Information */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <UserCheck className="size-3.5 text-indigo-500" />
                <span>Mentorship Relationship</span>
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Current Mentor</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeMentor?.facultyName || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Mentor Department</span>
                  <span className="font-medium text-slate-800 dark:text-neutral-200">{activeMentor?.coreDepartment || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Mentorship Phase</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{student?.mentorshipPhase || 'Semester 1–2'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Assigned Date</span>
                  <span className="text-slate-700 dark:text-neutral-300">
                    {activeMentor?.assignedAt ? new Date(activeMentor.assignedAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Follow-up Summary */}
            <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="size-3.5 text-amber-500" />
                <span>Mentoring Follow-ups</span>
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Open Action Items</span>
                  <span className="font-bold text-amber-600">{summaryCards?.openFollowUps || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-neutral-800">
                  <span className="text-slate-500">Completed Semesters</span>
                  <span className="font-medium text-slate-800 dark:text-neutral-200">{summaryCards?.completedSemesters || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Total Notes Recorded</span>
                  <span className="text-slate-700 dark:text-neutral-300">{profileData?.recentMentoringRecords?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ATTENDANCE (FULL SUBJECTS + CALENDAR + MONTHLY BREAKDOWN) ── */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Semester Filter */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="size-4 text-indigo-500" />
                  <span>Comprehensive Academic Attendance</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Includes all subjects enrolled for the student. Threshold: <strong>85.0%</strong>
                </p>
              </div>

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

            {/* Subject-wise Attendance Table */}
            {loadingAttendance ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Loading attendance...</span>
              </div>
            ) : attendanceData?.subjectWise?.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 font-bold border-b border-slate-200 dark:border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3">Subject Code</th>
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-3 text-center">Conducted</th>
                      <th className="py-2.5 px-3 text-center">Attended</th>
                      <th className="py-2.5 px-3 text-center">Absent</th>
                      <th className="py-2.5 px-3 text-center">Percentage</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                    {attendanceData.subjectWise.map((row) => (
                      <tr key={row.subjectId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {row.subjectCode}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-neutral-200">
                          {row.subjectName}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">{row.conducted}</td>
                        <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {row.attended}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                          {row.conducted - row.attended}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {row.attendancePercentage}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.eligibility === 'MEETS_THRESHOLD'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : row.eligibility === 'NEEDS_ATTENTION'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.eligibility === 'MEETS_THRESHOLD'
                              ? 'Eligible (≥85%)'
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
              <div className="py-8 text-center text-xs text-slate-400">
                No attendance sessions recorded for Semester {selectedAttendanceSem}.
              </div>
            )}
          </div>

          {/* Calendar & Monthly Summary Grid */}
          {/* Calendar & Monthly Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Custom Full-Size Attendance Calendar */}
            <AttendanceCalendar
              calendarData={attendanceData?.calendarData}
              threshold={attendanceData?.threshold ?? 85.0}
              onMonthChange={(mk) => setSelectedMonthKey(mk)}
            />

            {/* Monthly Attendance Breakdown */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 flex items-center gap-2">
                    <Clock className="size-4 text-purple-500" />
                    <span>Monthly Attendance Summary</span>
                  </h3>
                  {attendanceData?.monthlyBreakdown && attendanceData.monthlyBreakdown.length > 0 && (
                    <select
                      value={selectedMonthKey}
                      onChange={(e) => setSelectedMonthKey(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs font-semibold bg-white dark:bg-neutral-900"
                    >
                      {attendanceData.monthlyBreakdown.map((m) => (
                        <option key={m.monthKey} value={m.monthKey}>
                          {m.monthName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedMonthData ? (
                  <div className="space-y-3 text-xs">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-800">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Total Classes</div>
                        <div className="font-black text-slate-800 dark:text-neutral-200 text-sm mt-0.5">{selectedMonthData.totalClasses}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        <div className="text-[10px] font-bold uppercase text-emerald-600">Attended</div>
                        <div className="font-black text-sm mt-0.5">{selectedMonthData.attended}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                        <div className="text-[10px] font-bold uppercase text-rose-600">Missed</div>
                        <div className="font-black text-sm mt-0.5">{selectedMonthData.absent}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                        <div className="text-[10px] font-bold uppercase text-indigo-600">Rate</div>
                        <div className="font-black text-sm mt-0.5">{selectedMonthData.attendancePercentage}%</div>
                      </div>
                    </div>

                    {/* Subject Breakdown Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-neutral-800">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 dark:bg-neutral-800 font-bold text-slate-500 border-b border-slate-100 dark:border-neutral-800">
                          <tr>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-2 text-center">Classes</th>
                            <th className="py-2.5 px-2 text-center">Attended</th>
                            <th className="py-2.5 px-2 text-center">Missed</th>
                            <th className="py-2.5 px-2 text-center">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                          {selectedMonthData.subjectWise.map((sw) => (
                            <tr key={sw.subjectCode} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-neutral-200">
                                <div>{sw.subjectCode}</div>
                                <div className="text-[10px] font-normal text-slate-400">{sw.subjectName}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-medium">{sw.conducted}</td>
                              <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">{sw.attended}</td>
                              <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">{sw.conducted - sw.attended}</td>
                              <td className="py-2.5 px-2 text-center font-black text-indigo-600 dark:text-indigo-400">{sw.attendancePercentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 italic">
                    No monthly attendance breakdown available for this month.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ACADEMIC PERFORMANCE ── */}
      {activeTab === 'ACADEMICS' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="size-4 text-emerald-500" />
                <span>Semester-wise Academic Performance</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Authoritative marks records: CIE 1, CIE 2, Internal Average, and External Examination marks.
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
                  <div key={semGroup.semester} className="rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-neutral-800/80 px-4 py-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Semester {semGroup.semester}</span>
                        {semGroup.isCurrentSemester && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            Current Semester
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">
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
                              <th className="py-2.5 px-3 text-center">Total</th>
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
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        Results not available for Semester {semGroup.semester}.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">Results not available.</div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: PERSONAL INFORMATION & PARENT DATA IMPORT ── */}
      {activeTab === 'PERSONAL' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="size-4 text-indigo-500" />
                  <span>Student &amp; Parent / Guardian Details</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Official personal profile and contact directory.
                </p>
              </div>

              <button
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <FileSpreadsheet className="size-4" />
                <span>Import Parent / Personal Data</span>
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Student Academic Details */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900">
                <h3 className="font-extrabold uppercase text-[11px] text-indigo-600 dark:text-indigo-400 tracking-wider">
                  Student Record
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Student Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{personalInfo?.name || student?.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">USN</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{personalInfo?.usn || student?.usn}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Enrollment Number</span>
                    <span className="font-mono">{personalInfo?.enrollmentNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Roll Number</span>
                    <span>{personalInfo?.rollNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Date of Birth</span>
                    <span>{personalInfo?.dateOfBirth || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Gender</span>
                    <span>{personalInfo?.gender || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Admission Batch</span>
                    <span className="font-bold text-indigo-600">{personalInfo?.admissionBatch || '2026-27'}</span>
                  </div>
                </div>
              </div>

              {/* Parent & Contact Details */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900">
                <h3 className="font-extrabold uppercase text-[11px] text-emerald-600 dark:text-emerald-400 tracking-wider">
                  Parent / Guardian &amp; Address
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Parent / Guardian</span>
                    <span className="font-bold text-slate-900 dark:text-white">{personalInfo?.parentName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Parent Mobile</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <Phone className="size-3 text-emerald-500" />
                      {personalInfo?.parentPhone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Parent Email</span>
                    <span className="flex items-center gap-1">
                      <Mail className="size-3 text-indigo-500" />
                      {personalInfo?.parentEmail || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-neutral-800">
                    <span className="text-slate-400">Emergency Contact</span>
                    <span className="font-mono">{personalInfo?.emergencyContact || '—'}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-400 block mb-1">Permanent Address</span>
                    <p className="text-slate-800 dark:text-neutral-200 font-medium whitespace-pre-line">
                      {personalInfo?.address || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: MENTOR NOTES ── */}
      {activeTab === 'NOTES' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="size-4 text-indigo-500" />
                  <span>Mentor Notes &amp; Observations</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Private mentoring logs, discussion summaries, action plans, and follow-up tracking.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedNoteCategory}
                  onChange={(e) => setSelectedNoteCategory(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-semibold"
                >
                  <option value="ALL">All Categories</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="ATTENDANCE">Attendance</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="PARENT_INTERACTION">Parent Interaction</option>
                  <option value="CAREER">Career</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="OTHER">Other</option>
                </select>

                <button
                  onClick={() => setRecordModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
                >
                  <Plus className="size-3.5" />
                  <span>Log Note</span>
                </button>
              </div>
            </div>

            {loadingRecords ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-indigo-500" />
                <span>Loading mentor notes...</span>
              </div>
            ) : filteredRecords.length > 0 ? (
              <div className="space-y-3">
                {filteredRecords.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {rec.concernCategory}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(rec.meetingDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.followUpStatus === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {rec.followUpStatus}
                        </span>

                        <button
                          onClick={() => {
                            setTargetRecordId(rec.id);
                            setStatusModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:underline"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-neutral-200">{rec.summary}</p>
                    {rec.actionPlan && (
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-800 text-[11px] text-slate-600 dark:text-neutral-400">
                        <strong className="text-slate-800 dark:text-neutral-200">Action Plan:</strong> {rec.actionPlan}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <FileText className="size-8 mx-auto text-slate-300 dark:text-neutral-700" />
                <p className="text-xs font-medium">No mentor notes recorded yet.</p>
                <button
                  onClick={() => setRecordModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Log First Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: MENTEE ANALYTICS ── */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6 animate-fadeIn">
          {loadingAnalytics ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <RefreshCw className="size-6 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-semibold">Computing comprehensive mentee analytics...</p>
            </div>
          ) : analyticsData ? (
            <MenteeAnalyticsDashboard
              analytics={analyticsData}
              threshold={85.0}
            />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              Unable to load mentee analytics.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: MENTOR HISTORY ── */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl border border-slate-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="size-4 text-indigo-500" />
                <span>Auditable Mentorship History</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Preserves complete historical record of mentor allocations across Semester 1–2 and Semester 3–8 phases.
              </p>
            </div>

            {historyList.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-neutral-800/60 text-slate-600 font-bold border-b border-slate-200 dark:border-neutral-800">
                    <tr>
                      <th className="py-3 px-4">Phase</th>
                      <th className="py-3 px-4">Faculty Mentor</th>
                      <th className="py-3 px-4 text-center">Period</th>
                      <th className="py-3 px-4 text-center">Academic Year</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Assigned Date</th>
                      <th className="py-3 px-4">Reassignment Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                    {historyList.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                          {h.phase}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div>{h.mentorName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{h.mentorEmail}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">{h.period}</td>
                        <td className="py-3 px-4 text-center">{h.academicYear}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            h.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : h.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(h.assignedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic">
                          {h.reassignmentReason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No historical mentor records found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CALENDAR DATE INSPECTION MODAL ── */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="size-4 text-indigo-500" />
                <span>Attendance Sessions on {selectedCalendarDate}</span>
              </h3>
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {attendanceData?.calendarData?.[selectedCalendarDate]?.sessions?.map((sess, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/40 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-neutral-200">{sess.subjectName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Code: {sess.subjectCode} • Period: {sess.period}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sess.status === 'PRESENT'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {sess.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PARENT DATA EXCEL IMPORT MODAL ── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-emerald-500" />
                <span>Import Parent / Personal Information</span>
              </h3>
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview(null);
                  setImportFile(null);
                }}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Upload an Excel file with columns: <strong>USN, Student Name, Parent Name, Parent Mobile, Address</strong>.
              Only students in your assigned mentee cohort can be updated.
            </p>

            {/* Upload Step */}
            {!importPreview && (
              <form onSubmit={handleParseImport} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-neutral-700 rounded-2xl p-6 text-center space-y-3">
                  <Upload className="size-8 mx-auto text-slate-400" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-600 dark:text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {importFile && (
                    <p className="text-xs font-bold text-emerald-600">Selected: {importFile.name}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || parsingImport}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    {parsingImport ? <RefreshCw className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    <span>{parsingImport ? 'Validating...' : 'Parse & Validate'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Preview Step */}
            {importPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Total Rows: {importPreview.totalRows}</span>
                  <div className="flex gap-2">
                    <span className="text-emerald-600">Valid: {importPreview.validCount}</span>
                    <span className="text-rose-600">Invalid: {importPreview.invalidCount}</span>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-neutral-800 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 dark:bg-neutral-800 font-bold text-slate-600">
                      <tr>
                        <th className="p-2">USN</th>
                        <th className="p-2">Student</th>
                        <th className="p-2">Parent</th>
                        <th className="p-2">Mobile</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                      {importPreview.preview.map((r, i) => (
                        <tr key={i} className={r.status === 'VALID' ? 'bg-emerald-50/20' : 'bg-rose-50/20'}>
                          <td className="p-2 font-mono font-bold">{r.usn || '—'}</td>
                          <td className="p-2">{r.studentName}</td>
                          <td className="p-2">{r.parentName}</td>
                          <td className="p-2 font-mono">{r.parentMobile}</td>
                          <td className="p-2 text-center">
                            {r.status === 'VALID' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                                Valid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700" title={r.errors.join(', ')}>
                                {r.errors[0] || 'Invalid'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setImportPreview(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importPreview.validCount === 0 || confirmingImport}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
                  >
                    {confirmingImport ? <RefreshCw className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>{confirmingImport ? 'Saving...' : `Confirm Import (${importPreview.validCount} valid)`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RECORD MENTORING NOTE MODAL ── */}
      {recordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="size-4 text-indigo-500" />
                <span>Log Mentoring Session</span>
              </h3>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Date *
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
                    Category *
                  </label>
                  <select
                    value={sessionForm.concernCategory}
                    onChange={(e) => setSessionForm({ ...sessionForm, concernCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-semibold"
                  >
                    <option value="GENERAL">General</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="ATTENDANCE">Attendance</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="PARENT_INTERACTION">Parent Interaction</option>
                    <option value="CAREER">Career</option>
                    <option value="DISCIPLINE">Discipline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-neutral-300 font-bold mb-1">
                  Discussion Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  value={sessionForm.summary}
                  onChange={(e) => setSessionForm({ ...sessionForm, summary: e.target.value })}
                  placeholder="Key points discussed during mentoring session..."
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRecord}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {savingRecord ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{savingRecord ? 'Saving...' : 'Save Note'}</span>
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
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"
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
                  Resolution Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Notes explaining resolution progress..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingStatus}
                  onClick={handleUpdateStatus}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {savingStatus ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  <span>{savingStatus ? 'Saving...' : 'Save Status'}</span>
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
