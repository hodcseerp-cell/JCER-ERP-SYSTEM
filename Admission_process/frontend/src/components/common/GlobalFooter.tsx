import React, { useState, useEffect } from 'react';
import API from '../../services/api';

interface GlobalFooterProps {
  className?: string;
  isDark?: boolean;
  variant?: 'light' | 'dark' | 'transparent' | 'glass' | 'light-glass';
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ 
  className = '', 
  isDark = false,
  variant
}) => {
  const [copyrightYear, setCopyrightYear] = useState<string>(() => {
    return localStorage.getItem('jcer_copyright_year') || '2026';
  });

  useEffect(() => {
    let isMounted = true;
    const loadCopyrightYear = async () => {
      try {
        const res = await fetch('/api/system/config');
        if (res.ok) {
          const json = await res.json();
          const year = json.data?.copyrightYear || json.copyrightYear;
          if (year && isMounted) {
            setCopyrightYear(String(year));
            localStorage.setItem('jcer_copyright_year', String(year));
          }
        }
      } catch (err) {
        // Fallback value remains active
      }
    };

    loadCopyrightYear();

    const handleStorageChange = () => {
      const storedYear = localStorage.getItem('jcer_copyright_year');
      if (storedYear) {
        setCopyrightYear(storedYear);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const isLightGlass = variant === 'light-glass' || variant === 'light' || (!isDark && variant !== 'dark' && variant !== 'transparent' && variant !== 'glass');
  const isDarkGlass = variant === 'glass';

  return (
    <footer
      style={
        isLightGlass
          ? {
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderColor: 'rgba(226, 232, 240, 0.8)',
              color: '#0f172a'
            }
          : undefined
      }
      className={`w-full text-center text-xs font-medium transition-colors duration-200 select-none py-2.5 px-4 sm:px-6 ${
        isLightGlass
          ? 'light-footer-mode !bg-white/85 backdrop-blur-md !border-t !border-slate-200/80 !text-slate-800 shadow-sm'
          : isDarkGlass
          ? 'bg-[#0a142d]/55 backdrop-blur-md border-t border-white/15 text-slate-200'
          : variant === 'transparent'
          ? 'bg-transparent border-t-0 text-slate-300'
          : 'bg-slate-950/90 border-t border-slate-800/80 text-slate-400'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1.5 sm:gap-2">
        
        {/* Footer Navigation Links */}
        <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-4 text-[11px] sm:text-xs font-bold tracking-wide">
          <a
            href="/terms-of-use"
            style={isLightGlass ? { color: '#334155' } : isDarkGlass ? { color: '#e2e8f0' } : { color: '#cbd5e1' }}
            className="hover:underline transition-colors cursor-pointer"
          >
            Terms & Conditions
          </a>
          <span style={{ color: isLightGlass ? '#cbd5e1' : '#475569' }}>•</span>
          <a
            href="/privacy-policy"
            style={isLightGlass ? { color: '#334155' } : isDarkGlass ? { color: '#e2e8f0' } : { color: '#cbd5e1' }}
            className="hover:underline transition-colors cursor-pointer"
          >
            Privacy Policy
          </a>
          <span style={{ color: isLightGlass ? '#cbd5e1' : '#475569' }}>•</span>
          <a
            href="/support"
            style={isLightGlass ? { color: '#2563eb' } : isDarkGlass ? { color: '#60a5fa' } : { color: '#818cf8' }}
            className="hover:underline transition-colors cursor-pointer font-extrabold"
          >
            Support Desk
          </a>
        </div>

        <p 
          style={isLightGlass ? { color: '#475569' } : isDarkGlass ? { color: 'rgba(255, 255, 255, 0.85)' } : undefined}
          className={
            isLightGlass
              ? 'light-footer-copyright !text-slate-600 text-[11px] sm:text-xs leading-tight font-medium'
              : isDarkGlass
              ? 'text-white/85 text-[11px] sm:text-xs leading-tight font-medium'
              : 'text-slate-400 text-[11px] sm:text-xs leading-normal'
          }
        >
          © {copyrightYear} Jain College of Engineering & Research, Belagavi. All rights reserved.
        </p>
        <p 
          style={isLightGlass ? { color: '#0f172a' } : isDarkGlass ? { color: '#ffffff' } : undefined}
          className={
            isLightGlass
              ? 'light-footer-author !text-slate-900 font-semibold text-xs leading-tight'
              : isDarkGlass
              ? 'text-white font-semibold text-xs leading-tight'
              : 'text-slate-200 font-semibold text-xs leading-normal'
          }
        >
          Designed & Developed by{' '}
          <a
            href="https://vyonlabs.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Designed & Developed by VYON LABS (opens in a new tab)"
            style={isLightGlass ? { color: '#2563eb' } : isDarkGlass ? { color: '#7dd3fc' } : undefined}
            className={
              isLightGlass
                ? 'light-footer-link !text-blue-600 hover:!text-blue-700 font-bold transition-all hover:underline hover:scale-[1.02] inline-block ml-0.5'
                : isDarkGlass
                ? 'text-sky-300 hover:text-sky-200 font-bold transition-all hover:underline hover:scale-[1.02] inline-block ml-0.5'
                : 'text-primary-600 hover:text-primary-700 font-bold transition-all hover:underline hover:scale-[1.02] inline-block ml-0.5'
            }
          >
            VYON LABS
          </a>
        </p>
      </div>
    </footer>
  );
};

export default GlobalFooter;
