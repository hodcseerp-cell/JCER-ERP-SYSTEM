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
  usn: string;
  enrollmentNumber: string;
  name: string;
  email: string;
  phone: string;
  semester: number;
  section: string;
  batchYear: number;
  admissionStatus: string;
  admissionType: string;
  profileImage?: string;
  attendancePercentage: number;
  isDefaulter: boolean;
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
    search?: string;
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

  getStudentSections: async (): Promise<Array<{ id: string; name: string; semester: number; academicYear: string; maxCapacity: number; studentCount: number }>> => {
    const res = await API.get('/hod/students/sections');
    return res.data.data;
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
      sheetType: 'ATTENDANCE' | 'ACADEMIC_MARKS';
      academicYear?: string;
      section?: string;
    }
  ): Promise<any> => {
    const res = await API.post(`/hod/semesters/${semester}/google-sheets/connect`, data);
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
