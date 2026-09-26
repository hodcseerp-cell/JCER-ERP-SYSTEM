import React, { useState } from 'react';
import {
  CalendarCheck,
  BookOpen,
  Eye,
  X,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  semester: number;
  section: string;
  totalStudents: number;
  lastUpdated: string;
  credits: number;
}

export const FacultyAttendancePage: React.FC = () => {
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<SubjectRow | null>(null);

  // Teaching subjects placeholder
  const subjects: SubjectRow[] = [
    {
      id: 'sub-1',
      name: 'Database Management Systems',
      code: 'BCS301',
      semester: 3,
      section: 'A',
      totalStudents: 62,
      lastUpdated: 'Today, 10:30 AM',
      credits: 4,
    },
    {
      id: 'sub-2',
      name: 'Operating Systems',
      code: 'BCS401',
      semester: 5,
      section: 'B',
      totalStudents: 58,
      lastUpdated: 'Yesterday',
      credits: 4,
    },
  ];

  const filtered = subjects.filter((s) => {
    if (selectedSemester === 'ALL') return true;
    return String(s.semester) === selectedSemester;
  });

  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Matching HOD Metric Header Style) ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-6 py-3.5 shadow-sm border border-neutral-800">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
              Attendance Roster Courses
            </span>
            <div className="text-3xl font-black mt-0.5">
              {subjects.length} <span className="text-sm font-semibold text-neutral-400">assigned</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {}}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-neutral-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar (Matching HOD Clean Design) ──────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Filter className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>FILTER ATTENDANCE SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Semesters</option>
            <option value="3">Semester 3</option>
            <option value="5">Semester 5</option>
          </select>

          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-bold text-neutral-600 dark:text-neutral-300">
            Showing <span className="text-neutral-900 dark:text-white font-black">{filtered.length}</span> {filtered.length === 1 ? 'subject' : 'subjects'}
          </div>
        </div>
      </div>

      {/* ── Attendance Subject Table (Matching HOD Table Style) ─────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-black tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            Assigned Courses & Attendance Records
          </span>
          <span className="text-xs text-neutral-400 font-medium">Academic Year 2026-27</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/75 dark:bg-neutral-800/40 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Subject Name</th>
                <th className="py-3.5 px-6">Subject Code</th>
                <th className="py-3.5 px-6 text-center">Semester</th>
                <th className="py-3.5 px-6 text-center">Section</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-xs">
              {filtered.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group"
                >
                  <td className="py-4 px-6 font-bold text-neutral-900 dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-neutral-900 dark:text-white">{sub.name}</span>
                        <span className="text-[11px] text-neutral-400 font-normal">
                          {sub.totalStudents} Registered Students • {sub.credits} Credits
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                      {sub.code}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-extrabold">
                      Sem {sub.semester}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-neutral-700 dark:text-neutral-300">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-extrabold">
                      Section {sub.section}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setSelectedSubject(sub)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors border border-neutral-200/80 dark:border-neutral-700/80"
                    >
                      <Eye className="w-3.5 h-3.5 text-neutral-500" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Placeholder Subject View Modal (Matching HOD Modal Style) ───────── */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                    {selectedSubject.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    {selectedSubject.code} • Sem {selectedSubject.semester} • Section {selectedSubject.section}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubject(null)}
                className="w-8 h-8 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 p-4 border border-neutral-200/70 dark:border-neutral-700/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">Registered Students:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedSubject.totalStudents}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">Last Recorded Class:</span>
                <span className="font-bold text-neutral-900 dark:text-white">{selectedSubject.lastUpdated}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Roster Configured
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                <AlertCircle className="w-4 h-4 shrink-0 text-violet-600 dark:text-violet-400" />
                <span>Attendance Workspace Interface</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-5">
                Attendance grid, live marking mode, and defaulter tracking will open in this workspace.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubject(null)}
                className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 transition-opacity"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FacultyAttendancePage;
