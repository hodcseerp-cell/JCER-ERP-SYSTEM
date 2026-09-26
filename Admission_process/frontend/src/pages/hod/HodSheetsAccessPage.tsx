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
  Filter,
  Lock,
  Search,
  Check,
  AlertTriangle,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodSheetsAccessPage: React.FC = () => {
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Manage Access Modal State
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [modalGoogleEmail, setModalGoogleEmail] = useState<string>('');
  const [modalAttnAccess, setModalAttnAccess] = useState<boolean>(true);
  const [modalMarksAccess, setModalMarksAccess] = useState<boolean>(true);
  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchMatrix();
  }, [academicYear, selectedSemester, selectedSection]);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const data = await hodService.getFacultyGoogleSheetAccessMatrix({
        academicYear,
        semester: selectedSemester,
        section: selectedSection,
      });
      setMatrix(data || []);
    } catch (err) {
      console.error('Failed to load sheet matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAccess = async (row: any) => {
    setUpdatingId(row.assignmentId);
    try {
      await hodService.verifyFacultyGoogleSheetAccess(row.facultyId, {
        assignmentId: row.assignmentId,
        accessId: row.googleAccessId,
      });
      fetchMatrix();
    } catch (err) {
      alert('Verification failed. Please check Google Drive API status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevokeAccess = async (row: any) => {
    if (!confirm(`Revoke Google Sheet access for ${row.facultyName}?`)) return;
    setUpdatingId(row.assignmentId);
    try {
      await hodService.revokeFacultyGoogleSheetAccess(row.facultyId, {
        assignmentId: row.assignmentId,
      });
      fetchMatrix();
    } catch (err) {
      alert('Failed to revoke Google Sheet access.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenManageModal = (row: any) => {
    setSelectedRow(row);
    setModalGoogleEmail(row.googleEmail || row.facultyEmail || '');
    setModalAttnAccess(row.attendanceAccess);
    setModalMarksAccess(row.marksAccess);
    setModalMessage(null);
  };

  const handleSaveModal = async () => {
    if (!selectedRow) return;
    setModalSubmitting(true);
    setModalMessage(null);
    try {
      await hodService.grantFacultyGoogleSheetAccess(selectedRow.facultyId, {
        assignmentId: selectedRow.assignmentId,
        googleEmail: modalGoogleEmail.trim(),
        attendanceAccess: modalAttnAccess,
        marksAccess: modalMarksAccess,
        role: 'writer',
      });
      setModalMessage({ type: 'success', text: 'Google Sheet access and Drive permissions updated!' });
      fetchMatrix();
      setTimeout(() => {
        setSelectedRow(null);
      }, 1200);
    } catch (err: any) {
      setModalMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to update access.' });
    } finally {
      setModalSubmitting(false);
    }
  };

  const filteredMatrix = matrix.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (row.facultyName || '').toLowerCase().includes(term) ||
      (row.facultyEmail || '').toLowerCase().includes(term) ||
      (row.googleEmail || '').toLowerCase().includes(term) ||
      (row.subjectName || '').toLowerCase().includes(term) ||
      (row.subjectCode || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <span>Faculty Google Sheet Access</span>
            </h1>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {filteredMatrix.length} Assignments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage and audit Google Drive spreadsheet permissions across faculty assignments.
          </p>
        </div>

        <button
          onClick={fetchMatrix}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Locked Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Dept: <strong className="text-slate-900 dark:text-white">ECE</strong></span>
          </div>

          {/* Academic Year */}
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026-27">AY 2026-27</option>
            <option value="2025-26">AY 2025-26</option>
          </select>

          {/* Semester */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={String(s)}>Semester {s}</option>
            ))}
          </select>

          {/* Section */}
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search faculty or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── Architecture Banner ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold">Granular ERP Authorization vs Google Drive Access:</p>
          <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed">
            Faculty members may see all tabs within their semester Google Spreadsheet, but JCER ERP internal authorization accepts sync and updates strictly for their assigned subject code.
          </p>
        </div>
      </div>

      {/* ── Sheet Matrix Table ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-white/80 dark:bg-slate-900/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200/60 dark:border-slate-700/60">
              <tr>
                <th className="py-3.5 px-4">Faculty</th>
                <th className="py-3.5 px-4">Google Email</th>
                <th className="py-3.5 px-4 text-center">Semester</th>
                <th className="py-3.5 px-4 text-center">Division</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 text-center">Attendance Sheet</th>
                <th className="py-3.5 px-4 text-center">Permission</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
                    <p className="mt-2 text-xs font-bold">Loading faculty sheet access matrix...</p>
                  </td>
                </tr>
              ) : filteredMatrix.length > 0 ? (
                filteredMatrix.map((row) => {
                  const isPending = row.permissionStatus === 'PENDING';
                  const isGranted = row.permissionStatus === 'GRANTED';
                  const isRevoked = row.permissionStatus === 'REVOKED';

                  return (
                    <tr key={row.assignmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div>{row.facultyName}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{row.facultyEmail}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {row.googleEmail || row.facultyEmail}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        Sem {row.semester}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                          Division {row.section || 'A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{row.subjectName}</div>
                        <div className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{row.subjectCode}</div>
                      </td>

                      {/* Attendance Sheet Status */}
                      <td className="py-3.5 px-4 text-center">
                        {row.attendanceSheetConnected ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Connected ✓
                            </span>
                            {row.attendanceSpreadsheetUrl && (
                              <a
                                href={row.attendanceSpreadsheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5 font-mono"
                              >
                                <span>Spreadsheet</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">○ Not Connected</span>
                        )}
                      </td>

                      {/* Google Drive Permission Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                          isGranted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : isRevoked
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isGranted && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isRevoked && <XCircle className="w-3 h-3" />}
                          <span>{isGranted ? 'Granted ✓' : isPending ? 'Pending' : isRevoked ? 'Revoked' : 'Not Granted'}</span>
                        </span>
                      </td>

                      {/* Assignment Status */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {row.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenManageModal(row)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 transition-colors"
                          >
                            Manage Access
                          </button>
                          <button
                            onClick={() => handleVerifyAccess(row)}
                            disabled={updatingId === row.assignmentId}
                            title="Verify Google Drive API Permission"
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${updatingId === row.assignmentId ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleRevokeAccess(row)}
                            disabled={updatingId === row.assignmentId}
                            title="Revoke Permission"
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold">No faculty assignments found matching filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Manage Access Modal (Prompt Item 27) ─────────────────────────────── */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Manage Google Sheet Access
                </h3>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalMessage && (
              <div
                className={`p-3 rounded-2xl flex items-center gap-2 ${
                  modalMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {modalMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span className="font-bold">{modalMessage.text}</span>
              </div>
            )}

            {/* Scope Summary */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Faculty</span>
                <strong className="text-slate-900 dark:text-white">{selectedRow.facultyName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Assignment</span>
                <strong className="text-slate-900 dark:text-white">{selectedRow.subjectCode} - {selectedRow.subjectName}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Semester</span>
                <strong className="text-slate-900 dark:text-white">Semester {selectedRow.semester}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Section</span>
                <strong className="text-slate-900 dark:text-white">Section {selectedRow.section || 'A'}</strong>
              </div>
            </div>

            {/* Google Email Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Faculty Google Account Email
              </label>
              <input
                type="email"
                required
                value={modalGoogleEmail}
                onChange={(e) => setModalGoogleEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Attendance Sheet Card */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Attendance Sheet ({selectedRow.attendanceSheetConnected ? 'Connected ✓' : 'Not Connected'})</span>
                </span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs font-bold">{modalAttnAccess ? 'ON' : 'OFF'}</span>
                  <input
                    type="checkbox"
                    checked={modalAttnAccess}
                    onChange={(e) => setModalAttnAccess(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                Google Permission: <strong className="text-emerald-600 font-bold">{selectedRow.permissionStatus === 'GRANTED' ? 'Granted ✓' : 'Pending/Not Granted'}</strong>
              </p>
            </div>

            {/* Academic Marks Card */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>Academic Marks ({selectedRow.marksSheetConnected ? 'Connected ✓' : 'Not Connected'})</span>
                </span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs font-bold">{modalMarksAccess ? 'ON' : 'OFF'}</span>
                  <input
                    type="checkbox"
                    checked={modalMarksAccess}
                    onChange={(e) => setModalMarksAccess(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                Google Permission: <strong className="text-emerald-600 font-bold">{selectedRow.permissionStatus === 'GRANTED' ? 'Granted ✓' : 'Pending/Not Granted'}</strong>
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVerifyAccess(selectedRow)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  Verify Access
                </button>
                <button
                  type="button"
                  onClick={() => handleRevokeAccess(selectedRow)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50"
                >
                  Revoke Access
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={modalSubmitting}
                  className="px-5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  {modalSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodSheetsAccessPage;
