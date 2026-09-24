import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';
import hodService, { HodStudentItem } from '../../services/hod.service';

export const HodStudentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSem = searchParams.get('semester') || 'ALL';
  const initialSec = searchParams.get('section') || 'ALL';

  const [students, setStudents] = useState<HodStudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>(initialSem);
  const [selectedSection, setSelectedSection] = useState<string>(initialSec);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalStudents, setTotalStudents] = useState<number>(0);

  useEffect(() => {
    fetchStudents();
  }, [page, selectedSemester, selectedSection, selectedStatus]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hodService.getStudents({
        page,
        limit,
        semester: selectedSemester,
        section: selectedSection,
        status: selectedStatus,
        search: searchTerm,
      });
      setStudents(res.students);
      setTotalPages(res.pagination.totalPages);
      setTotalStudents(res.pagination.total);
    } catch (err: any) {
      console.error('Failed to load students:', err);
      setError('Unable to load students for this department.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
              <span>Department Students Directory</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {totalStudents} Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department-isolated student records, section allocations, and attendance compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/students/semesters"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Semester Breakdown</span>
          </Link>
          <Link
            to="/hod/students/sections"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Section Allocations</span>
          </Link>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, USN, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700"
            >
              Search
            </button>
          </form>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Semester Filter */}
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="VALIDATED">Validated</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Students Table ──────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">USN / Enrollment</th>
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4">Section</th>
                <th className="py-3.5 px-4">Attendance %</th>
                <th className="py-3.5 px-4">Batch</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading department students...</p>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => {
                  const isDefaulter = student.attendancePercentage < 75;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                            <div className="text-[11px] text-slate-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {student.usn}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-[11px]">
                          Sem {student.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {student.section ? (
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Sec {student.section}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${
                            isDefaulter ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            {student.attendancePercentage}%
                          </span>
                          {isDefaulter && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-extrabold text-[9px] uppercase tracking-wider">
                              Defaulter
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {student.batchYear || '2023-27'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> {student.admissionStatus || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/hod/students/${student.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-[11px] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Students Found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ──────────────────────────────────────────────── */}
        <div className="px-4 py-3 bg-slate-50/60 dark:bg-slate-800/60 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Showing Page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages || 1}</strong> ({totalStudents} total students)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodStudentsPage;
