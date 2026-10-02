import { Op } from 'sequelize';
import db from '../config/database';
import FacultyAssignment from '../models/FacultyAssignment';
import Subject from '../models/Subject';
import Department from '../models/Department';
import User from '../models/User';
import Student from '../models/Student';
import Section from '../models/Section';
import Teacher from '../models/Teacher';
import AttendanceRecord from '../models/AttendanceRecord';
import AttendanceSession from '../models/AttendanceSession';
import AuditLog from '../models/AuditLog';
import Assessment from '../models/Assessment';
import AssessmentComponent from '../models/AssessmentComponent';
import StudentMarks from '../models/StudentMarks';
import AcademicYear from '../models/AcademicYear';
import logger from '../utils/logger.util';

// Helper to normalize section names ('Section A', 'Section  D', 'Division A', 'A' -> 'A')
export const normalizeSection = (sec?: string | null): string => {
  if (!sec) return 'A';
  return sec.replace(/^(Section|Sec|Division|Div)\s+/i, '').trim().toUpperCase();
};

// Attendance threshold percentage for eligibility
const ATTENDANCE_THRESHOLD = 75.0;

// Helper to get academic year variants for flexible DB matching ('2026-27', '2026-2027', '2026–27')
export const getAcademicYearVariants = (ay?: string | null): string[] => {
  if (!ay || ay === 'ALL') return [];
  const clean = ay.trim().replace(/\u2013|\u2014/g, '-');
  
  const variants = new Set<string>([ay, clean]);
  
  // Format: "YYYY-YY" e.g. "2026-27"
  const match2 = clean.match(/^(\d{4})-(\d{2})$/);
  if (match2) {
    const startYear = match2[1];
    const endCentury = startYear.slice(0, 2);
    const fullEndYear = `${endCentury}${match2[2]}`;
    variants.add(`${startYear}-${fullEndYear}`);
    variants.add(`${startYear}\u2013${match2[2]}`);
    variants.add(`${startYear}\u2013${fullEndYear}`);
  }
  
  // Format: "YYYY-YYYY" e.g. "2026-2027"
  const match4 = clean.match(/^(\d{4})-(\d{4})$/);
  if (match4) {
    const startYear = match4[1];
    const endShort = match4[2].slice(2);
    variants.add(`${startYear}-${endShort}`);
    variants.add(`${startYear}\u2013${match4[2]}`);
    variants.add(`${startYear}\u2013${endShort}`);
  }

  return Array.from(variants);
};

/**
 * Resolves the authoritative Section model record for a FacultyAssignment.
 * Matches by explicit sectionId or by department/branch + semester + normalized section code.
 */
export const resolveSectionForAssignment = async (assignment: any): Promise<Section | null> => {
  if (!assignment) return null;

  // 1. Explicit sectionId if present on assignment
  if (assignment.sectionId) {
    const sec = await Section.findByPk(assignment.sectionId);
    if (sec) return sec;
  }

  const cleanSec = normalizeSection(assignment.section);
  const rawSec = (assignment.section || '').trim().toUpperCase();

  const deptCode = assignment.department?.code;
  const branchCodes: string[] = [];
  if (deptCode) {
    branchCodes.push(deptCode);
    if (deptCode === 'CSE-AIML') branchCodes.push('AIML');
    branchCodes.push(`CSE-${deptCode}`);
  }
  if (assignment.branch && assignment.branch !== 'ALL') {
    branchCodes.push(assignment.branch);
  }

  const candidateSections = await Section.findAll({
    where: {
      semester: assignment.semester,
      [Op.or]: [
        { departmentId: assignment.departmentId },
        ...(branchCodes.length > 0 ? [{ branch: { [Op.in]: branchCodes } }] : []),
      ],
    },
  });

  const matched = candidateSections.find((sec) => {
    const sCode = normalizeSection(sec.name);
    return sCode === cleanSec || sec.name.trim().toUpperCase() === rawSec;
  });

  return matched || null;
};

/**
 * Queries all students authoritatively allocated to a section for a FacultyAssignment.
 */
export const getEnrolledStudentsForAssignment = async (assignment: any, matchedSection?: Section | null) => {
  const sec = matchedSection !== undefined ? matchedSection : await resolveSectionForAssignment(assignment);
  const cleanSec = normalizeSection(assignment.section);
  const rawSec = (assignment.section || '').trim();

  const isSemHandling = assignment.department?.type === 'SEMESTER_HANDLING' || assignment.department?.code === 'AS';

  let targetDeptId = assignment.departmentId;
  if (isSemHandling && assignment.branch && assignment.branch !== 'ALL') {
    const branchDept = await Department.findOne({ where: { code: assignment.branch } });
    if (branchDept) targetDeptId = branchDept.id;
  }

  const orConditions: any[] = [];
  if (sec) {
    orConditions.push({ sectionId: sec.id });
    orConditions.push({ section: sec.name });
  }
  if (cleanSec) {
    orConditions.push({ section: cleanSec });
    orConditions.push({ section: `Section ${cleanSec}` });
    orConditions.push({ section: `Section  ${cleanSec}` });
  }
  if (rawSec && !orConditions.some((c: any) => c.section === rawSec)) {
    orConditions.push({ section: rawSec });
  }

  const students = await Student.findAll({
    where: {
      departmentId: targetDeptId,
      semester: assignment.semester,
      section: { [Op.ne]: null as any },
      [Op.or]: orConditions,
    },
    include: [
      { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] },
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
    ],
    order: [['usn', 'ASC'], ['enrollmentNumber', 'ASC']],
  });

  // Ensure uniqueness by student ID
  const seenIds = new Set<string>();
  const uniqueStudents: typeof students = [];
  for (const s of students) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      uniqueStudents.push(s);
    }
  }

  return { students: uniqueStudents, matchedSection: sec };
};

export const facultyService = {
  /**
   * Resolves a faculty member's teacher profile and department
   */
  async getFacultyProfile(userId: string) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'phone', 'profileImage'],
    });

    const teacher = await Teacher.findOne({
      where: { userId },
      include: [{ model: Department, as: 'department' }],
    });

    let department = teacher?.department;
    if (!department) {
      // Fallback: check any faculty assignment
      const assignment = await FacultyAssignment.findOne({
        where: { userId },
        include: [{ model: Department, as: 'department' }],
      });
      department = (assignment as any)?.department;
    }

    return {
      user,
      teacher,
      departmentId: department?.id || null,
      departmentCode: department?.code || 'CSE',
      departmentName: department?.name || 'Computer Science & Engineering',
      designation: teacher?.designation || 'Assistant Professor',
    };
  },

  /**
   * Retrieves all active assignments belonging to this faculty user
   */
  async getFacultyAssignments(userId: string, academicYear?: string) {
    const teacher = await Teacher.findOne({ where: { userId } });
    const teacherId = teacher?.id;

    const whereClause: any = {
      [Op.or]: [
        { userId },
        ...(teacherId ? [{ teacherId }] : []),
      ],
      status: 'ACTIVE',
    };

    if (academicYear && academicYear !== 'ALL') {
      let resolvedYear = academicYear;
      if (/^[0-9a-fA-F-]{36}$/.test(academicYear)) {
        const ayRecord = await AcademicYear.findByPk(academicYear);
        if (ayRecord?.year) {
          resolvedYear = ayRecord.year;
        }
      }
      const ayVariants = getAcademicYearVariants(resolvedYear);
      if (ayVariants.length > 0) {
        whereClause.academicYear = { [Op.in]: ayVariants };
      }
    }

    const assignments = await FacultyAssignment.findAll({
      where: whereClause,
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
      order: [['semester', 'ASC'], ['createdAt', 'ASC']],
    });

    const enriched = await Promise.all(
      assignments.map(async (a: any) => {
        const normSec = normalizeSection(a.section);

        // Count real enrolled students strictly allocated to this section (REQUIREMENT 13 & 39)
        const { students, matchedSection } = await getEnrolledStudentsForAssignment(a);
        const studentCount = students.length;

        // Check if attendance has been submitted/locked today for this assignment
        const todayStr = new Date().toISOString().split('T')[0];
        const todaySessionCount = await AttendanceSession.count({
          where: {
            facultyAssignmentId: a.id,
            attendanceDate: todayStr,
            status: { [Op.in]: ['SUBMITTED', 'LOCKED'] },
          },
        });

        // Calculate attendance percentage for this assignment
        const totalAttendanceRecords = await AttendanceRecord.count({
          where: { facultyAssignmentId: a.id },
        });
        const presentRecords = await AttendanceRecord.count({
          where: { facultyAssignmentId: a.id, status: 'PRESENT' },
        });

        const attendancePct =
          totalAttendanceRecords > 0
            ? Number(((presentRecords / totalAttendanceRecords) * 100).toFixed(1))
            : null;

        return {
          id: a.id,
          subjectId: a.subject?.id || a.subjectId,
          subjectName: a.subject?.name || 'Assigned Subject',
          subjectCode: a.subject?.code || 'SUB001',
          cycle: a.subject?.cycle || null,
          schemeId: a.subject?.schemeId || null,
          credits: a.subject?.credits || 4,
          type: a.subject?.type || 'THEORY',
          semester: a.semester,
          section: matchedSection?.name || (a.section ? `Section ${normSec}` : 'Section A'),
          sectionId: matchedSection?.id || (a as any).sectionId || null,
          normalizedSection: normSec,
          academicYear: a.academicYear || '2026-27',
          departmentId: a.departmentId,
          departmentCode: a.department?.code || 'CSE',
          attendanceAccess: a.attendanceAccess !== false,
          marksAccess: a.marksAccess !== false,
          totalStudents: studentCount,
          attendancePercentage: attendancePct,
          completedToday: todaySessionCount > 0,
          status: a.status,
        };
      })
    );

    return enriched;
  },

  /**
   * Retrieves dashboard overview statistics for the faculty workspace
   */
  async getFacultyDashboard(userId: string, academicYear?: string) {
    const profile = await this.getFacultyProfile(userId);
    const assignments = await this.getFacultyAssignments(userId, academicYear);

    const attendanceCourses = assignments.filter((a) => a.attendanceAccess);
    const marksCourses = assignments.filter((a) => a.marksAccess);

    return {
      profile,
      stats: {
        totalAssignments: assignments.length,
        attendanceCoursesCount: attendanceCourses.length,
        marksCoursesCount: marksCourses.length,
      },
      assignments,
    };
  },

  /**
   * Returns attendance-authorized courses list for the faculty attendance page
   */
  async getFacultyAttendanceList(userId: string, semesterFilter?: string, academicYearFilter?: string) {
    const assignments = await this.getFacultyAssignments(userId, academicYearFilter);
    let filtered = assignments.filter((a) => a.attendanceAccess !== false);

    if (semesterFilter && semesterFilter !== 'ALL') {
      const sem = parseInt(semesterFilter, 10);
      if (!isNaN(sem)) {
        filtered = filtered.filter((a) => a.semester === sem);
      }
    }

    return filtered;
  },

  /**
   * Retrieves full attendance workspace details for a specific assignment
   */
  async getFacultyAttendanceWorkspace(userId: string, assignmentId: string) {
    const teacher = await Teacher.findOne({ where: { userId } });
    const teacherId = teacher?.id;

    // 1. Strict Ownership & Permission Validation (REQUIREMENT 34)
    const assignment = await FacultyAssignment.findOne({
      where: {
        id: assignmentId,
        [Op.or]: [
          { userId },
          ...(teacherId ? [{ teacherId }] : []),
        ],
        status: 'ACTIVE',
      },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive attendance assignment. Access denied.');
    }

    const { students, matchedSection } = await getEnrolledStudentsForAssignment(assignment);

    // 3. Fetch all attendance sessions for this assignment (REQUIREMENT 2 & 21)
    const sessions = await AttendanceSession.findAll({
      where: { facultyAssignmentId: assignment.id },
      order: [['attendanceDate', 'DESC'], ['sessionPeriod', 'DESC']],
    });

    // Fetch all attendance records for this assignment
    const attendanceRecords = await AttendanceRecord.findAll({
      where: { facultyAssignmentId: assignment.id },
      order: [['date', 'ASC'], ['sessionPeriod', 'ASC']],
    });

    // Get unique conducted dates
    const dateSet = new Set<string>();
    sessions.forEach((s) => {
      const dStr = typeof s.attendanceDate === 'string' ? s.attendanceDate : String(s.attendanceDate);
      dateSet.add(dStr);
    });
    // Fallback for legacy records without AttendanceSession
    attendanceRecords.forEach((r) => {
      const dStr = (r.date as any) instanceof Date ? (r.date as any).toISOString().split('T')[0] : String(r.date);
      dateSet.add(dStr);
    });

    const conductedDates = Array.from(dateSet).sort();
    const totalClasses = sessions.length > 0 ? sessions.length : conductedDates.length;

    // Recorded sessions aggregation from AttendanceSession model with fallback
    const recordedSessions = sessions.map((s) => {
      const sDateStr = typeof s.attendanceDate === 'string' ? s.attendanceDate : String(s.attendanceDate);
      const sessionRecs = attendanceRecords.filter((r) => {
        const rDateStr = (r.date as any) instanceof Date ? (r.date as any).toISOString().split('T')[0] : String(r.date);
        return (
          r.attendanceSessionId === s.id ||
          (rDateStr === sDateStr && (r.sessionPeriod || 1) === (s.sessionPeriod || 1))
        );
      });

      const absentStudentIds = new Set(sessionRecs.filter((r) => r.status === 'ABSENT').map((r) => r.studentId));
      const absentStudents = students
        .filter((st: any) => absentStudentIds.has(st.id))
        .map((st: any) => ({
          id: st.id,
          usn: st.usn || st.enrollmentNumber || 'N/A',
          studentName: st.user ? `${st.user.firstName || ''} ${st.user.lastName || ''}`.trim() : 'Student',
        }));

      return {
        id: s.id,
        date: sDateStr,
        sessionPeriod: s.sessionPeriod,
        status: s.status,
        totalConducted: s.totalStudents || sessionRecs.length,
        presentCount: s.presentCount,
        absentCount: s.absentCount,
        percentage: s.totalStudents > 0 ? Number(((s.presentCount / s.totalStudents) * 100).toFixed(1)) : 100.0,
        absentStudents,
      };
    });

    // Previous Class logic (REQUIREMENT 21)
    const previousClass = recordedSessions.length > 0 ? recordedSessions[0] : null;

    // Student-wise metrics aggregation
    const studentRoster = students.map((s: any) => {
      const sRecords = attendanceRecords.filter((r) => r.studentId === s.id);
      const presentCount = sRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = sRecords.filter((r) => r.status === 'ABSENT').length;
      const excusedCount = sRecords.filter((r) => r.status === 'EXCUSED').length;

      const studentConducted = totalClasses;
      const percentage =
        studentConducted > 0 ? Number(((presentCount / studentConducted) * 100).toFixed(1)) : 100.0;

      const isShortage = totalClasses > 0 && percentage < ATTENDANCE_THRESHOLD;

      // Map session details by date
      const sessionMap: { [date: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'UNRECORDED' } = {};
      conductedDates.forEach((d) => {
        const rec = sRecords.find((r) => ((r.date as any) instanceof Date ? (r.date as any).toISOString().split('T')[0] : String(r.date)) === d);
        sessionMap[d] = rec ? rec.status : 'UNRECORDED';
      });

      return {
        id: s.id,
        studentId: s.id,
        usn: s.usn || s.enrollmentNumber || 'N/A',
        enrollmentNumber: s.enrollmentNumber || s.usn || '',
        rollNumber: s.rollNumber || '',
        studentName: s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'Student',
        email: s.user?.email || '',
        section: s.section || matchedSection?.name || (assignment.section ? `Section ${normalizeSection(assignment.section)}` : 'Section A'),
        classesConducted: studentConducted,
        presentCount,
        absentCount,
        excusedCount,
        attendancePercentage: percentage,
        status: isShortage ? 'Shortage' : 'Eligible',
        sessions: sessionMap,
      };
    });

    const totalStudents = studentRoster.length;
    const shortageCount = studentRoster.filter((s) => s.status === 'Shortage').length;
    const eligibleCount = totalStudents - shortageCount;

    const totalPresentSum = studentRoster.reduce((sum, s) => sum + s.presentCount, 0);
    const totalSlots = totalClasses * totalStudents;
    const overallPercentage =
      totalSlots > 0 ? Number(((totalPresentSum / totalSlots) * 100).toFixed(1)) : 100.0;

    return {
      assignment: {
        id: assignment.id,
        subjectId: (assignment as any).subject?.id,
        subjectName: (assignment as any).subject?.name || 'Assigned Course',
        subjectCode: (assignment as any).subject?.code || 'SUB001',
        semester: assignment.semester,
        section: matchedSection?.name || (assignment.section ? `Section ${normalizeSection(assignment.section)}` : 'Section A'),
        sectionId: matchedSection?.id || (assignment as any).sectionId || null,
        academicYear: assignment.academicYear,
        departmentCode: (assignment as any).department?.code || 'CSE',
      },
      metrics: {
        totalClassesConducted: totalClasses,
        totalStudents,
        overallAttendancePercentage: overallPercentage,
        eligibleCount,
        shortageCount,
        threshold: ATTENDANCE_THRESHOLD,
      },
      conductedDates,
      recordedSessions,
      previousClass,
      students: studentRoster,
    };
  },

  /**
   * Returns bitwise marks authorized courses list
   */
  async getFacultyMarksList(userId: string, semesterFilter?: string, academicYearFilter?: string) {
    const assignments = await this.getFacultyAssignments(userId, academicYearFilter);
    let filtered = assignments.filter((a) => a.marksAccess);

    if (semesterFilter && semesterFilter !== 'ALL') {
      const sem = parseInt(semesterFilter, 10);
      if (!isNaN(sem)) {
        filtered = filtered.filter((a) => a.semester === sem);
      }
    }

    return filtered;
  },

  /**
   * Records or updates attendance session for an assigned cohort
   */
  async saveFacultyAttendance(
    userId: string,
    assignmentId: string,
    payload: {
      date: string;
      sessionPeriod?: number;
      records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED' }>;
    }
  ) {
    const teacher = await Teacher.findOne({ where: { userId } });
    const teacherId = teacher?.id;

    // 1. Strict ownership & authorization check (REQUIREMENT 8 & 34)
    const assignment = await FacultyAssignment.findOne({
      where: {
        id: assignmentId,
        [Op.or]: [
          { userId },
          ...(teacherId ? [{ teacherId }] : []),
        ],
        status: 'ACTIVE',
        attendanceAccess: true,
      },
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive attendance assignment. Access denied.');
    }

    const sessionDate = payload.date || new Date().toISOString().split('T')[0];
    const sessionPeriod = payload.sessionPeriod || 1;

    // 2. Future date check (REQUIREMENT 23)
    const todayStr = new Date().toISOString().split('T')[0];
    if (sessionDate > todayStr) {
      throw new Error('Future attendance is not allowed. Selected date exceeds current date.');
    }

    // 3. Verify section roster isolation (REQUIREMENT 9 & 11)
    const { students: validStudents, matchedSection } = await getEnrolledStudentsForAssignment(assignment);

    const validStudentIds = new Set(validStudents.map((s) => s.id));
    for (const rec of payload.records) {
      if (!validStudentIds.has(rec.studentId)) {
        throw new Error(`Student ${rec.studentId} does not belong to this section.`);
      }
    }

    // 4. Transactional Attendance Save (REQUIREMENT 7, 13, 35)
    const transaction = await db.transaction();
    try {
      // Check existing session & session status
      let session = await AttendanceSession.findOne({
        where: {
          facultyAssignmentId: assignment.id,
          attendanceDate: sessionDate,
          sessionPeriod,
        },
        transaction,
      });

      if (session && session.status === 'LOCKED') {
        throw new Error('Attendance session is locked and cannot be edited directly.');
      }

      const totalStudents = payload.records.length;
      const presentCount = payload.records.filter((r) => r.status === 'PRESENT').length;
      const absentCount = payload.records.filter((r) => r.status === 'ABSENT').length;

      if (!session) {
        session = await AttendanceSession.create(
          {
            facultyAssignmentId: assignment.id,
            departmentId: assignment.departmentId,
            subjectId: assignment.subjectId,
            sectionId: matchedSection?.id || (assignment as any).sectionId || null,
            section: matchedSection?.name || assignment.section || 'A',
            semester: assignment.semester,
            academicYear: assignment.academicYear,
            attendanceDate: sessionDate,
            sessionPeriod,
            status: 'SUBMITTED',
            totalStudents,
            presentCount,
            absentCount,
            submittedAt: new Date(),
            submittedById: userId,
          },
          { transaction }
        );
      } else {
        session.totalStudents = totalStudents;
        session.presentCount = presentCount;
        session.absentCount = absentCount;
        session.status = 'SUBMITTED';
        session.submittedAt = new Date();
        session.submittedById = userId;
        if (matchedSection?.id) {
          session.sectionId = matchedSection.id;
        }
        if (matchedSection?.name) {
          session.section = matchedSection.name;
        }
        await session.save({ transaction });
      }

      // Upsert AttendanceRecord rows
      for (const item of payload.records) {
        if (!item.studentId || !item.status) continue;

        const [record, created] = await AttendanceRecord.findOrCreate({
          where: {
            studentId: item.studentId,
            facultyAssignmentId: assignment.id,
            date: sessionDate as any,
            sessionPeriod,
          },
          defaults: {
            attendanceSessionId: session.id,
            studentId: item.studentId,
            facultyAssignmentId: assignment.id,
            departmentId: assignment.departmentId,
            subjectId: assignment.subjectId,
            semester: assignment.semester,
            section: matchedSection?.name || assignment.section,
            academicYear: assignment.academicYear,
            date: sessionDate as any,
            sessionPeriod,
            status: item.status,
          },
          transaction,
        });

        if (!created) {
          record.attendanceSessionId = session.id;
          record.status = item.status;
          await record.save({ transaction });
        }
      }

      // Record audit log (REQUIREMENT 20)
      await AuditLog.create(
        {
          userId,
          action: 'ATTENDANCE_SESSION_SAVED',
          details: {
            sessionDate,
            sessionPeriod,
            assignmentId: assignment.id,
            totalStudents,
            presentCount,
            absentCount,
          },
        },
        { transaction }
      );

      await transaction.commit();
      logger.info(
        `Attendance session saved by faculty ${userId} for assignment ${assignmentId} on ${sessionDate} (P${sessionPeriod})`
      );
    } catch (err: any) {
      await transaction.rollback();
      logger.error('SAVE_FACULTY_ATTENDANCE_TRANSACTION_ERROR:', err);
      throw err;
    }

    return this.getFacultyAttendanceWorkspace(userId, assignmentId);
  },

  /**
   * Retrieves continuous assessment / marks workspace details
   */
  async getFacultyMarksWorkspace(userId: string, assignmentId: string) {
    const assignment = await FacultyAssignment.findOne({
      where: {
        id: assignmentId,
        userId,
        status: 'ACTIVE',
        marksAccess: true,
      },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive marks assignment. Access denied.');
    }

    const { students, matchedSection } = await getEnrolledStudentsForAssignment(assignment);

    // Ensure Assessment & AssessmentComponents exist for this subject/cohort
    const [assessment] = await Assessment.findOrCreate({
      where: {
        subjectId: assignment.subjectId,
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        academicYear: assignment.academicYear || '2026-27',
      },
      defaults: {
        subjectId: assignment.subjectId,
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        section: assignment.section,
        academicYear: assignment.academicYear || '2026-27',
        name: 'Continuous Internal Evaluation (CIE)',
        maxMarks: 50.0,
        status: 'ACTIVE',
      },
    });

    // Components: IA-1, IA-2, Assignment
    const [compIa1] = await AssessmentComponent.findOrCreate({
      where: { assessmentId: assessment.id, name: 'IA-1' },
      defaults: {
        assessmentId: assessment.id,
        name: 'IA-1',
        componentType: 'THEORY',
        maxMarks: 20.0,
        sequence: 1,
      },
    });

    const [compIa2] = await AssessmentComponent.findOrCreate({
      where: { assessmentId: assessment.id, name: 'IA-2' },
      defaults: {
        assessmentId: assessment.id,
        name: 'IA-2',
        componentType: 'THEORY',
        maxMarks: 20.0,
        sequence: 2,
      },
    });

    const [compAssign] = await AssessmentComponent.findOrCreate({
      where: { assessmentId: assessment.id, name: 'Assignment' },
      defaults: {
        assessmentId: assessment.id,
        name: 'Assignment',
        componentType: 'ASSIGNMENT',
        maxMarks: 10.0,
        sequence: 3,
      },
    });

    // Fetch existing student marks
    const studentIds = students.map((s) => s.id);
    const existingMarks = await StudentMarks.findAll({
      where: {
        assessmentId: assessment.id,
        studentId: { [Op.in]: studentIds },
      },
    });

    const marksMap: { [studentId: string]: { ia1: number; ia2: number; assignment: number } } = {};
    existingMarks.forEach((m) => {
      if (!marksMap[m.studentId]) {
        marksMap[m.studentId] = { ia1: 0, ia2: 0, assignment: 0 };
      }
      if (m.componentId === compIa1.id) marksMap[m.studentId].ia1 = Number(m.marks);
      if (m.componentId === compIa2.id) marksMap[m.studentId].ia2 = Number(m.marks);
      if (m.componentId === compAssign.id) marksMap[m.studentId].assignment = Number(m.marks);
    });

    const evaluations = [
      { name: 'Internal Assessment 1 (IA-1)', maxMarks: 20, weightage: '20%' },
      { name: 'Internal Assessment 2 (IA-2)', maxMarks: 20, weightage: '20%' },
      { name: 'Continuous Assignment / Quiz', maxMarks: 10, weightage: '10%' },
    ];

    return {
      assignment: {
        id: assignment.id,
        subjectId: (assignment as any).subject?.id,
        subjectName: (assignment as any).subject?.name || 'Course',
        subjectCode: (assignment as any).subject?.code || 'SUB001',
        semester: assignment.semester,
        section: assignment.section,
        academicYear: assignment.academicYear,
        departmentCode: (assignment as any).department?.code || 'CSE',
      },
      evaluations,
      students: students.map((s: any) => {
        const sMarks = marksMap[s.id] || { ia1: 0, ia2: 0, assignment: 0 };
        const totalCie = Number((sMarks.ia1 + sMarks.ia2 + sMarks.assignment).toFixed(1));
        return {
          id: s.id,
          usn: s.usn || s.enrollmentNumber || 'N/A',
          enrollmentNumber: s.enrollmentNumber || '',
          studentName: s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'Student',
          ia1: sMarks.ia1,
          ia2: sMarks.ia2,
          assignment: sMarks.assignment,
          totalCie,
        };
      }),
    };
  },

  /**
   * Saves continuous assessment / marks for students
   */
  async saveFacultyMarks(
    userId: string,
    assignmentId: string,
    payload: {
      marks: Array<{
        studentId: string;
        ia1?: number;
        ia2?: number;
        assignment?: number;
      }>;
    }
  ) {
    const assignment = await FacultyAssignment.findOne({
      where: {
        id: assignmentId,
        userId,
        status: 'ACTIVE',
        marksAccess: true,
      },
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive marks assignment. Access denied.');
    }

    const [assessment] = await Assessment.findOrCreate({
      where: {
        subjectId: assignment.subjectId,
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        academicYear: assignment.academicYear || '2026-27',
      },
      defaults: {
        subjectId: assignment.subjectId,
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        section: assignment.section,
        academicYear: assignment.academicYear || '2026-27',
        name: 'Continuous Internal Evaluation (CIE)',
        maxMarks: 50.0,
        status: 'ACTIVE',
      },
    });

    const [compIa1] = await AssessmentComponent.findOrCreate({
      where: { assessmentId: assessment.id, name: 'IA-1' },
      defaults: {
        assessmentId: assessment.id,
        name: 'IA-1',
        componentType: 'THEORY',
        maxMarks: 20.0,
        sequence: 1,
      },
    });

    const [compIa2] = await AssessmentComponent.findOrCreate({
      where: { assessmentId: assessment.id, name: 'IA-2' },
      defaults: {
        assessmentId: assessment.id,
        name: 'IA-2',
        componentType: 'THEORY',
        maxMarks: 20.0,
        sequence: 2,
      },
    });

    const [compAssign] = await AssessmentComponent.findOrCreate({
      where: { assessmentId: assessment.id, name: 'Assignment' },
      defaults: {
        assessmentId: assessment.id,
        name: 'Assignment',
        componentType: 'ASSIGNMENT',
        maxMarks: 10.0,
        sequence: 3,
      },
    });

    // Upsert student marks for each component
    for (const row of payload.marks) {
      if (!row.studentId) continue;

      if (row.ia1 !== undefined) {
        const val = Math.min(20, Math.max(0, Number(row.ia1) || 0));
        const [mRecord, created] = await StudentMarks.findOrCreate({
          where: {
            assessmentId: assessment.id,
            componentId: compIa1.id,
            studentId: row.studentId,
          },
          defaults: {
            assessmentId: assessment.id,
            componentId: compIa1.id,
            studentId: row.studentId,
            marks: val,
          },
        });
        if (!created && Number(mRecord.marks) !== val) {
          mRecord.marks = val;
          await mRecord.save();
        }
      }

      if (row.ia2 !== undefined) {
        const val = Math.min(20, Math.max(0, Number(row.ia2) || 0));
        const [mRecord, created] = await StudentMarks.findOrCreate({
          where: {
            assessmentId: assessment.id,
            componentId: compIa2.id,
            studentId: row.studentId,
          },
          defaults: {
            assessmentId: assessment.id,
            componentId: compIa2.id,
            studentId: row.studentId,
            marks: val,
          },
        });
        if (!created && Number(mRecord.marks) !== val) {
          mRecord.marks = val;
          await mRecord.save();
        }
      }

      if (row.assignment !== undefined) {
        const val = Math.min(10, Math.max(0, Number(row.assignment) || 0));
        const [mRecord, created] = await StudentMarks.findOrCreate({
          where: {
            assessmentId: assessment.id,
            componentId: compAssign.id,
            studentId: row.studentId,
          },
          defaults: {
            assessmentId: assessment.id,
            componentId: compAssign.id,
            studentId: row.studentId,
            marks: val,
          },
        });
        if (!created && Number(mRecord.marks) !== val) {
          mRecord.marks = val;
          await mRecord.save();
        }
      }
    }

    logger.info(`Marks updated by faculty ${userId} for assignment ${assignmentId}`);
    return this.getFacultyMarksWorkspace(userId, assignmentId);
  },

  /**
   * Aggregates assignment-scoped analytics strictly for the authenticated faculty
   */
  async getFacultyAnalytics(userId: string, academicYear?: string) {
    const assignments = await this.getFacultyAssignments(userId, academicYear);
    const assignmentIds = assignments.map((a) => a.id);

    // Subject attendance breakdown
    const subjectAttendanceStats = assignments.map((a) => ({
      assignmentId: a.id,
      subjectName: a.subjectName,
      subjectCode: a.subjectCode,
      semester: a.semester,
      section: a.section,
      totalStudents: a.totalStudents,
      attendancePercentage: a.attendancePercentage ?? 85.0,
      threshold: ATTENDANCE_THRESHOLD,
    }));

    // Find defaulters across all assigned courses
    const allAttendanceRecords = await AttendanceRecord.findAll({
      where: { facultyAssignmentId: { [Op.in]: assignmentIds } },
      include: [
        {
          model: Student,
          as: 'student',
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }],
        },
        { model: Subject, as: 'subject', attributes: ['name', 'code'] },
      ],
    });

    // Group by student + subject
    const studentMap: { [key: string]: { student: any; subject: any; total: number; present: number } } = {};
    allAttendanceRecords.forEach((r: any) => {
      const key = `${r.studentId}_${r.subjectId}`;
      if (!studentMap[key]) {
        studentMap[key] = {
          student: r.student,
          subject: r.subject,
          total: 0,
          present: 0,
        };
      }
      studentMap[key].total++;
      if (r.status === 'PRESENT') {
        studentMap[key].present++;
      }
    });

    const defaulters = Object.values(studentMap)
      .map((entry) => {
        const pct = entry.total > 0 ? Number(((entry.present / entry.total) * 100).toFixed(1)) : 100;
        return {
          studentId: entry.student?.id,
          usn: entry.student?.usn || entry.student?.enrollmentNumber || 'N/A',
          studentName: entry.student?.user
            ? `${entry.student.user.firstName || ''} ${entry.student.user.lastName || ''}`.trim()
            : 'Student',
          subjectName: entry.subject?.name,
          subjectCode: entry.subject?.code,
          totalClasses: entry.total,
          presentClasses: entry.present,
          attendancePercentage: pct,
        };
      })
      .filter((d) => d.totalClasses > 0 && d.attendancePercentage < ATTENDANCE_THRESHOLD);

    return {
      assignedCount: assignments.length,
      subjectAttendanceStats,
      defaulters,
      defaultersCount: defaulters.length,
      termStatus: 'AY 2026-27 Active Term',
    };
  },
};

export default facultyService;
