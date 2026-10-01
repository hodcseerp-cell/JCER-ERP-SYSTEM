import API from './api';

export interface HodDashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalSubjects: number;
  activeSections: number;
  overallAttendance: number;
  averageMarks: number;
  attendanceDefaulters: number;
  pendingFacultyActions: number;
}

export interface PendingAuthorizationItem {
  id: string;
  facultyName: string;
  email: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  section: string;
  authority: 'DEAN' | 'PRINCIPAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface RecentAssignmentItem {
  id: string;
  facultyName: string;
  email: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  section: string;
  attendanceAccess: boolean;
  marksAccess: boolean;
}

export interface HodDashboardData {
  hod: {
    id?: string;
    userId?: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    role?: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  academicYear: string;
  stats: HodDashboardStats;
  pendingAuthorizationsList: PendingAuthorizationItem[];
  recentAssignments: RecentAssignmentItem[];
  attendanceAnalytics: {
    overallPercentage: number;
    semesterBreakdown: Array<{ semester: number; attendance: number }>;
    monthlyTrend: Array<{ month: string; percentage: number }>;
  };
  marksAnalytics: {
    averageMarks: number;
    passPercentage: number;
    failPercentage: number;
    highestMarks: number;
    lowestMarks: number;
    bitwiseSummary: Array<{ name: string; average: number; maxMarks: number }>;
  };
}

export interface HodDepartmentInfo {
  department: {
    id: string;
    name: string;
    code: string;
  };
  facultyList: Array<{
    id: string;
    userId: string;
    name: string;
    email: string;
    phone?: string;
    designation: string;
    joiningDate?: string;
    status: string;
  }>;
  subjectsList: Array<{
    id: string;
    code: string;
    name: string;
    semester: number;
    credits: number;
    type: string;
    status: string;
  }>;
}

export interface HodStudentItem {
  id: string;
  userId: string;
  usn: string | null;
  enrollmentNumber: string | null;
  applicationNumber?: string | null;
  name: string;
  email: string;
  phone: string;
  semester: number;
  section: string | null;
  batchYear: number;
  admissionStatus: string;
  admissionType: string;
  qualification?: string | null;
  gender?: string | null;
  category?: string | null;
  profileImage?: string;
  attendancePercentage: number | null;
  isDefaulter: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HodSectionItem {
  id: string;
  code?: string;
  name: string;
  semester: number;
  academicYear: string;
  capacity: number;
  maxCapacity?: number;
  classroom?: string | null;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  studentCount: number;
  availableCapacity: number;
  fillPercentage: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HodSectionStudentItem {
  id: string;
  userId: string;
  usn: string | null;
  enrollmentNumber: string | null;
  rollNumber: string | null;
  name: string;
  email: string;
  phone: string;
  semester: number;
  sectionId?: string | null;
  section?: {
    id: string;
    code: string;
    name: string;
  } | string | null;
  currentSectionCode?: string;
  currentSectionId?: string | null;
  currentSection?: string | null;
  admissionType: string;
  admissionStatus: string;
  gender?: string | null;
  category?: string | null;
  isAllocatedToThisSection?: boolean;
  isAllocatedToOtherSection?: boolean;
  isUnallocated?: boolean;
}

export interface HodSectionCohortData {
  section: HodSectionItem;
  siblingSections: Array<{ id: string; name: string; capacity: number; code?: string }>;
  stats: {
    totalStudents: number;
    allocatedStudents: number;
    unallocatedStudents: number;
    sectionCapacity: number;
    sectionAllocatedCount: number;
    remainingCapacity: number;
  };
  students: HodSectionStudentItem[];
}

export interface HodCohortStudentItem {
  id: string;
  index: number;
  usn: string | null;
  enrollmentNumber: string | null;
  applicationNumber: string | null;
  name: string;
  email: string | null;
  department: string;
  semester: number;
  section: string;
  rollNumber: string | null;
  academicYear: string;
  status: string;
  admissionType: string;
}

export interface HodGoogleSheetTabItem {
  id: string;
  sheetId: number;
  title: string;
  index: number;
  sheetType: string;
  subjectId: string | null;
  subjectCode: string | null;
  status: string;
  mappedSubject: {
    id: string;
    name: string;
    code: string;
    type?: string;
  } | null;
}

export interface HodGoogleSheetConnectionItem {
  id: string;
  sheetType: 'ATTENDANCE' | 'BITWISE_MARKS' | 'ACADEMIC_MARKS';
  section: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  accountEmail: string;
  status: string;
  connectedAt: string;
  lastSyncedAt?: string;
  connectedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  tabs: HodGoogleSheetTabItem[];
}

export interface HodSemesterCohortPayload {
  semester: number;
  department: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: string;
  summary: {
    totalStudents: number;
    activeStudents: number;
    sections: string;
    sectionsList: string[];
    sectionsBreakdown: Array<{ section: string; count: number }>;
  };
  students: HodCohortStudentItem[];
  googleSheets: {
    attendance: HodGoogleSheetConnectionItem | null;
    attendanceConnections?: HodGoogleSheetConnectionItem[];
    bitwiseMarks: HodGoogleSheetConnectionItem | null;
  };
  subjects: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    credits: number;
    semester: number;
  }>;
}

export interface HodFacultyItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  joiningDate?: string;
  accountStatus: string; // 'ACTIVE' | 'INACTIVE' | 'PENDING_AUTHORIZATION'
  authorizationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'N/A';
  authority: 'DEAN' | 'PRINCIPAL' | 'N/A';
  rejectionReason?: string | null;
  profileImage?: string;
  assignments: Array<{
    id: string;
    subjectId: string;
    subjectName?: string;
    subjectCode?: string;
    semester: number;
    section: string;
    attendanceAccess: boolean;
    marksAccess: boolean;
    status: string;
  }>;
}

export interface HodSubjectItem {
  id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  type: string;
  status: string;
  assignedFaculty: Array<{
    assignmentId: string;
    facultyName: string;
    semester: number;
    section: string;
    attendanceAccess: boolean;
    marksAccess: boolean;
  }>;
}

export interface HodDefaulterItem {
  id: string;
  name: string;
  usn: string;
  semester: number;
  section: string;
  totalSessions: number;
  presentSessions: number;
  attendancePercentage: number;
  deficit: number;
  parentPhone: string;
  parentEmail: string;
}

export interface HodPerformanceItem {
  id: string;
  name: string;
  usn: string;
  semester: number;
  section: string;
  attendancePercentage: number;
  averageMarks: number;
  passFail: 'PASS' | 'FAIL';
  bitwiseScores: {
    bit1: number;
    bit2: number;
    bit3: number;
    bit4: number;
    bit5: number;
  };
}

export interface HodSheetMatrixItem {
  assignmentId: string;
  facultyId: string;
  facultyName: string;
  facultyEmail: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  section: string;
  attendanceAccess: boolean;
  marksAccess: boolean;
  googleSheetsAccess?: boolean;
  status: string;
  spreadsheetUrl: string;
  lastSyncedAt: string;
}

export interface TeachingAssignmentInput {
  semester: number | string;
  subjectName: string;
  subjectCode: string;
  academicYear?: string;
  section?: string;
  permissions?: {
    attendance: boolean;
    marks: boolean;
    googleSheets: boolean;
  };
  attendanceAccess?: boolean;
  marksAccess?: boolean;
  googleSheetsAccess?: boolean;
}

export const hodService = {
  // 1. Dashboard
  getDashboardData: async (params?: {
    academicYear?: string;
    semester?: string | number;
    section?: string;
  }): Promise<HodDashboardData> => {
    const res = await API.get('/hod/dashboard', { params });
    return res.data.data;
  },

  getDepartmentInfo: async (): Promise<HodDepartmentInfo> => {
    const res = await API.get('/hod/department');
    return res.data.data;
  },

  // 2. Students
  getStudents: async (params?: {
    page?: number;
    limit?: number;
    semester?: string | number;
    section?: string;
    status?: string;
    admissionType?: string;
    qualification?: string;
    gender?: string;
    category?: string;
    district?: string;
    academicYear?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ students: HodStudentItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await API.get('/hod/students', { params });
    return res.data.data;
  },

  getStudentById: async (id: string): Promise<any> => {
    const res = await API.get(`/hod/students/${id}`);
    return res.data.data;
  },

  getStudentSemesters: async (): Promise<Array<{ semester: number; totalStudents: number; assignedSectionsCount: number }>> => {
    const res = await API.get('/hod/students/semesters');
    return res.data.data;
  },

  getStudentSections: async (semester?: number | string, academicYear?: string): Promise<HodSectionItem[]> => {
    try {
      const res = await API.get('/hod/students/sections', { params: { semester, academicYear } });
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.get('/hod/sections', { params: { semester, academicYear } });
        return fallback.data.data;
      }
      throw err;
    }
  },

  getSections: async (semester?: number | string, academicYear?: string): Promise<HodSectionItem[]> => {
    try {
      const res = await API.get('/hod/students/sections', { params: { semester, academicYear } });
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.get('/hod/sections', { params: { semester, academicYear } });
        return fallback.data.data;
      }
      throw err;
    }
  },

  getSectionById: async (sectionId: string): Promise<HodSectionItem> => {
    try {
      const res = await API.get(`/hod/students/sections/${sectionId}`);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.get(`/hod/sections/${sectionId}`);
        return fallback.data.data;
      }
      throw err;
    }
  },

  createSection: async (data: {
    name: string;
    semester: number;
    capacity: number;
    academicYear?: string;
    classroom?: string;
    description?: string;
  }): Promise<HodSectionItem> => {
    try {
      const res = await API.post('/hod/students/sections', data);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.post('/hod/sections', data);
        return fallback.data.data;
      }
      throw err;
    }
  },

  updateSection: async (
    sectionId: string,
    data: Partial<{ name: string; capacity: number; classroom: string; description: string; status: 'ACTIVE' | 'INACTIVE' }>
  ): Promise<HodSectionItem> => {
    try {
      const res = await API.put(`/hod/students/sections/${sectionId}`, data);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.put(`/hod/sections/${sectionId}`, data);
        return fallback.data.data;
      }
      throw err;
    }
  },

  deleteSection: async (sectionId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.delete(`/hod/students/sections/${sectionId}`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.delete(`/hod/sections/${sectionId}`);
        return fallback.data;
      }
      throw err;
    }
  },

  getSectionStudents: async (sectionId: string): Promise<{ section: HodSectionItem; students: HodSectionStudentItem[] }> => {
    try {
      const res = await API.get(`/hod/students/sections/${sectionId}/students`);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.get(`/hod/sections/${sectionId}/students`);
        return fallback.data.data;
      }
      throw err;
    }
  },

  getSectionCohort: async (sectionId: string): Promise<HodSectionCohortData> => {
    try {
      const res = await API.get(`/hod/students/sections/${sectionId}/cohort`);
      return res.data.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.get(`/hod/sections/${sectionId}/cohort`);
        return fallback.data.data;
      }
      throw err;
    }
  },

  bulkAllocateStudents: async (
    sectionId: string,
    studentAllocations: Array<{ studentId: string; rollNumber?: string }>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.post(`/hod/students/sections/${sectionId}/bulk-allocate`, { studentAllocations });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.post(`/hod/sections/${sectionId}/bulk-allocate`, { studentAllocations });
        return fallback.data;
      }
      throw err;
    }
  },

  allocateStudents: async (
    sectionId: string,
    studentIds: string[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.post(`/hod/students/sections/${sectionId}/allocate`, { studentIds });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.post(`/hod/sections/${sectionId}/allocate`, { studentIds });
        return fallback.data;
      }
      throw err;
    }
  },

  unallocateStudents: async (
    sectionId: string,
    studentIds: string[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.post(`/hod/students/sections/${sectionId}/unallocate`, { studentIds });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.post(`/hod/sections/${sectionId}/unallocate`, { studentIds });
        return fallback.data;
      }
      throw err;
    }
  },

  moveStudentSection: async (
    sectionId: string,
    studentId: string,
    targetSectionId: string,
    newRollNumber?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.patch(`/hod/students/sections/${sectionId}/students/${studentId}/move`, {
        targetSectionId,
        newRollNumber,
      });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.patch(`/hod/sections/${sectionId}/students/${studentId}/move`, {
          targetSectionId,
          newRollNumber,
        });
        return fallback.data;
      }
      throw err;
    }
  },

  removeStudentFromSection: async (sectionId: string, studentId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.delete(`/hod/students/sections/${sectionId}/students/${studentId}/remove`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.delete(`/hod/sections/${sectionId}/students/${studentId}/remove`);
        return fallback.data;
      }
      throw err;
    }
  },

  bulkDistributeStudents: async (
    distributions: Array<{ sectionId: string; studentIds: string[]; rollNumbers?: Record<string, string> }>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await API.post('/hod/students/sections/distribute', { distributions });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        const fallback = await API.post('/hod/sections/distribute', { distributions });
        return fallback.data;
      }
      throw err;
    }
  },

  // 3. Faculty
  getFacultyList: async (): Promise<HodFacultyItem[]> => {
    const res = await API.get('/hod/faculty');
    return res.data.data;
  },

  createFaculty: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    designation: string;
    joiningDate?: string;
    teachingAssignments?: TeachingAssignmentInput[];
    subjectName?: string;
    subjectCode?: string;
    subjectId?: string;
    semester?: number;
    section?: string;
    academicYear?: string;
    attendanceAccess?: boolean;
    marksAccess?: boolean;
    googleSheetsAccess?: boolean;
    authority: 'DEAN' | 'PRINCIPAL';
  }): Promise<any> => {
    const res = await API.post('/hod/faculty', data);
    return res.data;
  },

  getFacultyDetail: async (id: string): Promise<any> => {
    const res = await API.get(`/hod/faculty/${id}`);
    return res.data.data;
  },

  updateFacultyAssignment: async (id: string, data: any): Promise<any> => {
    const res = await API.put(`/hod/faculty/${id}/assignment`, data);
    return res.data;
  },

  toggleFacultyAccess: async (id: string, data: { attendanceAccess?: boolean; marksAccess?: boolean; googleSheetsAccess?: boolean }): Promise<any> => {
    const res = await API.patch(`/hod/faculty/${id}/access`, data);
    return res.data;
  },

  resetFacultyPassword: async (id: string): Promise<{ temporaryPassword: string }> => {
    const res = await API.post(`/hod/faculty/${id}/reset-password`);
    return res.data.data;
  },

  toggleFacultyStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<any> => {
    const res = await API.patch(`/hod/faculty/${id}/status`, { status });
    return res.data;
  },

  getFacultyAssignments: async (): Promise<any[]> => {
    const res = await API.get('/hod/faculty/assignments');
    return res.data.data;
  },

  // 4. Subjects
  getSubjects: async (params?: { semester?: string | number; academicYear?: string; status?: string }): Promise<HodSubjectItem[]> => {
    const res = await API.get('/hod/subjects', { params });
    return res.data.data;
  },

  createSubject: async (data: { code: string; name: string; semester: number; credits?: number; type?: string }): Promise<any> => {
    const res = await API.post('/hod/subjects', data);
    return res.data;
  },

  updateSubject: async (id: string, data: any): Promise<any> => {
    const res = await API.put(`/hod/subjects/${id}`, data);
    return res.data;
  },

  deleteSubject: async (id: string): Promise<any> => {
    const res = await API.delete(`/hod/subjects/${id}`);
    return res.data;
  },

  assignSubject: async (data: any): Promise<any> => {
    const res = await API.post('/hod/subjects/assign', data);
    return res.data;
  },

  // 5. Attendance
  getAttendanceOverview: async (params?: { semester?: string | number; section?: string }): Promise<any> => {
    const res = await API.get('/hod/attendance/overview', { params });
    return res.data.data;
  },

  getAttendanceDefaulters: async (params?: { semester?: string | number; section?: string }): Promise<HodDefaulterItem[]> => {
    const res = await API.get('/hod/attendance/defaulters', { params });
    return res.data.data;
  },

  getAttendanceSessions: async (): Promise<any[]> => {
    const res = await API.get('/hod/attendance/sessions');
    return res.data.data;
  },

  // 6. Academics
  getAcademicsOverview: async (): Promise<any> => {
    const res = await API.get('/hod/academics/overview');
    return res.data.data;
  },

  getBitwiseAnalysis: async (): Promise<any[]> => {
    const res = await API.get('/hod/academics/bitwise');
    return res.data.data;
  },

  getStudentPerformance: async (params?: { semester?: string | number; section?: string }): Promise<HodPerformanceItem[]> => {
    const res = await API.get('/hod/academics/performance', { params });
    return res.data.data;
  },

  // 7. Sheets & Google Integration
  getSheetAccessMatrix: async (): Promise<HodSheetMatrixItem[]> => {
    const res = await API.get('/hod/sheets/access');
    return res.data.data;
  },

  updateSheetAccess: async (assignmentId: string, data: { attendanceAccess?: boolean; marksAccess?: boolean; googleSheetsAccess?: boolean }): Promise<any> => {
    const res = await API.patch(`/hod/sheets/access/${assignmentId}`, data);
    return res.data;
  },

  getSheetSyncHistory: async (): Promise<any[]> => {
    const res = await API.get('/google-sheets/sync-history');
    return res.data.data;
  },

  // Dedicated Semester Cohort API
  getSemesterCohort: async (
    semester: number | string,
    params?: { academicYear?: string; search?: string }
  ): Promise<HodSemesterCohortPayload> => {
    const res = await API.get(`/hod/students/semesters/${semester}`, { params });
    return res.data.data;
  },

  // Semester-Scoped Google Sheet APIs
  getSemesterGoogleSheets: async (
    semester: number | string,
    academicYear?: string,
    section?: string
  ): Promise<{
    semester: number;
    academicYear: string;
    divisions?: Array<{ section: string; divisionName: string; isConnected: boolean; connection: any }>;
    attendance: any;
    marks: any;
    allConnections?: any[];
  }> => {
    const res = await API.get(`/hod/semesters/${semester}/google-sheets`, { params: { academicYear, section } });
    return res.data.data;
  },

  connectSemesterGoogleSheet: async (
    semester: number | string,
    data: {
      spreadsheetUrl: string;
      sheetType: 'ATTENDANCE' | 'ACADEMIC_MARKS' | 'BITWISE_MARKS';
      academicYear?: string;
      section?: string;
    }
  ): Promise<any> => {
    const res = await API.post(`/hod/semesters/${semester}/google-sheets/connect`, data);
    return res.data;
  },

  connectSemesterAttendanceSheetsBatch: async (
    semester: number | string,
    data: {
      connections: Array<{ section: string; spreadsheetUrl: string }>;
      academicYear?: string;
    }
  ): Promise<any> => {
    const res = await API.post(`/hod/semesters/${semester}/google-sheets/attendance/batch`, data);
    return res.data;
  },

  validateGoogleSpreadsheet: async (
    spreadsheetUrl: string,
    semester?: number | string
  ): Promise<any> => {
    const endpoint = semester ? `/hod/semesters/${semester}/google-sheets/validate` : `/hod/google-sheets/validate`;
    const res = await API.post(endpoint, { spreadsheetUrl });
    return res.data;
  },

  getSemesterGoogleSheetTabs: async (
    semester: number | string,
    params?: { sheetType?: string; academicYear?: string; section?: string }
  ): Promise<any> => {
    const res = await API.get(`/hod/semesters/${semester}/google-sheets/tabs`, { params });
    return res.data.data;
  },

  mapGoogleSheetTab: async (connectionId: string, data: { tabId: string; subjectId: string | null }): Promise<any> => {
    const res = await API.post(`/hod/google-sheets/${connectionId}/map-tab`, data);
    return res.data;
  },

  refreshGoogleSheet: async (connectionId: string): Promise<any> => {
    const res = await API.post(`/hod/google-sheets/${connectionId}/refresh`);
    return res.data;
  },

  disconnectGoogleSheet: async (connectionId: string): Promise<any> => {
    const res = await API.post(`/hod/google-sheets/${connectionId}/disconnect`);
    return res.data;
  },

  // Faculty Google Access Matrix & Permissions
  getFacultyGoogleSheetAccessMatrix: async (params?: {
    academicYear?: string;
    semester?: string | number;
    section?: string;
    facultyId?: string;
    subjectId?: string;
  }): Promise<any[]> => {
    const res = await API.get('/hod/faculty/google-sheet-access', { params });
    return res.data.data;
  },

  grantFacultyGoogleSheetAccess: async (
    facultyId: string,
    data: {
      assignmentId: string;
      googleEmail?: string;
      attendanceAccess?: boolean;
      marksAccess?: boolean;
      role?: 'writer' | 'reader';
    }
  ): Promise<any> => {
    const res = await API.post(`/hod/faculty/${facultyId}/google-sheet-access`, data);
    return res.data;
  },

  verifyFacultyGoogleSheetAccess: async (
    facultyId: string,
    data?: { accessId?: string; assignmentId?: string }
  ): Promise<any> => {
    const res = await API.post(`/hod/faculty/${facultyId}/google-sheet-access/verify`, data || {});
    return res.data;
  },

  revokeFacultyGoogleSheetAccess: async (
    facultyId: string,
    data: { assignmentId: string }
  ): Promise<any> => {
    const res = await API.post(`/hod/faculty/${facultyId}/google-sheet-access/revoke`, data);
    return res.data;
  },

  // Google OAuth Management
  getGoogleAccountStatus: async (): Promise<{
    connected: boolean;
    isConnected: boolean;
    email: string | null;
    displayName?: string | null;
    googleAccountId?: string | null;
    profilePicture?: string | null;
    status?: string;
    connectedAt?: string | null;
    lastConnectedAt?: string | null;
    lastUsedAt?: string | null;
  }> => {
    const res = await API.get('/google/account');
    return res.data.data;
  },

  getGoogleOAuthStatus: async (): Promise<{
    connected: boolean;
    isConnected: boolean;
    email: string | null;
    displayName?: string | null;
    googleAccountId?: string | null;
    profilePicture?: string | null;
    status?: string;
    connectedAt?: string | null;
    lastConnectedAt?: string | null;
    lastUsedAt?: string | null;
  }> => {
    const res = await API.get('/google/account');
    return res.data.data;
  },

  getGoogleOAuthAuthUrl: async (forceSelect: boolean = true): Promise<{ authUrl: string }> => {
    const res = await API.get('/google/oauth/auth-url', {
      params: { forceSelect },
    });
    return res.data.data;
  },

  submitGoogleOAuthCallback: async (data: { code: string; state?: string }): Promise<any> => {
    const res = await API.post('/google/oauth/callback', data);
    return res.data;
  },

  disconnectGoogleOAuth: async (): Promise<any> => {
    const res = await API.post('/google/oauth/disconnect');
    return res.data;
  },

  // Synchronization Endpoints
  syncAttendanceSheet: async (data: { connectionId: string; tabId?: string; tabGid?: string; tabTitle?: string }): Promise<any> => {
    const res = await API.post('/google-sheets/sync/attendance', data);
    return res.data;
  },

  syncMarksSheet: async (data: { connectionId: string; tabId?: string; tabGid?: string; tabTitle?: string; assessmentName?: string }): Promise<any> => {
    const res = await API.post('/google-sheets/sync/marks', data);
    return res.data;
  },

  getFacultyMySheets: async (): Promise<any[]> => {
    const res = await API.get('/faculty/my-sheets');
    return res.data.data;
  },

  // 8. Reports & Settings
  getReports: async (): Promise<any> => {
    const res = await API.get('/hod/reports');
    return res.data.data;
  },

  getSettings: async (): Promise<any> => {
    const res = await API.get('/hod/settings');
    return res.data.data;
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phone?: string }): Promise<any> => {
    const res = await API.put('/hod/settings/profile', data);
    return res.data;
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string }): Promise<any> => {
    const res = await API.put('/hod/settings/password', data);
    return res.data;
  },
};

export default hodService;
