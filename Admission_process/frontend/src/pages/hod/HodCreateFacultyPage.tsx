import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
} from 'lucide-react';
import hodService from '../../services/hod.service';

interface TeachingAssignmentItem {
  id: string;
  semester: string;
  subjectName: string;
  subjectCode: string;
  academicYear: string;
  attendanceAccess: boolean;
  marksAccess: boolean;
  googleSheetsAccess: boolean;
}

const cardThemes = [
  {
    border: 'border-blue-200/90 dark:border-blue-900/60',
    bg: 'bg-blue-50/25 dark:bg-blue-950/10',
    headerBg: 'bg-blue-100/60 dark:bg-blue-900/30',
    headerText: 'text-blue-900 dark:text-blue-200',
    permBg: 'bg-blue-50/50 dark:bg-slate-800/50',
    permBorder: 'border-blue-100 dark:border-slate-700/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  {
    border: 'border-emerald-200/90 dark:border-emerald-900/60',
    bg: 'bg-emerald-50/25 dark:bg-emerald-950/10',
    headerBg: 'bg-emerald-100/60 dark:bg-emerald-900/30',
    headerText: 'text-emerald-900 dark:text-emerald-200',
    permBg: 'bg-emerald-50/50 dark:bg-slate-800/50',
    permBorder: 'border-emerald-100 dark:border-slate-700/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    border: 'border-amber-200/90 dark:border-amber-900/60',
    bg: 'bg-amber-50/25 dark:bg-amber-950/10',
    headerBg: 'bg-amber-100/60 dark:bg-amber-900/30',
    headerText: 'text-amber-900 dark:text-amber-200',
    permBg: 'bg-amber-50/50 dark:bg-slate-800/50',
    permBorder: 'border-amber-100 dark:border-slate-700/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  {
    border: 'border-purple-200/90 dark:border-purple-900/60',
    bg: 'bg-purple-50/25 dark:bg-purple-950/10',
    headerBg: 'bg-purple-100/60 dark:bg-purple-900/30',
    headerText: 'text-purple-900 dark:text-purple-200',
    permBg: 'bg-purple-50/50 dark:bg-slate-800/50',
    permBorder: 'border-purple-100 dark:border-slate-700/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
  },
];

export const HodCreateFacultyPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State - Section A
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  // Section B: Dynamic Teaching Assignments
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignmentItem[]>([
    {
      id: 'assign-1',
      semester: '1',
      subjectName: '',
      subjectCode: '',
      academicYear: '2026-27',
      attendanceAccess: true,
      marksAccess: true,
      googleSheetsAccess: true,
    },
  ]);

  // Section C: Authority Selection
  const [authority, setAuthority] = useState<'DEAN' | 'PRINCIPAL'>('DEAN');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Modal
  const [successModalData, setSuccessModalData] = useState<{
    email: string;
    temporaryPassword: string;
    authority: string;
    facultyName: string;
    assignmentsCount: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAddAssignment = () => {
    const newAssignment: TeachingAssignmentItem = {
      id: `assign_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      semester: '1',
      subjectName: '',
      subjectCode: '',
      academicYear: '2026-27',
      attendanceAccess: true,
      marksAccess: true,
      googleSheetsAccess: true,
    };
    setTeachingAssignments((prev) => [...prev, newAssignment]);
  };

  const handleRemoveAssignment = (id: string) => {
    if (teachingAssignments.length <= 1) return;
    setTeachingAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAssignment = (id: string, field: keyof TeachingAssignmentItem, value: any) => {
    setTeachingAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMessage('Please fill in all mandatory personal details (First Name, Last Name, and Email Address).');
      return;
    }

    if (teachingAssignments.length === 0) {
      setErrorMessage('Please provide at least one teaching assignment.');
      return;
    }

    // Validate each assignment card
    for (let i = 0; i < teachingAssignments.length; i++) {
      const a = teachingAssignments[i];
      if (!a.subjectName.trim()) {
        setErrorMessage(`Teaching Assignment ${i + 1}: Subject Name is required.`);
        return;
      }
      if (!a.subjectCode.trim()) {
        setErrorMessage(`Teaching Assignment ${i + 1}: Subject Code is required.`);
        return;
      }
      if (!a.semester) {
        setErrorMessage(`Teaching Assignment ${i + 1}: Teaching Semester is required.`);
        return;
      }
      if (!a.academicYear.trim()) {
        setErrorMessage(`Teaching Assignment ${i + 1}: Academic Year is required.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formattedAssignments = teachingAssignments.map((a) => ({
        semester: Number(a.semester),
        subjectName: a.subjectName.trim(),
        subjectCode: a.subjectCode.trim().toUpperCase(),
        academicYear: a.academicYear.trim(),
        permissions: {
          attendance: Boolean(a.attendanceAccess),
          marks: Boolean(a.marksAccess),
          googleSheets: Boolean(a.googleSheetsAccess),
        },
      }));

      const primaryAssignment = formattedAssignments[0];

      const response = await hodService.createFaculty({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        designation,
        joiningDate,
        authority,
        teachingAssignments: formattedAssignments,
        // Legacy fallback fields
        semester: primaryAssignment.semester,
        subjectName: primaryAssignment.subjectName,
        subjectCode: primaryAssignment.subjectCode,
        academicYear: primaryAssignment.academicYear,
        attendanceAccess: primaryAssignment.permissions.attendance,
        marksAccess: primaryAssignment.permissions.marks,
        googleSheetsAccess: primaryAssignment.permissions.googleSheets,
      });

      setSuccessModalData({
        email: response.data?.temporaryCredentials?.email || email,
        temporaryPassword: response.data?.temporaryCredentials?.temporaryPassword,
        authority,
        facultyName: `${firstName} ${lastName}`,
        assignmentsCount: formattedAssignments.length,
      });
    } catch (err: any) {
      console.error('Failed to create faculty:', err);
      setErrorMessage(err?.response?.data?.error || 'Failed to create faculty account.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* ── Breadcrumb & Back ────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/hod/faculty"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Faculty List</span>
        </Link>
      </div>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Create Faculty & Submit for Authorization
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Add a department teacher with multi-semester teaching assignments and route for approval.
            </p>
          </div>
        </div>

        {/* Workflow Alert */}
        <div className="mt-6 p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-[13px]">
              Critical Authorization Requirement:
            </p>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              Upon submission, this account is created with status <strong className="font-bold underline">PENDING_AUTHORIZATION</strong>. The faculty member <strong className="font-bold underline">CANNOT LOG IN</strong> until reviewed and approved by the selected Authority.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section A: Personal Information */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>SECTION A: PERSONAL & CONTACT INFORMATION</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Arihant"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Desai"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. arihantdesai@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 6363221706"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Academic Designation
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Professor">Professor</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section B: Teaching Assignments */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                SECTION B: TEACHING ASSIGNMENTS
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add one or more subject assignments for this faculty. Each assignment can have separate permissions.
              </p>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 self-start sm:self-auto">
              {teachingAssignments.length} {teachingAssignments.length === 1 ? 'Assignment' : 'Assignments'}
            </span>
          </div>

          {/* Assignment Cards List */}
          <div className="space-y-4">
            {teachingAssignments.map((assignment, index) => {
              const theme = cardThemes[index % cardThemes.length];
              return (
                <div
                  key={assignment.id}
                  className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5 space-y-4 transition-all shadow-2xs`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold ${theme.headerText}`}>
                        Teaching Assignment {index + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={teachingAssignments.length <= 1}
                      title={teachingAssignments.length <= 1 ? 'At least one assignment is required' : 'Remove this assignment'}
                      className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* 4 Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Teaching Semester */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Teaching Semester <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={assignment.semester}
                        onChange={(e) => handleUpdateAssignment(assignment.id, 'semester', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Subject Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Engineering Mathematics"
                        value={assignment.subjectName}
                        onChange={(e) => handleUpdateAssignment(assignment.id, 'subjectName', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Subject Code */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Subject Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MAT101"
                        value={assignment.subjectCode}
                        onChange={(e) => handleUpdateAssignment(assignment.id, 'subjectCode', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-mono"
                      />
                    </div>

                    {/* Academic Year */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Academic Year <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={assignment.academicYear}
                        onChange={(e) => handleUpdateAssignment(assignment.id, 'academicYear', e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="2026-27">2026-27</option>
                        <option value="2025-26">2025-26</option>
                        <option value="2024-25">2024-25</option>
                      </select>
                    </div>
                  </div>

                  {/* Per-Assignment Permissions Box */}
                  <div className={`p-4 rounded-xl ${theme.permBg} border ${theme.permBorder} space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Assignment Permissions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Attendance Permission */}
                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={assignment.attendanceAccess}
                          onChange={(e) => handleUpdateAssignment(assignment.id, 'attendanceAccess', e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            Attendance Sheet Access
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Allow faculty to record & sync student attendance
                          </p>
                        </div>
                      </label>

                      {/* Marks Permission */}
                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={assignment.marksAccess}
                          onChange={(e) => handleUpdateAssignment(assignment.id, 'marksAccess', e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            Marks & Bit-Wise Access
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Allow faculty to input IA & Bit 1-5 marks
                          </p>
                        </div>
                      </label>

                      {/* Google Sheets Permission */}
                      <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={assignment.googleSheetsAccess}
                          onChange={(e) => handleUpdateAssignment(assignment.id, 'googleSheetsAccess', e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            Google Sheets Access
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Allow faculty to access subject-related sheets
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Teaching Assignment Action */}
          <button
            type="button"
            onClick={handleAddAssignment}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-blue-400/80 dark:border-blue-500/60 hover:border-blue-600 dark:hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Another Teaching Assignment</span>
          </button>
        </div>

        {/* Section C: Select Authorization Authority */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>SECTION C: SELECT AUTHORIZATION AUTHORITY</span>
            </h2>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
              Mandatory Step
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Choose which executive role will review and approve this faculty appointment request:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: Dean Academics */}
            <label
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                authority === 'DEAN'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Dean Academics</span>
                <input
                  type="radio"
                  name="authority"
                  value="DEAN"
                  checked={authority === 'DEAN'}
                  onChange={() => setAuthority('DEAN')}
                  className="w-4 h-4 text-indigo-600"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct dispatch to Dean Academics portal for academic curriculum compliance, course workload review, and approval.
              </p>
            </label>

            {/* Option 2: Principal */}
            <label
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                authority === 'PRINCIPAL'
                  ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Principal</span>
                <input
                  type="radio"
                  name="authority"
                  value="PRINCIPAL"
                  checked={authority === 'PRINCIPAL'}
                  onChange={() => setAuthority('PRINCIPAL')}
                  className="w-4 h-4 text-purple-600"
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct dispatch to Principal executive portal for institutional staffing authorization and approval.
              </p>
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/hod/faculty"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating Faculty Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Authorization Request</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ── Success Modal with Temporary Credentials ─────────────────────────── */}
      {successModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Faculty Account Created!
              </h3>
              <p className="text-xs text-slate-500">
                {successModalData.assignmentsCount} teaching {successModalData.assignmentsCount === 1 ? 'assignment' : 'assignments'} submitted and dispatched to <strong className="text-indigo-600">{successModalData.authority}</strong> for approval.
              </p>
            </div>

            {/* Critical Status Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Account Status: PENDING_AUTHORIZATION</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Login is disabled for this user. The temporary password below will only become valid once the Dean/Principal approves.
              </p>
            </div>

            {/* Credentials Display */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Login Username / Email</span>
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">{successModalData.email}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Temporary Password</span>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">{successModalData.temporaryPassword}</p>
                  <button
                    onClick={() => copyToClipboard(`Email: ${successModalData.email}\nPassword: ${successModalData.temporaryPassword}`)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-200 transition-colors"
                    title="Copy credentials"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSuccessModalData(null);
                  navigate('/hod/faculty');
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Go to Faculty List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodCreateFacultyPage;
