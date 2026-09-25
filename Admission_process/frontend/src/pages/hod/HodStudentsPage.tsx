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
  RefreshCw,
  Download,
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
      
      {/* ── Page Header (Admin Style) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Total Students Counter Card (matching Admin screenshot 2) */}
          <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 shadow-sm border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
              Total Department Students
            </span>
            <div className="text-2xl font-black mt-0.5">
              {totalStudents} <span className="text-xs font-semibold text-neutral-400">students</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/hod/students/semesters"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Semester Breakdown</span>
          </Link>
          <Link
            to="/hod/students/sections"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Section Allocations</span>
          </Link>
          <button
            onClick={() => fetchStudents()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Quick Filter Pills (Matching Admin Screenshot 2) ────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
        {/* Semester quick pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 min-w-36">
            Quick Filter By Semester:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setSelectedSemester('ALL');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedSemester === 'ALL'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              ALL SEM
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <button
                key={sem}
                onClick={() => {
                  setSelectedSemester(String(sem));
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedSemester === String(sem)
                    ? 'bg-gradient-to-r from-[#070e22] via-[#0c1a40] to-[#0f245c] text-white font-bold shadow-sm border border-[#1e3a8a]/40'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        </div>

        {/* Section quick pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500 min-w-36">
            Quick Filter By Section:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'A', 'B', 'C'].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setSelectedSection(sec);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  selectedSection === sec
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                {sec === 'ALL' ? 'All Sections' : `Section ${sec}`}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar + Status dropdown */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by student name, USN, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-24 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[11px] transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="VALIDATED">Validated</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Students Table (Admin Professional Table Style) ──────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">USN / Enrollment</th>
                <th className="py-3.5 px-4 text-center">Semester</th>
                <th className="py-3.5 px-4 text-center">Section</th>
                <th className="py-3.5 px-4 text-center">Attendance %</th>
                <th className="py-3.5 px-4 text-center">Batch</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading department students...</p>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => {
                  const isDefaulter = student.attendancePercentage < 75;
                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs ring-1 ring-neutral-200 shadow-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{student.name}</div>
                            <div className="text-[11px] text-neutral-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {student.usn}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-[11px] border border-neutral-200 dark:border-neutral-700">
                          Sem {student.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {student.section ? (
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            Sec {student.section}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
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
                      <td className="py-3.5 px-4 text-center text-neutral-500 font-semibold">
                        {student.batchYear || '2023-27'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> {student.admissionStatus || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/hod/students/${student.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-900 hover:text-white dark:bg-neutral-800 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 text-neutral-800 dark:text-neutral-200 font-bold text-[11px] transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Students Found</p>
                    <p className="text-xs text-neutral-400 mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ──────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-medium">
            Showing Page <strong className="text-neutral-900 dark:text-white">{page}</strong> of <strong className="text-neutral-900 dark:text-white">{totalPages || 1}</strong> ({totalStudents} total students)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-neutral-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 px-2">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-neutral-800"
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
