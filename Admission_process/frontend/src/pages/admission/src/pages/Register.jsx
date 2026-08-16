import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Phone, Loader2, Eye, EyeOff, GraduationCap, User, ArrowRight, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../services/api';
import authService from '../../../../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { registerSchema } from '../../../../utils/validation.util';
import { getAcademicYear } from '../../../../utils/date.util';

const Register = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);

    // Email OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    const [admissionsClosed, setAdmissionsClosed] = useState(false);
    const [admissionCycle, setAdmissionCycle] = useState('');
    const [checkingStatus, setCheckingStatus] = useState(true);

    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const checkAdmissionStatus = async () => {
            try {
                const res = await api.get('/system/config');
                if (res.data?.success) {
                    if (res.data.data.admissionOpen === false) {
                        setAdmissionsClosed(true);
                    }
                    if (res.data.data.admissionCycle) {
                        setAdmissionCycle(res.data.data.admissionCycle);
                    }
                }
            } catch (err) {
                console.warn('Could not check system admission status:', err);
            } finally {
                setCheckingStatus(false);
            }
        };
        checkAdmissionStatus();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (e.target.name === 'email') {
            setIsEmailVerified(false);
            setOtpSent(false);
        }
    };

    useEffect(() => {
        const checkPhoneUniqueness = async () => {
            const val = formData.phone;
            if (!val) {
                setPhoneError('');
                return;
            }
            
            if (val.length !== 10 || isNaN(val)) {
                setPhoneError('Mobile number must be a 10-digit number');
                return;
            }

            setIsCheckingPhone(true);
            setPhoneError('');

            try {
                const res = await authService.checkPhone(val);
                if (res.data.exists) {
                    setPhoneError('This mobile number is already registered.');
                } else {
                    setPhoneError('');
                }
            } catch (err) {
                console.error('Phone check failed', err);
            } finally {
                setIsCheckingPhone(false);
            }
        };

        const timer = setTimeout(checkPhoneUniqueness, 600);
        return () => clearTimeout(timer);
    }, [formData.phone]);

    useEffect(() => {
        const val = formData.password;
        if (!val) {
            setPasswordError('');
            return;
        }
        if (val.length < 8) {
            setPasswordError('Password must be at least 8 characters.');
        } else {
            setPasswordError('');
        }
    }, [formData.password]);

    const searchParams = new URLSearchParams(window.location.search);
    const registrationTypeParam = searchParams.get('type');
    const isLateral = registrationTypeParam === 'lateral';

    // Handle Send OTP
    const handleSendOtp = async () => {
        if (!formData.email || !formData.firstName || !formData.lastName) {
            toast.error('Please enter First Name, Last Name, and Email Address first.');
            return;
        }

        setSendingOtp(true);
        try {
            const res = await authService.sendRegistrationOtp({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
            });
            setOtpSent(true);
            toast.success(res.data?.message || 'A 6-digit OTP code has been sent to your email inbox.');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send OTP email. Please check your email address.');
        } finally {
            setSendingOtp(false);
        }
    };

    // Handle Verify OTP
    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP code.');
            return;
        }

        setVerifyingOtp(true);
        try {
            await authService.verifyRegistrationOtp(formData.email, otpCode);
            setIsEmailVerified(true);
            toast.success('✓ Email address verified successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid or expired OTP code.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    // Handle Form Submit -> Registration
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isEmailVerified) {
            toast.error('Please verify your email address via OTP before creating your account.');
            return;
        }

        const validationResult = registerSchema.safeParse({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone || '',
        });

        if (!validationResult.success) {
            const firstIssue = validationResult.error.issues[0];
            toast.error(firstIssue.message);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (phoneError) {
            toast.error(phoneError);
            return;
        }

        if (passwordError) {
            toast.error(passwordError);
            return;
        }

        const registrationType = isLateral ? 'LATERAL_ENTRY' : 'FRESH';

        setLoading(true);
        try {
            const registerRes = await authService.register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                registrationType,
            });

            if (registerRes.data.success) {
                toast.success('Account created successfully! 🎉');
                login(registerRes.data.data.token);
                navigate('/admission/dashboard');
            }
        } catch (error) {
            const fields = error.response?.data?.fields;
            if (fields && typeof fields === 'object') {
                Object.values(fields).forEach((msg) => {
                    toast.error(msg);
                });
            } else {
                toast.error(error.response?.data?.error || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full animate-fade-in max-w-md mx-auto lg:mx-0">
            <div className="mb-3 sm:mb-4 text-center lg:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1.5 sm:mb-2">
                    <GraduationCap size={13} />
                    {isLateral ? 'Lateral Entry' : 'Fresh Admission'} {admissionCycle || getAcademicYear()}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">
                    {isLateral ? 'Lateral Entry Registration' : 'Student Registration'}
                </h2>
                <p className="text-xs text-slate-500">
                    {isLateral ? 'Create your account for direct 3rd-semester admission' : 'Create your account to begin the admission process'}
                </p>
            </div>

            {admissionsClosed ? (
                <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-4 my-4 shadow-sm">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Lock size={22} />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-base font-bold text-amber-900">Admissions Closed</h3>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            Admissions are currently closed. Please contact the college office for further information.
                        </p>
                    </div>
                    <div className="pt-3 border-t border-amber-200/80">
                        <Link to="/admission/login" className="inline-flex items-center text-xs font-bold text-primary-600 hover:underline">
                            Existing user? Log in to your portal &rarr;
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
                        {/* Name row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700" htmlFor="firstName">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all duration-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md"
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700" htmlFor="lastName">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all duration-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Address & Send OTP Button */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="email">
                                    <Mail size={14} className="text-slate-400" />
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                {isEmailVerified && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <CheckCircle2 size={12} /> Email Verified
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isEmailVerified}
                                    className="flex-1 px-3 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all duration-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-emerald-50/50 disabled:text-emerald-900 shadow-sm focus:shadow-md"
                                    placeholder="student@example.com"
                                    required
                                />
                                {!isEmailVerified && (
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || !formData.email}
                                        className="px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 hover:border-primary-400 font-bold rounded-xl text-xs transition-all duration-200 flex items-center gap-1 cursor-pointer disabled:opacity-50 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {sendingOtp ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                                        {otpSent ? 'Resend OTP' : 'Send OTP'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 6-Digit OTP Verification Box */}
                        {otpSent && !isEmailVerified && (
                            <div className="p-3.5 bg-indigo-50/80 hover:bg-indigo-50 border border-indigo-200/90 rounded-2xl space-y-2 animate-fade-in transition-all duration-300 shadow-sm">
                                <label className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                                    <span>Enter 6-Digit Verification Code</span>
                                    <span className="text-[10px] text-indigo-600 font-medium">Valid for 5 mins</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="••••••"
                                        className="flex-1 px-3 py-2 bg-white border border-indigo-300 rounded-xl text-center font-mono text-lg font-bold tracking-[8px] outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleVerifyOtp}
                                        disabled={verifyingOtp || otpCode.length !== 6}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-md hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        {verifyingOtp ? <Loader2 size={13} className="animate-spin" /> : 'Verify OTP'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phone */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="phone">
                                    <Phone size={14} className="text-slate-400" />
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                {isCheckingPhone && <span className="text-[10px] text-primary-600 font-semibold animate-pulse">Checking...</span>}
                            </div>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                maxLength={10}
                                className={`w-full px-3 py-2 bg-slate-50/80 hover:bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 transition-all duration-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md ${phoneError ? 'border-red-500 focus:ring-red-500/15' : 'border-slate-200 hover:border-primary-400 focus:ring-primary-600/15 focus:border-primary-600'}`}
                                placeholder="9876543210"
                                required
                            />
                            {phoneError && <p className="text-[11px] text-red-500 font-medium mt-0.5">{phoneError}</p>}
                        </div>

                        {/* Password Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="password">
                                    <Lock size={14} className="text-slate-400" />
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className={`w-full px-3 py-2 pr-8 bg-slate-50/80 hover:bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 transition-all duration-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md ${passwordError ? 'border-red-500 focus:ring-red-500/15' : 'border-slate-200 hover:border-primary-400 focus:ring-primary-600/15 focus:border-primary-600'}`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                {passwordError && <p className="text-[11px] text-red-500 font-medium mt-0.5">{passwordError}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="confirmPassword">
                                    <Lock size={14} className="text-slate-400" />
                                    Confirm <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-600/15 focus:border-primary-600 transition-all duration-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isEmailVerified || !!phoneError || !!passwordError}
                            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm mt-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1.5 transition-transform duration-300" />
                                </>
                            )}
                        </button>
                    </form>
                </>
            )}

            <div className="mt-3 text-center text-xs text-slate-600">
                Already registered?{' '}
                <Link to="/admission/login" className="font-bold text-primary-600 hover:underline">
                    Log in here
                </Link>
            </div>
        </div>
    );
};

export default Register;
