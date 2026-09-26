import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../../store';
import {
  BookOpen,
  Layers,
  CalendarCheck,
  Award,
  ChevronRight,
  Filter,
  UserCheck,
  Sparkles,
  Lock,
  ArrowUpRight,
  Users,
  GraduationCap,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import hodService from '../../services/hod.service';

interface SubjectAssignment {
  id: string;
  name: string;
  code: string;
  semester: number;
  section: string;
  department: string;
  academicYear: string;
  totalStudents: number;
  credits: number;
  type: string;
}

export const FacultyOverviewPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const facultyName = user?.name || 'Faculty Member';
  const employeeId = user?.employeeId || user?.id || 'FAC-2026-001';
  const deptName = user?.department?.name || 'Computer Science & Engineering';
  const deptCode = user?.department?.code || 'CSE';
  const designation = user?.designation || 'Assistant Professor';

  // Filters (AY, Semester, Section - Department is locked)
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [facultySheets, setFacultySheets] = useState<any[]>([]);
  const [loadingSheets, setLoadingSheets] = useState<boolean>(true);

  useEffect(() => {
    hodService.getFacultyMySheets()
      .then((data) => setFacultySheets(data || []))
      .catch(() => setFacultySheets([]))
      .finally(() => setLoadingSheets(false));
  }, []);

  // Assigned courses data (visual structure)
  const allAssignments: SubjectAssignment[] = [
    {
      id: 'sub-1',
      name: 'Database Management Systems',
      code: 'BCS301',
      semester: 3,
      section: 'A',
      department: deptCode,
      academicYear: '2026-27',
      totalStudents: 62,
      credits: 4,
      type: 'THEORY',
    },
    {
      id: 'sub-2',
      name: 'Operating Systems',
      code: 'BCS401',
      semester: 5,
      section: 'B',
      department: deptCode,
      academicYear: '2026-27',
      totalStudents: 58,
      credits: 4,
      type: 'THEORY',
    },
  ];

  const filteredAssignments = allAssignments.filter((sub) => {
    if (selectedSemester !== 'ALL' && String(sub.semester) !== selectedSemester) return false;
    if (selectedSection !== 'ALL' && sub.section !== selectedSection) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* ── Welcome Banner (Dark Shiny Navy Blue Style - Matching HOD) ──────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] p-6 sm:p-8 text-white border border-[#1e3a8a]/40 shadow-[0_16px_36px_rgba(7,14,34,0.35)]">
        {/* Shiny specular reflections & glass gleam */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -top-16 left-1/4 w-96 h-40 bg-gradient-to-b from-blue-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-cyan-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{designation} • {deptCode} Dept</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome, {facultyName} 👋
            </h2>
            <p className="text-sm text-blue-100/90 max-w-2xl font-medium">
              Faculty Academic Workspace for <span className="font-bold text-white">{deptName}</span>. Manage your course curriculum offerings, track classroom attendance, and enter bitwise continuous evaluation marks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/faculty/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-950/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-blue-400/30"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Take Attendance</span>
            </Link>
            <Link
              to="/faculty/bitwise-marks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all backdrop-blur-md"
            >
              <Award className="w-4 h-4" />
              <span>Bitwise Marks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Filter Bar (Matching HOD Clean Design) ──────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
          <Filter className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>FILTER ACADEMIC SCOPE</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Locked Department pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>Dept: <strong className="text-neutral-900 dark:text-white">{deptCode}</strong></span>
          </div>

          {/* Academic Year Selector */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="2026-27">AY 2026-27</option>
            <option value="2025-26">AY 2025-26</option>
          </select>

          {/* Semester Selector */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Semesters</option>
            <option value="3">Semester 3</option>
            <option value="5">Semester 5</option>
          </select>

          {/* Section Selector */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-xs focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>
        </div>
      </div>

      {/* ── 4 Core Summary Cards (Matching HOD Card Style) ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Assigned Subjects */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Assigned Subjects
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              {allAssignments.length}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Active Teaching Courses</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Current Semester</span>
            <span className="text-neutral-900 dark:text-white font-bold inline-flex items-center gap-0.5">
              Allocated
            </span>
          </div>
        </div>

        {/* KPI 2: Assigned Sections */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Assigned Sections
            </span>
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              2
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Section A & Section B</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Batches</span>
            <span className="text-neutral-900 dark:text-white font-bold inline-flex items-center gap-0.5">
              Active
            </span>
          </div>
        </div>

        {/* KPI 3: Attendance */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              Active
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Daily Attendance Logging</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Class Logs</span>
            <Link to="/faculty/attendance" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Take Attendance <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Bitwise Marks */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Bitwise Marks
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              CIE
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">IA-1 / IA-2 Bitwise Breakdown</p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Internal Assessment</span>
            <Link to="/faculty/bitwise-marks" className="text-neutral-900 dark:text-white font-bold hover:underline inline-flex items-center gap-0.5">
              Marks Matrix <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* ── My Teaching Section (Matching HOD Grid/Card Architecture) ──────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">
              My Teaching
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Allocated subject curriculum offerings and enrolled section allocations
            </p>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-bold text-neutral-600 dark:text-neutral-300">
            Showing <span className="text-neutral-900 dark:text-white font-black">{filteredAssignments.length}</span> courses
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {filteredAssignments.map((sub) => (
            <div
              key={sub.id}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    Semester {sub.semester} • Section {sub.section}
                  </span>
                </div>

                <h3 className="text-base font-black text-neutral-900 dark:text-white mt-3">
                  {sub.name}
                </h3>
                <p className="text-xs text-neutral-400 font-semibold mt-1">
                  Type: {sub.type} • {sub.credits} Credits • {sub.totalStudents} Enrolled Students
                </p>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">
                    Department:
                  </span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {deptName} ({deptCode})
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                <Link
                  to="/faculty/attendance"
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Take Attendance →</span>
                </Link>
                <Link
                  to="/faculty/bitwise-marks"
                  className="font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Bitwise Marks →</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── My Google Sheets Section (Prompt Item 25) ─────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>My Google Sheets</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Department Google Spreadsheet workspaces shared with your authorized Google Account
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {facultySheets.length > 0 ? (
            facultySheets.map((item, idx) => (
              <div
                key={item.assignmentId || idx}
                className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
                    {item.subjectCode || 'BCS401'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Semester {item.semester || 3}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Division {item.section || 'A'}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                    {item.subjectName || 'Course Curriculum Workspace'}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Authorized Teaching Allocation • Semester {item.semester || 3} Division {item.section || 'A'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                  {/* Attendance Sheet */}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Attendance Master Sheet:</span>
                    </span>
                    {item.attendanceSheet?.url ? (
                      <a
                        href={item.attendanceSheet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Open Google Sheet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-neutral-400 text-[11px]">No access granted</span>
                    )}
                  </div>

                  {/* Academic Marks Sheet */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-neutral-600 dark:text-neutral-300 font-semibold flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                      <span>Academic Marks:</span>
                    </span>
                    {item.marksSheet?.url ? (
                      <a
                        href={item.marksSheet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Open Google Sheet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-neutral-400 text-[11px]">No access granted</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-center text-xs space-y-1">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700 mb-1" />
              <p className="font-bold text-neutral-700 dark:text-neutral-300">No Google Sheet access has been granted yet.</p>
              <p className="text-neutral-400">Your department HOD will grant Google Drive spreadsheet permissions upon assignment allocation.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default FacultyOverviewPage;
