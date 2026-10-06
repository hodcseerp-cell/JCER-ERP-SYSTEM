import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface DaySession {
  subjectCode: string;
  subjectName: string;
  period: number;
  status: 'PRESENT' | 'ABSENT' | string;
}

export interface DayEntry {
  date: string;
  sessions: DaySession[];
  presentCount: number;
  absentCount: number;
  status: 'PRESENT' | 'ABSENT' | string;
}

interface AttendanceCalendarProps {
  calendarData?: Record<string, DayEntry>;
  threshold?: number;
  onMonthChange?: (monthKey: string) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  calendarData = {},
  threshold = 85.0,
  onMonthChange,
}) => {
  // Calendar View State: Year and Month (0 = Jan, 11 = Dec)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  // Modal State for Inspecting Day Details
  const [selectedDayModal, setSelectedDayModal] = useState<DayEntry | null>(null);

  // Month navigation
  const monthKey = useMemo(() => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  }, [currentYear, currentMonth]);

  const monthLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonth, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth - 1;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    const newKey = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    onMonthChange?.(newKey);
  };

  const handleNextMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth + 1;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
    const newKey = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    onMonthChange?.(newKey);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    const newKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange?.(newKey);
  };

  // Compute days in the month and leading weekday offset
  const { daysInMonth, leadingBlanks } = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    return {
      daysInMonth: totalDays,
      leadingBlanks: firstDayOfWeek,
    };
  }, [currentYear, currentMonth]);

  const weekdays = [
    { label: 'SUN', bgClass: 'bg-gradient-to-b from-rose-500 to-rose-600 text-white' },
    { label: 'MON', bgClass: 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white' },
    { label: 'TUE', bgClass: 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white' },
    { label: 'WED', bgClass: 'bg-gradient-to-b from-purple-600 to-purple-700 text-white' },
    { label: 'THU', bgClass: 'bg-gradient-to-b from-purple-600 to-purple-700 text-white' },
    { label: 'FRI', bgClass: 'bg-gradient-to-b from-violet-600 to-violet-700 text-white' },
    { label: 'SAT', bgClass: 'bg-gradient-to-b from-amber-500 to-amber-600 text-white' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-6 shadow-sm space-y-5">
      {/* ── COLORFUL VIBRANT HEADER & NAVIGATION ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white p-5 shadow-lg shadow-indigo-500/15">
        {/* Background decorative glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title & Icon */}
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center font-bold shadow-inner flex-shrink-0">
              <CalendarIcon className="size-6" />
            </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Attendance Calendar
                </h3>
                <p className="text-xs text-indigo-100/90 mt-0.5 font-medium">
                  Interactive session inspection across recorded dates
                </p>
              </div>
          </div>

          {/* Month Navigation (< Month Year >, Today) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-xs font-bold text-white transition shadow-xs cursor-pointer active:scale-95"
            >
              Today
            </button>
            <div className="flex items-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 p-1 text-white shadow-xs">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-3.5 text-xs font-black text-white min-w-[130px] text-center select-none tracking-wide">
                {monthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── COLORFUL LEGEND BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-neutral-300 py-1 px-1">
        <span className="text-[11px] text-slate-400 font-medium">
          Click any date cell to view session details:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold shadow-2xs">
            <span className="size-2.5 rounded-sm bg-emerald-500 shadow-xs" />
            <span>Green = Present</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold shadow-2xs">
            <span className="size-2.5 rounded-sm bg-rose-500 shadow-xs" />
            <span>Red = Absent</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold shadow-2xs">
            <span className="size-2.5 rounded-sm bg-amber-500 shadow-xs" />
            <span>Amber = Mixed</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700 font-semibold shadow-2xs">
            <span className="size-2.5 rounded-sm bg-slate-300 dark:bg-neutral-600 shadow-xs" />
            <span>White = No Classes</span>
          </span>
        </div>
      </div>

      {/* ── 7-DAY CALENDAR GRID WITH COLORFUL WEEKDAY HEADERS ── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-xs">
        {/* Colorful Weekdays Header Strip */}
        <div className="grid grid-cols-7 text-center text-xs font-black tracking-wider select-none">
          {weekdays.map((day) => (
            <div
              key={day.label}
              className={`py-3 ${day.bgClass} uppercase text-[11px] border-r border-white/10 last:border-r-0 shadow-2xs`}
            >
              {day.label}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-neutral-800/80 bg-white dark:bg-neutral-900">
          {/* Leading empty days */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[84px] p-2 bg-slate-50/50 dark:bg-neutral-950/30"
            />
          ))}

          {/* Actual days in month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const entry = calendarData[dateStr];
            const hasSessions = Boolean(entry && entry.sessions && entry.sessions.length > 0);
            const isAllPresent = hasSessions && entry.absentCount === 0;
            const isAllAbsent = hasSessions && entry.presentCount === 0;
            const isMixed = hasSessions && !isAllPresent && !isAllAbsent;
            const isToday =
              today.getFullYear() === currentYear &&
              today.getMonth() === currentMonth &&
              today.getDate() === dayNum;

            // Box styling based on attendance status: green for present, red for absent
            let boxClass = 'bg-white dark:bg-neutral-900';
            if (hasSessions) {
              if (isAllPresent) {
                boxClass = 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white cursor-pointer shadow-xs hover:shadow-md';
              } else if (isAllAbsent) {
                boxClass = 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500 text-white cursor-pointer shadow-xs hover:shadow-md';
              } else if (isMixed) {
                boxClass = 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white cursor-pointer shadow-xs hover:shadow-md';
              }
            }

            return (
              <div
                key={dayNum}
                onClick={() => hasSessions && setSelectedDayModal(entry)}
                title={
                  hasSessions
                    ? `${isAllPresent ? 'Present' : isAllAbsent ? 'Absent' : 'Mixed Attendance'} (${entry.sessions.length} ${entry.sessions.length === 1 ? 'class' : 'classes'}) — Click to inspect`
                    : undefined
                }
                className={`min-h-[84px] p-2.5 flex flex-col justify-between transition-all group select-none ${boxClass}`}
              >
                {/* Date header in cell */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-black text-2xl sm:text-3xl leading-none transition-colors ${
                      hasSessions
                        ? 'text-white'
                        : 'text-slate-800 dark:text-neutral-100 group-hover:text-indigo-600'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {isToday && (
                    <span
                      className={`size-2 sm:size-2.5 rounded-full ring-2 ${
                        hasSessions
                          ? 'bg-white ring-white/40 shadow-xs'
                          : 'bg-indigo-600 ring-indigo-200 dark:bg-indigo-400 dark:ring-indigo-900'
                      }`}
                      title="Today"
                    />
                  )}
                </div>

                {/* Status Indicator in Cell */}
                <div className="mt-1 flex items-center justify-center flex-1">
                  {hasSessions ? (
                    <div className="flex items-center justify-center">
                      {isAllPresent ? (
                        <Check className="size-5 stroke-[3] text-white drop-shadow-2xs group-hover:scale-110 transition-transform" />
                      ) : isAllAbsent ? (
                        <X className="size-5 stroke-[3] text-white drop-shadow-2xs group-hover:scale-110 transition-transform" />
                      ) : (
                        <span className="text-[11px] font-black text-white tracking-wide">
                          {entry.presentCount}P / {entry.absentCount}A
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 dark:text-neutral-700 font-medium select-none">
                        —
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL: DAY SESSIONS INSPECTION ── */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200 dark:border-neutral-800 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-indigo-700 to-purple-700 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white">
                  Recorded Sessions
                </h4>
                <p className="text-xs text-indigo-100 mt-0.5">
                  {new Date(selectedDayModal.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayModal(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDayModal.sessions.map((sess, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-800/40 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {sess.subjectCode}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">
                        Period {sess.period}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-neutral-300 truncate font-semibold">
                      {sess.subjectName}
                    </div>
                  </div>

                  <div>
                    {sess.status === 'PRESENT' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>Present</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
                        <XCircle className="size-3.5 text-rose-600" />
                        <span>Absent</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-neutral-800/60 border-t border-slate-100 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedDayModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
