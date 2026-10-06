import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import Student from '../models/Student';
import User from '../models/User';
import Department from '../models/Department';
import Teacher from '../models/Teacher';
import Section from '../models/Section';
import MentorAssignment from '../models/MentorAssignment';
import MentoringRecord, { MentoringMeetingType, MentoringConcernCategory, MentoringFollowUpStatus } from '../models/MentoringRecord';
import AttendanceRecord from '../models/AttendanceRecord';
import AttendanceSession from '../models/AttendanceSession';
import MentorTransition from '../models/MentorTransition';
import Notification from '../models/Notification';
import Subject from '../models/Subject';
import FinalInternalMarks from '../models/FinalInternalMarks';
import ExternalExaminationMarks from '../models/ExternalExaminationMarks';
import StudentAssessmentSummary from '../models/StudentAssessmentSummary';
import AssessmentConfiguration from '../models/AssessmentConfiguration';
import AuditLog from '../models/AuditLog';
import { HttpException } from '../utils/error.util';
import { normalizeAcademicYear } from '../utils/academicYear.util';
import logger from '../utils/logger.util';
import * as XLSX from 'xlsx';

export const ATTENDANCE_THRESHOLD = 85.0;

export const getMentorshipPhase = (semester: number): 'PHASE_1' | 'PHASE_2' => {
  return Number(semester) <= 2 ? 'PHASE_1' : 'PHASE_2';
};

export const getStudentAdmissionBatch = (student: any): string => {
  if (student?.admissionBatch && String(student.admissionBatch).trim()) {
    return String(student.admissionBatch).trim();
  }
  if (student?.batchYear) {
    const y = Number(student.batchYear);
    return `${y}-${(y + 1).toString().slice(-2)}`;
  }
  if (student?.currentAcademicYear) {
    const parts = String(student.currentAcademicYear).split(/[-–]/);
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].slice(-2)}`;
    }
  }
  return '2026-27';
};

export const getUserFullName = (u: any): string => {
  if (!u) return '—';
  if (u.name) return u.name;
  if (u.firstName || u.lastName) return `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return u.username || u.email || '—';
};

const USER_BASIC_ATTRIBUTES = ['id', 'firstName', 'lastName', 'email', 'phone', 'profileImage'];

export interface HodScopeContext {
  userId: string;
  departmentId: string;
  department?: any;
  isSemesterHandling: boolean;
  handlingSemesters: number[] | null;
  role?: string;
}

export class MentorService {
  /**
   * Helper to validate HOD semester access
   */
  public static getAuthorizedSemesters(context: HodScopeContext): number[] {
    if (context.isSemesterHandling) {
      return context.handlingSemesters && context.handlingSemesters.length > 0
        ? context.handlingSemesters
        : [1, 2];
    }
    // Standard Department HOD has authority for semesters 3 through 8
    return [3, 4, 5, 6, 7, 8];
  }

  /**
   * Helper to check whether a specific semester is authorized for this HOD
   */
  public static isSemesterAuthorized(context: HodScopeContext, semester: number): boolean {
    const authSems = this.getAuthorizedSemesters(context);
    return authSems.includes(Number(semester));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── HOD SERVICES ───────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * 1. HOD Mentor Overview
   */
  public static async getHodMentorOverview(context: HodScopeContext, academicYear: string = '2026-27') {
    const authorizedSemesters = this.getAuthorizedSemesters(context);

    const studentWhere: any = {
      semester: { [Op.in]: authorizedSemesters },
    };

    if (!context.isSemesterHandling) {
      studentWhere.departmentId = context.departmentId;
    }

    // 1. Total Students in authorized scope
    const students = await Student.findAll({
      where: studentWhere,
      attributes: ['id', 'semester', 'departmentId'],
    });

    const totalStudentsCount = students.length;
    const studentIds = students.map((s) => s.id);

    // 2. Active Mentor Assignments in scope
    const activeAssignments = studentIds.length > 0
      ? await MentorAssignment.findAll({
          where: {
            studentId: { [Op.in]: studentIds },
            status: 'ACTIVE',
            academicYear,
          },
          attributes: ['id', 'studentId', 'facultyId', 'semester', 'mentorDepartmentId', 'assignedAt'],
          include: [
            {
              model: User,
              as: 'faculty',
              attributes: USER_BASIC_ATTRIBUTES,
            },
            {
              model: Department,
              as: 'mentorDepartment',
              attributes: ['id', 'name', 'code'],
            },
          ],
        })
      : [];

    const assignedStudentIdSet = new Set(activeAssignments.map((a) => a.studentId));
    const assignedStudentsCount = assignedStudentIdSet.size;
    const unassignedStudentsCount = Math.max(0, totalStudentsCount - assignedStudentsCount);

    // 3. Active Eligible Faculty
    const activeFacultyCount = await Teacher.count({
      where: { status: 'ACTIVE' },
    });

    // 4. Semester-wise Allocation Progress
    const semesterProgress = authorizedSemesters.map((sem) => {
      const semStudents = students.filter((s) => s.semester === sem);
      const semTotal = semStudents.length;
      const semAssigned = semStudents.filter((s) => assignedStudentIdSet.has(s.id)).length;
      const semUnassigned = Math.max(0, semTotal - semAssigned);
      const progressPercent = semTotal > 0 ? Math.round((semAssigned / semTotal) * 100) : 0;

      return {
        semester: sem,
        semesterLabel: `Semester ${sem}`,
        totalStudents: semTotal,
        assignedStudents: semAssigned,
        unassignedStudents: semUnassigned,
        progress: progressPercent,
      };
    });

    // 5. Faculty-wise Mentee counts (workload)
    const facultyMenteeMap = new Map<string, { facultyId: string; facultyName: string; departmentCode: string; menteeCount: number }>();
    activeAssignments.forEach((assignment) => {
      const fId = assignment.facultyId;
      const fName = getUserFullName((assignment as any).faculty);
      const deptCode = (assignment as any).mentorDepartment?.code || '—';
      const existing = facultyMenteeMap.get(fId);
      if (existing) {
        existing.menteeCount += 1;
      } else {
        facultyMenteeMap.set(fId, {
          facultyId: fId,
          facultyName: fName,
          departmentCode: deptCode,
          menteeCount: 1,
        });
      }
    });

    const facultyWorkloadList = Array.from(facultyMenteeMap.values()).sort((a, b) => b.menteeCount - a.menteeCount);

    // 6. Recent Assignments
    const recentAssignments = await MentorAssignment.findAll({
      where: {
        academicYear,
        ...(studentIds.length > 0 ? { studentId: { [Op.in]: studentIds } } : {}),
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn', 'rollNumber', 'semester', 'section'],
          include: [{ model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES }],
        },
        {
          model: User,
          as: 'faculty',
          attributes: USER_BASIC_ATTRIBUTES,
        },
        {
          model: User,
          as: 'assignedByHod',
          attributes: USER_BASIC_ATTRIBUTES,
        },
        {
          model: Department,
          as: 'mentorDepartment',
          attributes: ['id', 'name', 'code'],
        },
      ],
    });

    // 7. Recent Unassigned Students preview
    const unassignedStudentList = students
      .filter((s) => !assignedStudentIdSet.has(s.id))
      .slice(0, 10);

    const unassignedStudentsDetailed = unassignedStudentList.length > 0
      ? await Student.findAll({
          where: { id: { [Op.in]: unassignedStudentList.map((s) => s.id) } },
          attributes: ['id', 'usn', 'rollNumber', 'semester', 'section'],
          include: [
            { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
          ],
        })
      : [];

    const pendingTransitionsCount = await MentorTransition.count({
      where: {
        ...(context.isSemesterHandling ? {} : { departmentId: context.departmentId }),
        status: 'PENDING',
      },
    });

    return {
      department: context.department,
      isSemesterHandling: context.isSemesterHandling,
      authorizedSemesters,
      academicYear,
      summary: {
        totalStudents: totalStudentsCount,
        assignedStudents: assignedStudentsCount,
        unassignedStudents: unassignedStudentsCount,
        activeMentors: activeFacultyCount,
        pendingTransitions: pendingTransitionsCount,
      },
      semesterProgress,
      facultyWorkloadList,
      recentAssignments: recentAssignments.map((ra: any) => ({
        id: ra.id,
        studentId: ra.studentId,
        semester: ra.semester,
        status: ra.status,
        student: {
          id: ra.student?.id,
          usn: ra.student?.usn,
          user: { name: getUserFullName(ra.student?.user) },
        },
        faculty: {
          id: ra.faculty?.id,
          name: getUserFullName(ra.faculty),
        },
        assignedByHod: {
          name: getUserFullName(ra.assignedByHod),
        },
        mentorDepartment: ra.mentorDepartment,
      })),
      unassignedStudentsDetailed: unassignedStudentsDetailed.map((st: any) => ({
        id: st.id,
        usn: st.usn,
        rollNumber: st.rollNumber,
        semester: st.semester,
        section: st.section,
        user: { name: getUserFullName(st.user) },
        department: st.department,
      })),
    };
  }

  /**
   * 2. Get Eligible Students for HOD Selection
   */
  public static async getEligibleStudents(
    context: HodScopeContext,
    filters: {
      academicYear?: string;
      semester?: number;
      section?: string;
      search?: string;
      status?: 'ALL' | 'UNASSIGNED' | 'ASSIGNED';
      page?: number;
      limit?: number;
    }
  ) {
    const authorizedSemesters = this.getAuthorizedSemesters(context);
    const academicYear = filters.academicYear || '2026-27';
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(200, Math.max(10, Number(filters.limit || 50)));
    const offset = (page - 1) * limit;

    // Filter semesters strictly by authorization
    let semFilter: any;
    if (filters.semester) {
      const reqSem = Number(filters.semester);
      if (!authorizedSemesters.includes(reqSem)) {
        throw new HttpException(`Semester ${reqSem} is outside your authorized allocation scope.`, 403, 'UNAUTHORIZED_SEMESTER');
      }
      semFilter = reqSem;
    } else {
      semFilter = { [Op.in]: authorizedSemesters };
    }

    const studentWhere: any = {
      semester: semFilter,
    };

    if (!context.isSemesterHandling) {
      studentWhere.departmentId = context.departmentId;
    }

    if (filters.section && filters.section !== 'ALL') {
      studentWhere.section = filters.section;
    }

    // If search term provided (search by USN or Name)
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      studentWhere[Op.or] = [
        { usn: { [Op.iLike]: `%${term}%` } },
        { rollNumber: { [Op.iLike]: `%${term}%` } },
        { '$user.firstName$': { [Op.iLike]: `%${term}%` } },
        { '$user.lastName$': { [Op.iLike]: `%${term}%` } },
      ];
    }

    // Fetch students
    const { count, rows: rawStudents } = await Student.findAndCountAll({
      where: studentWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: USER_BASIC_ATTRIBUTES,
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
        },
        {
          model: Section,
          as: 'sectionEntity',
          attributes: ['id', 'name'],
        },
      ],
      order: [
        ['semester', 'ASC'],
        ['section', 'ASC'],
        ['usn', 'ASC'],
      ],
      distinct: true,
    });

    const studentIds = rawStudents.map((s) => s.id);

    // Fetch active mentor assignments for these students
    const activeAssignments = studentIds.length > 0
      ? await MentorAssignment.findAll({
          where: {
            studentId: { [Op.in]: studentIds },
            status: 'ACTIVE',
            academicYear,
          },
          include: [
            {
              model: User,
              as: 'faculty',
              attributes: USER_BASIC_ATTRIBUTES,
            },
            {
              model: Department,
              as: 'mentorDepartment',
              attributes: ['id', 'name', 'code'],
            },
          ],
        })
      : [];

    const assignmentMap = new Map<string, any>();
    activeAssignments.forEach((a) => {
      assignmentMap.set(a.studentId, a);
    });

    // Transform and apply status filter
    const mapped = rawStudents.map((student) => {
      const assignment = assignmentMap.get(student.id);
      const isAssigned = Boolean(assignment);
      const studentUser = (student as any).user;

      return {
        id: student.id,
        usn: student.usn || '—',
        name: getUserFullName(studentUser),
        email: studentUser?.email || '—',
        phone: studentUser?.phone || '—',
        avatar: studentUser?.profileImage || null,
        department: (student as any).department?.name || '—',
        departmentCode: (student as any).department?.code || '—',
        departmentId: student.departmentId,
        semester: student.semester,
        section: student.section || '—',
        rollNumber: student.rollNumber || '—',
        isAssigned,
        currentMentor: isAssigned
          ? {
              assignmentId: assignment.id,
              facultyId: assignment.facultyId,
              facultyName: getUserFullName(assignment.faculty),
              facultyEmail: assignment.faculty?.email || '—',
              coreDepartment: assignment.mentorDepartment?.name || '—',
              coreDepartmentCode: assignment.mentorDepartment?.code || '—',
              assignedAt: assignment.assignedAt,
            }
          : null,
      };
    });

    let filtered = mapped;
    if (filters.status === 'UNASSIGNED') {
      filtered = mapped.filter((s) => !s.isAssigned);
    } else if (filters.status === 'ASSIGNED') {
      filtered = mapped.filter((s) => s.isAssigned);
    }

    const totalFiltered = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit),
      students: paginated,
      authorizedSemesters,
    };
  }

  /**
   * 3. Get Mentor Core Departments list
   */
  public static async getMentorCoreDepartments() {
    return await Department.findAll({
      attributes: ['id', 'name', 'code', 'type'],
      order: [['name', 'ASC']],
    });
  }

  /**
   * 4. Get Active Eligible Faculty for a Selected Core Department
   */
  public static async getEligibleFaculty(departmentId: string, search?: string, academicYear: string = '2026-27') {
    const dept = await Department.findByPk(departmentId);
    if (!dept) {
      throw new HttpException('Selected mentor core department not found.', 404, 'DEPARTMENT_NOT_FOUND');
    }

    const teacherWhere: any = {
      departmentId,
      status: 'ACTIVE',
    };

    const userWhere: any = search && search.trim()
      ? {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search.trim()}%` } },
            { lastName: { [Op.iLike]: `%${search.trim()}%` } },
          ],
        }
      : undefined;

    const teachers = await Teacher.findAll({
      where: teacherWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: USER_BASIC_ATTRIBUTES,
          where: userWhere,
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [[{ model: User, as: 'user' }, 'firstName', 'ASC']],
    });

    const userIds = teachers.map((t) => t.userId).filter(Boolean);

    // Calculate active mentee count for each faculty member
    const menteeCounts = userIds.length > 0
      ? await MentorAssignment.findAll({
          where: {
            facultyId: { [Op.in]: userIds },
            status: 'ACTIVE',
            academicYear,
          },
          attributes: ['facultyId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['facultyId'],
          raw: true,
        })
      : [];

    const countMap = new Map<string, number>();
    (menteeCounts as any[]).forEach((item) => {
      countMap.set(item.facultyId, parseInt(item.count, 10) || 0);
    });

    return teachers.map((teacher) => {
      const u = (teacher as any).user;
      return {
        teacherId: teacher.id,
        facultyId: teacher.userId,
        name: getUserFullName(u),
        email: u?.email || '—',
        phone: u?.phone || '—',
        avatar: u?.profileImage || null,
        designation: teacher.designation || 'Faculty',
        departmentId: teacher.departmentId,
        departmentName: (teacher as any).department?.name || dept.name,
        departmentCode: (teacher as any).department?.code || dept.code,
        currentMenteeCount: countMap.get(teacher.userId) || 0,
        status: teacher.status,
      };
    });
  }

  /**
   * 5. Bulk Assign Mentors (Transactional)
   */
  public static async bulkAssignMentors(
    context: HodScopeContext,
    data: {
      studentIds: string[];
      facultyId: string;
      mentorDepartmentId: string;
      academicYear?: string;
      semester?: number;
      notes?: string;
    }
  ) {
    if (!data.studentIds || !Array.isArray(data.studentIds) || data.studentIds.length === 0) {
      throw new HttpException('Please select at least one student for mentor allocation.', 400, 'NO_STUDENTS_SELECTED');
    }
    if (!data.facultyId) {
      throw new HttpException('Faculty member is required.', 400, 'FACULTY_REQUIRED');
    }
    if (!data.mentorDepartmentId) {
      throw new HttpException('Mentor core department is required.', 400, 'MENTOR_DEPARTMENT_REQUIRED');
    }

    const academicYear = data.academicYear || '2026-27';
    const authorizedSemesters = this.getAuthorizedSemesters(context);

    // Validate faculty and core department match
    const facultyUser = await User.findByPk(data.facultyId);
    if (!facultyUser) {
      throw new HttpException('Selected faculty user record does not exist.', 404, 'FACULTY_NOT_FOUND');
    }

    const teacher = await Teacher.findOne({
      where: {
        userId: data.facultyId,
        departmentId: data.mentorDepartmentId,
        status: 'ACTIVE',
      },
    });

    if (!teacher) {
      throw new HttpException(
        'Selected faculty member does not actively belong to the chosen mentor core department.',
        400,
        'FACULTY_DEPARTMENT_MISMATCH'
      );
    }

    // Validate students' authorization scope
    const students = await Student.findAll({
      where: { id: { [Op.in]: data.studentIds } },
      attributes: ['id', 'usn', 'departmentId', 'semester', 'batchYear', 'admissionBatch', 'currentAcademicYear'],
    });

    if (students.length !== data.studentIds.length) {
      throw new HttpException('Some selected students could not be found.', 404, 'STUDENT_NOT_FOUND');
    }

    for (const student of students) {
      if (!authorizedSemesters.includes(student.semester)) {
        throw new HttpException(
          `Student USN ${student.usn || student.id} in Semester ${student.semester} is outside your authorized allocation scope.`,
          403,
          'STUDENT_SCOPE_UNAUTHORIZED'
        );
      }
      if (!context.isSemesterHandling && student.departmentId !== context.departmentId) {
        throw new HttpException(
          `Student USN ${student.usn || student.id} does not belong to your department.`,
          403,
          'STUDENT_DEPARTMENT_UNAUTHORIZED'
        );
      }
    }

    // Transactional Bulk Allocation
    const result = await sequelize.transaction(async (t: Transaction) => {
      let newlyAssignedCount = 0;
      let reassignedCount = 0;

      for (const student of students) {
        const studentBatch = getStudentAdmissionBatch(student);
        const phase = getMentorshipPhase(student.semester);
        const startSem = student.semester;
        const endSem = phase === 'PHASE_1' ? 2 : 8;

        // Check if student already has active assignment
        const existingActive = await MentorAssignment.findOne({
          where: {
            studentId: student.id,
            status: 'ACTIVE',
          },
          transaction: t,
        });

        if (existingActive) {
          if (existingActive.facultyId === data.facultyId) {
            // Already assigned to this faculty, skip
            continue;
          }
          // Mark old assignment as REASSIGNED
          await existingActive.update(
            {
              status: 'REASSIGNED',
              reassignedAt: new Date(),
              reassignmentReason: data.notes || 'HOD Reassignment',
            },
            { transaction: t }
          );
          reassignedCount++;
        } else {
          newlyAssignedCount++;
        }

        // Create new active assignment
        await MentorAssignment.create(
          {
            studentId: student.id,
            facultyId: data.facultyId,
            assignedByHodId: context.userId,
            academicYear,
            semester: student.semester,
            phase,
            startSemester: startSem,
            endSemester: endSem,
            admissionBatch: studentBatch,
            departmentId: student.departmentId,
            mentorDepartmentId: data.mentorDepartmentId,
            status: 'ACTIVE',
            assignedAt: new Date(),
            notes: data.notes || null,
          },
          { transaction: t }
        );

        // Resolve any pending phase transitions for this student
        await MentorTransition.update(
          {
            status: 'RESOLVED',
            decision: 'ASSIGNED_NEW',
            newFacultyId: data.facultyId,
            resolvedByHodId: context.userId,
            resolvedAt: new Date(),
          },
          {
            where: {
              studentId: student.id,
              status: 'PENDING',
            },
            transaction: t,
          }
        );
      }

      // Log audit
      await AuditLog.create(
        {
          userId: context.userId,
          action: 'BULK_MENTOR_ASSIGNMENT',
          details: {
            facultyId: data.facultyId,
            mentorDepartmentId: data.mentorDepartmentId,
            studentCount: students.length,
            newlyAssignedCount,
            reassignedCount,
            academicYear,
          },
        },
        { transaction: t }
      );

      return {
        totalProcessed: students.length,
        newlyAssignedCount,
        reassignedCount,
      };
    });

    return result;
  }

  /**
   * 6. View Allocations List
   */
  public static async getAllocations(
    context: HodScopeContext,
    filters: {
      academicYear?: string;
      semester?: number;
      section?: string;
      mentorDepartmentId?: string;
      facultyId?: string;
      search?: string;
      status?: 'ACTIVE' | 'REASSIGNED' | 'ALL';
      page?: number;
      limit?: number;
    }
  ) {
    const authorizedSemesters = this.getAuthorizedSemesters(context);
    const academicYear = filters.academicYear || '2026-27';
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(200, Math.max(10, Number(filters.limit || 50)));
    const offset = (page - 1) * limit;

    const assignmentWhere: any = {
      academicYear,
    };

    if (filters.status && filters.status !== 'ALL') {
      assignmentWhere.status = filters.status;
    } else {
      assignmentWhere.status = 'ACTIVE';
    }

    if (filters.mentorDepartmentId && filters.mentorDepartmentId !== 'ALL') {
      assignmentWhere.mentorDepartmentId = filters.mentorDepartmentId;
    }

    if (filters.facultyId && filters.facultyId !== 'ALL') {
      assignmentWhere.facultyId = filters.facultyId;
    }

    // Semester filter
    if (filters.semester && filters.semester !== ('ALL' as any)) {
      const s = Number(filters.semester);
      if (!authorizedSemesters.includes(s)) {
        throw new HttpException(`Semester ${s} is outside your scope.`, 403, 'UNAUTHORIZED_SEMESTER');
      }
      assignmentWhere.semester = s;
    } else {
      assignmentWhere.semester = { [Op.in]: authorizedSemesters };
    }

    // Student scope filter
    const studentWhere: any = {};
    if (!context.isSemesterHandling) {
      studentWhere.departmentId = context.departmentId;
    }
    if (filters.section && filters.section !== 'ALL') {
      studentWhere.section = filters.section;
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      studentWhere[Op.or] = [
        { usn: { [Op.iLike]: `%${term}%` } },
        { '$student.user.firstName$': { [Op.iLike]: `%${term}%` } },
        { '$student.user.lastName$': { [Op.iLike]: `%${term}%` } },
      ];
    }

    const { count, rows: assignments } = await MentorAssignment.findAndCountAll({
      where: assignmentWhere,
      include: [
        {
          model: Student,
          as: 'student',
          where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
          attributes: ['id', 'usn', 'rollNumber', 'semester', 'section', 'departmentId'],
          include: [
            { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
            { model: Department, as: 'department', attributes: ['name', 'code'] },
          ],
        },
        {
          model: User,
          as: 'faculty',
          attributes: USER_BASIC_ATTRIBUTES,
        },
        {
          model: User,
          as: 'assignedByHod',
          attributes: USER_BASIC_ATTRIBUTES,
        },
        {
          model: Department,
          as: 'mentorDepartment',
          attributes: ['id', 'name', 'code'],
        },
      ],
      order: [['assignedAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const mapped = assignments.map((a) => {
      const s = a.student;
      const f = a.faculty;
      const hod = a.assignedByHod;
      const mDept = a.mentorDepartment;

      return {
        id: a.id,
        studentId: a.studentId,
        studentName: getUserFullName((s as any)?.user),
        usn: s?.usn || '—',
        semester: s?.semester || a.semester,
        section: s?.section || '—',
        department: (s as any)?.department?.name || '—',
        departmentCode: (s as any)?.department?.code || '—',
        facultyId: a.facultyId,
        mentorName: getUserFullName(f),
        mentorEmail: f?.email || '—',
        mentorDepartmentId: a.mentorDepartmentId,
        mentorDepartmentName: mDept?.name || '—',
        mentorDepartmentCode: mDept?.code || '—',
        assignedDate: a.assignedAt,
        reassignedDate: a.reassignedAt,
        assignedByName: getUserFullName(hod),
        status: a.status,
        notes: a.notes,
      };
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      allocations: mapped,
      authorizedSemesters,
    };
  }

  /**
   * 7. Reassign a Single Student
   */
  public static async reassignMentor(
    context: HodScopeContext,
    data: {
      assignmentId?: string;
      studentId: string;
      newFacultyId: string;
      mentorDepartmentId: string;
      academicYear?: string;
      notes?: string;
    }
  ) {
    return await this.bulkAssignMentors(context, {
      studentIds: [data.studentId],
      facultyId: data.newFacultyId,
      mentorDepartmentId: data.mentorDepartmentId,
      academicYear: data.academicYear || '2026-27',
      notes: data.notes,
    });
  }

  /**
   * 8. Allocation History for a Student
   */
  public static async getStudentAllocationHistory(studentId: string) {
    const history = await MentorAssignment.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'faculty', attributes: USER_BASIC_ATTRIBUTES },
        { model: User, as: 'assignedByHod', attributes: USER_BASIC_ATTRIBUTES },
        { model: Department, as: 'mentorDepartment', attributes: ['id', 'name', 'code'] },
      ],
    });

    return history.map((h: any) => ({
      id: h.id,
      studentId: h.studentId,
      status: h.status,
      assignedAt: h.assignedAt,
      reassignedAt: h.reassignedAt,
      notes: h.notes,
      faculty: {
        id: h.faculty?.id,
        name: getUserFullName(h.faculty),
        email: h.faculty?.email,
      },
      assignedByHod: {
        name: getUserFullName(h.assignedByHod),
      },
      mentorDepartment: h.mentorDepartment,
    }));
  }

  /**
   * 9. Handle Promotion Lifecycle (Promotion-Safe Mentorship)
   * Called during bulk student promotion.
   * - Sem 1 -> Sem 2: Phase 1 mentor continues automatically.
   * - Sem 2 -> Sem 3: Phase 1 closes (COMPLETED), Phase 2 transition requirement queued (PENDING), HOD notified.
   * - Sem 3 -> Sem 8: Phase 2 mentor continues automatically across promotion.
   */
  public static async handlePromotion(
    promotedStudents: Array<{
      id?: string;
      studentId?: string;
      fromSemester: number;
      toSemester: number;
      departmentId: string;
      admissionBatch?: string;
    }>,
    transaction?: Transaction
  ) {
    if (!promotedStudents || promotedStudents.length === 0) return;

    let sem3TransitionsCreated = 0;

    for (const item of promotedStudents) {
      const fromSem = Number(item.fromSemester);
      const toSem = Number(item.toSemester);
      const sId = item.id || (item as any).studentId;

      if (!sId) continue;

      if (fromSem === 1 && toSem === 2) {
        // Phase 1 continuity: active Phase 1 assignment continues automatically
        continue;
      }

      if (fromSem === 2 && toSem === 3) {
        // Sem 2 -> Sem 3 is the critical transition phase!
        // 1. Mark existing Phase 1 mentor assignment as COMPLETED
        const activePhase1 = await MentorAssignment.findOne({
          where: {
            studentId: sId,
            status: 'ACTIVE',
          },
          transaction,
        });

        if (activePhase1) {
          await activePhase1.update(
            {
              status: 'COMPLETED',
              endSemester: 2,
            },
            { transaction }
          );
        }

        // 2. Idempotently insert into mentor_transitions (prevent duplicate records on re-run)
        const existingTransition = await MentorTransition.findOne({
          where: {
            studentId: sId,
            toPhase: 'PHASE_2',
          },
          transaction,
        });

        if (!existingTransition) {
          await MentorTransition.create(
            {
              studentId: sId,
              departmentId: item.departmentId,
              admissionBatch: item.admissionBatch || '2026-27',
              fromPhase: 'PHASE_1',
              toPhase: 'PHASE_2',
              fromSemester: 2,
              toSemester: 3,
              previousFacultyId: activePhase1 ? activePhase1.facultyId : null,
              status: 'PENDING',
            },
            { transaction }
          );
          sem3TransitionsCreated++;
        }
      }
      // Sem 3 -> Sem 4...8: Phase 2 mentor continues automatically across promotions.
    }

    // Notify HOD if any students entered Sem 3 requiring mentor confirmation
    if (sem3TransitionsCreated > 0) {
      try {
        await Notification.create(
          {
            title: 'MENTOR REASSIGNMENT REQUIRED',
            content: `${sem3TransitionsCreated} student(s) have entered Semester 3 and require mentor confirmation for the Semester 3–8 mentoring phase.`,
            type: 'WARNING',
            audience: 'ALL',
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
          { transaction }
        );
      } catch (notifErr: any) {
        logger.warn('Failed to publish mentor transition notification:', notifErr.message);
      }
    }
  }

  /**
   * 10. Get Pending Mentor Transitions for HOD
   */
  public static async getPendingTransitions(
    context: HodScopeContext,
    filters: {
      admissionBatch?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(200, Math.max(10, Number(filters.limit || 50)));
    const offset = (page - 1) * limit;

    const whereClause: any = {
      status: 'PENDING',
    };
    if (!context.isSemesterHandling) {
      whereClause.departmentId = context.departmentId;
    }
    if (filters.admissionBatch && filters.admissionBatch !== 'ALL') {
      whereClause.admissionBatch = filters.admissionBatch;
    }

    const studentWhere: any = {};
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      studentWhere[Op.or] = [
        { usn: { [Op.iLike]: `%${term}%` } },
        { '$user.firstName$': { [Op.iLike]: `%${term}%` } },
        { '$user.lastName$': { [Op.iLike]: `%${term}%` } },
      ];
    }

    const { count, rows } = await MentorTransition.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
          include: [
            { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
          ],
        },
        {
          model: User,
          as: 'previousFaculty',
          attributes: USER_BASIC_ATTRIBUTES,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      transitions: rows.map((r: any) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: getUserFullName(r.student?.user),
        usn: r.student?.usn || '—',
        semester: r.toSemester,
        admissionBatch: r.admissionBatch,
        departmentCode: r.student?.department?.code || '—',
        previousFacultyId: r.previousFacultyId,
        previousMentorName: getUserFullName(r.previousFaculty),
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * 11. Resolve Mentor Transitions (Bulk or Single)
   */
  public static async resolveTransitions(
    context: HodScopeContext,
    payload: {
      transitions: Array<{
        transitionId: string;
        decision: 'CONTINUE' | 'ASSIGN_NEW';
        newFacultyId?: string;
        mentorDepartmentId?: string;
        notes?: string;
      }>;
      academicYear?: string;
    }
  ) {
    if (!payload.transitions || payload.transitions.length === 0) {
      throw new HttpException('No transitions provided to resolve.', 400, 'NO_TRANSITIONS');
    }

    const academicYear = payload.academicYear || '2026-27';

    const result = await sequelize.transaction(async (t: Transaction) => {
      let resolvedCount = 0;

      for (const item of payload.transitions) {
        const transition = await MentorTransition.findByPk(item.transitionId, { transaction: t });
        if (!transition || transition.status !== 'PENDING') {
          continue;
        }

        const student = await Student.findByPk(transition.studentId, { transaction: t });
        if (!student) continue;

        let targetFacultyId: string | null = null;
        let decisionType: 'CONTINUED_PREVIOUS' | 'ASSIGNED_NEW' = 'CONTINUED_PREVIOUS';

        if (item.decision === 'CONTINUE') {
          targetFacultyId = transition.previousFacultyId;
          decisionType = 'CONTINUED_PREVIOUS';
          if (!targetFacultyId) {
            throw new HttpException(
              `Student ${student.usn || student.id} has no previous mentor to continue. Please assign a new mentor.`,
              400,
              'NO_PREVIOUS_MENTOR'
            );
          }
        } else {
          targetFacultyId = item.newFacultyId || null;
          decisionType = 'ASSIGNED_NEW';
          if (!targetFacultyId) {
            throw new HttpException('New faculty member is required when assigning a new mentor.', 400, 'FACULTY_REQUIRED');
          }
        }

        const mentorDeptId = item.mentorDepartmentId || student.departmentId;

        // Create new active Phase 2 MentorAssignment (Sem 3 to Sem 8)
        await MentorAssignment.create(
          {
            studentId: student.id,
            facultyId: targetFacultyId,
            assignedByHodId: context.userId,
            academicYear,
            semester: student.semester || 3,
            phase: 'PHASE_2',
            startSemester: 3,
            endSemester: 8,
            admissionBatch: transition.admissionBatch,
            departmentId: student.departmentId,
            mentorDepartmentId: mentorDeptId,
            status: 'ACTIVE',
            assignedAt: new Date(),
            notes: item.notes || `Phase 2 transition resolved: ${decisionType}`,
          },
          { transaction: t }
        );

        // Update transition to RESOLVED
        await transition.update(
          {
            status: 'RESOLVED',
            decision: decisionType,
            newFacultyId: decisionType === 'ASSIGNED_NEW' ? targetFacultyId : null,
            resolvedByHodId: context.userId,
            resolvedAt: new Date(),
            notes: item.notes || null,
          },
          { transaction: t }
        );

        resolvedCount++;
      }

      return { resolvedCount };
    });

    return result;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── FACULTY MENTOR SERVICES ───────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Status check for faculty mentor capability (database-driven)
   * Mentorship follows batch, so active status determines capability.
   */
  public static async getMentorStatus(facultyId: string, academicYear?: string) {
    const activeMenteeCount = await MentorAssignment.count({
      where: {
        facultyId,
        status: 'ACTIVE',
      },
    });
    return {
      isMentor: activeMenteeCount > 0,
      activeMenteeCount,
      academicYear: academicYear || 'ALL',
    };
  }

  /**
   * 1. Faculty Mentor Dashboard Overview
   */
  public static async getMentorDashboardOverview(facultyId: string, academicYear: string = '2026-27') {
    const normalizedAY = normalizeAcademicYear(academicYear);
    // 1. Fetch active mentees
    const activeAssignments = await MentorAssignment.findAll({
      where: {
        facultyId,
        status: 'ACTIVE',
        [Op.or]: [
          { academicYear },
          { academicYear: normalizedAY },
          { academicYear: academicYear.replace('-20', '-') },
        ],
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn', 'rollNumber', 'semester', 'section', 'departmentId'],
          include: [
            { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
            { model: Department, as: 'department', attributes: ['name', 'code'] },
          ],
        },
      ],
    });

    const studentIds = activeAssignments.map((a) => a.studentId);
    const myMenteesCount = studentIds.length;

    if (myMenteesCount === 0) {
      return {
        myMenteesCount: 0,
        lowAttendanceCount: 0,
        followUpsCount: 0,
        attentionCount: 0,
        studentsRequiringAttention: [],
        recentActivity: [],
      };
    }

    // 2. Compute attendance for each student in their current semester
    const studentsRequiringAttention: any[] = [];
    let lowAttendanceCount = 0;
    const attentionStudentIdSet = new Set<string>();

    for (const assignment of activeAssignments) {
      const student = assignment.student;
      if (!student) continue;

      const sem = student.semester;
      const attSummary = await this.getStudentAttendanceSummary(student.id, sem);

      let isLowAttendance = false;
      if (attSummary.totalConducted > 0 && attSummary.attendancePercentage < ATTENDANCE_THRESHOLD) {
        isLowAttendance = true;
        lowAttendanceCount++;
        attentionStudentIdSet.add(student.id);
      }

      // Check open follow-ups
      const openFollowUps = await MentoringRecord.count({
        where: {
          studentId: student.id,
          followUpStatus: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      if (openFollowUps > 0) {
        attentionStudentIdSet.add(student.id);
      }

      if (isLowAttendance || openFollowUps > 0) {
        studentsRequiringAttention.push({
          studentId: student.id,
          usn: student.usn || '—',
          name: getUserFullName((student as any).user),
          avatar: (student as any).user?.profileImage || null,
          semester: student.semester,
          section: student.section || '—',
          departmentCode: (student as any).department?.code || '—',
          attendancePercentage: attSummary.totalConducted > 0 ? attSummary.attendancePercentage : null,
          hasLowAttendance: isLowAttendance,
          openFollowUps,
        });
      }
    }

    // 3. Overall open follow-ups for this mentor's mentees
    const followUpsCount = await MentoringRecord.count({
      where: {
        studentId: { [Op.in]: studentIds },
        followUpStatus: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    // 4. Recent Mentee Activity
    const recentRecords = await MentoringRecord.findAll({
      where: {
        studentId: { [Op.in]: studentIds },
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn'],
          include: [{ model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES }],
        },
        { model: User, as: 'creator', attributes: USER_BASIC_ATTRIBUTES },
      ],
    });

    return {
      myMenteesCount,
      lowAttendanceCount,
      followUpsCount,
      attentionCount: attentionStudentIdSet.size,
      studentsRequiringAttention,
      recentActivity: recentRecords.map((rec: any) => ({
        id: rec.id,
        studentId: rec.studentId,
        meetingDate: rec.meetingDate,
        summary: rec.summary,
        concernCategory: rec.concernCategory,
        followUpStatus: rec.followUpStatus,
        student: {
          id: rec.student?.id,
          usn: rec.student?.usn,
          user: { name: getUserFullName(rec.student?.user) },
        },
        creator: { name: getUserFullName(rec.creator) },
      })),
    };
  }

  /**
   * Helper to fetch distinct cohorts, semesters and sections for a mentor
   */
  public static async getMentorCohorts(facultyId: string) {
    const assignments = await MentorAssignment.findAll({
      where: {
        facultyId,
        status: 'ACTIVE',
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'semester', 'section', 'batchYear', 'admissionBatch', 'currentAcademicYear'],
        },
      ],
    });

    const batchesSet = new Set<string>();
    const semestersByBatch: Record<string, Set<number>> = {};
    const sectionsByBatch: Record<string, Set<string>> = {};

    for (const a of assignments) {
      const s = a.student;
      if (!s) continue;
      const batch = a.admissionBatch || getStudentAdmissionBatch(s);
      batchesSet.add(batch);

      if (!semestersByBatch[batch]) semestersByBatch[batch] = new Set<number>();
      if (!sectionsByBatch[batch]) sectionsByBatch[batch] = new Set<string>();

      semestersByBatch[batch].add(s.semester);
      if (s.section && s.section.trim()) {
        sectionsByBatch[batch].add(s.section.trim());
      }
    }

    const batches = Array.from(batchesSet).sort().reverse();
    const formattedSemesters: Record<string, number[]> = {};
    const formattedSections: Record<string, string[]> = {};

    batches.forEach((b) => {
      formattedSemesters[b] = Array.from(semestersByBatch[b] || []).sort((x, y) => x - y);
      formattedSections[b] = Array.from(sectionsByBatch[b] || []).sort();
    });

    const cohorts = batches.map((b) => {
      const sems = formattedSemesters[b] || [];
      const currentSem = sems.length > 0 ? sems[sems.length - 1] : 1;
      const count = assignments.filter((a) => (a.admissionBatch || getStudentAdmissionBatch(a.student)) === b).length;
      return {
        batch: b,
        admissionBatch: b,
        menteeCount: count,
        currentSemester: currentSem,
        semesters: sems,
        sections: formattedSections[b] || [],
      };
    });

    return {
      batches,
      semestersByBatch: formattedSemesters,
      sectionsByBatch: formattedSections,
      cohorts,
    };
  }

  /**
   * 2. My Mentees List (Batch First, Promotion-Safe)
   */
  public static async getMyMentees(
    facultyId: string,
    filters: {
      search?: string;
      admissionBatch?: string;
      semester?: number;
      section?: string;
      attendanceStatus?: 'ALL' | 'BELOW_85' | 'ABOVE_85' | 'NO_RECORDS';
      sortBy?: 'ATTENTION' | 'NAME' | 'USN' | 'ATTENDANCE';
      sortOrder?: 'ASC' | 'DESC';
      academicYear?: string;
    }
  ) {
    // Mentorship follows admission batch/cohort rather than static semester/AY
    const assignments = await MentorAssignment.findAll({
      where: {
        facultyId,
        status: 'ACTIVE',
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn', 'rollNumber', 'semester', 'section', 'departmentId', 'batchYear', 'admissionBatch', 'currentAcademicYear'],
          include: [
            { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
            { model: Department, as: 'department', attributes: ['name', 'code'] },
          ],
        },
      ],
    });

    const mentees: any[] = [];

    for (const assignment of assignments) {
      const s = assignment.student;
      if (!s) continue;

      const userName = getUserFullName((s as any).user);
      const usn = s.usn || '';

      // Search filter
      if (filters.search && filters.search.trim()) {
        const term = filters.search.trim().toLowerCase();
        if (!userName.toLowerCase().includes(term) && !usn.toLowerCase().includes(term)) {
          continue;
        }
      }

      // Semester filter
      if (filters.semester && Number(filters.semester) !== s.semester) {
        continue;
      }

      // Section filter
      if (filters.section && filters.section !== 'ALL' && s.section !== filters.section) {
        continue;
      }

      // Compute Attendance for current semester
      const attSummary = await this.getStudentAttendanceSummary(s.id, s.semester);

      // Attendance filter
      if (filters.attendanceStatus === 'BELOW_85') {
        if (attSummary.totalConducted === 0 || attSummary.attendancePercentage >= ATTENDANCE_THRESHOLD) continue;
      } else if (filters.attendanceStatus === 'ABOVE_85') {
        if (attSummary.totalConducted === 0 || attSummary.attendancePercentage < ATTENDANCE_THRESHOLD) continue;
      } else if (filters.attendanceStatus === 'NO_RECORDS') {
        if (attSummary.totalConducted > 0) continue;
      }

      // Open follow-up count & Last meeting
      const records = await MentoringRecord.findAll({
        where: { studentId: s.id },
        order: [['meetingDate', 'DESC']],
        attributes: ['id', 'meetingDate', 'followUpStatus'],
      });

      const openFollowUps = records.filter((r) => ['OPEN', 'IN_PROGRESS'].includes(r.followUpStatus)).length;
      const lastMeetingDate = records.length > 0 ? records[0].meetingDate : null;

      // Latest SGPA or CIE summary
      const latestResult = await this.getLatestAcademicSummary(s.id, s.semester);

      const requiresAttention =
        (attSummary.totalConducted > 0 && attSummary.attendancePercentage < ATTENDANCE_THRESHOLD) || openFollowUps > 0;

      mentees.push({
        id: s.id,
        usn: s.usn || '—',
        name: userName || '—',
        email: (s as any).user?.email || '—',
        phone: (s as any).user?.phone || '—',
        avatar: (s as any).user?.profileImage || null,
        department: (s as any).department?.name || '—',
        departmentCode: (s as any).department?.code || '—',
        semester: s.semester,
        section: s.section || '—',
        rollNumber: s.rollNumber || '—',
        attendance: {
          totalConducted: attSummary.totalConducted,
          totalAttended: attSummary.totalAttended,
          attendancePercentage: attSummary.totalConducted > 0 ? attSummary.attendancePercentage : null,
          status: attSummary.totalConducted === 0
            ? 'NO_RECORDS'
            : attSummary.attendancePercentage >= ATTENDANCE_THRESHOLD
            ? 'MEETS_THRESHOLD'
            : 'NEEDS_ATTENTION',
        },
        latestResult,
        openFollowUps,
        lastMeetingDate,
        requiresAttention,
        assignmentDate: assignment.assignedAt,
      });
    }

    // Apply Sorting
    const sortBy = filters.sortBy || 'ATTENTION';
    mentees.sort((a, b) => {
      if (sortBy === 'ATTENTION') {
        if (a.requiresAttention && !b.requiresAttention) return -1;
        if (!a.requiresAttention && b.requiresAttention) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'NAME') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortBy === 'USN') {
        return a.usn.localeCompare(b.usn);
      }
      if (sortBy === 'ATTENDANCE') {
        const attA = a.attendance.attendancePercentage ?? -1;
        const attB = b.attendance.attendancePercentage ?? -1;
        return attA - attB;
      }
      return 0;
    });

    return mentees;
  }

  /**
   * 3. Validate Mentor Authorization to access a specific student
   */
  public static async verifyMentorStudentAccess(facultyId: string, studentId: string, role?: string) {
    // Elevated administration permissions
    if (['ADMIN', 'SUPER_ADMIN', 'DEAN', 'PRINCIPAL', 'HOD'].includes(role || '')) {
      return true;
    }

    const assignment = await MentorAssignment.findOne({
      where: {
        facultyId,
        studentId,
        status: 'ACTIVE',
      },
    });

    if (!assignment) {
      throw new HttpException(
        'Access Denied. You are not assigned as an active mentor for this student.',
        403,
        'NOT_ASSIGNED_MENTOR'
      );
    }
    return true;
  }

  /**
   * 4. Unified Mentee Profile (Overview Tab)
   */
  public static async getMenteeProfile(studentId: string, facultyId: string, userRole?: string) {
    await this.verifyMentorStudentAccess(facultyId, studentId, userRole);

    const student = await Student.findByPk(studentId, {
      include: [
        { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
        { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: Section, as: 'sectionEntity', attributes: ['id', 'name'] },
      ],
    });

    if (!student) {
      throw new HttpException('Student record not found.', 404, 'STUDENT_NOT_FOUND');
    }

    // Active mentor assignment
    const activeAssignment = await MentorAssignment.findOne({
      where: { studentId, status: 'ACTIVE' },
      include: [
        { model: User, as: 'faculty', attributes: USER_BASIC_ATTRIBUTES },
        { model: Department, as: 'mentorDepartment', attributes: ['id', 'name', 'code'] },
      ],
    });

    // Current semester attendance
    const attendanceSummary = await this.getStudentAttendanceSummary(student.id, student.semester);

    // Latest Academic Result
    const latestResult = await this.getLatestAcademicSummary(student.id, student.semester);

    // Completed Semesters
    const completedSemesters = Math.max(0, student.semester - 1);

    // Open Follow-ups
    const openFollowUpsCount = await MentoringRecord.count({
      where: {
        studentId,
        followUpStatus: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    // Recent Mentoring Activity
    const recentMentoringRecords = await MentoringRecord.findAll({
      where: { studentId },
      order: [['meetingDate', 'DESC']],
      limit: 5,
      include: [{ model: User, as: 'faculty', attributes: USER_BASIC_ATTRIBUTES }],
    });

    // All Mentor Assignments for mentorship history
    const allAssignments = await MentorAssignment.findAll({
      where: { studentId },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'faculty', attributes: USER_BASIC_ATTRIBUTES },
        { model: Department, as: 'mentorDepartment', attributes: ['id', 'name', 'code'] },
      ],
    });

    const mentorshipHistory = allAssignments.map((a: any) => ({
      id: a.id,
      phase: a.phase === 'PHASE_1' ? 'Sem 1–2' : 'Sem 3–8',
      mentorName: getUserFullName(a.faculty),
      mentorEmail: a.faculty?.email || '—',
      period: `Sem ${a.startSemester || (a.phase === 'PHASE_1' ? 1 : 3)}–${a.endSemester || (a.phase === 'PHASE_1' ? 2 : 8)}`,
      academicYear: a.academicYear,
      status: a.status,
      assignedAt: a.assignedAt,
      reassignedAt: a.reassignedAt,
      reassignmentReason: a.reassignmentReason || (a.status === 'COMPLETED' ? 'Phase 1 Completed' : null),
    }));

    const admissionBatch = student.admissionBatch || getStudentAdmissionBatch(student);
    const mentorshipPhase = getMentorshipPhase(student.semester) === 'PHASE_1' ? 'Semester 1–2' : 'Semester 3–8';

    return {
      student: {
        id: student.id,
        usn: student.usn || '—',
        name: getUserFullName((student as any).user),
        email: (student as any).user?.email || '—',
        phone: (student as any).user?.phone || '—',
        avatar: (student as any).user?.profileImage || null,
        department: (student as any).department?.name || '—',
        departmentCode: (student as any).department?.code || '—',
        semester: student.semester,
        section: student.section || '—',
        rollNumber: student.rollNumber || '—',
        enrollmentNumber: student.enrollmentNumber || '—',
        academicYear: student.currentAcademicYear || '2026-27',
        admissionBatch,
        mentorshipPhase,
      },
      personalInfo: {
        name: getUserFullName((student as any).user),
        usn: student.usn || '—',
        enrollmentNumber: student.enrollmentNumber || '—',
        rollNumber: student.rollNumber || '—',
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '—',
        gender: student.gender || '—',
        department: (student as any).department?.name || '—',
        departmentCode: (student as any).department?.code || '—',
        admissionBatch,
        currentSemester: student.semester,
        section: student.section || '—',
        address: student.address || '—',
        parentName: student.fatherName || student.motherName || '—',
        fatherName: student.fatherName || '—',
        motherName: student.motherName || '—',
        parentPhone: student.parentPhone || '—',
        parentEmail: student.parentEmail || '—',
        emergencyContact: student.parentPhone || '—',
      },
      activeMentor: activeAssignment
        ? {
            facultyName: getUserFullName((activeAssignment as any).faculty),
            facultyEmail: (activeAssignment as any).faculty?.email || '—',
            coreDepartment: (activeAssignment as any).mentorDepartment?.name || '—',
            assignedAt: activeAssignment.assignedAt,
            phase: activeAssignment.phase === 'PHASE_1' ? 'Semester 1–2' : 'Semester 3–8',
          }
        : null,
      summaryCards: {
        attendance: attendanceSummary,
        latestResult,
        completedSemesters,
        openFollowUps: openFollowUpsCount,
        admissionBatch,
        mentorshipPhase,
      },
      mentorshipHistory,
      recentMentoringRecords: recentMentoringRecords.map((r: any) => ({
        id: r.id,
        meetingDate: r.meetingDate,
        meetingType: r.meetingType,
        concernCategory: r.concernCategory,
        summary: r.summary,
        actionPlan: r.actionPlan,
        followUpStatus: r.followUpStatus,
        facultyName: getUserFullName(r.faculty),
      })),
    };
  }

  /**
   * 5. Mentee Academic Performance (Academic Tab)
   */
  public static async getMenteeAcademicPerformance(studentId: string, facultyId: string, userRole?: string) {
    await this.verifyMentorStudentAccess(facultyId, studentId, userRole);

    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'semester', 'departmentId'],
    });
    if (!student) throw new HttpException('Student not found.', 404, 'STUDENT_NOT_FOUND');

    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
    const performanceBySemester: any[] = [];

    for (const sem of semesters) {
      // 1. Final Internal Marks
      const finalMarks = await FinalInternalMarks.findAll({
        where: { studentId, semester: sem },
        include: [{ model: Subject, as: 'subject', attributes: ['id', 'code', 'name', 'credits', 'type'] }],
      });

      // 2. External Exam Marks
      const externalMarks = await ExternalExaminationMarks.findAll({
        where: { studentId, semester: sem },
        include: [{ model: Subject, as: 'subject', attributes: ['id', 'code', 'name'] }],
      });

      const extMarksMap = new Map<string, number | null>();
      externalMarks.forEach((em) => {
        extMarksMap.set(em.subjectId, em.externalMarks);
      });

      const subjects = finalMarks.map((fm) => {
        const subj = (fm as any).subject;
        const ext = extMarksMap.get(fm.subjectId) ?? null;
        const total = (fm.finalInternalMarks !== null && ext !== null)
          ? Number(fm.finalInternalMarks) + Number(ext)
          : null;

        return {
          subjectId: fm.subjectId,
          subjectCode: subj?.code || '—',
          subjectName: subj?.name || '—',
          credits: subj?.credits || 3,
          cie1Marks: fm.cie1Marks,
          cie2Marks: fm.cie2Marks,
          cieAverage: fm.cieAverageOrPolicyResult,
          assignmentMarks: fm.assignmentScaledMarks ?? fm.assignmentRawMarks,
          finalInternalMarks: fm.finalInternalMarks,
          externalMarks: ext,
          totalMarks: total,
          status: fm.status,
        };
      });

      performanceBySemester.push({
        semester: sem,
        isCurrentSemester: sem === student.semester,
        isPastSemester: sem < student.semester,
        subjectsCount: subjects.length,
        subjects,
        hasRecords: subjects.length > 0,
      });
    }

    return {
      studentSemester: student.semester,
      performanceBySemester,
    };
  }

  /**
   * 6. Mentee Attendance Details (Attendance Tab)
   */
  public static async getMenteeAttendanceDetails(studentId: string, facultyId: string, semester?: number, userRole?: string) {
    await this.verifyMentorStudentAccess(facultyId, studentId, userRole);

    const student = await Student.findByPk(studentId, {
      attributes: ['id', 'semester', 'section'],
    });
    if (!student) throw new HttpException('Student not found.', 404, 'STUDENT_NOT_FOUND');

    const targetSemester = semester ? Number(semester) : student.semester;

    // Fetch all attendance records for this student and semester
    const records = await AttendanceRecord.findAll({
      where: {
        studentId,
        semester: targetSemester,
      },
      include: [
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'code', 'name'],
        },
      ],
      order: [['date', 'DESC']],
    });

    // Group by Subject
    const subjectAttendanceMap = new Map<string, {
      subjectId: string;
      subjectCode: string;
      subjectName: string;
      conducted: number;
      attended: number;
    }>();

    records.forEach((rec) => {
      const sId = rec.subjectId;
      const sCode = (rec as any).subject?.code || '—';
      const sName = (rec as any).subject?.name || 'Subject';

      let entry = subjectAttendanceMap.get(sId);
      if (!entry) {
        entry = {
          subjectId: sId,
          subjectCode: sCode,
          subjectName: sName,
          conducted: 0,
          attended: 0,
        };
        subjectAttendanceMap.set(sId, entry);
      }

      entry.conducted += 1;
      if (rec.status === 'PRESENT') {
        entry.attended += 1;
      }
    });

    let totalConductedAll = 0;
    let totalAttendedAll = 0;

    const subjectWise = Array.from(subjectAttendanceMap.values()).map((item) => {
      totalConductedAll += item.conducted;
      totalAttendedAll += item.attended;
      const percent = item.conducted > 0 ? Math.round((item.attended / item.conducted) * 1000) / 10 : 0;
      const eligibility = item.conducted === 0
        ? 'NO_RECORDS'
        : percent >= ATTENDANCE_THRESHOLD
        ? 'MEETS_THRESHOLD'
        : 'NEEDS_ATTENTION';

      return {
        subjectId: item.subjectId,
        subjectCode: item.subjectCode,
        subjectName: item.subjectName,
        conducted: item.conducted,
        attended: item.attended,
        attendancePercentage: percent,
        eligibility,
      };
    });

    const overallPercentage = totalConductedAll > 0
      ? Math.round((totalAttendedAll / totalConductedAll) * 1000) / 10
      : null;

    // ─── Daily Calendar Data ────────────────────────────────────────────────
    const dailyMap = new Map<string, {
      date: string;
      sessions: Array<{ subjectCode: string; subjectName: string; period: number; status: string }>;
      presentCount: number;
      absentCount: number;
      status: 'PRESENT' | 'ABSENT';
    }>();

    // ─── Monthly Breakdown Data ─────────────────────────────────────────────
    const monthlyMap = new Map<string, {
      monthKey: string;
      monthName: string;
      totalClasses: number;
      attended: number;
      absent: number;
      subjectWiseMap: Map<string, { subjectCode: string; subjectName: string; conducted: number; attended: number }>;
    }>();

    records.forEach((rec) => {
      const d = new Date(rec.date);
      const dateStr = d.toISOString().split('T')[0];
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const sCode = (rec as any).subject?.code || '—';
      const sName = (rec as any).subject?.name || 'Subject';

      // 1. Daily Calendar
      let dayEntry = dailyMap.get(dateStr);
      if (!dayEntry) {
        dayEntry = {
          date: dateStr,
          sessions: [],
          presentCount: 0,
          absentCount: 0,
          status: 'PRESENT',
        };
        dailyMap.set(dateStr, dayEntry);
      }
      dayEntry.sessions.push({
        subjectCode: sCode,
        subjectName: sName,
        period: rec.sessionPeriod || 1,
        status: rec.status,
      });
      if (rec.status === 'PRESENT') {
        dayEntry.presentCount += 1;
      } else {
        dayEntry.absentCount += 1;
        dayEntry.status = 'ABSENT'; // If absent in any session that day
      }

      // 2. Monthly Breakdown
      let mEntry = monthlyMap.get(monthKey);
      if (!mEntry) {
        mEntry = {
          monthKey,
          monthName,
          totalClasses: 0,
          attended: 0,
          absent: 0,
          subjectWiseMap: new Map(),
        };
        monthlyMap.set(monthKey, mEntry);
      }
      mEntry.totalClasses += 1;
      if (rec.status === 'PRESENT') {
        mEntry.attended += 1;
      } else {
        mEntry.absent += 1;
      }

      let mSubj = mEntry.subjectWiseMap.get(rec.subjectId);
      if (!mSubj) {
        mSubj = { subjectCode: sCode, subjectName: sName, conducted: 0, attended: 0 };
        mEntry.subjectWiseMap.set(rec.subjectId, mSubj);
      }
      mSubj.conducted += 1;
      if (rec.status === 'PRESENT') mSubj.attended += 1;
    });

    const calendarData: Record<string, any> = {};
    dailyMap.forEach((val, key) => {
      calendarData[key] = val;
    });

    const monthlyBreakdown = Array.from(monthlyMap.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((m) => {
        const pct = m.totalClasses > 0 ? Math.round((m.attended / m.totalClasses) * 1000) / 10 : 0;
        const subjectWise = Array.from(m.subjectWiseMap.values()).map((sw) => ({
          subjectCode: sw.subjectCode,
          subjectName: sw.subjectName,
          conducted: sw.conducted,
          attended: sw.attended,
          absent: sw.conducted - sw.attended,
          attendancePercentage: sw.conducted > 0 ? Math.round((sw.attended / sw.conducted) * 1000) / 10 : 0,
        }));
        return {
          monthKey: m.monthKey,
          monthName: m.monthName,
          totalClasses: m.totalClasses,
          attended: m.attended,
          absent: m.absent,
          attendancePercentage: pct,
          subjectWise,
        };
      });

    return {
      studentSemester: student.semester,
      selectedSemester: targetSemester,
      totalConducted: totalConductedAll,
      totalAttended: totalAttendedAll,
      overallPercentage,
      status: totalConductedAll === 0
        ? 'NO_RECORDS'
        : (overallPercentage ?? 0) >= ATTENDANCE_THRESHOLD
        ? 'MEETS_THRESHOLD'
        : 'NEEDS_ATTENTION',
      threshold: ATTENDANCE_THRESHOLD,
      subjectWise,
      calendarData,
      monthlyBreakdown,
    };
  }

  /**
   * 7. Mentoring Records & History (Mentoring Tab)
   */
  public static async getMentoringRecords(studentId: string, facultyId: string, userRole?: string) {
    await this.verifyMentorStudentAccess(facultyId, studentId, userRole);

    const records = await MentoringRecord.findAll({
      where: { studentId },
      order: [['meetingDate', 'DESC'], ['createdAt', 'DESC']],
      include: [
        { model: User, as: 'faculty', attributes: USER_BASIC_ATTRIBUTES },
        { model: User, as: 'creator', attributes: USER_BASIC_ATTRIBUTES },
      ],
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return records.map((rec) => {
      const isOverdue =
        Boolean(rec.followUpDate) &&
        ['OPEN', 'IN_PROGRESS'].includes(rec.followUpStatus) &&
        String(rec.followUpDate) < todayStr;

      return {
        id: rec.id,
        studentId: rec.studentId,
        facultyId: rec.facultyId,
        facultyName: getUserFullName((rec as any).faculty),
        meetingDate: rec.meetingDate,
        meetingType: rec.meetingType,
        concernCategory: rec.concernCategory,
        summary: rec.summary,
        actionPlan: rec.actionPlan,
        followUpDate: rec.followUpDate,
        followUpStatus: rec.followUpStatus,
        resolutionNotes: rec.resolutionNotes,
        resolvedAt: rec.resolvedAt,
        isOverdue,
        createdAt: rec.createdAt,
      };
    });
  }

  /**
   * 8. Create Mentoring Session Record
   */
  public static async createMentoringRecord(
    facultyId: string,
    data: {
      studentId: string;
      meetingDate?: string;
      meetingType?: MentoringMeetingType;
      concernCategory?: MentoringConcernCategory;
      summary: string;
      actionPlan?: string;
      followUpDate?: string;
      followUpStatus?: MentoringFollowUpStatus;
    },
    userRole?: string
  ) {
    await this.verifyMentorStudentAccess(facultyId, data.studentId, userRole);

    if (!data.summary || !data.summary.trim()) {
      throw new HttpException('Meeting summary is required.', 400, 'SUMMARY_REQUIRED');
    }

    const activeAssignment = await MentorAssignment.findOne({
      where: {
        studentId: data.studentId,
        status: 'ACTIVE',
      },
    });

    const record = await MentoringRecord.create({
      studentId: data.studentId,
      mentorAssignmentId: activeAssignment ? activeAssignment.id : null,
      facultyId,
      meetingDate: data.meetingDate ? new Date(data.meetingDate) : new Date(),
      meetingType: data.meetingType || 'IN_PERSON',
      concernCategory: data.concernCategory || 'GENERAL',
      summary: data.summary.trim(),
      actionPlan: data.actionPlan ? data.actionPlan.trim() : null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      followUpStatus: data.followUpStatus || (data.followUpDate ? 'OPEN' : 'NO_ACTION_REQUIRED'),
      createdBy: facultyId,
    });

    return record;
  }

  /**
   * 9. Update Mentoring Follow-up Status
   */
  public static async updateFollowUpStatus(
    facultyId: string,
    recordId: string,
    data: {
      followUpStatus: MentoringFollowUpStatus;
      resolutionNotes?: string;
    },
    userRole?: string
  ) {
    const record = await MentoringRecord.findByPk(recordId);
    if (!record) {
      throw new HttpException('Mentoring record not found.', 404, 'RECORD_NOT_FOUND');
    }

    await this.verifyMentorStudentAccess(facultyId, record.studentId, userRole);

    const isResolving = data.followUpStatus === 'RESOLVED';

    await record.update({
      followUpStatus: data.followUpStatus,
      resolutionNotes: data.resolutionNotes ? data.resolutionNotes.trim() : record.resolutionNotes,
      resolvedAt: isResolving ? new Date() : record.resolvedAt,
    });

    return record;
  }

  /**
   * 10. Individual Mentee Analytics (Analytics Tab in Profile)
   */
  public static async getMenteeAnalytics(studentId: string, facultyId: string, userRole?: string) {
    await this.verifyMentorStudentAccess(facultyId, studentId, userRole);
    const student = await Student.findByPk(studentId, {
      include: [
        { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
        { model: Department, as: 'department', attributes: ['name', 'code'] },
      ],
    });
    if (!student) throw new HttpException('Student not found.', 404, 'STUDENT_NOT_FOUND');

    const attDetails = await this.getMenteeAttendanceDetails(studentId, facultyId, student.semester, userRole);
    const acadDetails = await this.getMenteeAcademicPerformance(studentId, facultyId, userRole);

    // Calculate marks average for current semester
    const curSemAcad = acadDetails.performanceBySemester.find((p) => p.semester === student.semester);
    let avgScore = 0;
    if (curSemAcad && curSemAcad.subjects.length > 0) {
      const marks = curSemAcad.subjects
        .map((s: any) => s.finalInternalMarks)
        .filter((m: any) => m !== null && m !== undefined);
      if (marks.length > 0) {
        avgScore = Math.round((marks.reduce((a: number, b: number) => a + Number(b), 0) / marks.length) * 10) / 10;
      }
    }

    const lowAttSubjects = attDetails.subjectWise.filter((s: any) => s.eligibility === 'NEEDS_ATTENTION');
    const attPct = attDetails.overallPercentage ?? 100;

    let riskLevel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (attPct < ATTENDANCE_THRESHOLD || (avgScore > 0 && avgScore < 20)) {
      riskLevel = 'RED';
    } else if (attPct < 88 || (avgScore > 0 && avgScore < 25)) {
      riskLevel = 'YELLOW';
    }

    // Monthly attendance trend line
    const attendanceTrend = (attDetails.monthlyBreakdown || []).map((m: any) => ({
      month: m.monthName,
      monthKey: m.monthKey,
      percentage: m.attendancePercentage,
      conducted: m.totalClasses,
      attended: m.attended,
      missed: m.absent ?? (m.totalClasses - m.attended),
    }));

    // Monthly attendance grouped bars
    const monthlyAttendanceGrouped = (attDetails.monthlyBreakdown || []).map((m: any) => ({
      month: m.monthName,
      monthKey: m.monthKey,
      attended: m.attended,
      missed: m.absent ?? (m.totalClasses - m.attended),
      total: m.totalClasses,
      percentage: m.attendancePercentage,
    }));

    // Attended vs Missed donut chart
    const totalConducted = attDetails.totalConducted || 0;
    const totalAttended = attDetails.totalAttended || 0;
    const totalMissed = Math.max(0, totalConducted - totalAttended);
    const attendedVsMissedDonut = [
      { name: 'Attended', value: totalAttended, color: '#10b981' },
      { name: 'Missed', value: totalMissed, color: '#ef4444' },
    ];

    // Subject-wise attendance bars
    const subjectAttendanceBars = (attDetails.subjectWise || []).map((sw: any) => ({
      subjectCode: sw.subjectCode,
      subjectName: sw.subjectName,
      conducted: sw.conducted,
      attended: sw.attended,
      missed: sw.missed ?? (sw.conducted - sw.attended),
      attendancePercentage: sw.attendancePercentage,
    }));

    // Subject academic performance bars for current semester
    const subjectAcademicBars = (curSemAcad?.subjects || []).map((s: any) => ({
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      cie: s.finalInternalMarks !== null && s.finalInternalMarks !== undefined ? Number(s.finalInternalMarks) : 0,
      see: s.externalExamMarks !== null && s.externalExamMarks !== undefined ? Number(s.externalExamMarks) : null,
      total: s.totalMarks !== null && s.totalMarks !== undefined ? Number(s.totalMarks) : (s.finalInternalMarks ?? 0),
    }));

    // Academic trend across semesters
    const academicTrend = (acadDetails.performanceBySemester || [])
      .filter((p: any) => p.hasRecords)
      .map((p: any) => {
        const validMarks = p.subjects
          .map((s: any) => s.finalInternalMarks)
          .filter((m: any) => m !== null && m !== undefined);
        const avg = validMarks.length > 0
          ? Math.round((validMarks.reduce((a: number, b: number) => a + Number(b), 0) / validMarks.length) * 10) / 10
          : 0;
        return {
          semester: `Sem ${p.semester}`,
          averageMarks: avg,
        };
      });

    const riskLevelNormalized: 'LOW' | 'MEDIUM' | 'HIGH' =
      riskLevel === 'RED' ? 'HIGH' : riskLevel === 'YELLOW' ? 'MEDIUM' : 'LOW';

    const riskFactors: string[] = [
      attPct < ATTENDANCE_THRESHOLD ? `Overall attendance (${attPct}%) is below the ${ATTENDANCE_THRESHOLD}% institutional requirement.` : null,
      lowAttSubjects.length > 0 ? `${lowAttSubjects.length} subject(s) below the 85% attendance threshold.` : null,
      avgScore > 0 && avgScore < 20 ? `Internal CIE assessment average (${avgScore}/50) is below benchmark.` : null,
    ].filter(Boolean) as string[];

    return {
      studentId,
      studentName: getUserFullName((student as any).user),
      usn: student.usn || '—',
      semester: student.semester,
      riskLevel,
      riskLevelNormalized,
      riskFactors,
      summaryCards: {
        overallAttendance: attPct,
        academicAverage: avgScore,
        subjectsBelow85: lowAttSubjects.length,
        subjectsNeedingAttention: lowAttSubjects.length,
        totalConducted,
        totalAttended,
        totalMissed,
        riskLevel: riskLevelNormalized,
      },
      attendanceTrend,
      monthlyAttendanceGrouped,
      attendedVsMissedDonut,
      subjectAttendanceBars,
      subjectAcademicBars,
      academicTrend,
      lowAttendanceSubjects: lowAttSubjects,
      subjectPerformance: attDetails.subjectWise.map((sw: any) => ({
        subjectCode: sw.subjectCode,
        subjectName: sw.subjectName,
        attendancePercentage: sw.attendancePercentage,
        conducted: sw.conducted,
        attended: sw.attended,
      })),
    };
  }

  /**
   * 11. Global Mentor Group Analytics (Workspace Analytics Menu)
   */
  public static async getGlobalMentorAnalytics(facultyId: string) {
    const assignments = await MentorAssignment.findAll({
      where: {
        facultyId,
        status: 'ACTIVE',
      },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn', 'semester', 'section', 'departmentId'],
          include: [
            { model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES },
            { model: Department, as: 'department', attributes: ['name', 'code'] },
          ],
        },
      ],
    });

    const totalMentees = assignments.length;
    if (totalMentees === 0) {
      return {
        totalMentees: 0,
        averageAttendance: 0,
        studentsBelow85: 0,
        studentsAbove85: 0,
        averageAcademicScore: 0,
        studentsNeedingAttention: 0,
        studentsWithAcademicDecline: 0,
        attendanceDistribution: {
          range90To100: 0,
          range85To90: 0,
          range75To85: 0,
          rangeBelow75: 0,
        },
        monthlyAttendanceTrend: [],
        lowAttendanceStudents: [],
        topPerformingMentees: [],
        studentsNeedingSupport: [],
      };
    }

    const studentStats: any[] = [];
    const monthlyAttMap = new Map<string, { totalConducted: number; totalAttended: number; name: string }>();

    for (const a of assignments) {
      const s = a.student;
      if (!s) continue;
      const attSummary = await this.getStudentAttendanceSummary(s.id, s.semester);
      const acadSummary = await this.getLatestAcademicSummary(s.id, s.semester);

      let primaryLowSubject = '—';
      if (attSummary.totalConducted > 0 && attSummary.attendancePercentage < ATTENDANCE_THRESHOLD) {
        const records = await AttendanceRecord.findAll({
          where: { studentId: s.id, semester: s.semester },
          include: [{ model: Subject, as: 'subject', attributes: ['code', 'name'] }],
        });
        const subjMap = new Map<string, { code: string; conducted: number; attended: number }>();
        records.forEach((r) => {
          const code = (r as any).subject?.code || 'Subj';
          let item = subjMap.get(r.subjectId);
          if (!item) {
            item = { code, conducted: 0, attended: 0 };
            subjMap.set(r.subjectId, item);
          }
          item.conducted += 1;
          if (r.status === 'PRESENT') item.attended += 1;
        });
        let minPct = 101;
        subjMap.forEach((val) => {
          const p = val.conducted > 0 ? (val.attended / val.conducted) * 100 : 0;
          if (p < minPct) {
            minPct = p;
            primaryLowSubject = `${val.code} (${Math.round(p)}%)`;
          }
        });
      }

      const allRecords = await AttendanceRecord.findAll({
        where: { studentId: s.id, semester: s.semester },
        attributes: ['date', 'status'],
      });
      allRecords.forEach((r) => {
        const d = new Date(r.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthName = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        let mEntry = monthlyAttMap.get(monthKey);
        if (!mEntry) {
          mEntry = { totalConducted: 0, totalAttended: 0, name: monthName };
          monthlyAttMap.set(monthKey, mEntry);
        }
        mEntry.totalConducted += 1;
        if (r.status === 'PRESENT') mEntry.totalAttended += 1;
      });

      studentStats.push({
        id: s.id,
        name: getUserFullName((s as any).user),
        usn: s.usn || '—',
        semester: s.semester,
        section: s.section || '—',
        departmentCode: (s as any).department?.code || '—',
        attendancePercentage: attSummary.totalConducted > 0 ? attSummary.attendancePercentage : 100,
        totalConducted: attSummary.totalConducted,
        academicScore: (acadSummary as any).averageCie ?? 0,
        primaryLowSubject,
      });
    }

    let sumAtt = 0;
    let studentsBelow85 = 0;
    let studentsAbove85 = 0;
    let sumAcad = 0;
    let acadCount = 0;
    const distribution = {
      range90To100: 0,
      range85To90: 0,
      range75To85: 0,
      rangeBelow75: 0,
    };
    const lowAttendanceStudents: any[] = [];
    const studentsNeedingSupport: any[] = [];

    studentStats.forEach((st) => {
      const att = st.attendancePercentage;
      sumAtt += att;
      if (att >= 90) distribution.range90To100 += 1;
      else if (att >= 85) distribution.range85To90 += 1;
      else if (att >= 75) distribution.range75To85 += 1;
      else distribution.rangeBelow75 += 1;

      if (att < ATTENDANCE_THRESHOLD) {
        studentsBelow85 += 1;
        lowAttendanceStudents.push({
          id: st.id,
          name: st.name,
          usn: st.usn,
          semester: st.semester,
          section: st.section,
          attendancePercentage: att,
          primaryLowSubject: st.primaryLowSubject,
        });
        studentsNeedingSupport.push(st);
      } else {
        studentsAbove85 += 1;
      }

      if (st.academicScore > 0) {
        sumAcad += st.academicScore;
        acadCount += 1;
        if (st.academicScore < 20 && !studentsNeedingSupport.some((x) => x.id === st.id)) {
          studentsNeedingSupport.push(st);
        }
      }
    });

    const averageAttendance = totalMentees > 0 ? Math.round((sumAtt / totalMentees) * 10) / 10 : 0;
    const averageAcademicScore = acadCount > 0 ? Math.round((sumAcad / acadCount) * 10) / 10 : 0;

    const sortedMonthKeys = Array.from(monthlyAttMap.keys()).sort();
    const monthlyAttendanceTrend = sortedMonthKeys.map((mk) => {
      const item = monthlyAttMap.get(mk)!;
      const pct = item.totalConducted > 0 ? Math.round((item.totalAttended / item.totalConducted) * 1000) / 10 : 0;
      return {
        month: item.name,
        averageAttendance: pct,
      };
    });

    const topPerformingMentees = [...studentStats]
      .filter((s) => s.academicScore > 0)
      .sort((a, b) => b.academicScore - a.academicScore)
      .slice(0, 5);

    return {
      totalMentees,
      averageAttendance,
      studentsBelow85,
      studentsAbove85,
      averageAcademicScore,
      studentsNeedingAttention: studentsNeedingSupport.length,
      studentsWithAcademicDecline: 0,
      attendanceDistribution: distribution,
      monthlyAttendanceTrend,
      lowAttendanceStudents,
      topPerformingMentees,
      studentsNeedingSupport,
    };
  }

  /**
   * 12. Parse & Validate Parent Information Excel Import
   */
  public static async parseAndValidateParentImport(facultyId: string, buffer: Buffer) {
    const activeAssignments = await MentorAssignment.findAll({
      where: { facultyId, status: 'ACTIVE' },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn', 'fatherName', 'motherName', 'parentPhone', 'address'],
          include: [{ model: User, as: 'user', attributes: USER_BASIC_ATTRIBUTES }],
        },
      ],
    });

    const menteeUsnMap = new Map<string, any>();
    activeAssignments.forEach((a) => {
      const s = a.student;
      if (s && s.usn) {
        menteeUsnMap.set(s.usn.trim().toUpperCase(), s);
      }
    });

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new HttpException('Excel file does not contain any sheets.', 400, 'EMPTY_EXCEL');
    }

    const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (!rawRows || rawRows.length === 0) {
      throw new HttpException('No data rows found in the uploaded file.', 400, 'EMPTY_DATA');
    }

    const previewRows: any[] = [];
    const seenUsns = new Set<string>();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNormalized: Record<string, string> = {};
      Object.keys(row).forEach((k) => {
        const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        rowNormalized[cleanKey] = String(row[k] || '').trim();
      });

      const usn = (rowNormalized['usn'] || rowNormalized['rollno'] || rowNormalized['rollnumber'] || '').toUpperCase();
      const studentName = rowNormalized['studentname'] || rowNormalized['name'] || '';
      const parentName = rowNormalized['parentname'] || rowNormalized['fathername'] || rowNormalized['father'] || '';
      const parentMobile = rowNormalized['parentmobile'] || rowNormalized['mobile'] || rowNormalized['parentphone'] || rowNormalized['phone'] || '';
      const address = rowNormalized['address'] || rowNormalized['permanentaddress'] || '';
      const emergencyContact = rowNormalized['emergencycontact'] || rowNormalized['emergency'] || '';

      const errors: string[] = [];

      if (!usn) {
        errors.push('USN is missing.');
      } else if (seenUsns.has(usn)) {
        errors.push(`Duplicate USN "${usn}" in file.`);
      } else {
        seenUsns.add(usn);
      }

      let matchedStudent: any = null;
      if (usn) {
        matchedStudent = menteeUsnMap.get(usn);
        if (!matchedStudent) {
          const foreignStudent = await Student.findOne({ where: { usn } });
          if (foreignStudent) {
            errors.push(`Student (${usn}) is NOT assigned to you as a mentee. You cannot modify students outside your mentoring group.`);
          } else {
            errors.push(`Student with USN "${usn}" not found in system.`);
          }
        }
      }

      if (parentMobile && !/^\d{10}$/.test(parentMobile.replace(/[\s-]/g, ''))) {
        errors.push('Mobile number must be a valid 10-digit number.');
      }

      const isValid = errors.length === 0;

      previewRows.push({
        rowNumber: i + 1,
        usn,
        studentName: matchedStudent ? getUserFullName((matchedStudent as any).user) : studentName || '—',
        parentName: parentName || matchedStudent?.fatherName || '—',
        parentMobile: parentMobile || matchedStudent?.parentPhone || '—',
        address: address || matchedStudent?.address || '—',
        emergencyContact: emergencyContact || matchedStudent?.parentPhone || '—',
        status: isValid ? 'VALID' : 'INVALID',
        errors,
        studentId: matchedStudent?.id || null,
      });
    }

    const validCount = previewRows.filter((r) => r.status === 'VALID').length;
    const invalidCount = previewRows.filter((r) => r.status === 'INVALID').length;

    return {
      totalRows: previewRows.length,
      validCount,
      invalidCount,
      preview: previewRows,
    };
  }

  /**
   * 13. Confirm Parent Information Import
   */
  public static async confirmParentImport(
    facultyId: string,
    rows: Array<{
      studentId: string;
      usn: string;
      parentName?: string;
      parentMobile?: string;
      address?: string;
      emergencyContact?: string;
    }>
  ) {
    if (!rows || rows.length === 0) {
      throw new HttpException('No valid rows provided for import confirmation.', 400, 'NO_IMPORT_DATA');
    }

    const activeAssignments = await MentorAssignment.findAll({
      where: { facultyId, status: 'ACTIVE' },
      attributes: ['studentId'],
    });
    const authorizedStudentIds = new Set(activeAssignments.map((a) => a.studentId));

    const result = await sequelize.transaction(async (t: Transaction) => {
      let updatedCount = 0;

      for (const row of rows) {
        if (!row.studentId || !authorizedStudentIds.has(row.studentId)) {
          continue;
        }

        const student = await Student.findByPk(row.studentId, { transaction: t });
        if (!student) continue;

        const updateData: any = {};
        if (row.parentName && row.parentName.trim() && row.parentName !== '—') {
          updateData.fatherName = row.parentName.trim();
        }
        if (row.parentMobile && row.parentMobile.trim() && row.parentMobile !== '—') {
          updateData.parentPhone = row.parentMobile.trim();
        }
        if (row.address && row.address.trim() && row.address !== '—') {
          updateData.address = row.address.trim();
        }

        if (Object.keys(updateData).length > 0) {
          await student.update(updateData, { transaction: t });
          updatedCount++;
        }
      }

      await AuditLog.create(
        {
          userId: facultyId,
          action: 'BULK_PARENT_INFO_IMPORT',
          details: {
            updatedCount,
            totalSubmitted: rows.length,
          },
        },
        { transaction: t }
      );

      return { updatedCount };
    });

    return result;
  }

  /**
   * 14. Quick Mentee Search (Restricted strictly to logged-in mentor's active mentees)
   */
  public static async searchMentees(facultyId: string, query: string) {
    if (!query || !query.trim()) return [];
    const term = query.trim().toLowerCase();

    const assignments = await MentorAssignment.findAll({
      where: { facultyId, status: 'ACTIVE' },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn', 'semester', 'section', 'departmentId'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: USER_BASIC_ATTRIBUTES,
            },
            {
              model: Department,
              as: 'department',
              attributes: ['name', 'code'],
            },
          ],
        },
      ],
    });

    const matches: any[] = [];
    for (const a of assignments) {
      const s = a.student;
      if (!s) continue;
      const name = getUserFullName((s as any).user).toLowerCase();
      const usn = (s.usn || '').toLowerCase();

      if (name.includes(term) || usn.includes(term)) {
        matches.push({
          id: s.id,
          name: getUserFullName((s as any).user),
          usn: s.usn || '—',
          semester: s.semester,
          section: s.section || '—',
          departmentCode: (s as any).department?.code || '—',
          avatar: (s as any).user?.profileImage || null,
        });
      }
    }

    return matches;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  private static async getStudentAttendanceSummary(studentId: string, semester: number) {
    const records = await AttendanceRecord.findAll({
      where: { studentId, semester },
      attributes: ['status'],
    });

    const totalConducted = records.length;
    if (totalConducted === 0) {
      return {
        totalConducted: 0,
        totalAttended: 0,
        attendancePercentage: 0,
      };
    }

    const totalAttended = records.filter((r) => r.status === 'PRESENT').length;
    const attendancePercentage = Math.round((totalAttended / totalConducted) * 1000) / 10;

    return {
      totalConducted,
      totalAttended,
      attendancePercentage,
    };
  }

  private static async getLatestAcademicSummary(studentId: string, semester: number) {
    const finalMarks = await FinalInternalMarks.findAll({
      where: { studentId, semester },
      attributes: ['finalInternalMarks', 'status'],
    });

    if (finalMarks.length === 0) {
      return {
        status: 'AWAITING_RESULTS',
        displayString: 'Awaiting Results',
      };
    }

    const marksValues = finalMarks
      .map((f) => f.finalInternalMarks)
      .filter((m) => m !== null && m !== undefined) as number[];

    if (marksValues.length === 0) {
      return {
        status: 'AWAITING_RESULTS',
        displayString: 'Awaiting Results',
      };
    }

    const avg = Math.round((marksValues.reduce((a, b) => Number(a) + Number(b), 0) / marksValues.length) * 10) / 10;
    return {
      status: 'AVAILABLE',
      displayString: `Avg CIE: ${avg}/50 (${marksValues.length} Subjects)`,
      averageCie: avg,
    };
  }
}

export default MentorService;
