import axios from 'axios';

const API_BASE_URL = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

export interface FacultyAssignmentItem {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  credits: number;
  type: string;
  semester: number;
  section: string;
  normalizedSection: string;
  academicYear: string;
  departmentId: string;
  departmentCode: string;
  attendanceAccess: boolean;
  marksAccess: boolean;
  totalStudents: number;
  attendancePercentage: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  attendanceSheet: {
    connected: boolean;
    connectionId: string | null;
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    tabTitle: string | null;
    tabGid: string | null;
    deepLinkUrl: string | null;
    status: string;
  };
  marksSheet: {
    connected: boolean;
    connectionId: string | null;
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    tabTitle: string | null;
    tabGid: string | null;
    deepLinkUrl: string | null;
    status: string;
  };
}

export interface GoogleAccountStatus {
  connected: boolean;
  isConnected: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'NOT_CONNECTED';
  email: string | null;
  displayName: string | null;
  profilePicture: string | null;
  lastUsedAt?: string | null;
}

export interface FacultyDashboardData {
  profile: {
    user: any;
    teacher: any;
    departmentId: string | null;
    departmentCode: string;
    departmentName: string;
    designation: string;
  };
  googleAccount: GoogleAccountStatus;
  stats: {
    totalAssignments: number;
    attendanceCoursesCount: number;
    marksCoursesCount: number;
    pendingSyncsCount: number;
  };
  assignments: FacultyAssignmentItem[];
  recentSyncs: Array<{
    id: string;
    syncType: string;
    tabTitle: string;
    subjectCode: string;
    status: string;
    recordsProcessed: number;
    recordsCreated: number;
    errorCount: number;
    startedAt: string;
    completedAt: string;
  }>;
}

export interface StudentAttendanceRow {
  id: string;
  studentId: string;
  usn: string;
  enrollmentNumber: string;
  rollNumber: string;
  studentName: string;
  email: string;
  section: string;
  classesConducted: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendancePercentage: number;
  status: 'Eligible' | 'Shortage';
  sessions: { [date: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'UNRECORDED' };
}

export interface FacultyAttendanceWorkspaceData {
  assignment: {
    id: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    semester: number;
    section: string;
    academicYear: string;
    departmentCode: string;
  };
  googleSheet: {
    connected: boolean;
    connectionId: string | null;
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    tabTitle: string | null;
    tabGid: string | null;
    deepLinkUrl: string | null;
    accountEmail: string | null;
    googleConnected: boolean;
  };
  metrics: {
    totalClassesConducted: number;
    totalStudents: number;
    overallAttendancePercentage: number;
    eligibleCount: number;
    shortageCount: number;
    threshold: number;
  };
  conductedDates: string[];
  students: StudentAttendanceRow[];
}

export interface FacultyMarksWorkspaceData {
  assignment: {
    id: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    semester: number;
    section: string;
    academicYear: string;
    departmentCode: string;
  };
  googleSheet: {
    connected: boolean;
    connectionId: string | null;
    spreadsheetId: string | null;
    spreadsheetUrl: string | null;
    tabTitle: string | null;
    tabGid: string | null;
    deepLinkUrl: string | null;
    accountEmail: string | null;
  };
  evaluations: Array<{ name: string; maxMarks: number; weightage: string }>;
  students: Array<{
    id: string;
    usn: string;
    enrollmentNumber: string;
    studentName: string;
    ia1: number;
    ia2: number;
    assignment: number;
    totalCie: number;
  }>;
}

export interface GoogleSheetViewData {
  spreadsheetTitle: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetTitle: string;
  sheetId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  section: string;
  academicYear: string;
  departmentCode: string;
  googleAccountEmail: string | null;
  targetGoogleEmail?: string;
  googleConnected: boolean;
  accessStatus?:
    | 'EDITOR_VERIFIED'
    | 'PENDING_BROWSER_AUTH'
    | 'VIEWER_ACCESS'
    | 'ACCOUNT_MISMATCH'
    | 'ACCESS_PENDING'
    | 'ACCESS_REVOKED'
    | 'GOOGLE_NOT_CONNECTED'
    | 'VERIFICATION_FAILED';
  accessStatusLabel?: string;
  accessRole?: string;
  isEditable: boolean;
  deepLinkUrl: string;
  embedUrl?: string;
  grid?: string[][];
  columns: string[];
  rows: string[][];
  loadError?: string | null;
}

export interface FacultyAnalyticsData {
  assignedCount: number;
  subjectAttendanceStats: Array<{
    assignmentId: string;
    subjectName: string;
    subjectCode: string;
    semester: number;
    section: string;
    totalStudents: number;
    attendancePercentage: number;
    threshold: number;
  }>;
  defaulters: Array<{
    studentId: string;
    usn: string;
    studentName: string;
    subjectName: string;
    subjectCode: string;
    totalClasses: number;
    presentClasses: number;
    attendancePercentage: number;
  }>;
  defaultersCount: number;
  termStatus: string;
}

export const facultyService = {
  /**
   * Fetches full dashboard overview data
   */
  async getDashboard(): Promise<FacultyDashboardData> {
    const res = await axios.get(`${API_BASE_URL}/faculty/dashboard`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Fetches all active assignments for current faculty
   */
  async getAssignments(): Promise<FacultyAssignmentItem[]> {
    const res = await axios.get(`${API_BASE_URL}/faculty/assignments`, getAuthHeaders());
    return res.data.data || [];
  },

  /**
   * Fetches Google OAuth connection status
   */
  async getGoogleConnection(): Promise<GoogleAccountStatus> {
    const res = await axios.get(`${API_BASE_URL}/faculty/google-connection`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Fetches attendance-authorized courses
   */
  async getAttendanceCourses(semester?: string): Promise<FacultyAssignmentItem[]> {
    const query = semester && semester !== 'ALL' ? `?semester=${semester}` : '';
    const res = await axios.get(`${API_BASE_URL}/faculty/attendance${query}`, getAuthHeaders());
    return res.data.data || [];
  },

  /**
   * Fetches detailed attendance workspace for a single course
   */
  async getAttendanceWorkspace(assignmentId: string): Promise<FacultyAttendanceWorkspaceData> {
    const res = await axios.get(`${API_BASE_URL}/faculty/attendance/${assignmentId}`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Fetches Google Sheet viewer data for an attendance assignment
   */
  async getAttendanceSheetView(assignmentId: string): Promise<GoogleSheetViewData> {
    const res = await axios.get(`${API_BASE_URL}/faculty/attendance/${assignmentId}/sheet-view`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Fetches Google Sheet viewer data for a marks assignment
   */
  async getMarksSheetView(assignmentId: string): Promise<GoogleSheetViewData> {
    const res = await axios.get(`${API_BASE_URL}/faculty/bitwise-marks/${assignmentId}/sheet-view`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Triggers attendance sync from Google Sheet tab into ERP database
   */
  async syncAttendance(assignmentId: string, overrideValues?: string[][]): Promise<any> {
    const res = await axios.post(
      `${API_BASE_URL}/faculty/attendance/${assignmentId}/sync`,
      { overrideValues },
      getAuthHeaders()
    );
    return res.data;
  },

  /**
   * Fetches continuous assessment / marks authorized courses
   */
  async getMarksCourses(semester?: string): Promise<FacultyAssignmentItem[]> {
    const query = semester && semester !== 'ALL' ? `?semester=${semester}` : '';
    const res = await axios.get(`${API_BASE_URL}/faculty/bitwise-marks${query}`, getAuthHeaders());
    return res.data.data || [];
  },

  /**
   * Fetches continuous assessment / marks workspace
   */
  async getMarksWorkspace(assignmentId: string): Promise<FacultyMarksWorkspaceData> {
    const res = await axios.get(`${API_BASE_URL}/faculty/bitwise-marks/${assignmentId}`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Triggers continuous assessment / marks sync from Google Sheet tab
   */
  async syncMarks(assignmentId: string, assessmentName?: string, overrideValues?: string[][]): Promise<any> {
    const res = await axios.post(
      `${API_BASE_URL}/faculty/bitwise-marks/${assignmentId}/sync`,
      { assessmentName, overrideValues },
      getAuthHeaders()
    );
    return res.data;
  },

  /**
   * Fetches assignment-scoped analytics
   */
  async getAnalytics(): Promise<FacultyAnalyticsData> {
    const res = await axios.get(`${API_BASE_URL}/faculty/analytics`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Updates specific attendance cell values in the real Google Sheet
   */
  async updateAttendanceSheetCells(
    assignmentId: string,
    updates: Array<{
      cellAddress: string;
      value: string;
      oldValue?: string;
      studentUsn?: string;
      date?: string;
      row?: number;
      col?: number;
    }>
  ): Promise<any> {
    const res = await axios.patch(
      `${API_BASE_URL}/faculty/attendance/${assignmentId}/sheet-cells`,
      { updates },
      getAuthHeaders()
    );
    return res.data;
  },

  /**
   * Initiates Google OAuth consent flow for faculty
   */
  async getGoogleAuthUrl(): Promise<string> {
    const res = await axios.get(`${API_BASE_URL}/google/oauth/auth-url`, getAuthHeaders());
    return res.data.data?.authUrl || '';
  },

  /**
   * Disconnects faculty's connected Google account
   */
  async disconnectGoogleAccount(): Promise<any> {
    const res = await axios.post(`${API_BASE_URL}/google/oauth/disconnect`, {}, getAuthHeaders());
    return res.data;
  },
};

export default facultyService;
