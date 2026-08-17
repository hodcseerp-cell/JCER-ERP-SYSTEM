import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdmissionHeader from '../components/AdmissionHeader';
import { ArrowLeft } from 'lucide-react';
import GlobalFooter from '../../../../components/common/GlobalFooter';

const AuthLayout = () => {
    const { token, user } = useAuth();
    
    // IMAGE CONFIGURATION:
    const collegeImgPath = "/college-view.jpg";
    const fallbackImg = "https://images.unsplash.com/photo-1498243639159-414ccead8c51?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";

    if (token && user) {
        if (user.role === 'STUDENT') return <Navigate to="/admission/dashboard" replace />;
        if (user.role === 'ADMISSION_OFFICER') return <Navigate to="/admin/dashboard" replace />;
        return <Navigate to="/" replace />;
    }

    return (
        <div className="admission-portal-theme h-screen w-full bg-slate-50 font-display flex flex-col overflow-hidden relative">
            {/* Ambient Background Decorative Glows */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-400/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

            {/* Sticky Fixed Header - Always visible across all admission auth pages */}
            <AdmissionHeader />

            {/* Scrollable Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full p-3 sm:p-5 lg:p-6 flex flex-col justify-start items-center relative z-10">
                {/* Back to Home Button at top left of content area */}
                <button
                    type="button"
                    onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/';
                    }}
                    className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md hover:bg-white border border-slate-200/80 hover:border-primary-400 text-slate-800 hover:text-primary-600 font-bold text-xs transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Home
                </button>

                <div className="group w-full max-w-[1050px] grid grid-cols-1 lg:grid-cols-2 items-stretch bg-white rounded-3xl shadow-2xl hover:shadow-[0_30px_70px_-15px_rgba(37,99,235,0.22)] border border-slate-200/80 hover:border-primary-400/60 h-auto animate-fade-in text-slate-900 my-auto transition-all duration-500 ease-out hover:-translate-y-1 overflow-hidden">
                    
                    {/* Left Side: Visual/Branding Section (HIDDEN ON MOBILE) */}
                    <div className="hidden lg:flex relative bg-slate-900 border-r border-slate-200/80 h-full flex-col justify-end rounded-l-3xl overflow-hidden min-h-[440px]">
                        {/* Background Layer with Dual Fallback Logic */}
                        <div 
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105" 
                            style={{ 
                                backgroundImage: `url(${collegeImgPath}), url(${fallbackImg})`,
                            }}
                        ></div>

                        {/* Dark Gradient Overlay for Readability */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/60 to-black/80 pointer-events-none group-hover:opacity-90 transition-opacity duration-500"></div>
                        
                        {/* Content Overlay */}
                        <div className="relative h-full flex flex-col justify-end p-6 lg:p-8 xl:p-10 text-white z-10">
                            <div className="mb-4 xl:mb-8 space-y-2.5 xl:space-y-3">
                                <span className="bg-white/20 backdrop-blur-lg px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] mb-3 inline-block border border-white/25 shadow-sm group-hover:bg-primary-600/30 group-hover:border-primary-400/50 transition-all duration-300">
                                    Welcome Back
                                </span>
                                <h1 className="text-2xl lg:text-3xl xl:text-4xl font-extrabold leading-[1.15] mb-3 text-shadow-premium">
                                    Empowering Your <br />
                                    <span className="text-primary-300 group-hover:text-primary-200 transition-colors">Academic Journey.</span>
                                </h1>
                                <p className="text-white/80 text-xs lg:text-sm xl:text-base leading-relaxed max-w-md font-medium">
                                    Access your academic records, course registrations, and institutional resources in one secure portal.
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4 pt-4 xl:pt-6 border-t border-white/15">
                                <div className="flex -space-x-2.5">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="size-9 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden ring-2 ring-white/10 group-hover:ring-primary-400/30 transition-all">
                                            <img 
                                                src={`https://i.pravatar.cc/100?u=${i}`} 
                                                alt={`Student ${i}`} 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-extrabold">Join 5,000+ students today</p>
                                    <p className="text-[10px] text-white/60 font-medium">Trusted by leading academic institutions</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Form Content (Outlet) */}
                    <div className="p-6 sm:p-8 lg:p-9 xl:p-10 flex flex-col justify-center bg-white relative z-10 h-full rounded-r-3xl">
                        <Outlet />
                    </div>
                </div>
            </main>

            <GlobalFooter className="bg-white border-t border-slate-200/80 mt-auto shrink-0 relative z-20" />
        </div>
    );
};

export default AuthLayout;
