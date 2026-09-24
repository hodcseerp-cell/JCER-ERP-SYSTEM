import API from './api';

export interface OnboardingContext {
  departments: Array<{ id: string; name: string; code: string }>;
  academicYears: string[];
  schemes: string[];
  semesters: number[];
  sections: string[];
}

export interface ValidatedStudentRow {
  rowIndex: number;
  status: 'VALID' | 'WARNING' | 'ERROR';
  errors: string[];
  warnings: string[];
  data: {
    usn: string | null;
    name: string;
    enrollmentNumber: string | null;
    departmentId: string | null;
    departmentCode: string;
    departmentName: string;
    scheme: string;
    entrySemester: number;
    currentSemester: number;
    section: string | null;
    rollNumber: string | null;
    academicYear: string;
    admissionType: string;
    dateOfBirth: string | null;
    gender: string | null;
    studentMobile: string | null;
    studentEmail: string;
    parentName: string | null;
    parentMobile: string | null;
    parentEmail: string | null;
    address: string | null;
    previousCollege: string | null;
  };
}

export interface ValidationResponse {
  totalRecords: number;
  validRecords: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  canImport: boolean;
  rows: ValidatedStudentRow[];
}

export interface OnboardingBatchRecord {
  id: string;
  fileName: string;
  academicYear: string;
  scheme: string;
  semester: number;
  departmentCode: string;
  section: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  createdAt: string;
  errors?: any;
  operator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

export const existingStudentOnboardingService = {
  // Fetch academic context options
  getContext: async (): Promise<OnboardingContext> => {
    const res = await API.get('/admin/onboarding/existing-students/context');
    return res.data.data;
  },

  // Download Excel template
  downloadTemplate: async (): Promise<void> => {
    const response = await API.get('/admin/onboarding/existing-students/template', {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Existing_Student_Onboarding_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Validate uploaded file
  validateFile: async (
    file: File,
    context: {
      academicYear: string;
      scheme: string;
      semester: number;
      departmentCode: string;
      section: string;
    }
  ): Promise<ValidationResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('academicYear', context.academicYear);
    formData.append('scheme', context.scheme);
    formData.append('semester', context.semester.toString());
    formData.append('departmentCode', context.departmentCode);
    formData.append('section', context.section);

    const res = await API.post('/admin/onboarding/existing-students/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  // Commit import of validated students
  importStudents: async (payload: {
    fileName: string;
    academicYear: string;
    scheme: string;
    semester: number;
    departmentCode: string;
    section: string;
    records: any[];
  }): Promise<{ batchId: string; totalImported: number; failedCount: number }> => {
    const res = await API.post('/admin/onboarding/existing-students/import', payload);
    return res.data.data;
  },

  // Fetch onboarding batch history
  getHistory: async (page = 1, limit = 10): Promise<{
    batches: OnboardingBatchRecord[];
    pagination: { total: number; page: number; totalPages: number; limit: number };
  }> => {
    const res = await API.get('/admin/onboarding/existing-students/history', {
      params: { page, limit },
    });
    return res.data.data;
  },
};

export default existingStudentOnboardingService;
