import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, School, Layers, Moon, Sun } from 'lucide-react';

interface PublicConfig {
  collegeName: string;
  admissionOpen: boolean;
  admissionCycle: string;
  freshAdmissionOpen: boolean;
  lateralEntryOpen: boolean;
  provisionalAdmission3Open: boolean;
  provisionalAdmission5Open: boolean;
  provisionalAdmission7Open: boolean;
}

export const AdmissionTypeSelection: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PublicConfig>({
    collegeName: 'Jain College of Engineering & Research (JCER)',
    admissionOpen: true,
    admissionCycle: '2026-2027',
    freshAdmissionOpen: true,
    lateralEntryOpen: true,
    provisionalAdmission3Open: false,
    provisionalAdmission5Open: false,
    provisionalAdmission7Open: false,
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    fetch('/api/system/config')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setConfig((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch((err) => console.warn('Could not load config', err));
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const handleSelectType = (type: 'fresh' | 'lateral' | 'provisional') => {
    if (type === 'fresh') {
      navigate('/admission/register?type=fresh');
    } else if (type === 'lateral') {
      navigate('/admission/register?type=lateral');
    } else if (type === 'provisional') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.role === 'STUDENT') {
            navigate('/admission/provisional');
            return;
          }
        } catch (e) {}
      }
      navigate('/admission/login?type=provisional');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header */}
      <header className={`sticky top-0 z-30 w-full backdrop-blur-md border-b shadow-sm transition-all duration-200 ${isDark ? 'bg-slate-950/80 border-slate-800/70' : 'bg-white/80 border-[#E2E8F0]'}`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.png" alt="JCER Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center flex-1 space-y-0.5">
              <h1 className={`text-sm sm:text-base md:text-lg font-extrabold leading-tight tracking-tight uppercase ${isDark ? 'text-white' : 'text-[#0B4F8A]'}`}>
                {config.collegeName}
              </h1>
              <p className={`text-[8.5px] sm:text-[10px] md:text-xs font-medium leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                (Approved by AICTE, New Delhi, Affiliated to VTU Belagavi & Recognized by Govt. of Karnataka)
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 max-w-7xl mx-auto w-full">
        
        <div className="text-center max-w-2xl mb-12">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 ${isDark ? 'text-white' : 'text-[#0F4C81]'}`}>
            Choose Your Admission Type
          </h2>
          <p className={`text-sm sm:text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Select the application type that best matches your admission.
          </p>
        </div>

        {/* Cards container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          
          {/* Card 1: Fresh Application */}
          <div className={`flex flex-col h-full rounded-2xl border p-6 shadow-sm transition-all duration-300 ${
            isDark 
              ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 hover:shadow-lg' 
              : 'bg-white border-[#E2E8F0] hover:border-[#2563EB]/50 hover:shadow-lg'
          }`}>
            <div className="flex justify-between items-start mb-5">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-50 text-[#2563EB]'}`}>
                <GraduationCap className="w-7 h-7" />
              </div>
              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-900/50' : 'bg-blue-50 text-[#2563EB] border border-blue-100'
              }`}>
                1st Semester
              </span>
            </div>

            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#1E3A8A]'}`}>
              Fresh Application
            </h3>
            
            <p className={`text-sm mb-6 flex-grow ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              For students joining the 1st semester.
            </p>

            <button
              onClick={() => handleSelectType('fresh')}
              disabled={!config.freshAdmissionOpen}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wide transition-all shadow-md active:translate-y-0.5 cursor-pointer ${
                config.freshAdmissionOpen
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white shadow-blue-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              {config.freshAdmissionOpen ? 'Start Application' : 'Admission Closed'}
            </button>
          </div>

          {/* Card 2: Lateral Entry */}
          <div className={`flex flex-col h-full rounded-2xl border p-6 shadow-sm transition-all duration-300 ${
            isDark 
              ? 'bg-slate-950 border-slate-800 hover:border-indigo-500/50 hover:shadow-lg' 
              : 'bg-white border-[#E2E8F0] hover:border-indigo-600/50 hover:shadow-lg'
          }`}>
            <div className="flex justify-between items-start mb-5">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <School className="w-7 h-7" />
              </div>
              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                isDark ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/50' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}>
                3rd Semester
              </span>
            </div>

            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#1E3A8A]'}`}>
              Lateral Entry
            </h3>
            
            <p className={`text-sm mb-6 flex-grow ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              For diploma students joining directly into the 3rd semester.
            </p>

            <button
              onClick={() => handleSelectType('lateral')}
              disabled={!config.lateralEntryOpen}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wide transition-all shadow-md active:translate-y-0.5 cursor-pointer ${
                config.lateralEntryOpen
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              {config.lateralEntryOpen ? 'Start Application' : 'Admission Closed'}
            </button>
          </div>

          {/* Card 3: Provisional Admission */}
          <div className={`flex flex-col h-full rounded-2xl border p-6 shadow-sm transition-all duration-300 ${
            isDark 
              ? 'bg-slate-950 border-slate-800 hover:border-emerald-500/50 hover:shadow-lg' 
              : 'bg-white border-[#E2E8F0] hover:border-emerald-600/50 hover:shadow-lg'
          }`}>
            <div className="flex justify-between items-start mb-5">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <Layers className="w-7 h-7" />
              </div>
              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              }`}>
                3rd / 5th / 7th Semester
              </span>
            </div>

            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#1E3A8A]'}`}>
              Provisional Admission
            </h3>
            
            <p className={`text-sm mb-6 flex-grow ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              For students seeking provisional admission into an existing semester.
            </p>

            <button
              onClick={() => handleSelectType('provisional')}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wide transition-all shadow-md active:translate-y-0.5 cursor-pointer bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-500/20"
            >
              Continue
            </button>
          </div>

        </div>

        {/* Back to Home Button */}
        <button
          onClick={() => navigate('/')}
          className={`mt-12 flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold tracking-wide uppercase transition-all shadow-sm border cursor-pointer ${
            isDark
              ? 'bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

      </main>

      {/* Footer */}
      <footer className={`py-6 border-t text-center text-xs font-semibold ${isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-[#E2E8F0] text-slate-500'}`}>
        <p>© {new Date().getFullYear()} {config.collegeName}. All rights reserved.</p>
      </footer>

    </div>
  );
};
