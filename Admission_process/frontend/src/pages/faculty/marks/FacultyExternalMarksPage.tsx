import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import facultyService, {
  ExternalMarksWorkspaceData,
} from '../../../services/faculty.service';
import {
  ArrowLeft,
  GraduationCap,
  Save,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const FacultyExternalMarksPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { academicYear } = useAcademicYear();

  const subjectId = searchParams.get('subjectId') || '';
  const semester = parseInt(searchParams.get('semester') || '1', 10);

  const [workspace, setWorkspace] = useState<ExternalMarksWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maximumMarks, setMaximumMarks] = useState(100);
  const [cellValues, setCellValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWorkspace = async () => {
    if (!subjectId) return;
    try {
      setLoading(true);
      const data = await facultyService.getExternalMarksWorkspace(subjectId, semester, academicYear);
      setWorkspace(data);
      setMaximumMarks(data.metadata.defaultMaxMarks || 100);

      const initialMap: Record<string, string> = {};
      for (const s of data.students) {
        initialMap[s.studentId] = s.externalMarks !== null && s.externalMarks !== undefined ? String(s.externalMarks) : '';
      }
      setCellValues(initialMap);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load external marks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [subjectId, semester, academicYear]);

  const handleCellChange = (studentId: string, val: string) => {
    if (val.trim() !== '') {
      const num = parseFloat(val);
      if (isNaN(num)) {
        toast.error('Please enter a valid numeric mark.');
        return;
      }
      if (num < 0 || num > maximumMarks) {
        toast.error(`Marks must be between 0 and ${maximumMarks}.`);
        return;
      }
    }
    setCellValues((prev) => ({ ...prev, [studentId]: val }));
  };

  const filteredStudents = useMemo(() => {
    if (!workspace) return [];
    if (!searchQuery.trim()) return workspace.students;
    const q = searchQuery.toLowerCase();
    return workspace.students.filter(
      (s) => s.studentName.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q)
    );
  }, [workspace, searchQuery]);

  const handleSaveMarks = async () => {
    if (!workspace) return;
    try {
      setSaving(true);
      const marksPayload = workspace.students.map((s) => {
        const raw = cellValues[s.studentId];
        return {
          studentId: s.studentId,
          externalMarks: raw !== undefined && raw.trim() !== '' ? parseFloat(raw) : null,
        };
      });

      const res = await facultyService.saveExternalMarks({
        subjectId,
        semester,
        maximumMarks,
        marks: marksPayload,
        academicYear,
      });

      toast.success(res.message || 'External examination marks saved.');
      fetchWorkspace();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save external marks.');
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-5 max-w-full mx-auto pb-12">
      {/* ── HEADER ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <button
              onClick={() => navigate(`/faculty/marks/semesters/${semester}`)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:border-neutral-200 border-2 border-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer mb-1"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-neutral-200" />
              <span>Back to Semester {semester} Subjects</span>
            </button>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
                    {workspace?.metadata.subjectCode} — VTU External Semester Examination Marks
                  </h1>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {workspace?.metadata.subjectName} • Semester {semester} • AY {academicYear}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <label>Max Marks:</label>
              <input
                type="number"
                value={maximumMarks}
                onChange={(e) => setMaximumMarks(parseFloat(e.target.value) || 100)}
                className="w-20 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-bold"
              />
            </div>
            <button
              onClick={handleSaveMarks}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save External Marks</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search student by USN or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* ── EXTERNAL MARKS TABLE ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="max-h-[640px] overflow-auto relative marks-grid-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-30 bg-neutral-900 text-white border-b border-neutral-800 shadow-md">
              <tr>
                <th className="sticky left-0 z-40 bg-neutral-900 text-white px-3 py-3 font-bold border-r border-neutral-700 w-12 min-w-[48px] max-w-[48px] text-center">
                  #
                </th>
                <th className="sticky left-[48px] z-40 bg-neutral-900 text-white px-3 py-3 font-black text-sm uppercase tracking-wider border-r border-neutral-700 w-40 min-w-[160px] max-w-[160px]">
                  USN
                </th>
                <th className="sticky left-[208px] z-40 bg-neutral-900 text-white px-4 py-3 font-black text-sm uppercase tracking-wider border-r border-neutral-700 w-60 min-w-[240px] max-w-[240px]">
                  Student Name
                </th>
                <th className="px-4 py-2.5 font-bold text-center border-r border-neutral-700 w-52">
                  External Marks (Max {maximumMarks}M)
                </th>
                <th className="px-4 py-2.5 font-bold text-center w-36">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredStudents.map((row, rIdx) => {
                const rawVal = cellValues[row.studentId] || '';
                return (
                  <tr key={row.studentId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors">
                    <td className="sticky left-0 z-20 bg-white dark:bg-neutral-900 w-12 min-w-[48px] max-w-[48px] px-3 py-2.5 text-center text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 font-mono font-bold text-xs">
                      {rIdx + 1}
                    </td>
                    <td className="sticky left-[48px] z-20 bg-white dark:bg-neutral-900 w-40 min-w-[160px] max-w-[160px] px-3 py-2.5 font-mono font-black text-sm tracking-wide text-neutral-950 dark:text-white border-r border-neutral-200 dark:border-neutral-800 uppercase">
                      {(row.usn || '').toUpperCase()}
                    </td>
                    <td className="sticky left-[208px] z-20 bg-white dark:bg-neutral-900 w-60 min-w-[240px] max-w-[240px] px-4 py-2.5 font-bold text-xs uppercase tracking-tight text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 truncate">
                      {(row.studentName || '').toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-center border-r border-neutral-200 dark:border-neutral-800">
                      <input
                        type="text"
                        value={rawVal}
                        onChange={(e) => handleCellChange(row.studentId, e.target.value)}
                        className={`w-28 h-8 px-3 py-1 text-center rounded-lg font-bold text-xs transition-all shadow-xs ${
                          rawVal.trim() !== ''
                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-600'
                            : 'bg-neutral-50 dark:bg-neutral-850 text-neutral-400 border border-neutral-200 dark:border-neutral-750 hover:border-neutral-300'
                        } focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-xs">
                      {rawVal.trim() !== '' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[11px]">Entered</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 text-[11px]">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacultyExternalMarksPage;
