import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Calendar,
  Users,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Unlink,
  Link2,
  Search,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Loader2,
  Building2,
  X,
  Trash2,
  Plus,
  Edit3,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { RootState } from '../../store';
import hodService, {
  HodSemesterCohortPayload,
  HodCohortStudentItem,
  HodGoogleSheetConnectionItem,
  HodGoogleSheetTabItem,
} from '../../services/hod.service';
import GoogleAccountConnection, { GoogleAccountData } from '../../components/hod/GoogleAccountConnection';
import usePersistentState from '../../hooks/usePersistentState';

interface AttendanceSectionRow {
  id: string;
  section: string;
  spreadsheetUrl: string;
}

export const HodSemesterCohortPage: React.FC = () => {
  const { semester } = useParams<{ semester: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const semesterNum = parseInt(semester || '1', 10);
  const isValidSemester = !isNaN(semesterNum) && semesterNum >= 1 && semesterNum <= 8;

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<HodSemesterCohortPayload | null>(null);
  
  // Persisted Filters & Search across tab switches and refreshes
  const [searchQuery, setSearchQuery] = usePersistentState<string>(`hod_cohort_search_${semesterNum}`, '');
  const [selectedSectionFilter, setSelectedSectionFilter] = usePersistentState<string>(`hod_cohort_sec_filter_${semesterNum}`, 'ALL');

  // Available Sections & Attendance Connections
  const [availableSemesterSections, setAvailableSemesterSections] = useState<string[]>([]);
  const [attendanceConnectionsList, setAttendanceConnectionsList] = useState<HodGoogleSheetConnectionItem[]>([]);
  
  // Persisted Attendance draft rows for modal
  const [attendanceRows, setAttendanceRows, clearAttendanceRows] = usePersistentState<AttendanceSectionRow[]>(
    `hod_cohort_attendance_rows_${semesterNum}`,
    [{ id: 'row-1', section: 'Section A', spreadsheetUrl: '' }]
  );

  // Google OAuth State
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountData>({
    connected: false,
    email: null,
  });
  const [checkingAccount, setCheckingAccount] = useState(true);

  // Modals for connecting sheets
  const [connectModalType, setConnectModalType] = useState<'ATTENDANCE' | 'BITWISE_MARKS' | null>(null);
  const [connectSpreadsheetUrl, setConnectSpreadsheetUrl] = useState<string>('');
  const [connectLoading, setConnectLoading] = useState<boolean>(false);

  // Refresh & Disconnect states
  const [refreshingSheetId, setRefreshingSheetId] = useState<string | null>(null);
  const [disconnectModalData, setDisconnectModalData] = useState<{ id: string; type: string; title: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);

  // Mapping state
  const [savingMappingTabId, setSavingMappingTabId] = useState<string | null>(null);

  const activeAY = data?.academicYear || '2026-27';
  const deptCode = data?.department?.code || user?.department?.code || 'CSE';
  const deptName = data?.department?.name || user?.department?.name || 'Department of Computer Science & Engineering';

  // Fetch Cohort Data
  const fetchCohortData = async () => {
    if (!isValidSemester) return;
    setLoading(true);
    try {
      const [cohortRes, oauthRes, secRes, sheetsRes] = await Promise.all([
        hodService.getSemesterCohort(semesterNum),
        hodService.getGoogleAccountStatus().catch(() => ({
          connected: false,
          isConnected: false,
          email: null,
          displayName: null,
          googleAccountId: null,
          profilePicture: null,
          status: 'DISCONNECTED',
          connectedAt: null,
          lastConnectedAt: null,
          lastUsedAt: null,
        })),
        hodService.getStudentSections(semesterNum).catch(() => []),
        hodService.getSemesterGoogleSheets(semesterNum).catch(() => null),
      ]);

      setData(cohortRes);

      // Collect sections specifically for this semester
      const secSet = new Set<string>();
      if (Array.isArray(secRes)) {
        secRes.forEach((s: any) => {
          if (s.name) secSet.add(s.name.startsWith('Section') ? s.name : `Section ${s.name}`);
        });
      }
      (cohortRes?.summary?.sectionsList || []).forEach((s: string) => {
        if (s && s !== 'Unallocated' && s !== '—') {
          secSet.add(s.startsWith('Section') ? s : `Section ${s}`);
        }
      });
      (sheetsRes?.divisions || []).forEach((d: any) => {
        if (d.section) {
          secSet.add(`Section ${d.section}`);
        }
      });

      const resolvedSections = Array.from(secSet).sort();
      const finalSections = resolvedSections.length > 0 ? resolvedSections : ['Section A', 'Section B'];
      setAvailableSemesterSections(finalSections);

      // Collect attendance connections list
      const attConns: HodGoogleSheetConnectionItem[] = [];
      if (Array.isArray(cohortRes?.googleSheets?.attendanceConnections) && cohortRes.googleSheets.attendanceConnections.length > 0) {
        attConns.push(...cohortRes.googleSheets.attendanceConnections);
      } else if (cohortRes?.googleSheets?.attendance) {
        attConns.push(cohortRes.googleSheets.attendance);
      }
      if (Array.isArray(sheetsRes?.attendanceConnections) && sheetsRes.attendanceConnections.length > 0) {
        sheetsRes.attendanceConnections.forEach((c: any) => {
          if (!attConns.some((existing) => existing.id === c.id)) {
            attConns.push(c);
          }
        });
      }
      setAttendanceConnectionsList(attConns);

      const isConn = Boolean(oauthRes?.connected || oauthRes?.isConnected) && Boolean(oauthRes?.email);
      setGoogleAccount({
        connected: isConn,
        isConnected: isConn,
        email: oauthRes?.email || null,
        displayName: oauthRes?.displayName || null,
        googleAccountId: oauthRes?.googleAccountId || null,
        profilePicture: oauthRes?.profilePicture || null,
        status: oauthRes?.status || (isConn ? 'CONNECTED' : 'DISCONNECTED'),
        connectedAt: oauthRes?.connectedAt || null,
        lastUsedAt: oauthRes?.lastUsedAt || null,
      });
    } catch (err: any) {
      console.error('Failed to load semester cohort data:', err);
      toast.error('Failed to load semester cohort data.');
    } finally {
      setLoading(false);
      setCheckingAccount(false);
    }
  };

  useEffect(() => {
    fetchCohortData();
  }, [semesterNum]);

  // Connect Google Account OAuth Handler
  const handleConnectGoogleAccount = async (forceSelect: boolean = true) => {
    try {
      const res = await hodService.getGoogleOAuthAuthUrl(forceSelect);
      if (res?.authUrl) {
        if (res.authUrl.startsWith('http')) {
          const popup = window.open(res.authUrl, '_blank', 'width=600,height=700');
          const checkTimer = setInterval(async () => {
            if (!popup || popup.closed) {
              clearInterval(checkTimer);
              const updated = await hodService.getGoogleAccountStatus().catch(() => null);
              const isConn = Boolean(updated?.connected || updated?.isConnected) && Boolean(updated?.email);
              if (updated && isConn) {
                setGoogleAccount({
                  connected: true,
                  isConnected: true,
                  email: updated.email,
                  displayName: updated.displayName,
                  googleAccountId: updated.googleAccountId,
                  profilePicture: updated.profilePicture,
                  status: 'CONNECTED',
                });
                toast.success(`Google Account connected: ${updated.email}`);
              }
            }
          }, 1200);
        } else {
          await hodService.submitGoogleOAuthCallback({ code: 'mock-auth-code' });
          const updated = await hodService.getGoogleAccountStatus();
          const isConn = Boolean(updated?.connected || updated?.isConnected) && Boolean(updated?.email);
          setGoogleAccount({
            connected: isConn,
            isConnected: isConn,
            email: updated?.email || null,
            displayName: updated?.displayName || null,
            googleAccountId: updated?.googleAccountId || null,
            profilePicture: updated?.profilePicture || null,
            status: isConn ? 'CONNECTED' : 'DISCONNECTED',
          });
          if (isConn && updated?.email) {
            toast.success(`Google Account connected: ${updated.email}`);
          }
        }
      }
    } catch (err: any) {
      console.error('Google OAuth failed:', err);
      toast.error('Unable to connect Google account. Please try again.');
    }
  };

  // Open Attendance Modal
  const handleOpenAttendanceModal = (prefillSection?: string) => {
    const defaultSec = prefillSection || (availableSemesterSections[0] || 'Section A');
    const existingConn = attendanceConnectionsList.find((c) => {
      const cleanC = (c.section || '').replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
      const cleanT = defaultSec.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
      return cleanC === cleanT;
    });

    setAttendanceRows([
      {
        id: `row_${Date.now()}`,
        section: defaultSec,
        spreadsheetUrl: existingConn?.spreadsheetUrl || '',
      },
    ]);
    setConnectModalType('ATTENDANCE');
  };

  const handleAddAttendanceRow = () => {
    const usedSections = new Set(
      attendanceRows.map((r) =>
        r.section.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase()
      )
    );
    const nextAvailable = availableSemesterSections.find((s) => {
      const clean = s.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
      return !usedSections.has(clean);
    }) || availableSemesterSections[0] || 'Section A';

    setAttendanceRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        section: nextAvailable,
        spreadsheetUrl: '',
      },
    ]);
  };

  const handleRemoveAttendanceRow = (id: string) => {
    if (attendanceRows.length <= 1) return;
    setAttendanceRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateAttendanceRow = (id: string, field: 'section' | 'spreadsheetUrl', value: string) => {
    setAttendanceRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Connect Attendance Sheets Batch Handler
  const handleConnectAttendanceSheets = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate rows
    const seen = new Set<string>();
    for (let i = 0; i < attendanceRows.length; i++) {
      const row = attendanceRows[i];
      if (!row.section?.trim()) {
        toast.error(`Row ${i + 1}: Select a section.`);
        return;
      }
      const cleanSec = row.section.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
      if (seen.has(cleanSec)) {
        toast.error('Each section can have only one attendance sheet.');
        return;
      }
      seen.add(cleanSec);

      if (!row.spreadsheetUrl?.trim()) {
        toast.error(`Row ${i + 1}: Enter the Google Spreadsheet URL.`);
        return;
      }

      const sIdMatch = row.spreadsheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!sIdMatch) {
        toast.error(`Row ${i + 1}: Enter a valid Google Sheets URL.`);
        return;
      }
    }

    setConnectLoading(true);
    try {
      const payload = attendanceRows.map((r) => ({
        section: r.section.trim(),
        spreadsheetUrl: r.spreadsheetUrl.trim(),
      }));

      await hodService.connectSemesterAttendanceSheetsBatch(semesterNum, {
        connections: payload,
        academicYear: activeAY,
      });

      toast.success(`Attendance Google Sheet(s) connected successfully!`);
      setConnectModalType(null);
      await fetchCohortData();
    } catch (err: any) {
      console.error('Failed to connect Attendance Google Sheets:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to connect Attendance Google Sheets.';
      toast.error(msg);
    } finally {
      setConnectLoading(false);
    }
  };

  // Connect Bitwise Marks Sheet Handler
  const handleConnectBitwiseSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectSpreadsheetUrl.trim()) {
      toast.error('Please enter a valid Google Spreadsheet URL.');
      return;
    }

    setConnectLoading(true);
    try {
      await hodService.connectSemesterGoogleSheet(semesterNum, {
        spreadsheetUrl: connectSpreadsheetUrl.trim(),
        sheetType: 'BITWISE_MARKS',
        academicYear: activeAY,
      });

      toast.success('Bitwise Marks Google Sheet connected successfully!');
      setConnectModalType(null);
      setConnectSpreadsheetUrl('');
      await fetchCohortData();
    } catch (err: any) {
      console.error('Failed to connect Bitwise Marks Google Sheet:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to connect Bitwise Marks Google Sheet.';
      toast.error(msg);
    } finally {
      setConnectLoading(false);
    }
  };

  // Refresh Tabs Handler
  const handleRefreshSheet = async (connectionId: string, sheetLabel: string) => {
    setRefreshingSheetId(connectionId);
    try {
      await hodService.refreshGoogleSheet(connectionId);
      toast.success(`${sheetLabel} tabs refreshed from Google Spreadsheet.`);
      await fetchCohortData();
    } catch (err: any) {
      console.error('Failed to refresh Google Sheet:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to refresh sheet tabs.';
      toast.error(msg);
    } finally {
      setRefreshingSheetId(null);
    }
  };

  // Disconnect Sheet Handler
  const handleDisconnectSheet = async () => {
    if (!disconnectModalData) return;
    setDisconnecting(true);
    try {
      await hodService.disconnectGoogleSheet(disconnectModalData.id);
      toast.success(`${disconnectModalData.title} Google Sheet disconnected.`);
      setDisconnectModalData(null);
      await fetchCohortData();
    } catch (err: any) {
      console.error('Failed to disconnect Google Sheet:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to disconnect Google Sheet.';
      toast.error(msg);
    } finally {
      setDisconnecting(false);
    }
  };

  // Tab -> Subject Mapping Handler
  const handleMapTab = async (connectionId: string, tabId: string, subjectId: string | null) => {
    setSavingMappingTabId(tabId);
    try {
      await hodService.mapGoogleSheetTab(connectionId, {
        tabId,
        subjectId: subjectId && subjectId !== 'NONE' ? subjectId : null,
      });
      toast.success('Tab mapping saved successfully.');
      await fetchCohortData();
    } catch (err: any) {
      console.error('Failed to map tab to subject:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to update tab mapping.';
      toast.error(msg);
    } finally {
      setSavingMappingTabId(null);
    }
  };

  // Filtered students for table
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;

    if (selectedSectionFilter !== 'ALL') {
      list = list.filter((s) => s.section === selectedSectionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const nameMatch = s.name?.toLowerCase().includes(q);
        const usnMatch = s.usn?.toLowerCase().includes(q);
        const enrollMatch = s.enrollmentNumber?.toLowerCase().includes(q);
        const appMatch = s.applicationNumber?.toLowerCase().includes(q);
        const rollMatch = s.rollNumber?.toLowerCase().includes(q);
        const emailMatch = s.email?.toLowerCase().includes(q);
        return nameMatch || usnMatch || enrollMatch || appMatch || rollMatch || emailMatch;
      });
    }

    return list;
  }, [data?.students, searchQuery, selectedSectionFilter]);

  if (!isValidSemester) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Semester Scoping</h2>
        <p className="text-sm text-slate-500">Please select a valid semester between 1 and 8.</p>
        <Link
          to="/hod/students/semesters"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Semester Breakdown
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & BREADCRUMB ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              to="/hod/students/semesters"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Semester Breakdown
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold text-slate-500">Semester {semesterNum} Cohort</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <span>Semester {semesterNum} Cohort</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Departmental student cohort • Semester {semesterNum}
          </p>
        </div>

        {/* Right Header Badges */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dept: <strong>{deptCode}</strong></span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>AY: <strong>{activeAY}</strong></span>
          </div>

          <button
            onClick={fetchCohortData}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs inline-flex items-center gap-1.5"
            title="Refresh Cohort Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Students */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOTAL STUDENTS
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.summary?.totalStudents ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Semester {semesterNum} registered students
          </p>
        </div>

        {/* Sections */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              SECTIONS
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white truncate">
            {loading ? '...' : data?.summary?.sections || 'None'}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {(data?.summary?.sectionsBreakdown || []).map((sec) => (
              <span
                key={sec.section}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Sec {sec.section}: {sec.count}
              </span>
            ))}
          </div>
        </div>

        {/* Active Students */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              ACTIVE STUDENTS
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center text-cyan-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.summary?.activeStudents ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Active and enrolled status in department
          </p>
        </div>
      </div>

      {/* ── GOOGLE SHEET CONNECTIONS SECTION (TWO SEPARATE CARDS) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>Google Sheet Connections</span>
            </h2>
            <p className="text-xs text-slate-500">
              Dedicated Attendance & Bitwise Marks sheets scoped strictly to Semester {semesterNum}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* CARD 1: ATTENDANCE GOOGLE SHEETS (SECTION-WISE)              */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Card Top Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Attendance Google Sheets</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Section-specific master spreadsheets for daily attendance records
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAttendanceModal()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/70 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Sheets</span>
                </button>
              </div>

              {/* Section-Wise Connections List */}
              <div className="mt-4 space-y-3">
                {availableSemesterSections.map((secName) => {
                  const cleanS = secName.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
                  const conn = attendanceConnectionsList.find((c) => {
                    const cleanC = (c.section || '').replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
                    return cleanC === cleanS;
                  });
                  const isConnected = Boolean(conn && conn.status !== 'DISCONNECTED');

                  return (
                    <div
                      key={secName}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isConnected
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                          : 'bg-slate-50/30 dark:bg-slate-800/20 border-dashed border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Section Item Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{secName}</span>
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isConnected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                            }`}
                          />
                          {isConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>

                      {isConnected && conn ? (
                        <div className="mt-2.5 space-y-2.5 text-xs">
                          <div className="space-y-1 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Account:</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                                {conn.accountEmail || googleAccount.email || '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px]">Spreadsheet:</span>
                              <a
                                href={conn.spreadsheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                              >
                                <span className="truncate">Open Sheet</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            </div>
                          </div>

                          {/* Tabs & Subject Mappings */}
                          {conn.tabs && conn.tabs.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                                Discovered Tabs ({conn.tabs.length})
                              </span>
                              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                                {conn.tabs.map((tab) => {
                                  const isSpecialTab =
                                    tab.sheetType === 'SPECIAL' || /final\s*marks|final/i.test(tab.title);
                                  return (
                                    <div
                                      key={tab.id}
                                      className="p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex items-center justify-between gap-2 text-[11px]"
                                    >
                                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200 truncate">
                                        {tab.title}
                                      </span>
                                      {isSpecialTab ? (
                                        <span className="text-[9px] font-bold text-slate-400 italic">Admin Tab</span>
                                      ) : (
                                        <div className="flex items-center gap-1 shrink-0">
                                          {savingMappingTabId === tab.id && (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600" />
                                          )}
                                          <select
                                            value={tab.subjectId || 'NONE'}
                                            onChange={(e) =>
                                              handleMapTab(
                                                conn.id,
                                                tab.id,
                                                e.target.value === 'NONE' ? null : e.target.value
                                              )
                                            }
                                            disabled={savingMappingTabId === tab.id}
                                            className="px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-semibold text-slate-800 dark:text-slate-200 max-w-[130px] truncate"
                                          >
                                            <option value="NONE">Unmapped</option>
                                            {(data?.subjects || []).map((sub) => (
                                              <option key={sub.id} value={sub.id}>
                                                {sub.code} — {sub.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Section Connection Actions */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <a
                                href={conn.spreadsheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center gap-1"
                              >
                                <span>Open Sheet</span>
                                <ExternalLink className="w-3 h-3 text-indigo-600" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleRefreshSheet(conn.id, `${secName} Attendance`)}
                                disabled={refreshingSheetId === conn.id}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 text-indigo-600 ${refreshingSheetId === conn.id ? 'animate-spin' : ''}`} />
                                <span>{refreshingSheetId === conn.id ? 'Refreshing...' : 'Refresh'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenAttendanceModal(secName)}
                                className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setDisconnectModalData({
                                  id: conn.id,
                                  type: 'ATTENDANCE',
                                  title: `${secName} Attendance`,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 inline-flex items-center gap-1"
                            >
                              <Unlink className="w-3 h-3" />
                              <span>Disconnect</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            No attendance sheet connected for {secName}.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAttendanceModal(secName)}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Connect Sheet</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* CARD 2: BITWISE MARKS GOOGLE SHEET                            */}
          {/* ───────────────────────────────────────────────────────────── */}
          <GoogleSheetCard
            title="Bitwise Marks Google Sheet"
            subtitle="Master spreadsheet for bit-wise academic assessment marks"
            sheetType="BITWISE_MARKS"
            semesterNum={semesterNum}
            connection={data?.googleSheets?.bitwiseMarks || null}
            subjects={data?.subjects || []}
            googleAccount={googleAccount}
            isRefreshing={refreshingSheetId === data?.googleSheets?.bitwiseMarks?.id}
            isSavingMappingTabId={savingMappingTabId}
            onConnect={() => setConnectModalType('BITWISE_MARKS')}
            onRefresh={(connId) => handleRefreshSheet(connId, 'Bitwise Marks')}
            onDisconnect={(conn) =>
              setDisconnectModalData({
                id: conn.id,
                type: 'BITWISE_MARKS',
                title: 'Bitwise Marks',
              })
            }
            onMapTab={handleMapTab}
          />
        </div>
      </div>

      {/* ── STUDENT COHORT TABLE ── */}
      <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Semester {semesterNum} Students</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {filteredStudents.length} Students
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified students enrolled in Semester {semesterNum} of {deptName}.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[240px] max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Optional Section Filter inside this Semester */}
            {data?.summary?.sectionsList && data.summary.sectionsList.length > 1 && (
              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Sections</option>
                {data.summary.sectionsList.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800">
              <tr className="border-b border-neutral-800 text-[10px] font-black uppercase tracking-widest text-white">
                <th className="py-3.5 px-4 w-12 text-center text-white">#</th>
                <th className="py-3.5 px-4 text-white">USN / Enrollment No</th>
                <th className="py-3.5 px-4 text-white">Student Name</th>
                <th className="py-3.5 px-4 text-white">Department</th>
                <th className="py-3.5 px-4 text-center text-white">Section</th>
                <th className="py-3.5 px-4 text-white">Roll Number</th>
                <th className="py-3.5 px-4 text-white">Academic Year</th>
                <th className="py-3.5 px-4 text-center text-white">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-xs text-slate-500 font-semibold mt-2">Loading semester cohort students...</p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No students found for Semester {semesterNum}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Try adjusting your search criteria.'
                        : 'No students are currently enrolled in this semester.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const identifier =
                    st.usn ||
                    st.enrollmentNumber ||
                    (st.applicationNumber ? `App: ${st.applicationNumber}` : '—');
                  const isActive =
                    st.status === 'ACTIVE' || st.status === 'ENROLLED' || st.status === 'APPROVED';

                  return (
                    <tr
                      key={st.id || idx}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {identifier}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                        {st.email && (
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]">
                            {st.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {st.department || deptCode}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md font-extrabold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {st.section || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {st.rollNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {st.academicYear || activeAY}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {st.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CONNECT GOOGLE SHEET MODAL                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {connectModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-6 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {connectModalType === 'ATTENDANCE' ? 'Connect Attendance Sheets' : 'Connect Bitwise Marks Sheet'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Semester {semesterNum} • {deptCode} • {activeAY}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setConnectModalType(null);
                  setConnectSpreadsheetUrl('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Google Account OAuth Status Check */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Google Account
                </span>
                <GoogleAccountConnection
                  account={googleAccount}
                  checking={checkingAccount}
                  onConnect={() => handleConnectGoogleAccount(true)}
                />
              </div>

              {connectModalType === 'ATTENDANCE' ? (
                <form id="connect-attendance-form" onSubmit={handleConnectAttendanceSheets} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Attendance Section Sheets
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {attendanceRows.length} of {availableSemesterSections.length} section(s) configured
                      </span>
                    </div>

                    <div className="space-y-3">
                      {attendanceRows.map((row, idx) => {
                        const isUrlValid =
                          !row.spreadsheetUrl ||
                          /spreadsheets\/d\/([a-zA-Z0-9-_]+)/.test(row.spreadsheetUrl);

                        return (
                          <div
                            key={row.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                Section Row #{idx + 1}
                              </span>
                              {attendanceRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttendanceRow(row.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                                  title="Remove Section Row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Section Selection */}
                              <div className="sm:col-span-1">
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Section <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={row.section}
                                  onChange={(e) => handleUpdateAttendanceRow(row.id, 'section', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                                >
                                  {availableSemesterSections.map((sec) => {
                                    const cleanSec = sec.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase();
                                    const isTaken = attendanceRows.some(
                                      (r) =>
                                        r.id !== row.id &&
                                        r.section.replace(/^(Section|Division|Sec|Div)\s*/i, '').trim().toUpperCase() === cleanSec
                                    );
                                    return (
                                      <option key={sec} value={sec} disabled={isTaken}>
                                        {sec} {isTaken ? '(Selected)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Google Spreadsheet URL */}
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Google Spreadsheet URL <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="url"
                                  required
                                  placeholder="https://docs.google.com/spreadsheets/d/1aBcDeFg.../edit"
                                  value={row.spreadsheetUrl}
                                  onChange={(e) => handleUpdateAttendanceRow(row.id, 'spreadsheetUrl', e.target.value)}
                                  className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 ${
                                    !isUrlValid
                                      ? 'border-rose-400 focus:border-rose-500'
                                      : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'
                                  }`}
                                />
                                {!isUrlValid && (
                                  <p className="text-[10px] text-rose-500 font-bold mt-1">
                                    Enter a valid Google Sheets URL.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Another Section Button */}
                    {attendanceRows.length < availableSemesterSections.length && (
                      <button
                        type="button"
                        onClick={handleAddAttendanceRow}
                        className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add Another Section</span>
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <form id="connect-bitwise-form" onSubmit={handleConnectBitwiseSheet} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Google Spreadsheet URL <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://docs.google.com/spreadsheets/d/1aBcDeFg.../edit"
                      value={connectSpreadsheetUrl}
                      onChange={(e) => setConnectSpreadsheetUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Paste the full URL of the exact Google Spreadsheet for Semester {semesterNum}.
                    </p>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  setConnectModalType(null);
                  setConnectSpreadsheetUrl('');
                }}
                disabled={connectLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              {connectModalType === 'ATTENDANCE' ? (
                <button
                  type="submit"
                  form="connect-attendance-form"
                  disabled={connectLoading || attendanceRows.some((r) => !r.spreadsheetUrl.trim())}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {connectLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting Sheets...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Connect All Sheets
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  form="connect-bitwise-form"
                  disabled={connectLoading || !connectSpreadsheetUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {connectLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Connect Sheet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DISCONNECT CONFIRMATION MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {disconnectModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Disconnect {disconnectModalData.title} Sheet?
                </h3>
                <p className="text-xs text-slate-500">
                  Semester {semesterNum} Cohort Integration
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to disconnect this Google Spreadsheet? Other section connections and previously recorded attendance data will not be deleted.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDisconnectModalData(null)}
                disabled={disconnecting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnectSheet}
                disabled={disconnecting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/30 inline-flex items-center gap-1.5"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect Sheet
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

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SEMESTER GOOGLE SHEET CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface GoogleSheetCardProps {
  title: string;
  subtitle: string;
  sheetType: 'ATTENDANCE' | 'BITWISE_MARKS';
  semesterNum: number;
  connection: HodGoogleSheetConnectionItem | null;
  subjects: Array<{ id: string; name: string; code: string; type: string; credits: number; semester: number }>;
  googleAccount: GoogleAccountData;
  isRefreshing: boolean;
  isSavingMappingTabId: string | null;
  onConnect: () => void;
  onRefresh: (connectionId: string) => void;
  onDisconnect: (connection: HodGoogleSheetConnectionItem) => void;
  onMapTab: (connectionId: string, tabId: string, subjectId: string | null) => void;
}

const GoogleSheetCard: React.FC<GoogleSheetCardProps> = ({
  title,
  subtitle,
  sheetType,
  semesterNum,
  connection,
  subjects,
  googleAccount,
  isRefreshing,
  isSavingMappingTabId,
  onConnect,
  onRefresh,
  onDisconnect,
  onMapTab,
}) => {
  const isConnected = Boolean(connection && connection.status !== 'DISCONNECTED');

  return (
    <div className="glass-card rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm p-5 flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                sheetType === 'ATTENDANCE'
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{title}</span>
              </h3>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
              isConnected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Connected Info Details */}
        {isConnected && connection ? (
          <div className="mt-4 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Google Account:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                  {connection.accountEmail || googleAccount.email || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Spreadsheet:</span>
                <a
                  href={connection.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                  title={connection.spreadsheetUrl}
                >
                  <span className="truncate">Open Sheet</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>

              {connection.connectedAt && (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Connected Date:</span>
                  <span className="text-slate-800 dark:text-slate-300">
                    {new Date(connection.connectedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Discovered Sheet Tabs & Mapping Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Discovered Spreadsheet Tabs ({connection.tabs?.length || 0})
                </span>
                <span className="text-[10px] text-slate-400">
                  Source: Exact connected sheet
                </span>
              </div>

              {(!connection.tabs || connection.tabs.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500">
                  No tabs discovered yet. Click "Refresh Tabs" to fetch from Google Spreadsheet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {connection.tabs.map((tab) => {
                    const isFinalMarks =
                      tab.sheetType === 'SPECIAL' ||
                      /final\s*marks|final/i.test(tab.title);
                    const isProject = /project/i.test(tab.title);

                    return (
                      <div
                        key={tab.id}
                        className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 flex items-center justify-between gap-3 text-xs"
                      >
                        {/* Tab Title & Badges */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-slate-900 dark:text-white truncate font-mono">
                            {tab.title}
                          </span>

                          {isFinalMarks ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              SPECIAL
                            </span>
                          ) : isProject ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              PROJECT
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Tab #{tab.index + 1}
                            </span>
                          )}
                        </div>

                        {/* Subject Mapping Control */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isFinalMarks ? (
                            <span className="text-[11px] text-slate-400 italic">
                              Administrative Tab
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {isSavingMappingTabId === tab.id && (
                                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                              )}
                              <select
                                value={tab.subjectId || 'NONE'}
                                onChange={(e) =>
                                  onMapTab(
                                    connection.id,
                                    tab.id,
                                    e.target.value === 'NONE' ? null : e.target.value
                                  )
                                }
                                disabled={isSavingMappingTabId === tab.id}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 max-w-[160px] truncate"
                              >
                                <option value="NONE">Unmapped</option>
                                {subjects.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.code} — {sub.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="my-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              No {title.toLowerCase()} linked to Semester {semesterNum}.
            </p>
          </div>
        )}
      </div>

      {/* Card Action Buttons Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        {isConnected && connection ? (
          <>
            <div className="flex items-center gap-2">
              <a
                href={connection.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3 h-3 text-indigo-600" />
              </a>

              <button
                onClick={() => onRefresh(connection.id)}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Tabs'}</span>
              </button>
            </div>

            <button
              onClick={() => onDisconnect(connection)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 inline-flex items-center gap-1"
            >
              <Unlink className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-sm inline-flex items-center justify-center gap-2 transition-all ${
              sheetType === 'ATTENDANCE'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Connect {sheetType === 'ATTENDANCE' ? 'Attendance Sheet' : 'Bitwise Marks Sheet'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default HodSemesterCohortPage;
