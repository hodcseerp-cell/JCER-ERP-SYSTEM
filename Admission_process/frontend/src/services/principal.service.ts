import API from './api';

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  status?: string;
}

export interface AcademicYearRecord {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
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
  canApprove?: boolean;
}

export interface FacultyAssignmentDetail {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  credits: number;
  semester: number;
  section: string;
  academicYear: string;
  attendanceAccess: boolean;
  marksAccess: boolean;
  googleSheetsAccess: boolean;
  status: string;
}

export interface FacultyAuthDetailResponse extends Omit<FacultyAuthRequest, 'decidedBy'> {
  assignments: FacultyAssignmentDetail[];
  assignmentsData?: any[];
  faculty?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImage?: string;
    status: string;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
    credits?: number;
    type?: string;
  };
  createdByHOD?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  decidedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const principalService = {
  // Faculty Authorization Requests
  getFacultyAuthorizations: async (params?: {
    search?: string;
    departmentId?: string;
    status?: string;
    academicYear?: string;
    authority?: string;
  }): Promise<FacultyAuthRequest[]> => {
    const res = await API.get('/principal/faculty/authorizations', { params });
    return res.data.data;
  },

  getFacultyAuthorizationById: async (id: string): Promise<FacultyAuthDetailResponse> => {
    const res = await API.get(`/principal/faculty/authorizations/${id}`);
    return res.data.data;
  },

  getFacultyAuthorizationNotificationCount: async (): Promise<{
    count: number;
    principalPendingCount?: number;
    totalPendingCount?: number;
  }> => {
    const res = await API.get('/principal/faculty/authorizations/count');
    return res.data;
  },

  approveFacultyAuthorization: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await API.post(`/principal/faculty/authorizations/${id}/approve`);
    return res.data;
  },

  rejectFacultyAuthorization: async (id: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const res = await API.post(`/principal/faculty/authorizations/${id}/reject`, { reason });
    return res.data;
  },

  // Supporting filter options
  getDepartments: async (): Promise<DepartmentRecord[]> => {
    const res = await API.get('/principal/departments');
    return res.data.data;
  },

  getAcademicYears: async (): Promise<AcademicYearRecord[]> => {
    const res = await API.get('/principal/academic-years');
    return res.data.data;
  },
};

export default principalService;
