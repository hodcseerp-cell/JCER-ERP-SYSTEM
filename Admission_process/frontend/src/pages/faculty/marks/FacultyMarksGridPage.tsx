import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import facultyService, {
  BitwiseMarksWorkspaceData,
  BitwiseMarksStudentRow,
} from '../../../services/faculty.service';
import {
  ArrowLeft,
  Settings,
  Save,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  FileSpreadsheet,
  CloudCheck,
  CloudOff,
  Building2,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const QUESTION_THEMES = [
  {
    // Indigo / Blue (Q1)
    mainHeader: 'bg-indigo-900 text-white border-r border-indigo-700',
    subHeader: 'bg-indigo-800 text-indigo-100 border-r border-indigo-700/80',
    totalHeader: 'bg-indigo-950 text-indigo-200 font-extrabold border-r border-indigo-700',
    totalCell: 'bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200',
  },
  {
    // Teal / Cyan (Q2)
    mainHeader: 'bg-teal-900 text-white border-r border-teal-700',
    subHeader: 'bg-teal-800 text-teal-100 border-r border-teal-700/80',
    totalHeader: 'bg-teal-950 text-teal-200 font-extrabold border-teal-700',
    totalCell: 'bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200',
  },
  {
    // Purple / Violet (Q3)
    mainHeader: 'bg-purple-900 text-white border-r border-purple-700',
    subHeader: 'bg-purple-800 text-purple-100 border-r border-purple-700/80',
    totalHeader: 'bg-purple-950 text-purple-200 font-extrabold border-purple-700',
    totalCell: 'bg-purple-50/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200',
  },
  {
    // Amber / Orange (Q4)
    mainHeader: 'bg-amber-900 text-white border-r border-amber-700',
    subHeader: 'bg-amber-800 text-amber-100 border-r border-amber-700/80',
    totalHeader: 'bg-amber-950 text-amber-200 font-extrabold border-amber-700',
    totalCell: 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200',
  },
  {
    // Rose / Crimson (Q5)
    mainHeader: 'bg-rose-900 text-white border-r border-rose-700',
    subHeader: 'bg-rose-800 text-rose-100 border-r border-rose-700/80',
    totalHeader: 'bg-rose-950 text-rose-200 font-extrabold border-rose-700',
    totalCell: 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200',
  },
  {
    // Emerald / Green (Q6)
    mainHeader: 'bg-emerald-900 text-white border-r border-emerald-800',
    subHeader: 'bg-emerald-800 text-emerald-100 border-r border-emerald-700/80',
    totalHeader: 'bg-emerald-950 text-emerald-200 font-extrabold border-emerald-800',
    totalCell: 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200',
  },
];

export const FacultyMarksGridPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const subjectId = searchParams.get('subjectId') || '';
  const semester = parseInt(searchParams.get('semester') || '1', 10);
  const assessmentType = (searchParams.get('assessmentType') as 'CIE1' | 'CIE2') || 'CIE1';

  const [workspace, setWorkspace] = useState<BitwiseMarksWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retryingSync, setRetryingSync] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Local Edits state: key `${studentId}___${qId}___${subId}` => value string
  const [cellValues, setCellValues] = useState<Record<string, string>>({});
  const [dirtyCellKeys, setDirtyCellKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const fetchWorkspace = async () => {
    if (!subjectId) return;
    try {
      setLoading(true);
      const data = await facultyService.getBitwiseMarksWorkspace(subjectId, semester, assessmentType, academicYear);
      setWorkspace(data);

      // Initialize local cell values from server data
      const initialMap: Record<string, string> = {};
      for (const s of data.students) {
        for (const [key, val] of Object.entries(s.marks)) {
          const fullKey = `${s.studentId}___${key}`;
          initialMap[fullKey] = val !== null && val !== undefined ? String(val) : '';
        }
      }
      setCellValues(initialMap);
      setDirtyCellKeys(new Set());
      setLastSavedAt(new Date());
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load bitwise marks workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [subjectId, semester, assessmentType, academicYear]);

  // Handle cell input change
  const handleCellChange = (studentId: string, qId: string, subId: string, value: string, maxMarks: number) => {
    const fullKey = `${studentId}___${qId}___${subId}`;

    // Validate number if non-empty
    if (value.trim() !== '') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        toast.error('Please enter a valid numeric mark.');
        return;
      }
      if (num < 0) {
        toast.error('Marks cannot be negative.');
        return;
      }
      if (num > maxMarks) {
        toast.error(`Marks cannot exceed maximum allowed (${maxMarks}M).`);
        return;
      }
    }

    setCellValues((prev) => ({ ...prev, [fullKey]: value }));
    setDirtyCellKeys((prev) => {
      const next = new Set(prev);
      next.add(fullKey);
      return next;
    });
  };

  // Keyboard navigation between table inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
      e.preventDefault();
      let targetRow = rowIdx;
      let targetCol = colIdx;

      if (e.key === 'ArrowUp') targetRow = Math.max(0, rowIdx - 1);
      if (e.key === 'ArrowDown' || e.key === 'Enter') targetRow = rowIdx + 1;
      if (e.key === 'ArrowLeft') targetCol = Math.max(0, colIdx - 1);
      if (e.key === 'ArrowRight') targetCol = colIdx + 1;

      const nextInput = document.getElementById(`cell_${targetRow}_${targetCol}`);
      if (nextInput) {
        nextInput.focus();
        (nextInput as HTMLInputElement).select();
      }
    }
  };

  // Dynamic Calculated Row Data using live cell inputs
  const calculatedRows = useMemo(() => {
    if (!workspace) return [];

    const config = workspace.configuration;
    const questions = config.questionPattern || [];
    const attemptRules = config.attemptRules;
    const maxMarks = config.maximumMarks || 50;

    return workspace.students.map((student, sIdx) => {
      const liveMarks: Record<string, number | null> = {};
      const rawQuestionTotals: Record<string, number> = {};

      for (const q of questions) {
        let qSum = 0;
        let anyAttemptedInQ = false;

        for (const sub of q.subquestions) {
          const key = `${q.id}___${sub.id}`;
          const fullKey = `${student.studentId}___${key}`;
          const rawVal = cellValues[fullKey];

          if (rawVal !== undefined && rawVal.trim() !== '') {
            const num = parseFloat(rawVal);
            if (!isNaN(num)) {
              liveMarks[key] = num;
              qSum += num;
              anyAttemptedInQ = true;
            } else {
              liveMarks[key] = null;
            }
          } else {
            liveMarks[key] = null;
          }
        }

        const cappedQ = q.maxMarks > 0 ? Math.min(qSum, q.maxMarks) : qSum;
        rawQuestionTotals[q.id] = Math.round(cappedQ * 100) / 100;
      }

      // Calculate Best-of Groups & Final CIE
      const bestOfGroups: Array<{ groupId: string; groupName: string; selectedMarks: number; maxMarks: number }> = [];
      const groupedQIds = new Set<string>();
      let finalCieSum = 0;

      if (attemptRules?.type === 'GROUPED_BEST_OF' && Array.isArray(attemptRules.groups)) {
        for (const grp of attemptRules.groups) {
          let highest = 0;
          for (const qId of grp.questionIds) {
            groupedQIds.add(qId);
            const qTot = rawQuestionTotals[qId] || 0;
            if (qTot > highest) highest = qTot;
          }
          const cappedGrp = grp.maxMarks > 0 ? Math.min(highest, grp.maxMarks) : highest;
          bestOfGroups.push({
            groupId: grp.id,
            groupName: grp.name,
            selectedMarks: cappedGrp,
            maxMarks: grp.maxMarks,
          });
          finalCieSum += cappedGrp;
        }
      }

      for (const q of questions) {
        if (!groupedQIds.has(q.id)) {
          finalCieSum += rawQuestionTotals[q.id] || 0;
        }
      }

      const finalCieMarks = maxMarks > 0 ? Math.min(finalCieSum, maxMarks) : finalCieSum;
      const roundedFinal = Math.round(finalCieMarks * 100) / 100;

      return {
        ...student,
        calculatedMarks: liveMarks,
        rawQuestionTotals,
        bestOfGroups,
        finalCieMarks: roundedFinal,
      };
    });
  }, [workspace, cellValues]);

  // Filter students by search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return calculatedRows;
    const q = searchQuery.toLowerCase();
    return calculatedRows.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.usn.toLowerCase().includes(q)
    );
  }, [calculatedRows, searchQuery]);

  // Save Marks (Draft or Authoritative)
  const handleSaveMarks = async (isDraft: boolean) => {
    if (!workspace) return;
    try {
      setSaving(true);
      const marksPayload: Array<{
        studentId: string;
        questionId: string;
        subquestionId: string;
        marksObtained: number | null;
      }> = [];

      for (const student of workspace.students) {
        for (const q of workspace.configuration.questionPattern) {
          for (const sub of q.subquestions) {
            const key = `${q.id}___${sub.id}`;
            const fullKey = `${student.studentId}___${key}`;
            const rawVal = cellValues[fullKey];
            const parsed = rawVal !== undefined && rawVal.trim() !== '' ? parseFloat(rawVal) : null;

            marksPayload.push({
              studentId: student.studentId,
              questionId: q.id,
              subquestionId: sub.id,
              marksObtained: parsed,
            });
          }
        }
      }

      const res = await facultyService.saveBitwiseMarks({
        subjectId,
        semester,
        assessmentType,
        marks: marksPayload,
        isDraft,
        academicYear,
      });

      toast.success(res.message || (isDraft ? 'Draft saved.' : 'Marks saved & synchronized.'));
      setDirtyCellKeys(new Set());
      setLastSavedAt(new Date());
      fetchWorkspace();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const blob = await facultyService.downloadMarksExcel(subjectId, semester, academicYear);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const subjCode = workspace?.configuration.subjectCode || 'SUB';
      const subjName = (workspace?.configuration.subjectName || 'Subject').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${subjCode}_${subjName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Excel marks workbook downloaded.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to export Excel.');
    } finally {
      setExporting(false);
    }
  };

  // Retry Drive Sync
  const handleRetrySync = async () => {
    try {
      setRetryingSync(true);
      const res = await facultyService.retryDriveSync(subjectId, semester, academicYear);
      toast.success(res.message || 'Drive synchronization queued.');
      fetchWorkspace();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to queue sync retry.');
    } finally {
      setRetryingSync(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-full mx-auto">
        <div className="h-32 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl animate-pulse" />
        <div className="h-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!workspace || !workspace.configuration.id) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center space-y-4 max-w-2xl mx-auto mt-8 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          Question Pattern Not Configured
        </h2>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          Please configure the question-paper structure and maximum marks before entering student marks.
        </p>
        <button
          onClick={() =>
            navigate(
              `/faculty/marks/config?subjectId=${subjectId}&semester=${semester}&assessmentType=${assessmentType}`
            )
          }
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm"
        >
          Configure Question Paper
        </button>
      </div>
    );
  }

  const questions = workspace.configuration.questionPattern || [];
  const attemptRules = workspace.configuration.attemptRules;

  // Flatten subquestions for column indices
  const flattenedSubquestions: Array<{ qId: string; subId: string; qLabel: string; subLabel: string; maxMarks: number }> = [];
  questions.forEach((q) => {
    q.subquestions.forEach((sub) => {
      flattenedSubquestions.push({
        qId: q.id,
        subId: sub.id,
        qLabel: q.label,
        subLabel: sub.label,
        maxMarks: sub.maxMarks,
      });
    });
  });

  return (
    <div className="h-screen w-screen max-w-full flex flex-col bg-slate-100 dark:bg-neutral-950 overflow-hidden font-sans">
      {/* ── COMPACT TOP HEADER ── */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2 sm:px-6 sm:py-2.5 shadow-xs flex-shrink-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <button
              onClick={() => navigate(`/faculty/marks/semesters/${semester}`)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:border-neutral-200 border-2 border-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer mb-0.5"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-neutral-200" />
              <span>Back to Semester {semester} Subjects</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white tracking-tight">
                {workspace.configuration.subjectCode} — {assessmentType === 'CIE1' ? 'CIE-1' : 'CIE-2'} Bitwise Marks Grid
              </h1>
              <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-extrabold text-[11px]">
                Max: {workspace.configuration.maximumMarks} Marks
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium hidden md:inline">
                • {workspace.configuration.subjectName} • Semester {semester} • {workspace.configuration.departmentCode} • AY {academicYear}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() =>
                navigate(
                  `/faculty/marks/config?subjectId=${subjectId}&semester=${semester}&assessmentType=${assessmentType}`
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-300 font-bold text-xs shadow-xs transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-500" />
              <span>Edit Pattern</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-300 font-bold text-xs shadow-xs transition-colors"
            >
              <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => handleSaveMarks(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-300 font-bold text-xs shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => handleSaveMarks(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm hover:shadow transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Marks</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── STATUS & SEARCH BAR ── */}
      <div className="bg-neutral-100/90 dark:bg-neutral-850 border-b border-neutral-200 dark:border-neutral-800 px-4 py-1.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 text-xs">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search student by USN or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>

        {/* Metric Counters & Drive Sync */}
        <div className="flex flex-wrap items-center gap-4 text-neutral-600 dark:text-neutral-300 text-xs">
          <span>
            Students: <strong className="text-neutral-900 dark:text-white">{workspace.students.length}</strong>
          </span>
          <span>
            Unsaved:{' '}
            <strong className={dirtyCellKeys.size > 0 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-emerald-600 font-bold'}>
              {dirtyCellKeys.size}
            </strong>
          </span>
          {lastSavedAt && (
            <span className="text-neutral-400">
              Last saved: {lastSavedAt.toLocaleTimeString()}
            </span>
          )}

          {/* Drive Sync Status */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-300 dark:border-neutral-700">
            {workspace.summary.syncStatus === 'SYNCED' ? (
              <span
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs"
                title={workspace.summary.lastSyncedAt ? `Last synced to Google Drive: ${new Date(workspace.summary.lastSyncedAt).toLocaleString()}` : 'Google Drive Synced'}
              >
                <CloudCheck className="w-3.5 h-3.5" />
                <span>Synced</span>
              </span>
            ) : workspace.summary.syncStatus === 'PENDING' ? (
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs" title="Synchronizing to Google Drive...">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            ) : workspace.summary.syncStatus === 'ERROR' ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-xs" title="Drive sync failed. Click Retry to re-synchronize.">
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>Sync Failed</span>
                </span>
                <button
                  onClick={handleRetrySync}
                  disabled={retryingSync}
                  className="px-2 py-0.5 rounded border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-bold"
                >
                  {retryingSync ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-neutral-500 font-medium text-xs">
                <CloudCheck className="w-3.5 h-3.5 text-neutral-400" />
                <span>Synced</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CONSOLIDATED FULL-SCREEN BITWISE MARKS TABLE ── */}
      <div className="flex-1 w-full overflow-auto bg-white dark:bg-neutral-900 relative marks-grid-scroll">
        <table className="w-full text-left border-collapse text-xs select-none min-w-full">
          {/* Multi-Row Sticky Table Headers */}
          <thead className="sticky top-0 z-30 bg-neutral-900 text-white border-b border-neutral-800 shadow-md">
            {/* Top Question Header Row */}
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-40 bg-neutral-900 text-white px-3 py-3 font-bold border-r border-neutral-700 w-12 min-w-[48px] max-w-[48px] text-center"
              >
                #
              </th>
              <th
                rowSpan={2}
                className="sticky left-[48px] z-40 bg-neutral-900 text-white px-3 py-3 font-black text-sm uppercase tracking-wider border-r border-neutral-700 w-40 min-w-[160px] max-w-[160px]"
              >
                USN
              </th>
              <th
                rowSpan={2}
                className="sticky left-[208px] z-40 bg-neutral-900 text-white px-4 py-3 font-black text-sm uppercase tracking-wider border-r border-neutral-700 w-60 min-w-[240px] max-w-[240px]"
              >
                Student Name
              </th>

              {/* Question Group Headers (Colorful per Question) */}
              {questions.map((q, qIdx) => {
                const theme = QUESTION_THEMES[qIdx % QUESTION_THEMES.length];
                return (
                  <th
                    key={q.id}
                    colSpan={q.subquestions.length + 1}
                    className={`px-3 py-2.5 font-extrabold text-center uppercase tracking-wider text-xs ${theme.mainHeader}`}
                  >
                    {q.label} (Max {q.maxMarks}M)
                  </th>
                );
              })}

              {/* Best-of / OR Groups Headers */}
              {attemptRules?.type === 'GROUPED_BEST_OF' &&
                Array.isArray(attemptRules.groups) &&
                attemptRules.groups.map((grp) => (
                  <th
                    key={grp.id}
                    rowSpan={2}
                    className="px-3 py-2.5 font-bold text-center border-r border-neutral-700 bg-neutral-950 text-purple-300 min-w-[110px]"
                  >
                    {grp.name}
                    <div className="text-[10px] font-normal text-purple-400">
                      Max: {grp.maxMarks}M
                    </div>
                  </th>
                ))}

              {/* Final Assessment Score Header */}
              <th
                rowSpan={2}
                className="px-4 py-2.5 font-bold text-center bg-blue-600 text-white min-w-[120px]"
              >
                Final {assessmentType === 'CIE1' ? 'CIE-1' : 'CIE-2'}
                <div className="text-[10px] font-normal opacity-90">
                  Max: {workspace.configuration.maximumMarks}M
                </div>
              </th>
            </tr>

            {/* Subquestions Row (Colorful per Question) */}
            <tr>
              {questions.map((q, qIdx) => {
                const theme = QUESTION_THEMES[qIdx % QUESTION_THEMES.length];
                return (
                  <React.Fragment key={`${q.id}_sub_headers`}>
                    {q.subquestions.map((sub) => (
                      <th
                        key={`${q.id}_${sub.id}`}
                        className={`px-2 py-2 font-bold text-center min-w-[74px] ${theme.subHeader}`}
                      >
                        {sub.label} ({sub.maxMarks}M)
                      </th>
                    ))}
                    <th className={`px-2 py-2 font-black text-center min-w-[74px] ${theme.totalHeader}`}>
                      Total
                    </th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredRows.map((row, rIdx) => {
              let cellColCounter = 0;
              return (
                <tr
                  key={row.studentId}
                  className="hover:bg-blue-50/40 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  {/* Fixed Sl. No */}
                  <td className="sticky left-0 z-20 bg-white dark:bg-neutral-900 w-12 min-w-[48px] max-w-[48px] px-3 py-2 text-center text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 font-mono font-bold text-xs">
                    {rIdx + 1}
                  </td>

                  {/* Fixed USN */}
                  <td className="sticky left-[48px] z-20 bg-white dark:bg-neutral-900 w-40 min-w-[160px] max-w-[160px] px-3 py-2 font-mono font-black text-sm tracking-wide text-neutral-950 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                    {row.usn}
                  </td>

                  {/* Fixed Student Name */}
                  <td className="sticky left-[208px] z-20 bg-white dark:bg-neutral-900 w-60 min-w-[240px] max-w-[240px] px-4 py-2 font-bold text-xs uppercase tracking-tight text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 truncate">
                    {row.studentName}
                  </td>

                  {/* Dynamic Subquestion Input Cells & Question Totals */}
                  {questions.map((q, qIdx) => {
                    const theme = QUESTION_THEMES[qIdx % QUESTION_THEMES.length];
                    return (
                      <React.Fragment key={`${row.studentId}_${q.id}`}>
                        {q.subquestions.map((sub) => {
                          const fullKey = `${row.studentId}___${q.id}___${sub.id}`;
                          const rawVal = cellValues[fullKey] || '';
                          const isDirty = dirtyCellKeys.has(fullKey);
                          const currentColIdx = cellColCounter++;

                          return (
                            <td
                              key={fullKey}
                              className="px-2 py-1.5 text-center border-r border-neutral-200 dark:border-neutral-800"
                            >
                              <input
                                id={`cell_${rIdx}_${currentColIdx}`}
                                type="text"
                                value={rawVal}
                                onChange={(e) =>
                                  handleCellChange(row.studentId, q.id, sub.id, e.target.value, sub.maxMarks)
                                }
                                onKeyDown={(e) => handleKeyDown(e, rIdx, currentColIdx)}
                                className={`w-16 h-8 px-2 py-1 text-center rounded-lg font-bold text-xs transition-all shadow-xs ${
                                  isDirty
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-400 ring-1 ring-amber-400'
                                    : rawVal !== ''
                                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600'
                                    : 'bg-neutral-50 dark:bg-neutral-850 text-neutral-400 border border-neutral-200 dark:border-neutral-750 hover:border-neutral-300'
                                } focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                placeholder="-"
                              />
                            </td>
                          );
                        })}

                        {/* Main Question Total */}
                        <td className={`px-3 py-1.5 text-center font-bold text-xs border-r border-neutral-200 dark:border-neutral-800 ${theme.totalCell}`}>
                          {row.rawQuestionTotals[q.id] !== undefined ? row.rawQuestionTotals[q.id] : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {/* Best-of Groups Results */}
                  {attemptRules?.type === 'GROUPED_BEST_OF' &&
                    Array.isArray(row.bestOfGroups) &&
                    row.bestOfGroups.map((grp) => (
                      <td
                        key={`${row.studentId}_${grp.groupId}`}
                        className="px-3 py-1.5 text-center font-bold text-xs text-purple-800 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/30 border-r border-neutral-200 dark:border-neutral-800"
                      >
                        {grp.selectedMarks}
                      </td>
                    ))}

                  {/* Final CIE Marks */}
                  <td className="px-4 py-1.5 text-center font-bold text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30">
                    {row.finalCieMarks}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER HELPER BAR ── */}
      <footer className="bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 py-1.5 sm:px-6 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 flex-shrink-0">
        <span>Use <strong>Arrow Keys</strong>, <strong>Tab</strong>, or <strong>Enter</strong> to navigate quickly between student cells.</span>
        <span>Consolidated Continuous Roster • <strong>{workspace.students.length}</strong> Students</span>
      </footer>
    </div>
  );
};

export default FacultyMarksGridPage;
