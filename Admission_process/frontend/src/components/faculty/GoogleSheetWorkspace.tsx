import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  FileSpreadsheet,
  RefreshCw,
  X,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  ShieldCheck,
  Info,
  KeyRound,
} from 'lucide-react';
import facultyService, { GoogleSheetViewData } from '../../services/faculty.service';

interface GoogleSheetWorkspaceProps {
  assignmentId: string;
  viewType?: 'ATTENDANCE' | 'MARKS';
  onClose: () => void;
  onConnectGoogle?: () => void;
}

export const GoogleSheetWorkspace: React.FC<GoogleSheetWorkspaceProps> = ({
  assignmentId,
  viewType = 'ATTENDANCE',
  onClose,
  onConnectGoogle,
}) => {
  const [data, setData] = useState<GoogleSheetViewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Load authorized sheet metadata and access status from backend
  const loadSheetData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIframeLoaded(false);
      const res =
        viewType === 'MARKS'
          ? await facultyService.getMarksSheetView(assignmentId)
          : await facultyService.getAttendanceSheetView(assignmentId);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load Google Sheet workspace:', err);
      setError(
        err.response?.data?.error ||
          err.message ||
          'Unable to load the authorized Google Sheet. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [assignmentId, viewType]);

  useEffect(() => {
    loadSheetData();
  }, [loadSheetData]);

  // Direct edit URL targeting exact tab/GID
  const getGoogleSheetEditUrl = () => {
    if (!data?.spreadsheetId) return '';
    const gid = data.sheetId || '0';
    return `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit?gid=${gid}`;
  };

  const handleRefresh = () => {
    setIframeLoaded(false);
    setIframeKey((prev) => prev + 1);
    loadSheetData();
  };

  const editUrl = getGoogleSheetEditUrl();

  // Render truthful status badge based on backend verified Google Drive permission
  const renderStatusBadge = () => {
    const status = data?.accessStatus;

    if (status === 'EDITOR_VERIFIED') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/70 dark:border-emerald-800/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Editor Access Verified</span>
        </div>
      );
    }

    if (status === 'PENDING_BROWSER_AUTH') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/70 dark:border-emerald-800/50">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Google Drive Permission Active ({data?.targetGoogleEmail})</span>
        </div>
      );
    }

    if (status === 'VIEWER_ACCESS') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/70 dark:border-blue-800/50">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Viewer Access</span>
        </div>
      );
    }

    if (status === 'ACCOUNT_MISMATCH') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/70 dark:border-amber-800/50">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Account Mismatch ({data?.targetGoogleEmail})</span>
        </div>
      );
    }

    if (status === 'GOOGLE_NOT_CONNECTED') {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/70 dark:border-amber-800/50">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Google Account Not Connected</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold border border-neutral-200 dark:border-neutral-700">
        <span className="w-2 h-2 rounded-full bg-neutral-400" />
        <span>{data?.accessStatusLabel || 'Google Access Pending'}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Top Bar: Back & Direct Deep-link ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Subjects</span>
        </button>

        {editUrl && (
          <a
            href={editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span>Open in Google Sheets App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* ── Central Sheet Context Header Card ─────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center shrink-0 shadow-2xs text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                  {data?.subjectName || 'Course'} ({data?.subjectCode || '---'})
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60">
                  Sem {data?.semester || '-'} • {data?.section || 'Section -'} • AY {data?.academicYear || '2026-27'}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium flex-wrap">
                <span>Google Sheet: <strong className="text-neutral-700 dark:text-neutral-200">{data?.spreadsheetTitle || 'Loading...'}</strong></span>
                <span>•</span>
                <span>Tab: <strong className="text-blue-600 dark:text-blue-400">{data?.sheetTitle || '---'}</strong></span>
                <span>•</span>
                <span>GID: <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-300">{data?.sheetId || '---'}</span></span>
              </div>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {renderStatusBadge()}

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-neutral-500'}`} />
              <span>Refresh</span>
            </button>

            {/* Close Sheet View */}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-bold text-red-700 dark:text-red-300 border border-red-200/70 dark:border-red-800/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <X className="w-3.5 h-3.5 text-red-500" />
              <span>Close Sheet View</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Authentication Guidance Bar (when Google browser session sign-in is required) ── */}
      {data?.targetGoogleEmail && (
        <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Google Drive access is granted to <strong>{data.targetGoogleEmail}</strong>. If Google shows <em>Sign in</em> inside the sheet below, ensure this browser is logged into that account.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onConnectGoogle && (
              <button
                onClick={onConnectGoogle}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer text-[11px] inline-flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Verify Google Session</span>
              </button>
            )}
            {editUrl && (
              <a
                href={editUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-blue-200 dark:border-neutral-700 text-blue-700 dark:text-blue-300 font-bold hover:bg-blue-50 transition-colors cursor-pointer text-[11px] inline-flex items-center gap-1"
              >
                <span>Open in App</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Main Google Sheets Web Application View ──────────────────────── */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-neutral-200/90 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 min-h-[680px]">
        {loading && (
          <div className="absolute inset-0 z-20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
              Loading authorized Google Sheet workspace...
            </p>
          </div>
        )}

        {error ? (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              Unable to Open Google Sheet
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mt-1 mb-4">
              {error}
            </p>
            {onConnectGoogle && (
              <button
                onClick={onConnectGoogle}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Reconnect Google Account
              </button>
            )}
          </div>
        ) : editUrl ? (
          <div className="w-full h-full min-h-[680px] flex flex-col">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={editUrl}
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-[calc(100vh-210px)] min-h-[680px] border-0"
              title={`Google Sheet - ${data?.spreadsheetTitle || 'Workbook'}`}
              allow="clipboard-read; clipboard-write; autoplay; encrypted-media; fullscreen"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GoogleSheetWorkspace;
