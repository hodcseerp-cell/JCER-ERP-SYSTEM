import React, { useState } from 'react';
import {
  Link2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export interface GoogleAccountData {
  connected: boolean;
  isConnected?: boolean;
  email: string | null;
  displayName?: string | null;
  googleAccountId?: string | null;
  profilePicture?: string | null;
  status?: string;
  connectedAt?: string | null;
  lastUsedAt?: string | null;
}

interface GoogleAccountConnectionProps {
  account: GoogleAccountData;
  checking?: boolean;
  connecting?: boolean;
  onConnect: (forceSelect?: boolean) => void;
  onAccountChanged?: (account: GoogleAccountData) => void;
}

export const GoogleAccountConnection: React.FC<GoogleAccountConnectionProps> = ({
  account,
  checking = false,
  connecting = false,
  onConnect,
}) => {
  const [showEditDialog, setShowEditDialog] = useState(false);

  const isConnected = Boolean(account.connected || account.isConnected) && Boolean(account.email);
  const email = account.email || '';

  const handleChangeAccount = () => {
    setShowEditDialog(false);
    onConnect(true);
  };

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
        <div className="flex items-center gap-3.5">
          {/* Google / Profile Icon */}
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
            {account.profilePicture ? (
              <img
                src={account.profilePicture}
                alt="Google Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              GOOGLE ACCOUNT
            </span>

            {checking ? (
              <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs mt-0.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>Checking Google account...</span>
              </div>
            ) : isConnected ? (
              <div className="mt-0.5">
                <div className="text-slate-900 dark:text-white font-bold text-xs flex flex-wrap items-center gap-2">
                  <span className="font-mono">{email}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                  {account.displayName && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      ({account.displayName})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5 block">
                No Google account connected
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div>
          {checking ? null : isConnected ? (
            <button
              type="button"
              onClick={() => setShowEditDialog(true)}
              className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all shadow-xs self-start sm:self-auto cursor-pointer"
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onConnect(true)}
              disabled={connecting}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs self-start sm:self-auto cursor-pointer"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Change Account / Edit Confirmation Modal */}
      {showEditDialog && (
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="font-bold text-xs text-amber-950 dark:text-amber-100">
                Google Account Management
              </h4>
              <p className="text-[11px] mt-0.5">
                Currently connected: <strong className="font-mono text-slate-800 dark:text-slate-100">{email}</strong>
              </p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                Connecting another Google account updates your active Google authorization identity. Existing spreadsheet connections, tabs, subject mappings, attendance, and marks records remain completely intact.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowEditDialog(false)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleChangeAccount}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Change Google Account</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAccountConnection;
