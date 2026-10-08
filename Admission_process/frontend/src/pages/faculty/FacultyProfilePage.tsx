import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateUser } from '../../store/authSlice';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Building2,
  Loader2,
  Check,
  X,
  Key,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const FacultyProfilePage: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { academicYear } = useAcademicYear();

  // Avatar State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || user?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/);
      setFirstName(user.firstName || parts[0] || '');
      setLastName(user.lastName !== undefined ? user.lastName : parts.slice(1).join(' '));
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Clean up preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelPreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    setUploadingImage(true);
    try {
      const res = await API.post('/auth/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data?.profileImage) {
        const newUrl = res.data.data.profileImage;
        dispatch(updateUser({ profileImage: newUrl }));
        toast.success('🎉 Profile picture updated successfully!');
        handleCancelPreview();
      } else {
        toast.error('Failed to upload profile picture.');
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.response?.data?.error || 'Failed to upload profile picture.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      const cleanFullName = `${cleanFirst} ${cleanLast}`.trim();

      const res = await API.put('/auth/profile', {
        firstName: cleanFirst,
        lastName: cleanLast,
        name: cleanFullName,
        phone: phone.trim(),
      });

      if (res.data?.success && res.data?.data?.user) {
        dispatch(updateUser(res.data.data.user));
        setProfileMsg({ type: 'success', text: 'Personal details updated successfully.' });
        toast.success('Profile saved successfully!');
      } else {
        setProfileMsg({ type: 'error', text: res.data?.error || 'Failed to update details.' });
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      setProfileMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile details.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await API.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        toast.success('Security password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: res.data?.error || 'Failed to change password.' });
      }
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password. Verify your current password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const deptName = user?.department?.name || 'Computer Science & Engineering';
  const deptCode = user?.department?.code || 'CSE';
  const facultyName = user?.name || `${firstName} ${lastName}`.trim() || 'Faculty Member';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans">
      {/* ── Page Header ── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-neutral-800/60 shadow-sm bg-white/80 dark:bg-neutral-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shadow-xs">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                Faculty Profile & Settings
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Manage your official profile photo, personal information, and portal security credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              {deptCode} Dept
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              AY {academicYear}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT COLUMN: Profile Picture Card ── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-neutral-800/60 shadow-sm bg-white/80 dark:bg-neutral-900/80 text-center flex flex-col items-center gap-4">
            <div className="w-full text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                Profile Picture
              </h3>
            </div>

            {/* Avatar display / Preview */}
            <div className="relative group my-2">
              {previewUrl ? (
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-violet-500 shadow-xl relative animate-fade-in">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-violet-900/30 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase text-white bg-black/60 px-2 py-0.5 rounded-full">
                      Preview
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <ProfileAvatar
                    imageUrl={user?.profileImage}
                    name={facultyName}
                    size="custom"
                    className="w-32 h-32 rounded-3xl border-4 border-white dark:border-neutral-800 shadow-xl text-3xl font-black object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingImage}
                    title="Change Profile Picture"
                    className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Change / Preview Actions */}
            <div className="w-full space-y-2">
              {previewUrl ? (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    disabled={uploadingImage}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={uploadingImage}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>{uploadingImage ? 'Uploading...' : 'Confirm & Save'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingImage}
                    className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Camera size={14} />
                    <span>Change Profile Picture</span>
                  </button>
                  <p className="text-[10px] text-neutral-400">
                    JPG, PNG, or WEBP (Max 5MB)
                  </p>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
            />

            {/* Quick summary info */}
            <div className="w-full pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800/60 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400 font-medium">Designation</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {user?.designation || 'Faculty'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400 font-medium">Department</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {deptCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400 font-medium">Status</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Personal Details & Password ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Personal Details Form */}
          <form
            onSubmit={handleSaveProfile}
            className="glass-card rounded-3xl p-6 sm:p-7 border border-white/60 dark:border-neutral-800/60 shadow-sm bg-white/80 dark:bg-neutral-900/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <User className="w-4 h-4 text-violet-600" />
                <span>Personal Profile</span>
              </h3>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Email Address (Read Only)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 text-neutral-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>

          {/* Change Security Password Form */}
          <form
            onSubmit={handleChangePassword}
            className="glass-card rounded-3xl p-6 sm:p-7 border border-white/60 dark:border-neutral-800/60 shadow-sm bg-white/80 dark:bg-neutral-900/80 space-y-4"
          >
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Key className="w-4 h-4 text-violet-600" />
              <span>Change Security Password</span>
            </h3>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-semibold focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FacultyProfilePage;
