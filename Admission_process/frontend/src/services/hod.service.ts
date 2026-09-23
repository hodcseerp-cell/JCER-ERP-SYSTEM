import API from './api';

export interface HodDashboardStats {
  facultyCount: number;
  subjectsCount: number;
  sectionsCount: number;
  pendingAuthorizations: number;
}

export interface HodDashboardData {
  hod: {
    id?: string;
    userId?: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    tenureStartDate?: string;
    role?: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  academicYear: string;
  stats: HodDashboardStats;
  activities: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
  }>;
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

export const hodService = {
  getDashboardData: async (): Promise<HodDashboardData> => {
    const res = await API.get('/hod/dashboard');
    return res.data.data;
  },

  getDepartmentInfo: async (): Promise<HodDepartmentInfo> => {
    const res = await API.get('/hod/department');
    return res.data.data;
  },
};

export default hodService;
