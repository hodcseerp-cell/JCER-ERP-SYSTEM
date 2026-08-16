import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';
import { LEGAL_LAST_UPDATED } from '../../constants/legal.constants';
import GlobalFooter from './GlobalFooter';

interface LegalPageLayoutProps {
  title: string;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, sections, children }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains('dark') || 
                        window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(isDarkTheme);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 transition-colors duration-300 font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-[#E2E8F0] dark:border-slate-800/70 shadow-sm transition-all duration-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" alt="Jain College of Engineering & Research" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center flex-1 space-y-0.5">
              <h1 className="text-[#0B4F8A] dark:text-white text-sm sm:text-base md:text-lg font-extrabold leading-tight tracking-tight uppercase" style={{ color: isDark ? '#ffffff' : '#0B4F8A' }}>
                Jain College of Engineering & Research
              </h1>
              <p className="text-[8.5px] sm:text-[10px] md:text-xs text-slate-700 dark:text-slate-350 font-medium leading-snug">
                (Approved by AICTE, New Delhi, Affiliated to VTU Belagavi & Recognized by Govt. of Karnataka)
              </p>
              <p className="text-[9.5px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400">
                JCER Admission ERP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow">
        <div className="flex flex-col lg:flex-row gap-8 relative items-start">
          
          {/* Sidebar Navigation */}
          <nav className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              {title.toLowerCase().includes('privacy') ? (
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              ) : (
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              )}
              <span className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Quick Navigation</span>
            </div>
            
            <ul className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <button
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left py-1.5 px-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                      activeSection === sec.id
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-extrabold shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {sec.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal Document Content */}
          <article className="flex-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 p-6 sm:p-8 md:p-10 rounded-3xl shadow-sm space-y-8">
            <div className="border-b border-slate-150 dark:border-slate-850 pb-5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-3 flex items-center gap-1.5">
                <span>Last Updated:</span>
                <span className="text-slate-850 dark:text-white font-bold">{LEGAL_LAST_UPDATED}</span>
              </p>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none text-xs sm:text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300 space-y-6">
              {children}
            </div>
          </article>
        </div>
      </main>

      {/* Footer */}
      <GlobalFooter isDark={isDark} />
    </div>
  );
};
