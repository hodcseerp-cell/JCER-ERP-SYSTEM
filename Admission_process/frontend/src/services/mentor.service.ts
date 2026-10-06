import API from './api';

// ─── TYPES & INTERFACES ───────────────────────────────────────────────────────

export interface MentorOverviewData {
  department: { id: string; name: string; code: string; type: string };
  isSemesterHandling: boolean;
  authorizedSemesters: number[];
  academicYear: string;
  summary: {
    totalStudents: number;
    assignedStudents: number;
    unassignedStudents: number;
    activeMentors: number;
    pendingTransitions?: number;
  };
  semesterProgress: Array<{
    semester: number;
    semesterLabel: string;
    totalStudents: number;
    assignedStudents: number;
    unassignedStudents: number;
    progress: number;
  }>;
  facultyWorkloadList: Array<{
    facultyId: string;
    facultyName: string;
    departmentCode: string;
    menteeCount: number;
  }>;
  recentAssignments: any[];
  unassignedStudentsDetailed: any[];
}

export interface EligibleStudentItem {
  id: string;
  usn: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  department: string;
  departmentCode: string;
  departmentId: string;
  semester: number;
  section: string;
  rollNumber: string;
  isAssigned: boolean;
  currentMentor: {
    assignmentId: string;
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    coreDepartment: string;
    coreDepartmentCode: string;
    assignedAt: string;
  } | null;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface EligibleFacultyItem {
  teacherId: string;
  facultyId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  designation: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  currentMenteeCount: number;
  status: string;
}

export interface AllocationItem {
  id: string;
  studentId: string;
  studentName: string;
  usn: string;
  semester: number;
  section: string;
  department: string;
  departmentCode: string;
  facultyId: string;
  mentorName: string;
  mentorEmail: string;
  mentorDepartmentId: string;
  mentorDepartmentName: string;
  mentorDepartmentCode: string;
  assignedDate: string;
  reassignedDate: string | null;
  assignedByName: string;
  status: 'ACTIVE' | 'REASSIGNED' | 'INACTIVE';
  notes: string | null;
}

export interface FacultyMentorOverviewData {
  myMenteesCount: number;
  lowAttendanceCount: number;
  followUpsCount: number;
  attentionCount: number;
  studentsRequiringAttention: Array<{
    studentId: string;
    usn: string;
    name: string;
    avatar: string | null;
    semester: number;
    section: string;
    departmentCode: string;
    attendancePercentage: number | null;
    hasLowAttendance: boolean;
    openFollowUps: number;
  }>;
  recentActivity: any[];
}

export interface MenteeListItem {
  id: string;
  usn: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  department: string;
  departmentCode: string;
  semester: number;
  section: string;
  rollNumber: string;
  attendance: {
    totalConducted: number;
    totalAttended: number;
    attendancePercentage: number | null;
    status: 'MEETS_THRESHOLD' | 'NEEDS_ATTENTION' | 'NO_RECORDS';
  };
  latestResult: {
    status: string;
    displayString: string;
    averageCie?: number;
  };
  openFollowUps: number;
  lastMeetingDate: string | null;
  requiresAttention: boolean;
  assignmentDate: string;
}

export interface MenteeProfileData {
  student: {
    id: string;
    usn: string;
    name: string;
    email: string;
    phone: string;
    avatar: string | null;
    department: string;
    departmentCode: string;
    semester: number;
    section: string;
    rollNumber: string;
    enrollmentNumber?: string;
    academicYear: string;
    admissionBatch?: string;
    mentorshipPhase?: string;
  };
  personalInfo?: {
    name: string;
    usn: string;
    enrollmentNumber: string;
    rollNumber: string;
    dateOfBirth: string;
    gender: string;
    department: string;
    departmentCode: string;
    admissionBatch: string;
    currentSemester: number;
    section: string;
    address: string;
    parentName: string;
    fatherName: string;
    motherName: string;
    parentPhone: string;
    parentEmail: string;
    emergencyContact: string;
  };
  activeMentor: {
    facultyName: string;
    facultyEmail: string;
    coreDepartment: string;
    assignedAt: string;
    phase?: string;
  } | null;
  summaryCards: {
    attendance: {
      totalConducted: number;
      totalAttended: number;
      attendancePercentage: number;
    };
    latestResult: {
      status: string;
      displayString: string;
      averageCie?: number;
    };
    completedSemesters: number;
    openFollowUps: number;
    admissionBatch?: string;
    mentorshipPhase?: string;
  };
  mentorshipHistory?: Array<{
    id: string;
    phase: string;
    mentorName: string;
    mentorEmail: string;
    period: string;
    academicYear: string;
    status: string;
    assignedAt: string;
    reassignedAt?: string | null;
    reassignmentReason?: string | null;
  }>;
  recentMentoringRecords: any[];
}

export interface MenteeAcademicPerformanceData {
  studentSemester: number;
  performanceBySemester: Array<{
    semester: number;
    isCurrentSemester: boolean;
    isPastSemester: boolean;
    subjectsCount: number;
    subjects: Array<{
      subjectId: string;
      subjectCode: string;
      subjectName: string;
      credits: number;
      cie1Marks: number | null;
      cie2Marks: number | null;
      cieAverage: number | null;
      assignmentMarks: number | null;
      finalInternalMarks: number | null;
      externalMarks: number | null;
      totalMarks: number | null;
      status: string;
    }>;
    hasRecords: boolean;
  }>;
}

export interface MenteeAttendanceDetailsData {
  studentSemester: number;
  selectedSemester: number;
  totalConducted: number;
  totalAttended: number;
  overallPercentage: number | null;
  status: 'MEETS_THRESHOLD' | 'NEEDS_ATTENTION' | 'NO_RECORDS';
  threshold: number;
  subjectWise: Array<{
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    conducted: number;
    attended: number;
    attendancePercentage: number;
    eligibility: 'MEETS_THRESHOLD' | 'NEEDS_ATTENTION' | 'NO_RECORDS';
  }>;
  calendarData?: Record<string, {
    date: string;
    sessions: Array<{ subjectCode: string; subjectName: string; period: number; status: string }>;
    presentCount: number;
    absentCount: number;
    status: 'PRESENT' | 'ABSENT';
  }>;
  monthlyBreakdown?: Array<{
    monthKey: string;
    monthName: string;
    totalClasses: number;
    attended: number;
    absent: number;
    attendancePercentage: number;
    subjectWise: Array<{
      subjectCode: string;
      subjectName: string;
      conducted: number;
      attended: number;
      absent: number;
      attendancePercentage: number;
    }>;
  }>;
}

export interface MenteeAnalyticsData {
  studentId: string;
  studentName: string;
  usn: string;
  semester: number;
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  riskLevelNormalized?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors?: string[];
  summaryCards: {
    overallAttendance: number;
    academicAverage: number;
    subjectsBelow85: number;
    subjectsNeedingAttention: number;
    totalConducted?: number;
    totalAttended?: number;
    totalMissed?: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  attendanceTrend: Array<{
    month: string;
    monthKey?: string;
    percentage: number;
    conducted?: number;
    attended?: number;
    missed?: number;
  }>;
  monthlyAttendanceGrouped?: Array<{
    month: string;
    monthKey?: string;
    attended: number;
    missed: number;
    total: number;
    percentage: number;
  }>;
  attendedVsMissedDonut?: Array<{ name: string; value: number; color: string }>;
  subjectAttendanceBars?: Array<{
    subjectCode: string;
    subjectName: string;
    conducted: number;
    attended: number;
    missed: number;
    attendancePercentage: number;
  }>;
  subjectAcademicBars?: Array<{
    subjectCode: string;
    subjectName: string;
    cie: number;
    see: number | null;
    total: number;
  }>;
  academicTrend: Array<{ semester: string; averageMarks: number }>;
  lowAttendanceSubjects: any[];
  subjectPerformance: any[];
}

export interface GlobalMentorAnalyticsData {
  totalMentees: number;
  averageAttendance: number;
  studentsBelow85: number;
  studentsAbove85: number;
  averageAcademicScore: number;
  studentsNeedingAttention: number;
  studentsWithAcademicDecline: number;
  attendanceDistribution: {
    range90To100: number;
    range85To90: number;
    range75To85: number;
    rangeBelow75: number;
  };
  monthlyAttendanceTrend: Array<{ month: string; averageAttendance: number }>;
  lowAttendanceStudents: Array<{
    id: string;
    name: string;
    usn: string;
    semester: number;
    section: string;
    attendancePercentage: number;
    primaryLowSubject: string;
  }>;
  topPerformingMentees: any[];
  studentsNeedingSupport: any[];
}

export interface CohortCardItem {
  batch: string;
  admissionBatch: string;
  menteeCount: number;
  currentSemester: number;
  semesters: number[];
  sections: string[];
}

export interface MentorCohortsData {
  batches: string[];
  semestersByBatch: Record<string, number[]>;
  sectionsByBatch: Record<string, string[]>;
  cohorts?: CohortCardItem[];
}

export interface MentorTransitionItem {
  id: string;
  studentId: string;
  studentName: string;
  usn: string;
  semester: number;
  admissionBatch: string;
  departmentCode: string;
  previousFacultyId: string | null;
  previousMentorName: string;
  status: string;
  createdAt: string;
}

export interface ParentImportPreviewData {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  preview: Array<{
    rowNumber: number;
    usn: string;
    studentName: string;
    parentName: string;
    parentMobile: string;
    address: string;
    emergencyContact: string;
    status: 'VALID' | 'INVALID';
    errors: string[];
    studentId: string | null;
  }>;
}

export interface MentoringRecordItem {
  id: string;
  studentId: string;
  facultyId: string;
  facultyName: string;
  meetingDate: string;
  meetingType: 'IN_PERSON' | 'ONLINE' | 'PHONE' | 'OTHER';
  concernCategory: 'ACADEMIC' | 'ATTENDANCE' | 'DISCIPLINARY' | 'CAREER' | 'PERSONAL' | 'GENERAL';
  summary: string;
  actionPlan: string | null;
  followUpDate: string | null;
  followUpStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'NO_ACTION_REQUIRED';
  resolutionNotes: string | null;
  resolvedAt: string | null;
  isOverdue: boolean;
  createdAt: string;
}

// ─── API CLIENT SERVICE ───────────────────────────────────────────────────────

export const mentorService = {
  // ─── HOD Endpoints ───
  getHodOverview: async (academicYear?: string): Promise<MentorOverviewData> => {
    const res = await API.get('/hod/mentors/overview', { params: { academicYear } });
    return res.data.data;
  },

  getEligibleStudents: async (params?: {
    academicYear?: string;
    semester?: number | string;
    section?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    students: EligibleStudentItem[];
    authorizedSemesters: number[];
  }> => {
    const res = await API.get('/hod/mentors/students', { params });
    return res.data.data;
  },

  getMentorCoreDepartments: async (): Promise<DepartmentItem[]> => {
    const res = await API.get('/hod/mentors/departments');
    return res.data.data;
  },

  getEligibleFaculty: async (departmentId: string, search?: string, academicYear?: string): Promise<EligibleFacultyItem[]> => {
    const res = await API.get(`/hod/mentors/faculty/${departmentId}`, { params: { search, academicYear } });
    return res.data.data;
  },

  bulkAssignMentors: async (data: {
    studentIds: string[];
    facultyId: string;
    mentorDepartmentId: string;
    academicYear?: string;
    semester?: number;
    notes?: string;
  }) => {
    const res = await API.post('/hod/mentors/assign', data);
    return res.data;
  },

  getAllocations: async (params?: {
    academicYear?: string;
    semester?: number | string;
    section?: string;
    mentorDepartmentId?: string;
    facultyId?: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    allocations: AllocationItem[];
    authorizedSemesters: number[];
  }> => {
    const res = await API.get('/hod/mentors/allocations', { params });
    return res.data.data;
  },

  reassignMentor: async (data: {
    studentId: string;
    newFacultyId: string;
    mentorDepartmentId: string;
    academicYear?: string;
    notes?: string;
  }) => {
    const res = await API.post('/hod/mentors/reassign', data);
    return res.data;
  },

  getStudentAllocationHistory: async (studentId: string) => {
    const res = await API.get(`/hod/mentors/history/${studentId}`);
    return res.data.data;
  },

  // ─── HOD Phase Transitions ───
  getPendingTransitions: async (params?: {
    admissionBatch?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    transitions: MentorTransitionItem[];
  }> => {
    const res = await API.get('/hod/mentors/transitions', { params });
    return res.data.data;
  },

  resolveTransitions: async (data: {
    transitions: Array<{
      transitionId: string;
      decision: 'CONTINUE' | 'ASSIGN_NEW';
      newFacultyId?: string;
      mentorDepartmentId?: string;
      notes?: string;
    }>;
    academicYear?: string;
  }) => {
    const res = await API.post('/hod/mentors/transitions/resolve', data);
    return res.data;
  },

  // ─── Faculty Mentor Endpoints ───
  getMentorDashboardOverview: async (academicYear?: string): Promise<FacultyMentorOverviewData> => {
    const res = await API.get('/faculty/mentor/overview', { params: { academicYear } });
    return res.data.data;
  },

  getMentorCohorts: async (): Promise<MentorCohortsData> => {
    const res = await API.get('/faculty/mentor/cohorts');
    return res.data.data;
  },

  searchMentees: async (query: string): Promise<any[]> => {
    const res = await API.get('/faculty/mentor/search', { params: { q: query } });
    return res.data.data;
  },

  getGlobalMentorAnalytics: async (): Promise<GlobalMentorAnalyticsData> => {
    const res = await API.get('/faculty/mentor/analytics');
    return res.data.data;
  },

  getMyMentees: async (params?: {
    search?: string;
    admissionBatch?: string;
    semester?: number | string;
    section?: string;
    attendanceStatus?: string;
    sortBy?: string;
    sortOrder?: string;
    academicYear?: string;
  }): Promise<MenteeListItem[]> => {
    const res = await API.get('/faculty/mentor/mentees', { params });
    return res.data.data;
  },

  getMenteeProfile: async (studentId: string): Promise<MenteeProfileData> => {
    const res = await API.get(`/faculty/mentor/mentees/${studentId}`);
    return res.data.data;
  },

  getMenteeAcademics: async (studentId: string): Promise<MenteeAcademicPerformanceData> => {
    const res = await API.get(`/faculty/mentor/mentees/${studentId}/academics`);
    return res.data.data;
  },

  getMenteeAttendance: async (studentId: string, semester?: number | string): Promise<MenteeAttendanceDetailsData> => {
    const res = await API.get(`/faculty/mentor/mentees/${studentId}/attendance`, { params: { semester } });
    return res.data.data;
  },

  getMenteeAnalytics: async (studentId: string): Promise<MenteeAnalyticsData> => {
    const res = await API.get(`/faculty/mentor/mentees/${studentId}/analytics`);
    return res.data.data;
  },

  getMenteeRecords: async (studentId: string): Promise<MentoringRecordItem[]> => {
    const res = await API.get(`/faculty/mentor/mentees/${studentId}/records`);
    return res.data.data;
  },

  parseParentImport: async (file: File): Promise<ParentImportPreviewData> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await API.post('/faculty/mentor/personal-info/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  confirmParentImport: async (rows: any[]): Promise<{ updatedCount: number }> => {
    const res = await API.post('/faculty/mentor/personal-info/import', { rows });
    return res.data;
  },

  createMentoringRecord: async (data: {
    studentId: string;
    meetingDate?: string;
    meetingType?: string;
    concernCategory?: string;
    summary: string;
    actionPlan?: string;
    followUpDate?: string;
    followUpStatus?: string;
  }) => {
    const res = await API.post('/faculty/mentor/records', data);
    return res.data;
  },

  updateFollowUpStatus: async (
    recordId: string,
    data: {
      followUpStatus: string;
      resolutionNotes?: string;
    }
  ) => {
    const res = await API.patch(`/faculty/mentor/records/${recordId}/status`, data);
    return res.data;
  },

  getMentorStatus: async (academicYear?: string): Promise<{ isMentor: boolean; activeMenteeCount: number; academicYear: string }> => {
    const res = await API.get('/faculty/mentor/status', { params: { academicYear } });
    return res.data.data;
  },

  getUserWorkspaces: async (): Promise<{
    success: boolean;
    workspaces: Array<{
      type: string;
      label: string;
      route: string;
      menteeCount?: number;
    }>;
  }> => {
    const res = await API.get('/me/workspaces');
    return res.data;
  },
};

export default mentorService;
