import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  Phone,
  Download,
  Users,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import hodService, { HodDefaulterItem } from '../../services/hod.service';

export const HodAttendanceDefaultersPage: React.FC = () => {
  const [defaulters, setDefaulters] = useState<HodDefaulterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');

  useEffect(() => {
    fetchDefaulters();
  }, [selectedSemester]);

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const data = await hodService.getAttendanceDefaulters({
        semester: selectedSemester,
      });
      setDefaulters(data);
    } catch (err) {
      console.error('Failed to load defaulters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Student Name', 'USN', 'Semester', 'Section', 'Total Sessions', 'Present Sessions', 'Attendance %', 'Deficit %', 'Parent Phone', 'Parent Email'];
    const rows = defaulters.map((d) => [
      `"${d.name}"`,
      `"${d.usn}"`,
      d.semester,
      `"${d.section}"`,
      d.totalSessions,
      d.presentSessions,
      `${d.attendancePercentage}%`,
      `${d.deficit}%`,
      `"${d.parentPhone}"`,
      `"${d.parentEmail}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Defaulters_${selectedSemester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* ── Breadcrumb & Back ────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/hod/attendance"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Attendance Overview</span>
        </Link>
      </div>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Attendance Defaulters List
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  {defaulters.length} Below 75%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Students with attendance strictly below the institutional mandatory 75% threshold.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={defaulters.length === 0}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Filter by Semester:</span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <span className="text-xs font-extrabold text-rose-600">
          Threshold: &lt; 75.0%
        </span>
      </div>

      {/* ── Defaulters Table ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">USN</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4">Attended / Total</th>
                <th className="py-3.5 px-4">Attendance %</th>
                <th className="py-3.5 px-4">Deficit</th>
                <th className="py-3.5 px-4">Parent Contact</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Computing defaulters list...</p>
                  </td>
                </tr>
              ) : defaulters.length > 0 ? (
                defaulters.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.usn}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      Sem {item.semester} • {item.section}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                      {item.presentSessions} / {item.totalSessions} sessions
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-black text-rose-600 text-sm">
                        {item.attendancePercentage}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px]">
                        -{item.deficit}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Phone className="w-3 h-3 text-slate-400" /> {item.parentPhone}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Mail className="w-3 h-3 text-slate-400" /> {item.parentEmail}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/hod/students/${item.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-[11px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Attendance Defaulters</p>
                    <p className="text-xs text-slate-400 mt-1">All department students meet or exceed the 75% attendance threshold.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HodAttendanceDefaultersPage;
