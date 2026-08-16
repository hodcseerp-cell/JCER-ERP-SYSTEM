import React from 'react';

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
  const currentYear = 2026;
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
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1 sm:gap-1">
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
          © {currentYear} Jain College of Engineering & Research, Belagavi. All rights reserved.
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
