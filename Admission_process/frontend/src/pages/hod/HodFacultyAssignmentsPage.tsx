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
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              <span>Department Faculty Assignments Matrix</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {assignments.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage subject allotments and toggle live Google Sheet synchronization permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/faculty"
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Faculty List</span>
          </Link>
          <Link
            to="/hod/faculty/create"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 inline-flex items-center gap-1.5"
          >
            <span>+ Assign Faculty</span>
          </Link>
        </div>
      </div>

      {/* ── Assignments Matrix Table ─────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Faculty Member</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Semester</th>
                <th className="py-3.5 px-4">Section</th>
                <th className="py-3.5 px-4">Academic Year</th>
                <th className="py-3.5 px-4">Attendance Sheet</th>
                <th className="py-3.5 px-4">Marks Sheet</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading department assignments...</p>
                  </td>
                </tr>
              ) : assignments.length > 0 ? (
                assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{item.facultyName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.facultyEmail}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{item.subjectName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.subjectCode}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      Sem {item.semester}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      Sec {item.section}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-500">
                      {item.academicYear}
                    </td>

                    {/* Attendance Access Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(item.id, item.attendanceAccess, item.marksAccess, 'attn')}
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide transition-all ${
                          item.attendanceAccess
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {item.attendanceAccess ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    {/* Marks Access Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(item.id, item.attendanceAccess, item.marksAccess, 'marks')}
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide transition-all ${
                          item.marksAccess
                            ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {item.marksAccess ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/hod/faculty/${item.facultyUserId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-bold text-[11px] transition-colors"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Assignments Found</p>
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
