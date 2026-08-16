import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff, User, ArrowRight, ShieldCheck, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../../../services/auth.service';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password Modal State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState('EMAIL'); // 'EMAIL' | 'OTP' | 'NEW_PASSWORD'
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOtp, setForgotOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const searchParams = new URLSearchParams(location.search);
    const isProvisional = searchParams.get('type') === 'provisional';

    useEffect(() => {
        if (user) {
            if (isProvisional) {
                navigate('/admission/provisional', { replace: true });
            } else {
                navigate('/admission/dashboard', { replace: true });
            }
        }
    }, [user, isProvisional, navigate]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('expired') === 'true') {
            toast.error('Session expired. Please log in again.', { id: 'session-expired-toast' });
            navigate(location.pathname, { replace: true });
        }
    }, [location, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            toast.error('Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await authService.login(formData.email, formData.password);
            if (response.success && response.data?.token) {
                const { token, user } = response.data;
                toast.success('Login successful!');
                login(token, user);
                if (isProvisional) {
                    navigate('/admission/provisional');
                } else {
                    navigate('/admission/dashboard');
                }
            } else {
                throw new Error(response.message || 'Login failed.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ─── FORGOT PASSWORD HANDLERS ─────────────────────────────────────────────

    const handleSendForgotOtp = async (e) => {
        e.preventDefault();
        if (!forgotEmail) return;

        setForgotLoading(true);
        try {
            const res = await authService.sendForgotPasswordOtp(forgotEmail);
            setForgotStep('OTP');
            toast.success(res.data?.message || 'If an account exists, a 6-digit OTP code has been sent to your email.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send password reset OTP.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleVerifyForgotOtp = async (e) => {
        e.preventDefault();
        if (!forgotOtp || forgotOtp.length !== 6) {
            toast.error('Please enter a 6-digit numeric OTP code.');
            return;
        }

        setForgotLoading(true);
        try {
            await authService.verifyForgotPasswordOtp(forgotEmail, forgotOtp);
            setForgotStep('NEW_PASSWORD');
            toast.success('OTP verified successfully! Please enter your new password.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid or expired OTP code.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
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
            toast.success(res.data?.message || 'Password reset successfully! Please log in with your new password.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Password reset failed.');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="w-full animate-fade-in max-w-sm mx-auto lg:mx-0">
            <div className="mb-6 sm:mb-8 lg:mb-10 text-center lg:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
                    {isProvisional ? 'Provisional Admission Login' : 'Student Login'}
                </h2>
                <p className="text-sm sm:text-base text-slate-500">
                    {isProvisional 
                        ? 'Log in with your existing credentials to continue with Provisional Admission.' 
                        : 'Please enter your credentials to access the system.'}
                </p>
                {isProvisional && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold text-left">
                        ℹ️ This portal is only for existing JCER students seeking promotion to 3rd, 5th, or 7th semester.
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2" htmlFor="email">
                        <User size={18} className="text-slate-400" />
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 sm:py-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md"
                        placeholder="e.g. student.name@example.com"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2" htmlFor="password">
                            <Lock size={18} className="text-slate-400" />
                            Password
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setForgotStep('EMAIL');
                                setForgotEmail(formData.email);
                                setShowForgotModal(true);
                            }}
                            className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-all hover:underline bg-transparent border-none cursor-pointer"
                        >
                            Forgot password?
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 sm:py-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all duration-300 text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md"
                            placeholder="••••••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 sm:py-4 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 group/btn disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Logging in...</span>
                        </>
                    ) : (
                        <>
                            <span>Log In</span>
                            <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 space-y-2">
                {!isProvisional && (
                    <div>
                        Don't have an account?{' '}
                        <Link to="/admission/register" className="font-bold text-primary-600 hover:underline">
                            Register here
                        </Link>
                    </div>
                )}
                <div>
                    <a
                        href={`${import.meta.env.VITE_API_URL || ''}/public/handbook`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
                    >
                        📘 Download Admission Handbook (PDF)
                    </a>
                </div>
            </div>

            {/* ─── REUSABLE FORGOT PASSWORD MODAL ─────────────────────────────────── */}
            {showForgotModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 relative animate-fade-in">
                        
                        <button 
                            onClick={() => { if (!forgotLoading) setShowForgotModal(false); }}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:scale-105 transition-all cursor-pointer border-none"
                        >
                            <X size={16} className="text-slate-600" />
                        </button>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                                    <KeyRound size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Password Recovery</h3>
                                    <p className="text-xs text-slate-500">Reset your JCER Portal password using Email OTP</p>
                                </div>
                            </div>

                            {/* Step 1: Enter Email */}
                            {forgotStep === 'EMAIL' && (
                                <form onSubmit={handleSendForgotOtp} className="space-y-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 block">Registered Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="e.g. student@example.com"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3.5 text-xs outline-none focus:ring-2 focus:ring-primary-600 text-slate-900 font-medium"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotLoading || !forgotEmail}
                                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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

                            {/* Step 2: Enter OTP */}
                            {forgotStep === 'OTP' && (
                                <form onSubmit={handleVerifyForgotOtp} className="space-y-4 pt-2">
                                    <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 text-xs text-primary-900">
                                        Enter the 6-digit OTP sent to <strong>{forgotEmail}</strong>.
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 block">Enter 6-Digit Code</label>
                                        <input
                                            type="password"
                                            required
                                            maxLength={6}
                                            value={forgotOtp}
                                            onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="••••••"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-center font-mono text-xl font-bold tracking-[8px] outline-none focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 text-slate-900 transition-all shadow-sm focus:shadow-md"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setForgotStep('EMAIL')}
                                            className="text-xs font-semibold text-slate-500 hover:underline bg-transparent border-none cursor-pointer"
                                        >
                                            Change Email
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={forgotLoading || forgotOtp.length !== 6}
                                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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

                            {/* Step 3: Enter New Password */}
                            {forgotStep === 'NEW_PASSWORD' && (
                                <form onSubmit={handleResetPassword} className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 block">New Password</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Minimum 8 characters"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:ring-2 focus:ring-primary-600 text-slate-900 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 block">Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs outline-none focus:ring-2 focus:ring-primary-600 text-slate-900 font-medium"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotLoading || !newPassword || newPassword !== confirmPassword}
                                        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
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

export default Login;
