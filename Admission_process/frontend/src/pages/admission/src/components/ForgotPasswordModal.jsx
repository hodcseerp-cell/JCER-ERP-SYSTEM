import React, { useState, useEffect } from 'react';
import { Mail, Lock, KeyRound, Loader2, ShieldCheck, CheckCircle2, RefreshCw, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import OtpInputBox from './OtpInputBox';

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendingOtp, setResendingOtp] = useState(false);

  // Prevent background scrolling when modal is open & add ESC listener
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  // Cooldown Timer
  useEffect(() => {
    let timer;
    if (isOpen && step === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, step, resendCooldown]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  // Step 1: Send Forgot Password OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/send-forgot-password-otp', { email });
      if (res.data.success) {
        toast.success('Password reset OTP sent to your email!');
        setStep(2);
        setResendCooldown(60);
        setOtp('');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send OTP. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendingOtp) return;
    setResendingOtp(true);
    try {
      const res = await api.post('/auth/send-forgot-password-otp', { email });
      if (res.data.success) {
        toast.success('A new password reset OTP has been sent to your email.');
        setResendCooldown(60);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setResendingOtp(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      toast.error('Please enter a valid 6-digit numeric OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-forgot-password-otp', { email, otp });
      if (res.data.success) {
        toast.success('OTP verified! Please set your new password.');
        setStep(3);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        newPassword,
        confirmPassword,
      });

      if (res.data.success) {
        toast.success('Password updated successfully! Please log in with your new password.');
        handleClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-[8px] transition-opacity duration-300">
      <div className="bg-white dark:bg-neutral-900 rounded-[24px] w-[92vw] max-w-[380px] sm:w-[480px] sm:max-w-[480px] max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-neutral-800 space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
          title="Close (Esc)"
        >
          <X size={20} />
        </button>

        {/* Header Branding & Status */}
        <div className="text-center space-y-3 py-4 select-none">
          <div className="size-14 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-amber-100 dark:border-amber-900/40">
            <Lock size={26} />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Password Recovery
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto mt-2 leading-relaxed px-2">
              Password recovery is temporarily unavailable. Please contact the administrator.
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="w-full h-[52px] bg-slate-100 hover:bg-slate-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-slate-800 dark:text-white font-extrabold rounded-[14px] text-sm transition-all"
        >
          Close Window
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
