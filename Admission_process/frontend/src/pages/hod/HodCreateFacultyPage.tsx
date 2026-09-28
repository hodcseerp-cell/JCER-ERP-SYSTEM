import React, { useState, useEffect } from 'react';
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
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import hodService from '../../services/hod.service';
import usePersistentFormState from '../../hooks/usePersistentFormState';

interface TeachingAssignmentItem {
  id: string;
  semester: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  section: string;
  academicYear: string;
  attendanceAccess: boolean;
  attendanceSections: string[];
  marksAccess: boolean;
  googleSheetsAccess: boolean;
}

interface CreateFacultyFormState {
  firstName: string;
  lastName: string;
  email: string;
  googleEmail: string;
  phone: string;
  designation: string;
  joiningDate: string;
  authority: 'DEAN' | 'PRINCIPAL';
  teachingAssignments: TeachingAssignmentItem[];
}

const defaultFacultyForm: CreateFacultyFormState = {
  firstName: '',
  lastName: '',
  email: '',
  googleEmail: '',
  phone: '',
  designation: 'Assistant Professor',
  joiningDate: new Date().toISOString().split('T')[0],
  authority: 'DEAN',
  teachingAssignments: [
    {
      id: 'alloc-1',
      semester: '1',
      subjectId: '',
      subjectName: '',
      subjectCode: '',
      section: 'Section A',
      academicYear: '2026-27',
      attendanceAccess: false,
      attendanceSections: [],
      marksAccess: true,
      googleSheetsAccess: false,
    },
  ],
};

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

  // Persistent Form State with LocalStorage & Redis session synchronization
  const {
    formState,
    updateField,
    clearDraft,
  } = usePersistentFormState<CreateFacultyFormState>('hod_create_faculty_form', defaultFacultyForm);

  const {
    firstName,
    lastName,
    email,
    googleEmail,
    phone,
    designation,
    joiningDate,
    teachingAssignments,
    authority,
  } = formState;

  const setFirstName = (val: string) => updateField('firstName', val);
  const setLastName = (val: string) => updateField('lastName', val);
  const setEmail = (val: string) => updateField('email', val);
  const setGoogleEmail = (val: string) => updateField('googleEmail', val);
  const setPhone = (val: string) => updateField('phone', val);
  const setDesignation = (val: string) => updateField('designation', val);
  const setJoiningDate = (val: string) => updateField('joiningDate', val);
  const setAuthority = (val: 'DEAN' | 'PRINCIPAL') => updateField('authority', val);
  const setTeachingAssignments = (val: TeachingAssignmentItem[] | ((prev: TeachingAssignmentItem[]) => TeachingAssignmentItem[])) => {
    updateField('teachingAssignments', val);
  };

  // Semester Sheets Connection Status
  const [semesterSheetsMap, setSemesterSheetsMap] = useState<
    Record<number, { attendance: boolean; marks: boolean; divisions: Record<string, { isConnected: boolean; connection: any }> }>
  >({});

  useEffect(() => {
    // Check connected sheets for Sem 1-8
    const loadSemesterSheets = async () => {
      const map: Record<number, { attendance: boolean; marks: boolean; divisions: Record<string, { isConnected: boolean; connection: any }> }> = {};
      for (const sem of [1, 2, 3, 4, 5, 6, 7, 8]) {
        try {
          const res = await hodService.getSemesterGoogleSheets(sem);
          const divMap: Record<string, { isConnected: boolean; connection: any }> = {};
          (res?.divisions || []).forEach((d: any) => {
            divMap[d.section] = { isConnected: d.isConnected, connection: d.connection };
          });
          map[sem] = {
            attendance: Boolean(res?.attendance),
            marks: Boolean(res?.marks),
            divisions: divMap,
          };
        } catch {
          map[sem] = { attendance: false, marks: false, divisions: {} };
        }
      }
      setSemesterSheetsMap(map);
    };
    loadSemesterSheets();
  }, []);

  // Semester-based dynamic subjects cache & loading state
  const [subjectsBySemester, setSubjectsBySemester] = useState<Record<number, any[]>>({});
  const [loadingSubjectsMap, setLoadingSubjectsMap] = useState<Record<number, boolean>>({});

  // Dynamic sections cache by semester and academic year
  const [sectionsBySemester, setSectionsBySemester] = useState<Record<string, string[]>>({});
  const [loadingSectionsMap, setLoadingSectionsMap] = useState<Record<string, boolean>>({});

  const fetchSubjectsForSemester = async (sem: number) => {
    if (!sem || sem < 1 || sem > 8) return;
    if (subjectsBySemester[sem] !== undefined) return;

    setLoadingSubjectsMap((prev) => ({ ...prev, [sem]: true }));
    try {
      const list = await hodService.getSubjects({ semester: sem });
      setSubjectsBySemester((prev) => ({ ...prev, [sem]: list || [] }));
    } catch (err) {
      console.error(`Failed to load subjects for semester ${sem}:`, err);
      setSubjectsBySemester((prev) => ({ ...prev, [sem]: [] }));
    } finally {
      setLoadingSubjectsMap((prev) => ({ ...prev, [sem]: false }));
    }
  };

  const fetchSectionsForSemester = async (sem: number, ay?: string) => {
    if (!sem || sem < 1 || sem > 8) return;
    const yearKey = ay || '2026-27';
    const cacheKey = `${sem}_${yearKey}`;
    if (sectionsBySemester[cacheKey] !== undefined) return;

    setLoadingSectionsMap((prev) => ({ ...prev, [cacheKey]: true }));
    try {
      const secData = await hodService.getStudentSections(sem, yearKey);
      let secNames: string[] = [];
      if (Array.isArray(secData) && secData.length > 0) {
        const uniqueNames = Array.from(new Set(secData.map((s: any) => s.name).filter(Boolean)));
        secNames = uniqueNames.map((n: string) => (n.startsWith('Section') || n.startsWith('Division') ? n : `Section ${n}`));
      }
      setSectionsBySemester((prev) => ({ ...prev, [cacheKey]: secNames }));
    } catch (err) {
      console.error(`Failed to load sections for semester ${sem} ay ${yearKey}:`, err);
      setSectionsBySemester((prev) => ({ ...prev, [cacheKey]: [] }));
    } finally {
      setLoadingSectionsMap((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

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

  // Initial fetch for subjects and sections, and preloading for all restored teaching allocations
  useEffect(() => {
    fetchSubjectsForSemester(1);
    for (let s = 1; s <= 8; s++) {
      fetchSectionsForSemester(s, '2026-27');
    }
    if (teachingAssignments && teachingAssignments.length > 0) {
      teachingAssignments.forEach((a) => {
        const semNum = Number(a.semester);
        if (semNum >= 1 && semNum <= 8) {
          fetchSubjectsForSemester(semNum);
          fetchSectionsForSemester(semNum, a.academicYear || '2026-27');
        }
      });
    }
  }, []);

  const handleAddAssignment = () => {
    const newAssignment: TeachingAssignmentItem = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      semester: '1',
      subjectId: '',
      subjectName: '',
      subjectCode: '',
      section: 'Section A',
      academicYear: '2026-27',
      attendanceAccess: false,
      attendanceSections: [],
      marksAccess: true,
      googleSheetsAccess: false,
    };
    fetchSubjectsForSemester(1);
    fetchSectionsForSemester(1, '2026-27');
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

  const handleSemesterChange = (id: string, newSemester: string) => {
    const semNum = Number(newSemester);
    setTeachingAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          semester: newSemester,
          subjectId: '',
          subjectName: '',
          subjectCode: '',
          attendanceSections: [], // Clear previous semester section selections
        };
      })
    );
    if (semNum >= 1 && semNum <= 8) {
      fetchSubjectsForSemester(semNum);
      const targetAssign = teachingAssignments.find((a) => a.id === id);
      fetchSectionsForSemester(semNum, targetAssign?.academicYear || '2026-27');
    }
  };

  const handleAcademicYearChange = (id: string, newYear: string) => {
    setTeachingAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          academicYear: newYear,
          attendanceSections: [], // Clear attendance sections when academic year changes
        };
      })
    );
    const targetAssign = teachingAssignments.find((a) => a.id === id);
    if (targetAssign?.semester) {
      fetchSectionsForSemester(Number(targetAssign.semester), newYear);
    }
  };

  const handleToggleAttendanceAccess = (id: string, enabled: boolean) => {
    setTeachingAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          attendanceAccess: enabled,
          attendanceSections: enabled ? a.attendanceSections : [], // Clear attendance sections when disabled
          googleSheetsAccess: enabled,
        };
      })
    );
  };

  const handleToggleAttendanceSection = (assignmentId: string, sectionName: string) => {
    setTeachingAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== assignmentId) return a;
        const current = a.attendanceSections || [];
        const exists = current.includes(sectionName);
        const updated = exists ? current.filter((s) => s !== sectionName) : [...current, sectionName];
        return {
          ...a,
          attendanceSections: updated,
        };
      })
    );
  };

  const handleSubjectChange = (id: string, selectedSubjectId: string, semesterNum: number) => {
    const semSubs = subjectsBySemester[semesterNum] || [];
    const selectedSub = semSubs.find((s) => s.id === selectedSubjectId);

    setTeachingAssignments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              subjectId: selectedSubjectId,
              subjectName: selectedSub?.name || '',
              subjectCode: selectedSub?.code || '',
            }
          : a
      )
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
      setErrorMessage('Please provide at least one teaching allocation.');
      return;
    }

    // Validate each allocation card
    for (let i = 0; i < teachingAssignments.length; i++) {
      const a = teachingAssignments[i];
      if (!a.semester) {
        setErrorMessage(`Teaching Allocation ${i + 1}: Teaching Semester is required.`);
        return;
      }
      if (!a.subjectId || !a.subjectName.trim()) {
        setErrorMessage(`Teaching Allocation ${i + 1}: Please select a subject from the dropdown.`);
        return;
      }
      if (!a.academicYear.trim()) {
        setErrorMessage(`Teaching Allocation ${i + 1}: Academic Year is required.`);
        return;
      }
      if (a.attendanceAccess && (!a.attendanceSections || a.attendanceSections.length === 0)) {
        setErrorMessage(`Teaching Allocation ${i + 1}: Select at least one section for attendance access.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formattedAssignments = teachingAssignments.map((a) => {
        const primarySec = a.attendanceSections && a.attendanceSections.length > 0
          ? a.attendanceSections.join(', ')
          : (a.section || 'All Sections');

        return {
          subjectId: a.subjectId,
          subjectName: a.subjectName.trim(),
          subjectCode: a.subjectCode.trim().toUpperCase(),
          semester: Number(a.semester),
          section: primarySec.trim(),
          academicYear: a.academicYear.trim(),
          attendanceAccess: Boolean(a.attendanceAccess),
          attendanceSections: a.attendanceAccess ? (a.attendanceSections || []) : [],
          marksAccess: Boolean(a.marksAccess),
          googleSheetsAccess: Boolean(a.attendanceAccess),
          permissions: {
            attendance: Boolean(a.attendanceAccess),
            attendanceSections: a.attendanceAccess ? (a.attendanceSections || []) : [],
            marks: Boolean(a.marksAccess),
            googleSheets: Boolean(a.attendanceAccess),
          },
        };
      });

      const primaryAssignment = formattedAssignments[0];

      const response = await hodService.createFaculty({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        googleEmail: googleEmail.trim() || email.trim(),
        phone: phone.trim() || undefined,
        designation,
        joiningDate,
        authority,
        teachingAssignments: formattedAssignments,
        // Legacy fallback fields
        semester: primaryAssignment.semester,
        subjectId: primaryAssignment.subjectId,
        subjectName: primaryAssignment.subjectName,
        subjectCode: primaryAssignment.subjectCode,
        section: primaryAssignment.section,
        academicYear: primaryAssignment.academicYear,
        attendanceAccess: primaryAssignment.permissions.attendance,
        marksAccess: primaryAssignment.permissions.marks,
        googleSheetsAccess: primaryAssignment.permissions.googleSheets,
      } as any);

      setSuccessModalData({
        email: response.data?.temporaryCredentials?.email || email,
        temporaryPassword: response.data?.temporaryCredentials?.temporaryPassword,
        authority,
        facultyName: `${firstName} ${lastName}`,
        assignmentsCount: formattedAssignments.length,
      });
      // Clear persisted form draft upon successful creation
      clearDraft();
    } catch (err: any) {
      console.error('Failed to create faculty:', err);
      const backendError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create faculty account.';
      setErrorMessage(backendError);
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
      
      {/* ── Breadcrumb & Actions Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link
          to="/hod/faculty"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Faculty List</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
            <Sparkles className="w-3 h-3" />
            <span>Session Auto-Saved</span>
          </span>
          <button
            type="button"
            onClick={() => clearDraft()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
            title="Reset form draft"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Draft</span>
          </button>
        </div>
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
              Add a department teacher with multi-semester teaching allocations and route for approval.
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
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Faculty College Email</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. rahul@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Google Account / Email</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">For Google Drive Access</span>
              </label>
              <input
                type="email"
                placeholder={email || 'e.g. rahul@gmail.com'}
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
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

        {/* Section B: Teaching Allocation */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 dark:border-slate-800/60 shadow-sm bg-white/80 dark:bg-slate-900/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                SECTION B: TEACHING ALLOCATION
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Allocate one or more subjects to this faculty member. Each allocation can have separate permissions.
              </p>
            </div>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 self-start sm:self-auto">
              {teachingAssignments.length} {teachingAssignments.length === 1 ? 'Allocation' : 'Allocations'}
            </span>
          </div>

          {/* Allocation Cards List */}
          <div className="space-y-4">
            {teachingAssignments.map((assignment, index) => {
              const theme = cardThemes[index % cardThemes.length];
              const semNum = Number(assignment.semester) || 1;
              const semStatus = semesterSheetsMap[semNum] || { attendance: false, marks: false, divisions: {} };
              const secCacheKey = `${semNum}_${assignment.academicYear || '2026-27'}`;
              const availableSemesterSections = sectionsBySemester[secCacheKey] || [];

              return (
                <div
                  key={assignment.id}
                  className={`rounded-2xl border ${theme.border} ${theme.bg} p-4 sm:p-5 space-y-4 transition-all shadow-2xs`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold ${theme.headerText}`}>
                        Teaching Allocation {index + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={teachingAssignments.length <= 1}
                      title={teachingAssignments.length <= 1 ? 'At least one allocation is required' : 'Remove this allocation'}
                      className="px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>

                  {/* 3 Fields Grid (Teaching Semester, Subject Dropdown, Academic Year) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Teaching Semester */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Teaching Semester <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={assignment.semester}
                        onChange={(e) => handleSemesterChange(assignment.id, e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>Semester {s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Dropdown (Single database-backed dropdown) */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Subject <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        disabled={!assignment.semester || loadingSubjectsMap[semNum]}
                        value={assignment.subjectId || ''}
                        onChange={(e) => handleSubjectChange(assignment.id, e.target.value, semNum)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {!assignment.semester ? (
                          <option value="">Select teaching semester first</option>
                        ) : loadingSubjectsMap[semNum] ? (
                          <option value="">Loading subjects...</option>
                        ) : (subjectsBySemester[semNum] || []).length === 0 ? (
                          <option value="">No subjects available for this semester</option>
                        ) : (
                          <>
                            <option value="">Select Subject</option>
                            {(subjectsBySemester[semNum] || []).map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name} ({sub.code})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>

                    {/* Academic Year */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Academic Year <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={assignment.academicYear}
                        onChange={(e) => handleAcademicYearChange(assignment.id, e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="2026-27">2026-27</option>
                        <option value="2025-26">2025-26</option>
                        <option value="2024-25">2024-25</option>
                      </select>
                    </div>
                  </div>

                  {/* Per-Allocation Permissions Box */}
                  <div className={`p-4 sm:p-5 rounded-2xl ${theme.permBg} border ${theme.permBorder} space-y-4 shadow-2xs`}>
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        ALLOCATION PERMISSIONS
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Attendance Permission Toggle */}
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={assignment.attendanceAccess}
                            onChange={(e) => handleToggleAttendanceAccess(assignment.id, e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                              Attendance Sheet Access
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                              Allow faculty to record & sync student attendance
                            </p>
                          </div>
                        </label>

                        {/* When Attendance Sheet Access is checked, render Attendance Section Access Checkbox List */}
                        {assignment.attendanceAccess && (
                          <div className="ml-7 p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/50 space-y-3 shadow-2xs transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                  ATTENDANCE SECTION ACCESS
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Select the sections for which this faculty can record and sync attendance.
                                </p>
                              </div>
                              <Link
                                to={`/hod/students/semesters/${semNum}`}
                                target="_blank"
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                              >
                                Manage Spreadsheets ↗
                              </Link>
                            </div>

                            {loadingSectionsMap[secCacheKey] ? (
                              <div className="p-3 text-center text-xs text-slate-400 font-semibold">Loading semester sections...</div>
                            ) : availableSemesterSections.length === 0 ? (
                              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                                <span className="font-bold">No active sections found for Semester {semNum} ({assignment.academicYear || '2026-27'}).</span>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                  Please create sections under Student Management → Section Allocation first.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {availableSemesterSections.map((secName) => {
                                  const isChecked = (assignment.attendanceSections || []).includes(secName);
                                  const cleanSecLetter = (secName || 'A').trim().toUpperCase().replace(/^(SECTION|DIVISION|SEC|DIV)\s*/i, '') || 'A';
                                  const isConn = Boolean(semStatus.divisions?.[cleanSecLetter]?.isConnected);

                                  return (
                                    <label
                                      key={secName}
                                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                        isChecked
                                          ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/80'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleAttendanceSection(assignment.id, secName)}
                                        className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                      />
                                      <div className="space-y-1 min-w-0">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                          {secName}
                                        </span>
                                        {isConn ? (
                                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span>Attendance Sheet Connected</span>
                                          </span>
                                        ) : (
                                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                                            <span>Attendance Sheet Not Connected</span>
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Marks & Bit-Wise Access (No Section Selection) */}
                      <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer select-none border-t border-slate-200/50 dark:border-slate-700/50 pt-3">
                        <input
                          type="checkbox"
                          checked={assignment.marksAccess}
                          onChange={(e) => handleUpdateAssignment(assignment.id, 'marksAccess', e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                            Marks & Bit-Wise Access
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Allow faculty to input IA & Bit-1–5 marks
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Another Teaching Allocation Action */}
          <button
            type="button"
            onClick={handleAddAssignment}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-blue-400/80 dark:border-blue-500/60 hover:border-blue-600 dark:hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Another Teaching Allocation</span>
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
                <span>Creating Faculty & Granting Access...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Create Faculty & Grant Access</span>
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
                {successModalData.assignmentsCount} teaching {successModalData.assignmentsCount === 1 ? 'allocation' : 'allocations'} submitted and dispatched to <strong className="text-indigo-600">{successModalData.authority}</strong> for approval.
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
