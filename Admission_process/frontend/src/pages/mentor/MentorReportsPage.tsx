import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Download,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import mentorService, { MenteeListItem, MentoringRecordItem } from '../../services/mentor.service';
import { toast } from 'react-toastify';

export const MentorReportsPage: React.FC = () => {
  const { academicYear } = useAcademicYear();

  const [loading, setLoading] = useState<boolean>(true);
  const [mentees, setMentees] = useState<MenteeListItem[]>([]);
  const [allRecords, setAllRecords] = useState<MentoringRecordItem[]>([]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const menteesList = await mentorService.getMyMentees({ academicYear });
      setMentees(menteesList);

      const recordPromises = menteesList.map((m) =>
        mentorService.getMenteeRecords(m.id).catch(() => [])
      );
      const results = await Promise.all(recordPromises);
      setAllRecords(results.flat());
    } catch (err: any) {
      console.error('Failed to load report data:', err);
      toast.error('Failed to generate mentoring report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [academicYear]);

  // Statistics
  const totalMentees = mentees.length;
  const regularCount = mentees.filter((m) => m.attendance.status === 'MEETS_THRESHOLD').length;
  const lowAttendanceCount = mentees.filter((m) => m.attendance.status === 'NEEDS_ATTENTION').length;
  const noRecordsCount = mentees.filter((m) => m.attendance.status === 'NO_RECORDS').length;

  const totalMeetings = allRecords.length;
  const openFollowUps = allRecords.filter((r) => r.followUpStatus === 'OPEN' || r.followUpStatus === 'IN_PROGRESS').length;
  const resolvedFollowUps = allRecords.filter((r) => r.followUpStatus === 'RESOLVED').length;
  const resolutionRate = totalMeetings > 0 ? Math.round((resolvedFollowUps / (openFollowUps + resolvedFollowUps || 1)) * 100) : 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Mentoring Coverage &amp; Summary Reports
              </h1>
              <p className="text-sm text-slate-500 dark:text-neutral-400">
                Official audit and summary of student mentoring allocations, attendance health, and follow-up closure rates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-sm transition"
          >
            <Printer className="size-4" />
            <span>Print Report</span>
          </button>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── PRINTABLE REPORT CONTAINER ── */}
      <div className="space-y-6 bg-white dark:bg-neutral-900 rounded-3xl border border-slate-200/80 dark:border-neutral-800/80 p-8 shadow-sm">
        
        {/* Institutional Report Header */}
        <div className="border-b border-slate-200 dark:border-neutral-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              JAIN COLLEGE OF ENGINEERING &amp; RESEARCH (JCER)
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              Faculty Mentoring Performance &amp; Coverage Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
              Academic Year: <strong>{academicYear}</strong> • Generated on: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/40 text-xs space-y-1">
            <div className="text-slate-500 font-semibold">Audit Status: <strong className="text-emerald-600">Active &amp; Compliant</strong></div>
            <div className="text-slate-500 font-semibold">Attendance Threshold: <strong>85.0% Mandatory</strong></div>
          </div>
        </div>

        {/* 4 Core Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-100 dark:border-neutral-800">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Mentees</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalMentees}</div>
            <div className="text-[11px] text-slate-400 mt-1">100% Mentorship Scope</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Regular Attendance (&ge; 85%)</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{regularCount}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              {totalMentees > 0 ? Math.round((regularCount / totalMentees) * 100) : 0}% of cohort
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Attendance Shortage (&lt; 85%)</div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{lowAttendanceCount}</div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
              {totalMentees > 0 ? Math.round((lowAttendanceCount / totalMentees) * 100) : 0}% needing intervention
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Action Closure Rate</div>
            <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">{resolutionRate}%</div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
              {resolvedFollowUps} resolved / {openFollowUps} open
            </div>
          </div>
        </div>

        {/* Mentee Roster Breakdown Table */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Assigned Student Cohort &amp; Performance Status
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-neutral-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-neutral-800/60 text-[10px] uppercase font-black tracking-wider text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">USN</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Sem &amp; Sec</th>
                  <th className="py-2.5 px-3">Attendance %</th>
                  <th className="py-2.5 px-3">Threshold Status</th>
                  <th className="py-2.5 px-3">Open Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/40">
                {mentees.map((st, idx) => (
                  <tr key={st.id}>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{st.name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-neutral-300">{st.usn}</td>
                    <td className="py-2.5 px-3">{st.department}</td>
                    <td className="py-2.5 px-3 font-semibold">Sem {st.semester}-{st.section}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {st.attendance.attendancePercentage !== null ? `${st.attendance.attendancePercentage}%` : 'No records'}
                    </td>
                    <td className="py-2.5 px-3">
                      {st.attendance.status === 'MEETS_THRESHOLD' && (
                        <span className="text-emerald-600 font-bold">Meets Threshold</span>
                      )}
                      {st.attendance.status === 'NEEDS_ATTENTION' && (
                        <span className="text-rose-600 font-bold">Needs Attention</span>
                      )}
                      {st.attendance.status === 'NO_RECORDS' && (
                        <span className="text-slate-400">No Records</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{st.openFollowUps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Sign-off Block for Institution */}
        <div className="pt-8 border-t border-slate-200 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs text-slate-500">
          <div className="space-y-6">
            <div className="h-10 border-b border-dashed border-slate-300 dark:border-neutral-700" />
            <span className="font-semibold">Faculty Mentor Signature</span>
          </div>
          <div className="space-y-6">
            <div className="h-10 border-b border-dashed border-slate-300 dark:border-neutral-700" />
            <span className="font-semibold">Head of Department (HOD)</span>
          </div>
          <div className="space-y-6 hidden sm:block">
            <div className="h-10 border-b border-dashed border-slate-300 dark:border-neutral-700" />
            <span className="font-semibold">Dean Academics / Principal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorReportsPage;
