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
  cycle?: string | null;
  schemeId?: string | null;
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
  completedToday?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
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
  stats: {
    totalAssignments: number;
    attendanceCoursesCount: number;
    marksCoursesCount: number;
  };
  assignments: FacultyAssignmentItem[];
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

export interface RecordedSessionItem {
  date: string;
  sessionPeriod: number;
  totalConducted: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
  absentStudents: Array<{ id: string; usn: string; studentName: string }>;
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
  metrics: {
    totalClassesConducted: number;
    totalStudents: number;
    overallAttendancePercentage: number;
    eligibleCount: number;
    shortageCount: number;
    threshold: number;
  };
  conductedDates: string[];
  recordedSessions?: RecordedSessionItem[];
  previousClass?: RecordedSessionItem | null;
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
  async getDashboard(academicYear?: string): Promise<FacultyDashboardData> {
    const params = new URLSearchParams();
    if (academicYear && academicYear !== 'ALL') params.append('academicYear', academicYear);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await axios.get(`${API_BASE_URL}/faculty/dashboard${qs}`, getAuthHeaders());
    return res.data.data;
  },

  /**
   * Fetches all active assignments for current faculty
   */
  async getAssignments(academicYear?: string): Promise<FacultyAssignmentItem[]> {
    const params = new URLSearchParams();
    if (academicYear && academicYear !== 'ALL') params.append('academicYear', academicYear);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await axios.get(`${API_BASE_URL}/faculty/assignments${qs}`, getAuthHeaders());
    return res.data.data || [];
  },

  /**
   * Fetches attendance-authorized courses
   */
  async getAttendanceCourses(semester?: string, academicYear?: string): Promise<FacultyAssignmentItem[]> {
    const params = new URLSearchParams();
    if (semester && semester !== 'ALL') params.append('semester', semester);
    if (academicYear && academicYear !== 'ALL') params.append('academicYear', academicYear);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await axios.get(`${API_BASE_URL}/faculty/attendance${queryString}`, getAuthHeaders());
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
   * Records or updates daily attendance for a course
   */
  async saveAttendance(
    assignmentId: string,
    payload: {
      date: string;
      sessionPeriod?: number;
      records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' }>;
    }
  ): Promise<FacultyAttendanceWorkspaceData> {
    const res = await axios.post(
      `${API_BASE_URL}/faculty/attendance/${assignmentId}`,
      payload,
      getAuthHeaders()
    );
    return res.data.data;
  },

  /**
   * Fetches continuous assessment / marks authorized courses
   */
  async getMarksCourses(semester?: string, academicYear?: string): Promise<FacultyAssignmentItem[]> {
    const params = new URLSearchParams();
    if (semester && semester !== 'ALL') params.append('semester', semester);
    if (academicYear && academicYear !== 'ALL') params.append('academicYear', academicYear);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await axios.get(`${API_BASE_URL}/faculty/bitwise-marks${qs}`, getAuthHeaders());
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
   * Saves student continuous assessment marks
   */
  async saveMarks(
    assignmentId: string,
    payload: {
      marks: Array<{
        studentId: string;
        ia1?: number;
        ia2?: number;
        assignment?: number;
      }>;
    }
  ): Promise<FacultyMarksWorkspaceData> {
    const res = await axios.post(
      `${API_BASE_URL}/faculty/bitwise-marks/${assignmentId}`,
      payload,
      getAuthHeaders()
    );
    return res.data.data;
  },

  /**
   * Fetches assignment-scoped analytics
   */
  async getAnalytics(academicYear?: string): Promise<FacultyAnalyticsData> {
    const params = new URLSearchParams();
    if (academicYear && academicYear !== 'ALL') params.append('academicYear', academicYear);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await axios.get(`${API_BASE_URL}/faculty/analytics${qs}`, getAuthHeaders());
    return res.data.data;
  },
};

export default facultyService;
