import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UserPlus,
  ArrowLeft,
  Building2,
  BookOpen,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import hodService, { HodSubjectItem } from '../../services/hod.service';

export const HodCreateFacultyPage: React.FC = () => {
  const navigate = useNavigate();

  // Subjects in this department
  const [subjects, setSubjects] = useState<HodSubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(true);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);

  const [subjectId, setSubjectId] = useState('');
  const [semester, setSemester] = useState('5');
  const [section, setSection] = useState('A');
  const [academicYear, setAcademicYear] = useState('2026-27');

  const [attendanceAccess, setAttendanceAccess] = useState(true);
  const [marksAccess, setMarksAccess] = useState(true);

  // Authority Selection (Critical User Requirement 1)
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
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    hodService.getSubjects()
      .then((data) => {
        setSubjects(data);
        if (data.length > 0) {
          setSubjectId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load department subjects:', err))
      .finally(() => setLoadingSubjects(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName || !lastName || !email || !subjectId) {
      setErrorMessage('Please fill in all mandatory fields (Name, Email, and Subject).');
      return;
    }

    setSubmitting(true);
    try {
      const response = await hodService.createFaculty({
        firstName,
        lastName,
        email,
        phone,
        designation,
        joiningDate,
        subjectId,
        semester: Number(semester),
        section,
        academicYear,
        attendanceAccess,
        marksAccess,
        authority,
      });

      setSuccessModalData({
        email: response.data?.temporaryCredentials?.email || email,
        temporaryPassword: response.data?.temporaryCredentials?.temporaryPassword,
        authority,
        facultyName: `${firstName} ${lastName}`,
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
              Add a department teacher and route for mandatory approval by Dean Academics or Principal.
            </p>
          </div>
        </div>

        {/* Workflow Alert (Prompt Item 1 & 2) */}
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

      {/* ── The 6-Section Form ───────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section A: Personal Information */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>Section A: Personal & Contact Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul"
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
                placeholder="e.g. Sharma"
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
                placeholder="e.g. rahul.sharma@college.com"
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
                placeholder="+91 98765 43210"
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

        {/* Section B: Academic Assignment */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>Section B: Department Subject & Section Assignment</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Assigned Subject <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {subjects.length > 0 ? (
                  subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code}) — Sem {sub.semester}
                    </option>
                  ))
                ) : (
                  <option value="">Loading subjects...</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Teaching Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Section Division
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section C: Access Permissions (Prompt Item 11) */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Section C: Faculty Assignment Permissions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Attendance Sheet Access</p>
                <p className="text-[11px] text-slate-500">Allow faculty to record & sync student attendance</p>
              </div>
              <input
                type="checkbox"
                checked={attendanceAccess}
                onChange={(e) => setAttendanceAccess(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Marks & Bit-Wise Access</p>
                <p className="text-[11px] text-slate-500">Allow faculty to input IA & Bit 1-5 marks</p>
              </div>
              <input
                type="checkbox"
                checked={marksAccess}
                onChange={(e) => setMarksAccess(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section D: Select Authorization Authority (Prompt Item 1) */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Section D: Select Authorization Authority</span>
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
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
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
                Dispatched to <strong className="text-indigo-600">{successModalData.authority}</strong> for approval.
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
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
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
