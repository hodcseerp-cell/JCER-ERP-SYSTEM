import React from 'react';
import { Menu, X } from 'lucide-react';

const AdmissionHeader = ({ toggleSidebar, isSidebarOpen, headerRef }) => {

    return (
        <header ref={headerRef} className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm flex-shrink-0 transition-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
                
                {/* ─── 1. DESKTOP / LAPTOP LAYOUT (lg:flex) ─── */}
                <div className="hidden lg:flex items-center justify-between py-1 w-full">
                    
                    {/* LEFT: BRANDING BLOCK (Logo + College Details) */}
                    <div className="flex items-center justify-start gap-4 flex-1 min-w-0">
                        {/* College Logo */}
                        <div className="shrink-0 w-[70px] h-[70px] bg-white rounded-full overflow-hidden flex items-center justify-center shadow-xs border border-slate-200">
                            <img 
                                src="/logo.png" 
                                alt="JCER Logo" 
                                className="w-full h-full object-contain bg-white rounded-full p-1" 
                            />
                        </div>

                        {/* Text Stack */}
                        <div className="flex flex-col text-left justify-center min-w-0 flex-1">
                            {/* Title */}
                            <h1 
                                className="text-[#0B4F8A] text-xl xl:text-[22px] font-black leading-tight uppercase font-sans tracking-tight"
                                style={{ color: '#0B4F8A', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: '900' }}
                            >
                                JAIN COLLEGE OF ENGINEERING & RESEARCH
                            </h1>

                            {/* Approval Line */}
                            <p 
                                className="text-xs lg:text-[12.5px] text-slate-700 font-bold leading-snug mt-0.5"
                                style={{ color: '#1f2937', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: '700' }}
                            >
                                (Approved by AICTE, New Delhi, Affiliated to VTU Belagavi & Recognized by Govt. of Karnataka)
                            </p>

                            {/* Accreditation Line */}
                            <p 
                                className="text-xs lg:text-[12.5px] font-extrabold text-indigo-700 leading-tight mt-0.5"
                                style={{ color: '#4f46e5', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: '800' }}
                            >
                                NBA Accredited Programs – ECE & ME
                            </p>
                        </div>
                    </div>

                </div>

                {/* ─── 2. MOBILE / TABLET LAYOUT (lg:hidden) ─── */}
                <div className="flex lg:hidden items-center justify-start gap-3 py-1.5 w-full">
                    
                    {/* LEFT: Hamburger Menu Icon */}
                    <div className="flex items-center shrink-0">
                        {toggleSidebar ? (
                            <button
                                onClick={toggleSidebar}
                                className="p-1.5 text-slate-800 hover:text-primary-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                                aria-label="Toggle Navigation Menu"
                                type="button"
                            >
                                {isSidebarOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        ) : (
                            <div className="w-6 h-6" />
                        )}
                    </div>

                    {/* College Logo */}
                    <div className="shrink-0 w-[52px] h-[52px] bg-white rounded-full overflow-hidden flex items-center justify-center shadow-xs border border-slate-200">
                        <img 
                            src="/logo.png" 
                            alt="JCER Logo" 
                            className="w-full h-full object-contain bg-white rounded-full p-0.5" 
                        />
                    </div>

                    {/* College details text stack */}
                    <div className="flex flex-col text-left justify-center min-w-0 flex-1">
                        <h1 
                            className="text-[#0B4F8A] text-[13px] sm:text-[15px] font-black leading-tight uppercase font-sans tracking-tight"
                            style={{ color: '#0B4F8A', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: '900' }}
                        >
                            JAIN COLLEGE OF ENGINEERING & RESEARCH
                        </h1>
                        <p 
                            className="text-[9px] sm:text-[10px] text-slate-700 font-bold leading-snug mt-0.5"
                            style={{ color: '#1f2937', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: '700' }}
                        >
                            (Approved by AICTE, New Delhi, Affiliated to VTU Belagavi & Recognized by Govt. of Karnataka)
                        </p>
                        <p 
                            className="text-[9.5px] sm:text-[10.5px] font-extrabold text-indigo-600 leading-tight mt-0.5"
                            style={{ color: '#4f46e5', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontWeight: '800' }}
                        >
                            NBA Accredited Programs – ECE & ME
                        </p>
                    </div>

                </div>

            </div>
        </header>
    );
};

export default AdmissionHeader;
