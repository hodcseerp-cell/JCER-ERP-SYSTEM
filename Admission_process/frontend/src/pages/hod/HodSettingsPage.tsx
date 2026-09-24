import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Lock,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Key,
  Clock,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodSettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Profile Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await hodService.getSettings();
      setSettingsData(data);
      if (data.profile) {
        const parts = (data.profile.name || '').split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
        setPhone(data.profile.phone || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await hodService.updateProfile({ firstName, lastName, phone });
      setProfileMsg('Profile information updated successfully.');
      fetchSettings();
    } catch (err: any) {
      setProfileMsg('Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation password do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    setSavingPassword(true);
    try {
      await hodService.updatePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to update password. Please check your current password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              HOD Account & Department Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your personal credentials, view locked department attributes, and review recent administrative logs.
            </p>
          </div>
        </div>
      </div>

      {/* ── Locked Department Info Card (Prompt Item 12) ──────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Assigned Department Scope</span>
          </h2>
          <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
            <Lock className="w-3 h-3" /> PERMANENTLY LOCKED
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Department Name:</span>
              <strong className="text-slate-900 dark:text-white text-sm">
                {settingsData?.department?.name || 'Computer Science & Engineering'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Department Code:</span>
              <strong className="text-slate-900 dark:text-white font-mono text-sm">
                {settingsData?.department?.code || 'CSE'}
              </strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
            Note: HOD accounts are strictly scoped to their appointed department. To transfer departments or change institution codes, contact the Dean Academics or Super Admin.
          </p>
        </div>
      </div>

      {/* ── Two Column Forms: Profile & Password ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Details Form */}
        <form onSubmit={handleUpdateProfile} className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Personal Profile</span>
          </h3>

          {profileMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{profileMsg}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email (Read Only)</label>
              <input
                type="email"
                disabled
                value={settingsData?.profile?.email || ''}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handleUpdatePassword} className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Change Security Password</span>
          </h3>

          {passwordMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Recent HOD Activity Audit Logs ───────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-3">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Recent Administrative Activity Log</span>
        </h3>

        {settingsData?.auditLogs && settingsData.auditLogs.length > 0 ? (
          <div className="space-y-2">
            {settingsData.auditLogs.map((log: any) => (
              <div key={log.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                  <p className="text-[10px] text-slate-400">IP: {log.ipAddress}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No recent activity recorded.</p>
        )}
      </div>
    </div>
  );
};

export default HodSettingsPage;
