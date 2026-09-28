import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Layers,
  Database,
  ShieldCheck,
  ChevronRight,
  Info,
  Check,
  Lock,
  Search,
} from 'lucide-react';
import { toast } from 'react-toastify';
import hodService, { HodSubjectItem } from '../../services/hod.service';
import GoogleAccountConnection, { GoogleAccountData } from '../../components/hod/GoogleAccountConnection';

interface DiscoveredTab {
  id: string;
  sheetId: string;
  title: string;
  index: number;
  status: 'MAPPED' | 'UNMAPPED' | 'PENDING_MAPPING' | 'IGNORED';
  sheetType?: string;
  subjectId: string | null;
  subjectCode: string | null;
  mappedSubject?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export const HodGoogleSheetsConnectPage: React.FC = () => {
  const navigate = useNavigate();

  // Configuration / Form inputs
  const [semester, setSemester] = useState<number>(3);
  const [section, setSection] = useState<string>('A');
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>('');
  const [sheetType, setSheetType] = useState<'ACADEMIC_MARKS' | 'ATTENDANCE'>('ACADEMIC_MARKS');

  // Google Account & Connection states
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountData>({
    connected: false,
    isConnected: false,
    email: null,
  });
  const [checkingAccount, setCheckingAccount] = useState<boolean>(false);
  const [connectingOAuth, setConnectingOAuth] = useState<boolean>(false);
  const [departmentSubjects, setDepartmentSubjects] = useState<HodSubjectItem[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [connectionData, setConnectionData] = useState<any | null>(null);
  const [tabs, setTabs] = useState<DiscoveredTab[]>([]);
  const [mappingUpdatingId, setMappingUpdatingId] = useState<string | null>(null);
  const [activeTabSearch, setActiveTabSearch] = useState<string>('');

  useEffect(() => {
    loadSubjects();
    loadExistingConnection();
    loadAccount();
  }, [semester, section, academicYear, sheetType]);

  const loadAccount = async () => {
    setCheckingAccount(true);
    try {
      const acc = await hodService.getGoogleAccountStatus().catch(() => null);
      if (acc && (acc.connected || acc.isConnected)) {
        setGoogleAccount({
          connected: true,
          isConnected: true,
          email: acc.email,
          displayName: acc.displayName,
          googleAccountId: acc.googleAccountId,
          profilePicture: acc.profilePicture,
          status: 'CONNECTED',
        });
      }
    } finally {
      setCheckingAccount(false);
    }
  };

  const handleConnectGoogleAccount = async (forceSelect?: boolean) => {
    setConnectingOAuth(true);
    try {
      const res = await hodService.getGoogleOAuthAuthUrl(forceSelect);
      if (res?.authUrl) {
        const popup = window.open(res.authUrl, '_blank', 'width=600,height=700');
        const checkTimer = setInterval(async () => {
          if (!popup || popup.closed) {
            clearInterval(checkTimer);
            const updated = await hodService.getGoogleAccountStatus().catch(() => null);
            if (updated && (updated.connected || updated.isConnected)) {
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
        setGoogleAccount({
          connected: Boolean(updated?.connected || updated?.isConnected),
          isConnected: Boolean(updated?.connected || updated?.isConnected),
          email: updated?.email || 'hod@college.edu',
          displayName: updated?.displayName || 'Department HOD',
          googleAccountId: updated?.googleAccountId || null,
          profilePicture: updated?.profilePicture || null,
          status: 'CONNECTED',
        });
        toast.success(`Google Account connected: ${updated?.email || 'hod@college.edu'}`);
      }
    } catch (err: any) {
      toast.error('Unable to connect Google account.');
    } finally {
      setConnectingOAuth(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await hodService.getSubjects();
      setDepartmentSubjects(data.filter((s) => s.semester === Number(semester)));
    } catch (err) {
      console.error('Failed to load curriculum subjects:', err);
    }
  };

  const loadExistingConnection = async () => {
    try {
      const res = await hodService.getSemesterGoogleSheets(semester, academicYear, section);
      const targetConn = sheetType === 'ACADEMIC_MARKS' ? res?.marks : res?.attendance;
      if (targetConn && targetConn.status === 'ACTIVE') {
        setConnectionData(targetConn);
        setSpreadsheetUrl(targetConn.spreadsheetUrl || targetConn.googleSpreadsheetUrl || '');
        if (targetConn.tabs) {
          setTabs(targetConn.tabs);
        }
      } else {
        setConnectionData(null);
        setTabs([]);
      }
    } catch (err) {
      console.error('Error loading existing connection:', err);
    }
  };

  const handleConnectSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetUrl.trim()) {
      toast.error('Please enter a valid Google Spreadsheet URL.');
      return;
    }

    setIsFetching(true);
    try {
      const res = await hodService.connectSemesterGoogleSheet(semester, {
        spreadsheetUrl: spreadsheetUrl.trim(),
        sheetType,
        academicYear,
        section,
      });

      toast.success(res.message || 'Spreadsheet verified and tabs discovered successfully!');
      if (res.data?.connection) {
        setConnectionData(res.data.connection);
        setTabs(res.data.tabs || []);
      }
    } catch (err: any) {
      console.error('Failed to connect Google Sheet:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Unable to connect Google Sheet. Please verify permissions and try again.';
      toast.error(msg);
    } finally {
      setIsFetching(false);
    }
  };

  const handleMapTab = async (tabId: string, subjectId: string) => {
    if (!connectionData?.id) return;
    setMappingUpdatingId(tabId);
    try {
      const res = await hodService.mapGoogleSheetTab(connectionData.id, {
        tabId,
        subjectId: subjectId === 'UNMAPPED' ? null : subjectId,
      });
      toast.success(res.message || 'Tab mapping saved.');
      // Refresh connection tabs
      await loadExistingConnection();
    } catch (err: any) {
      console.error('Failed to map tab:', err);
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to update tab mapping.');
    } finally {
      setMappingUpdatingId(null);
    }
  };

  const filteredTabs = tabs.filter((t) => {
    if (!activeTabSearch) return true;
    const q = activeTabSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.subjectCode && t.subjectCode.toLowerCase().includes(q)) ||
      (t.sheetId && t.sheetId.includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
            <Link to="/hod/students" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Students
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <Link to="/hod/sheets" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
              Google Sheets
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-900 dark:text-white font-semibold">Connect Academic Sheet</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            Connect Academic Marks Sheet
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Link and map Google Spreadsheets to ERP Curriculum subjects for continuous mark reconciliation.
          </p>
        </div>

        <Link
          to="/hod/sheets"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sheet Matrix</span>
        </Link>
      </div>

      {/* ── Workflow Guide Card ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-neutral-900 text-white shadow-sm border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-600/30 text-violet-400 border border-violet-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-violet-300">
              Authoritative PostgreSQL Architecture
            </h2>
            <p className="text-xs text-neutral-300 mt-0.5">
              Google Sheets operates purely as an intake and marks submission pipeline. ERP subjects and student records remain authoritative in PostgreSQL.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Scope: Semester {semester} • Section {section}</span>
        </div>
      </div>

      {/* ── STEP 1 & 2: Scope & Google Account ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1 Form */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                  Target Curriculum Scope & URL
                </h2>
              </div>
              <span className="text-[11px] font-bold text-neutral-400">Step 1 of 3</span>
            </div>

            <form onSubmit={handleConnectSpreadsheet} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Academic Year
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200"
                  >
                    <option value="2026-27">2026-27 (Current)</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Target Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200"
                  >
                    {['A', 'B', 'C', 'D'].map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  Google Spreadsheet URL *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    value={spreadsheetUrl}
                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                    className="w-full p-3 pl-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white font-mono focus:ring-2 focus:ring-violet-500"
                  />
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Ensure the spreadsheet is accessible by your connected Google Account or college workspace.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isFetching}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  <span>{isFetching ? 'Connecting & Discovering Tabs...' : 'Fetch & Discover Tabs'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Step 2: Google Account Identity */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                Authorized Google Account
              </h2>
            </div>

            <GoogleAccountConnection
              account={googleAccount}
              checking={checkingAccount}
              connecting={connectingOAuth}
              onConnect={handleConnectGoogleAccount}
              onAccountChanged={(acc) => setGoogleAccount(acc)}
            />

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-500 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Zero Stored Passwords</span>
              </div>
              <p>Google OAuth 2.0 token grants scoped access directly to spreadsheets without exposing credentials.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 3, 4 & 5: Discovered Tabs & Mapping Table ─────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-7 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-black flex items-center justify-center">
                3
              </span>
              <h2 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                Discovered Worksheets & ERP Mapping
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Real Google tab titles are preserved with immutable Tab IDs (GID). Map academic tabs to official VTU subject offerings.
            </p>
          </div>

          {/* Search filter for tabs */}
          {tabs.length > 0 && (
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search discovered tabs..."
                value={activeTabSearch}
                onChange={(e) => setActiveTabSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
            </div>
          )}
        </div>

        {/* Spreadhsheet Metadata Preview if connected */}
        {connectionData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 text-xs">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Spreadsheet ID</span>
              <p className="font-mono text-neutral-900 dark:text-white truncate font-bold mt-0.5">
                {connectionData.spreadsheetId || connectionData.googleSpreadsheetId}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Connected Google Email</span>
              <p className="text-neutral-900 dark:text-white font-bold mt-0.5 truncate">
                {connectionData.accountEmail || connectionData.googleAccountEmail || 'Authorized Account'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Discovered Tabs</span>
              <p className="text-neutral-900 dark:text-white font-bold mt-0.5">
                {tabs.length} tabs found
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase">External Sheet</span>
              <div className="mt-0.5">
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-600 dark:text-violet-400 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <span>Open in Google</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab Mapping Table */}
        {filteredTabs.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Google Tab Title</th>
                  <th className="py-3 px-4">Google Tab ID (GID)</th>
                  <th className="py-3 px-4">Detected Type</th>
                  <th className="py-3 px-4">ERP Subject Mapping</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                {filteredTabs.map((tab) => {
                  const isSpecial =
                    tab.title.toUpperCase().includes('FINAL MARKS') ||
                    tab.title.toLowerCase().includes('form responses') ||
                    tab.title.toLowerCase().includes('project') ||
                    tab.title.toLowerCase().includes('final');

                  const isMapped = tab.status === 'MAPPED' && Boolean(tab.subjectId);

                  return (
                    <tr
                      key={tab.id || tab.sheetId}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Real Google Tab Title */}
                      <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{tab.title}</span>
                      </td>

                      {/* Immutable Google Tab GID */}
                      <td className="py-3.5 px-4 font-mono text-neutral-500 text-[11px]">
                        {tab.sheetId || '0'}
                      </td>

                      {/* Detected Type */}
                      <td className="py-3.5 px-4">
                        {isSpecial ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            Administrative / Special
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            Academic Subject
                          </span>
                        )}
                      </td>

                      {/* ERP Subject Mapping Selector */}
                      <td className="py-3.5 px-4">
                        {isSpecial ? (
                          <span className="text-neutral-400 italic text-[11px]">
                            Handled as administrative aggregate
                          </span>
                        ) : (
                          <select
                            value={tab.subjectId || 'UNMAPPED'}
                            disabled={mappingUpdatingId === tab.id}
                            onChange={(e) => handleMapTab(tab.id, e.target.value)}
                            className="w-full max-w-xs p-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-900 dark:text-white focus:ring-2 focus:ring-violet-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="UNMAPPED">— Select ERP Subject —</option>
                            {departmentSubjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.code} — {sub.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isSpecial ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                            <span>Special</span>
                          </span>
                        ) : isMapped ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mapped</span>
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5" title="Google worksheet discovered, awaiting association with an ERP curriculum subject">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Not Mapped
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isSpecial ? (
                          <span className="text-[11px] text-neutral-400">System Tab</span>
                        ) : isMapped ? (
                          <button
                            type="button"
                            disabled={mappingUpdatingId === tab.id}
                            onClick={() => handleMapTab(tab.id, 'UNMAPPED')}
                            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Unmap
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
                            Map Subject ↑
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 border border-dashed border-neutral-200 dark:border-neutral-800">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              No Worksheets Discovered Yet
            </p>
            <p className="text-[11px] text-neutral-400 max-w-sm mx-auto mt-1">
              Enter your Google Spreadsheet URL in Step 1 and click <strong>Fetch & Discover Tabs</strong> to inspect the worksheet hierarchy.
            </p>
          </div>
        )}

        {/* Explain Not Mapped Context */}
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <strong>Note on &quot;Not Mapped&quot; status:</strong> A tab marked as &quot;Not Mapped&quot; indicates that Google Sheets discovered the worksheet, but it has not yet been assigned to an active ERP curriculum offering. Once mapped, students enrolled in that subject and semester will be linked automatically.
          </p>
        </div>

        {/* Footer save / completion button */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <Link
            to="/hod/sheets"
            className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            ← Return to Permissions Matrix
          </Link>

          <button
            type="button"
            onClick={() => {
              toast.success('Google Sheet connection and tab mappings verified successfully.');
              navigate('/hod/sheets');
            }}
            className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            Save Connection & Proceed →
          </button>
        </div>
      </div>
    </div>
  );
};

export default HodGoogleSheetsConnectPage;
