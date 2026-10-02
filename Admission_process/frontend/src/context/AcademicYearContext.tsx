import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import API from '../services/api';

export interface AcademicYearOption {
  id: string;
  year: string;
  isCurrent?: boolean;
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

interface AcademicYearContextType {
  academicYear: string;
  selectedAcademicYear?: AcademicYearOption;
  setAcademicYear: (year: string) => void;
  academicYears: AcademicYearOption[];
  loading: boolean;
  refreshAcademicYears: () => Promise<void>;
}

const STORAGE_KEY = 'global_academic_year';
const DEFAULT_YEAR = '2026-27';

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const AcademicYearProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [academicYear, setAcademicYearState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_YEAR;
  });
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([
    { id: '16f8bdab-5ed2-4fde-9a84-d71640527098', year: '2027-28', isCurrent: false, status: 'UPCOMING' },
    { id: '6724907a-0d31-4400-a96d-049e966220aa', year: '2026-27', isCurrent: true, status: 'ACTIVE' },
    { id: 'ab77567d-1f26-44f3-9822-9804324bdbd5', year: '2025-26', isCurrent: false, status: 'ARCHIVED' },
  ]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/system/academic-years');
      if (res.data?.success && res.data?.data) {
        const { currentYear, years } = res.data.data;
        if (Array.isArray(years) && years.length > 0) {
          setAcademicYears(years);
        }
        // If no stored preference exists yet, use system's currentYear
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored && currentYear) {
          setAcademicYearState(currentYear);
          localStorage.setItem(STORAGE_KEY, currentYear);
        }
      }
    } catch (err) {
      console.warn('Could not fetch academic years list from server, using fallback list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  // Sync across tabs and custom events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== academicYear) {
        setAcademicYearState(e.newValue);
      }
    };
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ academicYear: string }>;
      if (customEvent.detail?.academicYear && customEvent.detail.academicYear !== academicYear) {
        setAcademicYearState(customEvent.detail.academicYear);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('academic-year-changed', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('academic-year-changed', handleCustomChange);
    };
  }, [academicYear]);

  const setAcademicYear = useCallback((newYear: string) => {
    if (!newYear) return;
    setAcademicYearState(newYear);
    localStorage.setItem(STORAGE_KEY, newYear);
    // Dispatch custom event for any listeners across dashboard
    window.dispatchEvent(new CustomEvent('academic-year-changed', { detail: { academicYear: newYear } }));
  }, []);

  const selectedAcademicYear = academicYears.find((y) => y.year === academicYear);

  return (
    <AcademicYearContext.Provider
      value={{
        academicYear,
        selectedAcademicYear,
        setAcademicYear,
        academicYears,
        loading,
        refreshAcademicYears: fetchAcademicYears,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = (): AcademicYearContextType => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};

export default AcademicYearContext;
