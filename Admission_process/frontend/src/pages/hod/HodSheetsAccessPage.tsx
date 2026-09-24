import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Users,
  ShieldCheck,
} from 'lucide-react';
import hodService, { HodSheetMatrixItem } from '../../services/hod.service';

export const HodSheetsAccessPage: React.FC = () => {
  const [matrix, setMatrix] = useState<HodSheetMatrixItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const data = await hodService.getSheetAccessMatrix();
      setMatrix(data);
    } catch (err) {
      console.error('Failed to load sheet matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (assignmentId: string, currentAtt: boolean, currentMarks: boolean, field: 'attn' | 'marks') => {
    setUpdatingId(assignmentId);
    try {
      await hodService.updateSheetAccess(assignmentId, {
        attendanceAccess: field === 'attn' ? !currentAtt : currentAtt,
        marksAccess: field === 'marks' ? !currentMarks : currentMarks,
      });
      fetchMatrix();
    } catch (err) {
      alert('Failed to update sheet permission.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <span>Google Sheets Faculty Access Matrix</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {matrix.length} Assignments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally control spreadsheet permissions for department faculty without manual Google Drive sharing.
          </p>
        </div>

        <button
          onClick={fetchMatrix}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* ── Architecture Banner (Prompt Item 16) ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold">System of Record Architecture:</p>
          <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
            The JCER ERP PostgreSQL database is the single source of truth. Google Sheets serves as an ingestion and capture layer. Disabling a toggle below immediately revokes the faculty's synchronization permission.
          </p>
        </div>
      </div>

      {/* ── Sheet Matrix Table ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Faculty Member</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4">Attendance Sheet Access</th>
                <th className="py-3.5 px-4">Marks Sheet Access</th>
                <th className="py-3.5 px-4">Google Sheet Link</th>
                <th className="py-3.5 px-4">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading sheet access matrix...</p>
                  </td>
                </tr>
              ) : matrix.length > 0 ? (
                matrix.map((row) => (
                  <tr key={row.assignmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{row.facultyName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{row.facultyEmail}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{row.subjectName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.subjectCode}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                      Sem {row.semester} • {row.section}
                    </td>

                    {/* Attendance Access Live Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(row.assignmentId, row.attendanceAccess, row.marksAccess, 'attn')}
                        disabled={updatingId === row.assignmentId}
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide transition-all ${
                          row.attendanceAccess
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {row.attendanceAccess ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    {/* Marks Access Live Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggle(row.assignmentId, row.attendanceAccess, row.marksAccess, 'marks')}
                        disabled={updatingId === row.assignmentId}
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide transition-all ${
                          row.marksAccess
                            ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {row.marksAccess ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <a
                        href={row.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                      >
                        <span>Open Sheet</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {new Date(row.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No sheet assignments recorded.
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

export default HodSheetsAccessPage;
