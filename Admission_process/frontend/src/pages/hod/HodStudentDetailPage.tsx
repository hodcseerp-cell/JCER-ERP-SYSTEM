import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import hodService from '../../services/hod.service';

export const HodStudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      hodService.getStudentById(id)
        .then((res) => setData(res))
        .catch((err) => {
          console.error('Failed to load student details:', err);
          setError('Student not found or does not belong to your department.');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-xs font-bold">Loading student profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{error || 'Unable to load student.'}</p>
        <Link to="/hod/students" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Students Directory
        </Link>
      </div>
    );
  }

  const { student, attendance, marks } = data;
  const isDefaulter = attendance.isDefaulter;

  return (
    <div className="space-y-6">
      
      {/* ── Breadcrumb & Back ────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/hod/students"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Students Directory</span>
        </Link>
      </div>

      {/* ── Student Identity Hero Card ───────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-white/80">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {student.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Sem {student.semester} • Section {student.section || 'Unassigned'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  USN: {student.usn}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {student.department?.name} ({student.department?.code}) • Admission Status: <strong className="text-slate-800 dark:text-slate-200">{student.admissionStatus}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Attendance</span>
              <span className={`text-lg font-black ${isDefaulter ? 'text-rose-600' : 'text-emerald-600'}`}>
                {attendance.percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two Column Details: Personal / Parent & Academics ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Contact & Parent Info */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Personal & Guardian Info
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{student.email || 'No email registered'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Phone className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{student.phone || 'No phone registered'}</span>
            </div>
            {student.address && (
              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{student.address}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Parent Details</h4>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <p>Father: <strong className="text-slate-800 dark:text-slate-200">{student.fatherName || 'N/A'}</strong></p>
              <p>Mother: <strong className="text-slate-800 dark:text-slate-200">{student.motherName || 'N/A'}</strong></p>
              <p>Parent Contact: <strong className="text-slate-800 dark:text-slate-200">{student.parentPhone || 'N/A'}</strong></p>
              <p>Parent Email: <strong className="text-slate-800 dark:text-slate-200">{student.parentEmail || 'N/A'}</strong></p>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance & Academic Performance */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-6">
          
          {/* Attendance Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-teal-600" />
                <span>Attendance Record</span>
              </h3>
              {isDefaulter && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800">
                  Critical Defaulter (&lt; 75%)
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 block">Total Sessions</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-200">{attendance.totalSessions}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 block">Present</span>
                <span className="text-base font-black text-emerald-600">{attendance.presentSessions}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[10px] font-bold text-slate-400 block">Absent</span>
                <span className="text-base font-black text-rose-600">
                  {attendance.totalSessions - attendance.presentSessions}
                </span>
              </div>
            </div>
          </div>

          {/* Marks & Assessment Components */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Assessment & Bit-Wise Marks</span>
            </h3>

            {marks && marks.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Assessment</th>
                      <th className="py-2.5 px-3">Component</th>
                      <th className="py-2.5 px-3">Scored</th>
                      <th className="py-2.5 px-3">Max Marks</th>
                      <th className="py-2.5 px-3 text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {marks.map((m: any) => {
                      const pct = m.component?.maxMarks ? ((m.marks / m.component.maxMarks) * 100).toFixed(0) : '0';
                      return (
                        <tr key={m.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{m.assessment?.name || 'IA 1'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{m.component?.name || 'Bit 1'}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">{m.marks}</td>
                          <td className="py-2.5 px-3 text-slate-400">{m.component?.maxMarks || 10}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                No formal bit-wise assessment records captured yet for this student.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HodStudentDetailPage;
