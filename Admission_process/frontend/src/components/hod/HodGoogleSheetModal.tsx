import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Unlink,
  Link2,
  Database,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowRight,
  Info,
  Check,
  Plus,
} from 'lucide-react';
import hodService from '../../services/hod.service';
import GoogleAccountConnection, { GoogleAccountData } from './GoogleAccountConnection';

export interface DivisionItem {
  section: string;
  divisionName: string;
  isConnected: boolean;
  connection: any;
}

const DEFAULT_DIVISIONS: DivisionItem[] = [
  { section: 'A', divisionName: 'Division A', isConnected: false, connection: null },
  { section: 'B', divisionName: 'Division B', isConnected: false, connection: null },
  { section: 'C', divisionName: 'Division C', isConnected: false, connection: null },
  { section: 'D', divisionName: 'Division D', isConnected: false, connection: null },
];

interface HodGoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  semester: number | string;
  sheetType: 'ATTENDANCE' | 'ACADEMIC_MARKS';
  initialSection?: string;
  departmentName?: string;
  departmentCode?: string;
  academicYear?: string;
  onSuccess?: () => void;
}

export const HodGoogleSheetModal: React.FC<HodGoogleSheetModalProps> = ({
  isOpen,
  onClose,
  semester,
  sheetType,
  initialSection = 'A',
  departmentName = 'Electronics & Communication Engineering',
  departmentCode = 'ECE',
  academicYear = '2026-27',
  onSuccess,
}) => {
  const [selectedDivision, setSelectedDivision] = useState<string>(initialSection || 'A');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic Divisions State
  const [divisions, setDivisions] = useState<DivisionItem[]>(DEFAULT_DIVISIONS);
  const [connectionData, setConnectionData] = useState<any>(null);
  const [tabs, setTabs] = useState<any[]>([]);
  const [departmentSubjects, setDepartmentSubjects] = useState<any[]>([]);

  // Google OAuth State
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountData>({
    connected: false,
    email: null,
  });
  const [connectingOAuth, setConnectingOAuth] = useState(false);

  // Disconnect Confirmation Modal
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Mutually Exclusive Notification Helpers
  const showError = (msg: string | null) => {
    setErrorMessage(msg);
    if (msg) setSuccessMessage(null);
  };

  const showSuccess = (msg: string | null) => {
    setSuccessMessage(msg);
    if (msg) setErrorMessage(null);
  };

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  useEffect(() => {
    if (isOpen) {
      clearMessages();
      loadInitialData(selectedDivision);
    }
  }, [isOpen, semester, sheetType, selectedDivision]);

  const mergeDivisionsWithBackend = (backendDivs: any[], currentDivs: DivisionItem[]): DivisionItem[] => {
    const sectionsSet = new Set<string>(['A', 'B', 'C', 'D']);
    currentDivs.forEach((d) => sectionsSet.add(d.section));
    (backendDivs || []).forEach((d) => {
      if (d.section) sectionsSet.add(d.section);
    });

    const sortedSections = Array.from(sectionsSet).sort((a, b) => a.localeCompare(b));

    return sortedSections.map((sec) => {
      const backendMatch = (backendDivs || []).find((d: any) => d.section === sec);
      const currentMatch = currentDivs.find((d) => d.section === sec);
      const isConn = Boolean(backendMatch?.isConnected && backendMatch?.connection);
      return {
        section: sec,
        divisionName: backendMatch?.divisionName || `Division ${sec}`,
        isConnected: isConn,
        connection: isConn ? backendMatch.connection : (currentMatch?.connection || null),
      };
    });
  };

  const loadInitialData = async (activeDivision: string = selectedDivision) => {
    setFetchingData(true);
    setCheckingAccount(true);
    try {
      const [oauthRes, sheetRes, subjectsRes] = await Promise.all([
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
        hodService.getSemesterGoogleSheets(semester, academicYear, activeDivision).catch(() => null),
        hodService.getSubjects({ semester: Number(semester) }).catch(() => []),
      ]);

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
      setDepartmentSubjects(subjectsRes || []);

      if (sheetRes) {
        if (sheetRes.divisions) {
          setDivisions((prev) => mergeDivisionsWithBackend(sheetRes.divisions, prev));
        }

        if (sheetType === 'ATTENDANCE') {
          // Find connection matching the active division
          const divItem = (sheetRes.divisions || []).find((d: any) => d.section === activeDivision);
          const activeConn = divItem?.connection || (sheetRes.attendance?.section === activeDivision ? sheetRes.attendance : null);
          setConnectionData(activeConn);
          if (activeConn) {
            setSpreadsheetUrl(activeConn.spreadsheetUrl || '');
            setTabs(activeConn.tabs || []);
          } else {
            setSpreadsheetUrl('');
            setTabs([]);
          }
        } else {
          // Marks connection
          const activeConn = sheetRes.marks;
          setConnectionData(activeConn);
          if (activeConn) {
            setSpreadsheetUrl(activeConn.spreadsheetUrl || '');
            setTabs(activeConn.tabs || []);
          } else {
            setSpreadsheetUrl('');
            setTabs([]);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load Google Sheet connection details:', err);
    } finally {
      setFetchingData(false);
      setCheckingAccount(false);
    }
  };

  const handleSelectDivision = (divSection: string) => {
    setSelectedDivision(divSection);
    clearMessages();
    const divItem = divisions.find((d) => d.section === divSection);
    if (divItem?.isConnected && divItem.connection) {
      setConnectionData(divItem.connection);
      setSpreadsheetUrl(divItem.connection.spreadsheetUrl || '');
      setTabs(divItem.connection.tabs || []);
    } else {
      setConnectionData(null);
      setSpreadsheetUrl('');
      setTabs([]);
    }
  };

  const handleAddDivision = () => {
    const currentSections = divisions.map((d) => d.section);
    // Find next alphabetical letter after existing sections
    const letters = currentSections
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z]$/.test(s));

    let nextLetter = 'E';
    if (letters.length > 0) {
      const maxCharCode = Math.max(...letters.map((l) => l.charCodeAt(0)));
      nextLetter = String.fromCharCode(maxCharCode + 1);
    }

    // Ensure no duplicate if letter already exists
    while (currentSections.includes(nextLetter)) {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    }

    const newDiv: DivisionItem = {
      section: nextLetter,
      divisionName: `Division ${nextLetter}`,
      isConnected: false,
      connection: null,
    };

    setDivisions((prev) => [...prev, newDiv]);
    setSelectedDivision(nextLetter);
    setConnectionData(null);
    setSpreadsheetUrl('');
    setTabs([]);
    showSuccess(`Division ${nextLetter} added. You can now connect its master attendance sheet.`);
  };

  const handleConnectGoogleAccount = async (forceSelect: boolean = true) => {
    setConnectingOAuth(true);
    clearMessages();
    try {
      const res = await hodService.getGoogleOAuthAuthUrl(forceSelect);
      if (res?.authUrl) {
        if (res.authUrl.startsWith('http')) {
          // Open OAuth consent window with select_account prompt
          const popup = window.open(res.authUrl, '_blank', 'width=600,height=700');

          const onMessage = async (event: MessageEvent) => {
            if (event.data && event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
              window.removeEventListener('message', onMessage);
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
                showSuccess(`Google Account connected: ${updated.email}`);
              }
            }
          };
          window.addEventListener('message', onMessage);

          const checkTimer = setInterval(async () => {
            if (!popup || popup.closed) {
              clearInterval(checkTimer);
              window.removeEventListener('message', onMessage);
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
                showSuccess(`Google Account connected: ${updated.email}`);
              }
            }
          }, 1200);
        } else {
          // Dev / mock connect flow
          await hodService.submitGoogleOAuthCallback({ code: 'mock-auth-code' });
          const updated = await hodService.getGoogleAccountStatus();
          setGoogleAccount({
            connected: Boolean(updated?.connected || updated?.isConnected),
            isConnected: Boolean(updated?.connected || updated?.isConnected),
            email: updated?.email || 'yuvarajbtalawar@gmail.com',
            displayName: updated?.displayName || 'Yuvaraj Talawar',
            googleAccountId: updated?.googleAccountId || '10982374618293746',
            profilePicture: updated?.profilePicture || null,
            status: 'CONNECTED',
          });
          showSuccess(`Google Account connected: ${updated?.email || 'yuvarajbtalawar@gmail.com'}`);
        }
      }
    } catch (err: any) {
      console.error('Google OAuth failed:', err);
      showError('Unable to connect Google account. Please try again.');
    } finally {
      setConnectingOAuth(false);
    }
  };

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spreadsheetUrl.trim()) {
      showError('Please enter a valid Google Spreadsheet URL.');
      return;
    }

    setLoading(true);
    setTabs([]);
    clearMessages();

    try {
      const res = await hodService.connectSemesterGoogleSheet(semester, {
        spreadsheetUrl: spreadsheetUrl.trim(),
        sheetType,
        academicYear,
        section: sheetType === 'ATTENDANCE' ? selectedDivision : undefined,
      });

      setConnectionData(res.data?.connection);
      setTabs(res.data?.tabs || []);
      showSuccess(
        sheetType === 'ATTENDANCE'
          ? `Division ${selectedDivision} Attendance Google Sheet connected successfully for Semester ${semester}!`
          : `Academic Marks Google Sheet connected successfully for Semester ${semester}!`
      );
      if (sheetType === 'ATTENDANCE' && res.data?.connection) {
        setDivisions((prev) =>
          prev.map((d) =>
            d.section === selectedDivision
              ? { ...d, isConnected: true, connection: res.data.connection }
              : d
          )
        );
      }
      loadInitialData(selectedDivision);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to connect Google Sheet:', err);
      showError(
        err?.response?.data?.error ||
          'Unable to connect Google Sheet. Please verify the spreadsheet URL and Google account permissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshTabs = async (targetConnId?: string) => {
    const connId = targetConnId || connectionData?.id;
    if (!connId) return;
    setLoading(true);
    clearMessages();
    try {
      const res = await hodService.refreshGoogleSheet(connId);
      setTabs(res.data?.tabs || []);
      showSuccess('Discovered tabs refreshed from Google Sheets API.');
      loadInitialData(selectedDivision);
    } catch (err: any) {
      showError('Failed to refresh tabs from Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const connId = showDisconnectConfirm?.id || connectionData?.id;
    if (!connId) return;
    setLoading(true);
    clearMessages();
    try {
      await hodService.disconnectGoogleSheet(connId);
      const disconnectedSection = showDisconnectConfirm?.section || selectedDivision;
      setShowDisconnectConfirm(null);
      showSuccess('Google Sheet disconnected. Historical attendance and marks records remain intact.');
      setDivisions((prev) =>
        prev.map((d) =>
          d.section === disconnectedSection
            ? { ...d, isConnected: false, connection: null }
            : d
        )
      );
      loadInitialData(selectedDivision);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showError('Failed to disconnect Google Sheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTabNow = async (tab: any) => {
    if (!connectionData?.id) return;
    setSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      let res = null;
      if (sheetType === 'ATTENDANCE') {
        res = await hodService.syncAttendanceSheet({
          connectionId: connectionData.id,
          tabId: tab.id,
          tabTitle: tab.title || tab.sheetTitle,
        });
      } else {
        res = await hodService.syncMarksSheet({
          connectionId: connectionData.id,
          tabId: tab.id,
          tabTitle: tab.title || tab.sheetTitle,
        });
      }

      if (res?.success) {
        setSuccessMessage(
          `Sync Completed! Processed: ${res.data?.recordsProcessed}, Created: ${res.data?.recordsCreated}, Updated: ${res.data?.recordsUpdated}`
        );
        loadInitialData(selectedDivision);
      } else {
        setErrorMessage(res?.message || 'Sync encountered errors.');
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || 'Failed to sync data from tab.');
    } finally {
      setSyncing(false);
    }
  };

  const handleMapTab = async (tabId: string, subjectId: string) => {
    if (!connectionData?.id) return;
    try {
      await hodService.mapGoogleSheetTab(connectionData.id, {
        tabId,
        subjectId: subjectId === 'UNMAPPED' ? null : subjectId,
      });
      loadInitialData(selectedDivision);
    } catch (err) {
      alert('Failed to update tab mapping.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* ── Modal Header ────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Connect {sheetType === 'ATTENDANCE' ? 'Attendance' : 'Academic Marks'} Google Sheet
              </h2>
              <p className="text-xs text-slate-500">
                Division-wise master spreadsheets for <strong className="text-slate-800 dark:text-slate-200">Semester {semester}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Body ──────────────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Status Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Connection Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold">Success</p>
                <p className="mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Academic Scope Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 font-medium">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
              <strong className="text-slate-900 dark:text-white text-xs">{departmentName} ({departmentCode})</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Year</span>
              <strong className="text-slate-900 dark:text-white text-xs">{academicYear}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cohort Semester</span>
              <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                Semester {semester}
              </span>
            </div>
            {sheetType === 'ATTENDANCE' && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Division</span>
                <span className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                  Division {selectedDivision}
                </span>
              </div>
            )}
          </div>

          {/* Google Account Section */}
          <GoogleAccountConnection
            account={googleAccount}
            checking={checkingAccount}
            connecting={connectingOAuth}
            onConnect={handleConnectGoogleAccount}
          />

          {/* ── Division Connection Status Matrix (Per Specification Section 5) ── */}
          {sheetType === 'ATTENDANCE' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  ATTENDANCE GOOGLE SHEETS (BY DIVISION)
                </span>
                <span className="text-[10px] text-slate-400">
                  Semester {semester} Division Workbooks
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {divisions.map((divItem) => {
                  const div = divItem.section;
                  const isConn = Boolean(divItem.isConnected && divItem.connection);
                  const isSelected = selectedDivision === div;

                  return (
                    <div
                      key={div}
                      onClick={() => handleSelectDivision(div)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500/50'
                          : isConn
                          ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-slate-300'
                          : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Division {div}</span>
                          {isSelected && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-sm bg-indigo-600 text-white">
                              SELECTED
                            </span>
                          )}
                        </span>

                        {isConn ? (
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Connected ✓</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            ○ Not Connected
                          </span>
                        )}
                      </div>

                      {isConn && divItem?.connection ? (
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {divItem.connection.spreadsheetUrl?.split('/d/')[1]?.substring(0, 24) || 'Workbook Connected'}...
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          No spreadsheet linked
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        {isConn && divItem?.connection ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={divItem.connection.spreadsheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRefreshTabs(divItem.connection.id);
                              }}
                              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                            >
                              Refresh
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDisconnectConfirm(divItem.connection);
                              }}
                              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                            Click to Connect →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ── + Add Division Card ────────────────────────────────────── */}
                <button
                  type="button"
                  onClick={handleAddDivision}
                  className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 min-h-[96px] group text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:border-indigo-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 transition-colors shadow-xs">
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400" />
                  </div>
                  <span className="font-extrabold text-xs">
                    + Add Division
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Division Selector & Connect Form */}
          {connectionData ? (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-extrabold text-blue-950 dark:text-blue-200 text-sm">
                    {sheetType === 'ATTENDANCE' ? `Division ${selectedDivision} Attendance Sheet` : 'Academic Marks Sheet'} Connected
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ACTIVE
                </span>
              </div>

              <div className="text-slate-600 dark:text-slate-300 break-all font-mono text-[11px] bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                {connectionData.spreadsheetUrl}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={connectionData.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Sheet</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleRefreshTabs()}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Tabs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisconnectConfirm(connectionData)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* Connect Form (Per Specification Section 3) */
            <form onSubmit={handleConnectSheet} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sheetType === 'ATTENDANCE' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Division / Section <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedDivision}
                      onChange={(e) => handleSelectDivision(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-blue-500"
                    >
                      {divisions.map((d) => (
                        <option key={d.section} value={d.section}>
                          Division {d.section} {d.isConnected ? '(Connected ✓)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={sheetType === 'ATTENDANCE' ? '' : 'sm:col-span-2'}>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Semester
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`Semester ${semester}`}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Google Spreadsheet URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder={
                    sheetType === 'ATTENDANCE'
                      ? `e.g. https://docs.google.com/spreadsheets/d/1BQqtwNY-2N0I0-IEDvqj-kjHgqukSNInRG/edit?gid=0 (Division ${selectedDivision})`
                      : 'e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
                  }
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Master division workbook containing subject tabs (e.g. CS301, CS302, CS303, project, Final).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !spreadsheetUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating & Discovering Tabs...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Connect {sheetType === 'ATTENDANCE' ? `Division ${selectedDivision}` : 'Google'} Sheet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ── Discovered Tabs & Subject Mapping Table ────────────────────────── */}
          {tabs.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Discovered Tabs ({tabs.length})
                      {sheetType === 'ATTENDANCE' && ` — Division ${selectedDivision}`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Immutable Google tab GIDs mapped to official ERP subjects.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Tab Title</th>
                      <th className="py-2.5 px-3">Google GID</th>
                      <th className="py-2.5 px-3">Mapped ERP Subject</th>
                      <th className="py-2.5 px-3 text-right">Status / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {tabs.map((tab) => {
                      const tabTitle = tab.sheetTitle || tab.title || '';
                      const isSpecial =
                        tabTitle.toUpperCase().includes('FINAL MARKS') ||
                        tabTitle.toLowerCase().includes('form responses') ||
                        tabTitle.toLowerCase().includes('project') ||
                        tabTitle.toLowerCase().includes('final') ||
                        tab.sheetType === 'SPECIAL';

                      const isMapped = Boolean(tab.status === 'MAPPED' && tab.subjectId);
                      const isIgnored = Boolean(tab.status === 'IGNORED');

                      return (
                        <tr key={tab.id || tab.sheetId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="font-mono">{tabTitle}</span>
                            {isSpecial && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                SPECIAL
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                            {tab.googleSheetId || tab.sheetId}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={tab.subjectId || (isIgnored ? 'IGNORED' : 'UNMAPPED')}
                              onChange={(e) => handleMapTab(tab.id, e.target.value)}
                              className="w-full max-w-xs px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="UNMAPPED">Select ERP Subject</option>
                              <option value="IGNORED">-- Ignore / System Tab --</option>
                              {departmentSubjects.length === 0 ? (
                                <option value="" disabled>
                                  No subjects configured for Semester {semester}
                                </option>
                              ) : (
                                departmentSubjects.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.code} — {sub.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isMapped && (
                                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  ✓ Mapped
                                </span>
                              )}
                              {isIgnored && (
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                  Ignored
                                </span>
                              )}
                              {!isMapped && !isIgnored && (
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                  Pending
                                </span>
                              )}
                              {isMapped && (
                                <button
                                  type="button"
                                  onClick={() => handleSyncTabNow(tab)}
                                  disabled={syncing}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 transition-colors cursor-pointer text-xs"
                                >
                                  {syncing ? 'Syncing...' : 'Sync Tab'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Architecture Reminder (Prompt Item 12, 13, 21) */}
          <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5 text-indigo-900 dark:text-indigo-200 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              <strong>Security Rule:</strong> Even though division access grants physical access to the master division spreadsheet, the backend validates that a faculty member can only sync attendance for their authorized subject code and division.
            </p>
          </div>

        </div>

        {/* ── Disconnect Confirmation Modal ─────────────────────────────────── */}
        {showDisconnectConfirm && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full space-y-4 text-xs">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Disconnect {sheetType === 'ATTENDANCE' ? `Division ${showDisconnectConfirm.section || selectedDivision}` : ''} Sheet?
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                This will stop future synchronization from this Google Spreadsheet for Semester {semester} {showDisconnectConfirm.section ? `Division ${showDisconnectConfirm.section}` : ''}. Existing imported attendance records will <strong className="text-slate-900 dark:text-white">NOT</strong> be deleted.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisconnectConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                >
                  {loading ? 'Disconnecting...' : 'Yes, Disconnect'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default HodGoogleSheetModal;

