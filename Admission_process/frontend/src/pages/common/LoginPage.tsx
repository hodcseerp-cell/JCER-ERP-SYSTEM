import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../../store/authSlice';
import authService from '../../services/auth.service';
import { RootState } from '../../store';
import Toast from '../../components/common/Toast';
import { Lock, Mail, ArrowRight, Loader2, X, ArrowLeft, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import GlobalFooter from '../../components/common/GlobalFooter';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Daily OTP Modal State for Admin & Principal
  const [showDailyOtpModal, setShowDailyOtpModal] = useState(false);
  const [dailyOtp, setDailyOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingRole, setPendingRole] = useState('');
  const [verifyingDailyOtp, setVerifyingDailyOtp] = useState(false);
  const [resendingDailyOtp, setResendingDailyOtp] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'EMAIL' | 'OTP' | 'NEW_PASSWORD'>('EMAIL');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setToast({ type: 'error', message: 'Session expired. Please log in again.' });
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleRedirect = (userRole: string) => {
    const dashboardRoutes: Record<string, string> = {
      STUDENT: '/admission/dashboard',
      TEACHER: '/teacher/dashboard',
      HOD: '/hod/dashboard',
      ADMIN: '/admin/dashboard',
      SUPER_ADMIN: '/admin/dashboard',
      PRINCIPAL: '/principal/dashboard',
      PARENT: '/parent/dashboard',
    };

    const targetDashboard = dashboardRoutes[userRole];

    if (targetDashboard) {
      const redirectPath = (location.state as any)?.from?.pathname || targetDashboard;
      if (redirectPath.startsWith('/student') && userRole !== 'STUDENT') {
        navigate(targetDashboard, { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    } else {
      authService.logout();
      dispatch(loginFailure('Invalid user role assigned.'));
      setToast({ type: 'error', message: 'Account configuration error. Please contact administration.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setToast({ type: 'error', message: 'Please enter both User ID/Email and password.' });
      return;
    }

    try {
      dispatch(loginStart());
      const res = await authService.login(email, password);

      if (res.requiresDailyOtp) {
        dispatch(loginFailure(''));
        setPendingEmail(res.email || email);
        setPendingRole(res.role || '');
        setShowDailyOtpModal(true);
        setToast({
          type: 'success',
          message: `🔐 Daily OTP required for ${res.role || 'Admin'} login. Check your inbox for the 6-digit code.`,
        });
        return;
      }

      if (res.data?.user && res.data?.token) {
        dispatch(loginSuccess({ user: res.data.user, token: res.data.token }));
        handleRedirect(res.data.user.role);
      } else {
        throw new Error(res.message || 'Authentication failed.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Authentication failed. Please check credentials.';
      dispatch(loginFailure(errMsg));
      setToast({ type: 'error', message: errMsg });
    }
  };

  const handleVerifyDailyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyOtp || dailyOtp.length !== 6) {
      setToast({ type: 'error', message: 'Please enter a valid 6-digit OTP code.' });
      return;
    }

    setVerifyingDailyOtp(true);
    try {
      const user = await authService.verifyDailyOtp(pendingEmail, dailyOtp);
      const token = authService.getToken() || '';
      dispatch(loginSuccess({ user, token }));
      setShowDailyOtpModal(false);
      setToast({ type: 'success', message: '✅ Today\'s Daily OTP verified successfully! Welcome back.' });
      handleRedirect(user.role);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Daily OTP verification failed.';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setVerifyingDailyOtp(false);
    }
  };

  const handleResendDailyOtp = async () => {
    setResendingDailyOtp(true);
    try {
      await authService.login(email, password);
      setToast({ type: 'success', message: 'A new Daily OTP code has been sent to your email address.' });
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to resend Daily OTP. Please try logging in again.' });
    } finally {
      setResendingDailyOtp(false);
    }
  };

  // ─── FORGOT PASSWORD HANDLERS ──────────────────────────────────────────────

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    try {
      const res = await authService.sendForgotPasswordOtp(forgotEmail);
      setForgotStep('OTP');
      setToast({ type: 'success', message: res.data?.message || 'If an account exists, a 6-digit password reset OTP has been sent.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to send password reset OTP.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      setToast({ type: 'error', message: 'Please enter a 6-digit numeric OTP code.' });
      return;
    }

    setForgotLoading(true);
    try {
      await authService.verifyForgotPasswordOtp(forgotEmail, forgotOtp);
      setForgotStep('NEW_PASSWORD');
      setToast({ type: 'success', message: 'OTP verified successfully! Please enter your new password.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Invalid or expired OTP code.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setToast({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authService.resetPassword(forgotEmail, newPassword, confirmPassword);
      setShowForgotModal(false);
      setForgotStep('EMAIL');
      setForgotEmail('');
      setForgotOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setToast({ type: 'success', message: res.data?.message || 'Password reset successfully! Please log in with your new password.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.error || 'Password reset failed.' });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between font-sans selection:bg-indigo-500/30 bg-slate-950">
      
      {/* ── HERO / LOGIN MAIN CONTENT SECTION ── */}
      <main className="flex-1 w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden min-h-[600px]">
        {/* Background Image Container strictly scoped inside main hero section */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 blur-[3px] scale-105" 
          style={{ backgroundImage: 'url("/college.png")' }}
        />
        {/* Slightly blue/indigo dark overlay for readability and premium aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-blue-950/60 to-indigo-900/40 z-0"></div>

        {/* Back to Home Button at top left */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium text-sm transition-all duration-200 shadow-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}

        {/* Global Header Section */}
        <div className="w-full max-w-4xl text-center space-y-4 mb-6 z-10 hidden sm:block">
          <div className="flex justify-center">
            <div 
              className="w-[100px] h-[100px] rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#ffffff' }}
            >
              <img
                src="/logo.png"
                alt="JCER Logo"
                className="w-full h-full object-cover bg-white rounded-full"
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              JAIN COLLEGE OF ENGINEERING AND RESEARCH
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-neutral-200 drop-shadow-sm">
              (Approved by AICTE, New Delhi, Affiliated to VTU Belagavi & Recognized by Govt. of Karnataka)
            </p>
            <p className="text-xs sm:text-sm font-semibold text-neutral-200 drop-shadow-sm">
              NBA Accredited Programs - ECE & ME
            </p>
            <p className="text-sky-300 pt-1 text-sm font-bold tracking-wider uppercase drop-shadow-sm">
              Secure ERP Portal
            </p>
          </div>
        </div>

        {/* Mobile-Only Header Layout */}
        <div className="w-full text-center space-y-3 mb-6 z-10 sm:hidden">
          <div className="flex justify-center">
            <div 
              className="w-[80px] h-[80px] rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#ffffff' }}
            >
              <img 
                src="/logo.png" 
                alt="JCER Logo" 
                className="w-full h-full object-cover bg-white rounded-full" 
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>
          </div>
          <div className="px-2 space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-white drop-shadow-md">JAIN COLLEGE OF ENGINEERING AND RESEARCH</h2>
            <p className="text-[11px] font-semibold text-neutral-200 leading-tight">Approved by AICTE • Affiliated to VTU • Recognized by Govt. of Karnataka</p>
            <p className="text-[11px] font-semibold text-neutral-200">NBA Accredited Programs - ECE & ME</p>
            <p className="text-sky-300 text-xs font-bold uppercase tracking-wider pt-0.5">Secure ERP Portal</p>
          </div>
        </div>

        {/* Login Card Container */}
        <div className="w-full max-w-md bg-white/40 backdrop-blur-md border border-white/20 rounded-3xl z-10 p-6 sm:p-8 shadow-xl shadow-neutral-200/30">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User ID / Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-1">
                User ID / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 dark-input-icon !text-slate-800" style={{ color: '#0F172A', stroke: '#0F172A' }} />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`e.g. email@example.com`}
                  className="w-full bg-white/90 border border-neutral-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none transition-all duration-200 placeholder:text-neutral-400 text-slate-900 light-input-mode shadow-sm"
                  style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1 pr-1">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep('EMAIL');
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors bg-transparent border-none cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 dark-input-icon !text-slate-800" style={{ color: '#0F172A', stroke: '#0F172A' }} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white/90 border border-neutral-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none transition-all duration-200 placeholder:text-neutral-400 text-slate-900 light-input-mode shadow-sm"
                  style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all duration-300 text-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In Securely</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* ── LIGHT TRANSLUCENT GLASS FOOTER (BELOW HERO SECTION) ── */}
      <GlobalFooter variant="light-glass" className="relative z-20 shrink-0" />

      {/* ─── ADMIN & PRINCIPAL DAILY OTP MODAL ───────────────────────────────── */}
      {showDailyOtpModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-[28px] shadow-2xl p-6 relative animate-fade-in">
            
            <button 
              onClick={() => setShowDailyOtpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:scale-105 transition-all cursor-pointer border-none"
            >
              <X className="w-4 h-4 text-neutral-600" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Daily Login Authentication</h3>
                  <p className="text-xs text-neutral-600">First login of calendar date for <strong className="text-neutral-900">{pendingRole}</strong> ({pendingEmail})</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-medium" style={{ color: '#78350f' }}>
                ⏱ A 6-digit OTP code has been sent to <strong className="text-amber-950">{pendingEmail}</strong>. Once verified, today's verification remains valid for the rest of today.
              </div>

              <form onSubmit={handleVerifyDailyOtpSubmit} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700 block">
                    Enter 6-Digit Daily OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={dailyOtp}
                    onChange={(e) => setDailyOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-center font-mono text-xl font-bold tracking-[8px] outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 light-input-mode"
                    style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResendDailyOtp}
                    disabled={resendingDailyOtp || verifyingDailyOtp}
                    className="text-xs font-semibold text-indigo-600 hover:underline bg-transparent border-none cursor-pointer disabled:opacity-50"
                  >
                    {resendingDailyOtp ? 'Resending...' : 'Resend Daily OTP'}
                  </button>

                  <button
                    type="submit"
                    disabled={verifyingDailyOtp || dailyOtp.length !== 6}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifyingDailyOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── REUSABLE FORGOT PASSWORD MODAL (ALL ROLES) ────────────────────── */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-[28px] shadow-2xl p-6 relative animate-fade-in">
            
            <button 
              onClick={() => { if (!forgotLoading) setShowForgotModal(false); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center hover:scale-105 transition-all cursor-pointer border-none"
            >
              <X className="w-4 h-4 text-neutral-600" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Password Recovery</h3>
                  <p className="text-xs text-neutral-600">Secure OTP Password Reset for Student, Admin & Principal</p>
                </div>
              </div>

              {/* Step 1: Request OTP */}
              {forgotStep === 'EMAIL' && (
                <form onSubmit={handleSendForgotOtp} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 block">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium light-input-mode"
                      style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Password Reset OTP...
                      </>
                    ) : (
                      'Send Verification Code'
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {forgotStep === 'OTP' && (
                <form onSubmit={handleVerifyForgotOtp} className="space-y-4 pt-2">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-xs text-indigo-950 font-medium" style={{ color: '#1e1b4b' }}>
                    Enter the 6-digit OTP sent to <strong className="text-indigo-950">{forgotEmail}</strong>.
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 block">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-3 px-4 text-center font-mono text-xl font-bold tracking-[8px] outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 light-input-mode"
                      style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('EMAIL')}
                      className="text-xs font-semibold text-neutral-600 hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Change Email
                    </button>

                    <button
                      type="submit"
                      disabled={forgotLoading || forgotOtp.length !== 6}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-2xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Code'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: New Password */}
              {forgotStep === 'NEW_PASSWORD' && (
                <form onSubmit={handleResetPassword} className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 block">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-2.5 px-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium light-input-mode"
                      style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 block">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-2.5 px-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium light-input-mode"
                      style={{ color: '#0F172A', WebkitTextFillColor: '#0F172A' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !newPassword || newPassword !== confirmPassword}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-2xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      'Set New Password & Back to Login'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;