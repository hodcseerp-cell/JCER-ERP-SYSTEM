import API from './api';

export interface DeanDashboardData {
  academicYear: string;
  stats: {
    departments: number;
    activeHods: number;
    totalFaculty: number;
    pendingRequests: number;
  };
  departmentOverview: Array<{
    id: string;
    name: string;
    code: string;
    hodName: string;
    hodEmail: string | null;
    hodImage: string | null;
    facultyCount: number;
    studentCount: number;
    status: string;
  }>;
  pendingRequests: Array<{
    id: string;
    facultyName: string;
    email: string;
    department: string;
    departmentCode: string;
    subject: string;
    subjectCode: string;
    semester: number;
    section: string;
    academicYear: string;
    designation: string;
    createdBy: string;
    requestedDate: string;
    status: string;
  }>;
}

export interface AcademicYearRecord {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'ARCHIVED';
  isCurrent: boolean;
  createdAt?: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  hod?: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  } | null;
  facultyCount: number;
  studentCount: number;
  subjectCount: number;
  status: string;
  createdAt: string;
}

export interface SemesterRecord {
  id: string;
  semesterNumber: number;
  semesterName: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

export interface SectionRecord {
  id: string;
  departmentId: string;
  department?: { name: string; code: string };
  semester: number;
  academicYear: string;
  name: string;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  semester: number;
  departmentId: string | null;
  department?: { name: string; code: string };
  credits: number;
  type: 'Theory' | 'Practical' | 'Project' | 'Elective' | 'Seminar';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface HodRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  departmentId: string;
  departmentName?: string;
  departmentCode?: string;
  academicYear: string;
  tenureStartDate: string;
  appointmentOrderNo?: string;
  isActive: boolean;
  status: string;
  createdAt: string;
}

export interface FacultyRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  designation: string;
  status: string;
  subjects: string;
  academicYear: string;
  joiningDate: string;
  createdAt: string;
}

export interface FacultyAuthRequest {
  id: string;
  facultyId: string;
  facultyName: string;
  email: string;
  phone?: string;
  profileImage?: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  subjectId?: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  section: string;
  academicYear: string;
  designation: string;
  authority: 'DEAN' | 'PRINCIPAL';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdBy: string;
  createdDate: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

export interface FacultyAssignmentRecord {
  id: string;
  facultyName: string;
  email: string;
  profileImage?: string;
  departmentName: string;
  departmentCode: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  credits: number;
  semester: number;
  section: string;
  academicYear: string;
  status: string;
}

const deanService = {
  // Dashboard
  getDashboardData: async (): Promise<DeanDashboardData> => {
    const res = await API.get('/dean/dashboard');
    return res.data.data;
  },

  // Academic Years
  getAcademicYears: async (params?: { search?: string; status?: string }): Promise<AcademicYearRecord[]> => {
    const res = await API.get('/dean/academic-years', { params });
    return res.data.data;
  },
  createAcademicYear: async (data: Partial<AcademicYearRecord>): Promise<AcademicYearRecord> => {
    const res = await API.post('/dean/academic-years', data);
    return res.data.data;
  },
  updateAcademicYear: async (id: string, data: Partial<AcademicYearRecord>): Promise<AcademicYearRecord> => {
    const res = await API.put(`/dean/academic-years/${id}`, data);
    return res.data.data;
  },

  // Departments
  getDepartments: async (params?: { search?: string }): Promise<DepartmentRecord[]> => {
    const res = await API.get('/dean/departments', { params });
    return res.data.data;
  },
  createDepartment: async (data: { name: string; code: string }): Promise<DepartmentRecord> => {
    const res = await API.post('/dean/departments', data);
    return res.data.data;
  },
  updateDepartment: async (id: string, data: { name?: string; code?: string }): Promise<DepartmentRecord> => {
    const res = await API.put(`/dean/departments/${id}`, data);
    return res.data.data;
  },
  getDepartmentAcademicInfo: async (id: string): Promise<any> => {
    const res = await API.get(`/dean/departments/${id}/academic-info`);
    return res.data.data;
  },

  // Semesters
  getSemesters: async (params?: { academicYear?: string }): Promise<SemesterRecord[]> => {
    const res = await API.get('/dean/semesters', { params });
    return res.data.data;
  },
  createSemester: async (data: Partial<SemesterRecord>): Promise<SemesterRecord> => {
    const res = await API.post('/dean/semesters', data);
    return res.data.data;
  },
  updateSemester: async (id: string, data: Partial<SemesterRecord>): Promise<SemesterRecord> => {
    const res = await API.put(`/dean/semesters/${id}`, data);
    return res.data.data;
  },

  // Sections
  getSections: async (params?: { departmentId?: string; semester?: number; academicYear?: string }): Promise<SectionRecord[]> => {
    const res = await API.get('/dean/sections', { params });
    return res.data.data;
  },
  createSection: async (data: Partial<SectionRecord>): Promise<SectionRecord> => {
    const res = await API.post('/dean/sections', data);
    return res.data.data;
  },
  updateSection: async (id: string, data: Partial<SectionRecord>): Promise<SectionRecord> => {
    const res = await API.put(`/dean/sections/${id}`, data);
    return res.data.data;
  },

  // Subjects
  getSubjects: async (params?: { search?: string; departmentId?: string; semester?: number; type?: string }): Promise<SubjectRecord[]> => {
    const res = await API.get('/dean/subjects', { params });
    return res.data.data;
  },
  createSubject: async (data: Partial<SubjectRecord>): Promise<SubjectRecord> => {
    const res = await API.post('/dean/subjects', data);
    return res.data.data;
  },
  updateSubject: async (id: string, data: Partial<SubjectRecord>): Promise<SubjectRecord> => {
    const res = await API.put(`/dean/subjects/${id}`, data);
    return res.data.data;
  },

  // HODs
  getHods: async (params?: { search?: string; departmentId?: string; status?: string }): Promise<HodRecord[]> => {
    const res = await API.get('/dean/hods', { params });
    return res.data.data;
  },
  createHod: async (data: any): Promise<any> => {
    const res = await API.post('/dean/hods', data);
    return res.data;
  },
  getHodById: async (id: string): Promise<any> => {
    const res = await API.get(`/dean/hods/${id}`);
    return res.data.data;
  },
  assignHod: async (data: { hodUserId: string; departmentId: string; academicYear: string; startDate: string; endDate?: string }): Promise<any> => {
    const res = await API.post('/dean/hods/assign', data);
    return res.data;
  },
  getHodHistory: async (): Promise<any[]> => {
    const res = await API.get('/dean/hods/history');
    return res.data.data;
  },

  // Faculty Management & Authorizations
  getFacultyList: async (params?: { search?: string; departmentId?: string; status?: string }): Promise<FacultyRecord[]> => {
    const res = await API.get('/dean/faculty', { params });
    return res.data.data;
  },
  getFacultyAuthorizations: async (params?: { search?: string; departmentId?: string; status?: string; academicYear?: string }): Promise<FacultyAuthRequest[]> => {
    const res = await API.get('/dean/faculty/authorizations', { params });
    return res.data.data;
  },
  getFacultyAuthorizationById: async (id: string): Promise<any> => {
    const res = await API.get(`/dean/faculty/authorizations/${id}`);
    return res.data.data;
  },
  approveFacultyAuthorization: async (id: string): Promise<any> => {
    const res = await API.post(`/dean/faculty/authorizations/${id}/approve`);
    return res.data;
  },
  rejectFacultyAuthorization: async (id: string, reason: string): Promise<any> => {
    const res = await API.post(`/dean/faculty/authorizations/${id}/reject`, { reason });
    return res.data;
  },
  getFacultyAssignments: async (params?: { search?: string; departmentId?: string; semester?: number; academicYear?: string; status?: string }): Promise<FacultyAssignmentRecord[]> => {
    const res = await API.get('/dean/faculty/assignments', { params });
    return res.data.data;
  },
};

export default deanService;
