import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Users,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Settings2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodFacultyAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await hodService.getFacultyAssignments();
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load faculty assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (assignmentId: string, att: boolean, marks: boolean, type: 'attn' | 'marks') => {
    try {
      await hodService.toggleFacultyAccess(assignmentId, {
        attendanceAccess: type === 'attn' ? !att : att,
        marksAccess: type === 'marks' ? !marks : marks,
      });
      fetchAssignments();
    } catch (err) {
      alert('Failed to update access toggle.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header (Admin Style) ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 shadow-sm border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
              Active Allotments
            </span>
            <div className="text-2xl font-black mt-0.5">
              {assignments.length} <span className="text-xs font-semibold text-neutral-400">allotted</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAssignments()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/hod/faculty"
            className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Faculty List</span>
          </Link>

          <Link
            to="/hod/faculty/create"
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm inline-flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>+ Assign Faculty</span>
          </Link>
        </div>
      </div>

      {/* ── Assignments Matrix Table (Admin Table Style) ─────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111111] dark:bg-neutral-950 text-white uppercase tracking-wider font-extrabold border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">Faculty Member</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 text-center">Semester</th>
                <th className="py-3.5 px-4 text-center">Academic Year</th>
                <th className="py-3.5 px-4 text-center">Attendance Sheet</th>
                <th className="py-3.5 px-4 text-center">Marks Sheet</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading department assignments...</p>
                  </td>
                </tr>
              ) : assignments.length > 0 ? (
                assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white">
                      <div>{item.facultyName}</div>
                      <div className="text-[11px] text-neutral-400 font-normal">{item.facultyEmail}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">{item.subjectName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{item.subjectCode}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-neutral-700 dark:text-neutral-300">
                      Sem {item.semester}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-neutral-500">
                      {item.academicYear}
                    </td>

                    {/* Attendance Access Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggle(item.id, item.attendanceAccess, item.marksAccess, 'attn')}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                          item.attendanceAccess
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-300'
                        }`}
                      >
                        {item.attendanceAccess ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    {/* Marks Access Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggle(item.id, item.attendanceAccess, item.marksAccess, 'marks')}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-wide transition-all ${
                          item.marksAccess
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 hover:bg-violet-200'
                            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-300'
                        }`}
                      >
                        {item.marksAccess ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/hod/faculty/${item.facultyUserId || item.facultyId || item.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-900 hover:text-white dark:bg-neutral-800 dark:hover:bg-neutral-100 dark:hover:text-neutral-900 text-neutral-800 dark:text-neutral-200 font-bold text-[11px] transition-all"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">No Assignments Found</p>
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

export default HodFacultyAssignmentsPage;
