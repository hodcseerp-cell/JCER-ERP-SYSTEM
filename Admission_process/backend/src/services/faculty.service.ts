import { Op } from 'sequelize';
import FacultyAssignment from '../models/FacultyAssignment';
import Subject from '../models/Subject';
import Department from '../models/Department';
import User from '../models/User';
import Student from '../models/Student';
import Teacher from '../models/Teacher';
import AttendanceRecord from '../models/AttendanceRecord';
import GoogleSheetConnection from '../models/GoogleSheetConnection';
import GoogleSheetTab from '../models/GoogleSheetTab';
import FacultyGoogleSheetAccess from '../models/FacultyGoogleSheetAccess';
import GoogleOAuthToken from '../models/GoogleOAuthToken';
import GoogleSheetSyncLog from '../models/GoogleSheetSyncLog';
import Assessment from '../models/Assessment';
import AssessmentComponent from '../models/AssessmentComponent';
import StudentMarks from '../models/StudentMarks';
import AuditLog from '../models/AuditLog';
import googleOAuthService from './googleOAuth.service';
import { googleSheetsService } from './googleSheets.service';
import logger from '../utils/logger.util';

// Helper to normalize section names ('Section A', 'Division A', 'A' -> 'A')
export const normalizeSection = (sec?: string | null): string => {
  if (!sec) return 'A';
  const clean = sec.trim().toUpperCase();
  if (clean.startsWith('DIVISION ')) return clean.replace('DIVISION ', '').trim();
  if (clean.startsWith('SECTION ')) return clean.replace('SECTION ', '').trim();
  return clean;
};

// Attendance threshold percentage for eligibility
const ATTENDANCE_THRESHOLD = 75.0;

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
   * Retrieves Google OAuth status for this specific faculty user
   */
  async getFacultyGoogleOAuthStatus(userId: string) {
    const token = await GoogleOAuthToken.findOne({
      where: { userId, status: 'ACTIVE' },
      order: [['createdAt', 'DESC']],
    });

    if (!token) {
      return {
        connected: false,
        isConnected: false,
        status: 'NOT_CONNECTED',
        email: null,
        displayName: null,
        profilePicture: null,
      };
    }

    return {
      connected: true,
      isConnected: true,
      status: token.status,
      email: token.googleAccountEmail || token.userEmail,
      displayName: token.displayName || null,
      profilePicture: token.profilePicture || null,
      lastUsedAt: token.lastUsedAt,
    };
  },

  /**
   * Retrieves all active assignments belonging to this faculty user
   * Hydrates with mapped section Google Sheets, exact tab titles (e.g. CS301), and student counts
   */
  async getFacultyAssignments(userId: string) {
    const assignments = await FacultyAssignment.findAll({
      where: { userId, status: 'ACTIVE' },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
        {
          model: FacultyGoogleSheetAccess,
          as: 'googleSheetAccesses',
          required: false,
          include: [{ model: GoogleSheetConnection, as: 'googleSheetConnection' }],
        },
      ],
      order: [['semester', 'ASC'], ['createdAt', 'ASC']],
    });

    const enriched = await Promise.all(
      assignments.map(async (a: any) => {
        const normSec = normalizeSection(a.section);

        // 1. Resolve Attendance Google Sheet Connection & Tab for this semester + section
        const attendanceConn = await GoogleSheetConnection.findOne({
          where: {
            departmentId: a.departmentId,
            semester: a.semester,
            sheetType: 'ATTENDANCE',
            status: 'ACTIVE',
            [Op.or]: [
              { section: normSec },
              { section: a.section },
              { section: `Section ${normSec}` },
              { section: `Division ${normSec}` },
              { section: { [Op.iLike]: `%${normSec}%` } },
            ],
          },
          include: [
            {
              model: GoogleSheetTab,
              as: 'tabs',
              where: {
                [Op.or]: [
                  { subjectId: a.subjectId },
                  { subjectCode: a.subject?.code },
                  { sheetTitle: { [Op.iLike]: `%${a.subject?.code?.replace(/^[A-Z]+/, '') || ''}%` } },
                ],
              },
              required: false,
            },
          ],
        });

        // Find exact mapped tab
        let attTab = (attendanceConn?.tabs || []).find(
          (t: any) => t.subjectId === a.subjectId || t.subjectCode === a.subject?.code
        );
        if (!attTab && attendanceConn?.tabs?.length) {
          attTab = attendanceConn.tabs[0];
        }

        // 2. Resolve Marks Google Sheet Connection & Tab for this semester
        const marksConn = await GoogleSheetConnection.findOne({
          where: {
            departmentId: a.departmentId,
            semester: a.semester,
            sheetType: { [Op.in]: ['ACADEMIC_MARKS', 'BITWISE_MARKS'] },
            status: 'ACTIVE',
          },
          include: [
            {
              model: GoogleSheetTab,
              as: 'tabs',
              where: {
                [Op.or]: [
                  { subjectId: a.subjectId },
                  { subjectCode: a.subject?.code },
                ],
              },
              required: false,
            },
          ],
        });

        let marksTab = (marksConn?.tabs || []).find(
          (t: any) => t.subjectId === a.subjectId || t.subjectCode === a.subject?.code
        );
        if (!marksTab && marksConn?.tabs?.length) {
          marksTab = marksConn.tabs[0];
        }

        // 3. Count real enrolled students in this department, semester, and section
        const studentCount = await Student.count({
          where: {
            departmentId: a.departmentId,
            semester: a.semester,
            [Op.or]: [
              { section: normSec },
              { section: a.section },
              { section: `Section ${normSec}` },
              { section: null },
            ],
          },
        });

        // 4. Calculate attendance percentage for this assignment
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

        // Build exact GID deep links
        const attendanceDeepLink =
          attendanceConn && attTab?.googleSheetId
            ? `https://docs.google.com/spreadsheets/d/${attendanceConn.googleSpreadsheetId}/edit#gid=${attTab.googleSheetId}`
            : attendanceConn?.googleSpreadsheetUrl || null;

        const marksDeepLink =
          marksConn && marksTab?.googleSheetId
            ? `https://docs.google.com/spreadsheets/d/${marksConn.googleSpreadsheetId}/edit#gid=${marksTab.googleSheetId}`
            : marksConn?.googleSpreadsheetUrl || null;

        // Permission status from FacultyGoogleSheetAccess
        const accesses = a.googleSheetAccesses || [];
        const attAccessRecord = accesses.find(
          (acc: any) => acc.googleSheetConnection?.sheetType === 'ATTENDANCE'
        );
        const marksAccessRecord = accesses.find(
          (acc: any) =>
            acc.googleSheetConnection?.sheetType === 'ACADEMIC_MARKS' ||
            acc.googleSheetConnection?.sheetType === 'BITWISE_MARKS'
        );

        return {
          id: a.id,
          subjectId: a.subject?.id || a.subjectId,
          subjectName: a.subject?.name || 'Assigned Subject',
          subjectCode: a.subject?.code || 'SUB001',
          credits: a.subject?.credits || 4,
          type: a.subject?.type || 'THEORY',
          semester: a.semester,
          section: a.section || 'Section A',
          normalizedSection: normSec,
          academicYear: a.academicYear || '2026-27',
          departmentId: a.departmentId,
          departmentCode: a.department?.code || 'CSE',
          attendanceAccess: a.attendanceAccess,
          marksAccess: a.marksAccess,
          totalStudents: studentCount,
          attendancePercentage: attendancePct,
          status: a.status,
          attendanceSheet: {
            connected: Boolean(attendanceConn),
            connectionId: attendanceConn?.id || null,
            spreadsheetId: attendanceConn?.googleSpreadsheetId || null,
            spreadsheetUrl: attendanceConn?.googleSpreadsheetUrl || null,
            tabTitle: attTab?.sheetTitle || null, // e.g. "CS301"
            tabGid: attTab?.googleSheetId || null,
            deepLinkUrl: attendanceDeepLink,
            status: attAccessRecord?.status || (attendanceConn ? 'GRANTED' : 'NOT_CONFIGURED'),
          },
          marksSheet: {
            connected: Boolean(marksConn),
            connectionId: marksConn?.id || null,
            spreadsheetId: marksConn?.googleSpreadsheetId || null,
            spreadsheetUrl: marksConn?.googleSpreadsheetUrl || null,
            tabTitle: marksTab?.sheetTitle || null, // e.g. "MAT"
            tabGid: marksTab?.googleSheetId || null,
            deepLinkUrl: marksDeepLink,
            status: marksAccessRecord?.status || (marksConn ? 'GRANTED' : 'NOT_CONFIGURED'),
          },
        };
      })
    );

    return enriched;
  },

  /**
   * Retrieves dashboard overview statistics for the faculty workspace
   */
  async getFacultyDashboard(userId: string) {
    const profile = await this.getFacultyProfile(userId);
    const googleAccount = await this.getFacultyGoogleOAuthStatus(userId);
    const assignments = await this.getFacultyAssignments(userId);

    const attendanceCourses = assignments.filter((a) => a.attendanceAccess);
    const marksCourses = assignments.filter((a) => a.marksAccess);

    // Count pending/disconnected sheets
    const pendingSyncs = assignments.filter(
      (a) =>
        (a.attendanceAccess && !a.attendanceSheet.connected) ||
        (a.marksAccess && !a.marksSheet.connected)
    ).length;

    // Recent sync logs for this faculty's assignments
    const assignmentIds = assignments.map((a) => a.id);
    const recentLogs = await GoogleSheetSyncLog.findAll({
      where: {
        facultyAssignmentId: { [Op.in]: assignmentIds },
      },
      include: [
        { model: GoogleSheetConnection, as: 'connection', attributes: ['semester', 'section', 'sheetType'] },
        { model: GoogleSheetTab, as: 'tab', attributes: ['sheetTitle', 'subjectCode'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 6,
    });

    return {
      profile,
      googleAccount,
      stats: {
        totalAssignments: assignments.length,
        attendanceCoursesCount: attendanceCourses.length,
        marksCoursesCount: marksCourses.length,
        pendingSyncsCount: pendingSyncs,
      },
      assignments,
      recentSyncs: recentLogs.map((l: any) => ({
        id: l.id,
        syncType: l.syncType,
        tabTitle: l.tab?.sheetTitle || 'Tab',
        subjectCode: l.tab?.subjectCode || '',
        status: l.status,
        recordsProcessed: l.recordsProcessed,
        recordsCreated: l.recordsCreated,
        errorCount: l.errorCount,
        startedAt: l.startedAt,
        completedAt: l.completedAt,
      })),
    };
  },

  /**
   * Returns attendance-authorized courses list for the faculty attendance page
   */
  async getFacultyAttendanceList(userId: string, semesterFilter?: string) {
    const assignments = await this.getFacultyAssignments(userId);
    let filtered = assignments.filter((a) => a.attendanceAccess);

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
    // 1. Strict Ownership & Permission Validation
    const assignment = await FacultyAssignment.findOne({
      where: {
        id: assignmentId,
        userId,
        status: 'ACTIVE',
        attendanceAccess: true,
      },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive attendance assignment. Access denied.');
    }

    const normSec = normalizeSection(assignment.section);

    // 2. Fetch connected Attendance Google Sheet and mapped Tab
    const connection = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: 'ATTENDANCE',
        status: 'ACTIVE',
        [Op.or]: [
          { section: normSec },
          { section: assignment.section },
          { section: `Section ${normSec}` },
          { section: { [Op.iLike]: `%${normSec}%` } },
        ],
      },
      include: [
        {
          model: GoogleSheetTab,
          as: 'tabs',
          where: {
            [Op.or]: [
              { subjectId: assignment.subjectId },
              { subjectCode: (assignment as any).subject?.code },
            ],
          },
          required: false,
        },
      ],
    });

    let tab = (connection?.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && connection?.tabs?.length) {
      tab = connection.tabs[0];
    }

    // 3. Fetch all enrolled students in this cohort
    const students = await Student.findAll({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        [Op.or]: [
          { section: normSec },
          { section: assignment.section },
          { section: `Section ${normSec}` },
          { section: null },
        ],
      },
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
      order: [['usn', 'ASC'], ['enrollmentNumber', 'ASC']],
    });

    // 4. Fetch all attendance records for this assignment
    const attendanceRecords = await AttendanceRecord.findAll({
      where: {
        facultyAssignmentId: assignment.id,
      },
      order: [['date', 'ASC']],
    });

    // Get unique conducted dates
    const dateSet = new Set<string>();
    attendanceRecords.forEach((r) => {
      const dStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date);
      dateSet.add(dStr);
    });
    const conductedDates = Array.from(dateSet).sort();
    const totalClasses = conductedDates.length;

    // Student-wise metrics aggregation
    const studentRoster = students.map((s: any) => {
      const sRecords = attendanceRecords.filter((r) => r.studentId === s.id);
      const presentCount = sRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = sRecords.filter((r) => r.status === 'ABSENT').length;
      const excusedCount = sRecords.filter((r) => r.status === 'EXCUSED').length;

      const studentConducted = totalClasses > 0 ? totalClasses : sRecords.length;
      const percentage =
        studentConducted > 0 ? Number(((presentCount / studentConducted) * 100).toFixed(1)) : 100.0;

      const isShortage = totalClasses > 0 && percentage < ATTENDANCE_THRESHOLD;

      // Map session details
      const sessionMap: { [date: string]: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'UNRECORDED' } = {};
      conductedDates.forEach((d) => {
        const rec = sRecords.find((r) => (r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date)) === d);
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
        section: s.section || assignment.section,
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

    const googleAccount = await this.getFacultyGoogleOAuthStatus(userId);

    const deepLinkUrl =
      connection && tab?.googleSheetId
        ? `https://docs.google.com/spreadsheets/d/${connection.googleSpreadsheetId}/edit#gid=${tab.googleSheetId}`
        : connection?.googleSpreadsheetUrl || null;

    return {
      assignment: {
        id: assignment.id,
        subjectId: (assignment as any).subject?.id,
        subjectName: (assignment as any).subject?.name || 'Assigned Course',
        subjectCode: (assignment as any).subject?.code || 'SUB001',
        semester: assignment.semester,
        section: assignment.section,
        academicYear: assignment.academicYear,
        departmentCode: (assignment as any).department?.code || 'CSE',
      },
      googleSheet: {
        connected: Boolean(connection),
        connectionId: connection?.id || null,
        spreadsheetId: connection?.googleSpreadsheetId || null,
        spreadsheetUrl: connection?.googleSpreadsheetUrl || null,
        tabTitle: tab?.sheetTitle || null, // e.g. "CS301"
        tabGid: tab?.googleSheetId || null,
        deepLinkUrl,
        accountEmail: googleAccount.email,
        googleConnected: googleAccount.connected,
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
      students: studentRoster,
    };
  },

  /**
   * Synchronizes attendance from the authorized Google Sheet tab into ERP database
   */
  async syncFacultyAttendance(
    userId: string,
    assignmentId: string,
    overrideValues?: string[][]
  ) {
    // Strict assignment validation
    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, userId, status: 'ACTIVE', attendanceAccess: true },
      include: [{ model: Subject, as: 'subject' }, { model: Department, as: 'department' }],
    });

    if (!assignment) {
      throw new Error('Unauthorized: You do not have permission to sync attendance for this assignment.');
    }

    const normSec = normalizeSection(assignment.section);

    // Find active connection
    const connection = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: 'ATTENDANCE',
        status: 'ACTIVE',
        [Op.or]: [
          { section: normSec },
          { section: assignment.section },
          { section: `Section ${normSec}` },
          { section: { [Op.iLike]: `%${normSec}%` } },
        ],
      },
      include: [{ model: GoogleSheetTab, as: 'tabs' }],
    });

    if (!connection) {
      throw new Error(
        `No active Attendance spreadsheet is connected for Semester ${assignment.semester} Section ${assignment.section}. Contact your HOD.`
      );
    }

    // Find mapped tab (e.g. CS301 for BCS301)
    let tab = (connection.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && connection.tabs?.length) {
      tab = connection.tabs[0];
    }

    if (!tab) {
      throw new Error(
        `Google Sheet Tab for ${(assignment as any).subject?.name} (${(assignment as any).subject?.code}) is not mapped.`
      );
    }

    // Read sheet values using faculty's token or fallback
    const facultyToken = await GoogleOAuthToken.findOne({
      where: { userId, status: 'ACTIVE' },
    });
    const accessToken = facultyToken?.encryptedAccessToken || undefined;

    const result = await googleSheetsService.syncAttendanceTab({
      connectionId: connection.id,
      tabId: tab.id,
      tabGid: tab.googleSheetId,
      tabTitle: tab.sheetTitle,
      facultyUserId: userId,
      departmentId: assignment.departmentId,
      authenticatedUserId: userId,
      overrideValues,
    });

    return result;
  },

  /**
   * Returns bitwise marks authorized courses list
   */
  async getFacultyMarksList(userId: string, semesterFilter?: string) {
    const assignments = await this.getFacultyAssignments(userId);
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

    const marksConn = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: { [Op.in]: ['ACADEMIC_MARKS', 'BITWISE_MARKS'] },
        status: 'ACTIVE',
      },
      include: [
        {
          model: GoogleSheetTab,
          as: 'tabs',
          where: {
            [Op.or]: [
              { subjectId: assignment.subjectId },
              { subjectCode: (assignment as any).subject?.code },
            ],
          },
          required: false,
        },
      ],
    });

    let tab = (marksConn?.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && marksConn?.tabs?.length) {
      tab = marksConn.tabs[0];
    }

    const normSec = normalizeSection(assignment.section);
    const students = await Student.findAll({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        [Op.or]: [
          { section: normSec },
          { section: assignment.section },
          { section: `Section ${normSec}` },
          { section: null },
        ],
      },
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
      order: [['usn', 'ASC'], ['enrollmentNumber', 'ASC']],
    });

    // Default assessment components
    const evaluations = [
      { name: 'Internal Assessment 1 (IA-1)', maxMarks: 20, weightage: '20%' },
      { name: 'Internal Assessment 2 (IA-2)', maxMarks: 20, weightage: '20%' },
      { name: 'Continuous Assignment / Quiz', maxMarks: 10, weightage: '10%' },
    ];

    const deepLinkUrl =
      marksConn && tab?.googleSheetId
        ? `https://docs.google.com/spreadsheets/d/${marksConn.googleSpreadsheetId}/edit#gid=${tab.googleSheetId}`
        : marksConn?.googleSpreadsheetUrl || null;

    const googleAccount = await this.getFacultyGoogleOAuthStatus(userId);

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
      googleSheet: {
        connected: Boolean(marksConn),
        connectionId: marksConn?.id || null,
        spreadsheetId: marksConn?.googleSpreadsheetId || null,
        spreadsheetUrl: marksConn?.googleSpreadsheetUrl || null,
        tabTitle: tab?.sheetTitle || null, // e.g. "MAT"
        tabGid: tab?.googleSheetId || null,
        deepLinkUrl,
        accountEmail: googleAccount.email,
      },
      evaluations,
      students: students.map((s: any) => ({
        id: s.id,
        usn: s.usn || s.enrollmentNumber || 'N/A',
        enrollmentNumber: s.enrollmentNumber || '',
        studentName: s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() : 'Student',
        ia1: 0,
        ia2: 0,
        assignment: 0,
        totalCie: 0,
      })),
    };
  },

  /**
   * Synchronizes bitwise marks tab from Google Sheet into ERP
   */
  async syncFacultyMarks(
    userId: string,
    assignmentId: string,
    assessmentName?: string,
    overrideValues?: string[][]
  ) {
    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, userId, status: 'ACTIVE', marksAccess: true },
      include: [{ model: Subject, as: 'subject' }, { model: Department, as: 'department' }],
    });

    if (!assignment) {
      throw new Error('Unauthorized: You do not have permission to sync marks for this assignment.');
    }

    const connection = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: { [Op.in]: ['ACADEMIC_MARKS', 'BITWISE_MARKS'] },
        status: 'ACTIVE',
      },
      include: [{ model: GoogleSheetTab, as: 'tabs' }],
    });

    if (!connection) {
      throw new Error(
        `No active Bitwise Marks spreadsheet is connected for Semester ${assignment.semester}. Contact your HOD.`
      );
    }

    let tab = (connection.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && connection.tabs?.length) {
      tab = connection.tabs[0];
    }

    if (!tab) {
      throw new Error(
        `Google Sheet Tab for ${(assignment as any).subject?.name} (${(assignment as any).subject?.code}) is not mapped.`
      );
    }

    // Tab protection check: ensure FINAL MARKS is never synced as a subject
    if (tab.sheetTitle.toUpperCase().includes('FINAL MARKS')) {
      throw new Error('Tab "FINAL MARKS" is a master summary tab and cannot be synced directly.');
    }

    const result = await googleSheetsService.syncMarksTab({
      connectionId: connection.id,
      tabId: tab.id,
      tabGid: tab.googleSheetId,
      tabTitle: tab.sheetTitle,
      facultyUserId: userId,
      departmentId: assignment.departmentId,
      authenticatedUserId: userId,
      assessmentName: assessmentName || 'Internal Assessment 1',
      overrideValues,
    });

    return result;
  },

  /**
   * Aggregates assignment-scoped analytics strictly for the authenticated faculty
   */
  async getFacultyAnalytics(userId: string) {
    const assignments = await this.getFacultyAssignments(userId);
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

  /**
   * Retrieves full in-app Google Sheet view data for an attendance assignment
   */
  async getFacultyAttendanceSheetView(userId: string, assignmentId: string) {
    // 1. Strict Assignment Validation
    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, userId, status: 'ACTIVE', attendanceAccess: true },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive attendance assignment. Access denied.');
    }

    const normSec = normalizeSection(assignment.section);

    // 2. Resolve section-specific Attendance Connection
    const connection = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: 'ATTENDANCE',
        status: 'ACTIVE',
        [Op.or]: [
          { section: normSec },
          { section: assignment.section },
          { section: `Section ${normSec}` },
          { section: { [Op.iLike]: `%${normSec}%` } },
        ],
      },
      include: [{ model: GoogleSheetTab, as: 'tabs' }],
    });

    if (!connection) {
      throw new Error(
        `No active Attendance spreadsheet is connected for Semester ${assignment.semester} Section ${assignment.section}. Contact your HOD.`
      );
    }

    // 3. Resolve exact Google Tab (e.g. CS301 for BCS301)
    let tab = (connection.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && connection.tabs?.length) {
      tab = connection.tabs[0];
    }

    if (!tab) {
      throw new Error(
        `Google Sheet Tab for ${(assignment as any).subject?.name} (${(assignment as any).subject?.code}) is not mapped.`
      );
    }

    const user = await User.findByPk(userId);
    const facultyAccess = await FacultyGoogleSheetAccess.findOne({
      where: {
        facultyId: userId,
        googleSheetConnectionId: connection.id,
      },
    });

    const googleAccount = await this.getFacultyGoogleOAuthStatus(userId);
    const deepLinkUrl = `https://docs.google.com/spreadsheets/d/${connection.googleSpreadsheetId}/edit#gid=${tab.googleSheetId}`;
    const embedUrl = `https://docs.google.com/spreadsheets/d/${connection.googleSpreadsheetId}/edit?gid=${tab.googleSheetId}`;

    const targetGoogleEmail = facultyAccess?.googleEmail || user?.email || '';
    const isGranted = facultyAccess?.status === 'GRANTED';
    const isWriter = (facultyAccess?.accessRole || 'writer') === 'writer';

    let accessStatus:
      | 'EDITOR_VERIFIED'
      | 'PENDING_BROWSER_AUTH'
      | 'VIEWER_ACCESS'
      | 'ACCOUNT_MISMATCH'
      | 'ACCESS_PENDING'
      | 'ACCESS_REVOKED'
      | 'GOOGLE_NOT_CONNECTED'
      | 'VERIFICATION_FAILED' = 'ACCESS_PENDING';
    let accessStatusLabel = 'Google Access Pending';

    if (facultyAccess?.status === 'REVOKED') {
      accessStatus = 'ACCESS_REVOKED';
      accessStatusLabel = 'Google Access Revoked';
    } else if (facultyAccess?.status === 'FAILED') {
      accessStatus = 'VERIFICATION_FAILED';
      accessStatusLabel = 'Access Verification Failed';
    } else if (googleAccount.connected && googleAccount.email) {
      if (googleAccount.email.toLowerCase() === targetGoogleEmail.toLowerCase()) {
        if (!isWriter) {
          accessStatus = 'VIEWER_ACCESS';
          accessStatusLabel = 'Viewer Access';
        } else {
          accessStatus = 'EDITOR_VERIFIED';
          accessStatusLabel = 'Editor Access Verified';
        }
      } else {
        accessStatus = 'ACCOUNT_MISMATCH';
        accessStatusLabel = `Account Mismatch (Granted to: ${targetGoogleEmail})`;
      }
    } else {
      if (isGranted) {
        if (isWriter) {
          accessStatus = 'PENDING_BROWSER_AUTH';
          accessStatusLabel = `Editor Permission Granted (${targetGoogleEmail})`;
        } else {
          accessStatus = 'VIEWER_ACCESS';
          accessStatusLabel = `Viewer Permission Granted (${targetGoogleEmail})`;
        }
      } else {
        accessStatus = 'ACCESS_PENDING';
        accessStatusLabel = 'Google Access Pending';
      }
    }

    // Diagnostic log for development tracking (NEVER logs tokens)
    logger.info('[FacultyAttendance] Authorized Sheet View Access Verified:', {
      facultyId: userId,
      facultyGoogleEmail: targetGoogleEmail,
      spreadsheetId: connection.googleSpreadsheetId,
      gid: tab.googleSheetId,
      permissionRole: facultyAccess?.accessRole || 'writer',
      permissionStatus: facultyAccess?.status || 'PENDING',
      accessStatus,
      accessStatusLabel,
    });

    // Read sheet values
    const facultyToken = await GoogleOAuthToken.findOne({
      where: { userId, status: 'ACTIVE' },
    });
    let accessToken = facultyToken?.encryptedAccessToken || undefined;
    if (!accessToken) {
      const deptToken = await GoogleOAuthToken.findOne({
        where: { departmentId: assignment.departmentId, status: 'ACTIVE' },
      });
      accessToken = deptToken?.encryptedAccessToken || undefined;
    }

    let rawRows: string[][] = [];
    let loadError: string | null = null;
    try {
      rawRows = await googleSheetsService.readSheetValues(
        connection.googleSpreadsheetId,
        tab.sheetTitle,
        accessToken
      );
    } catch (err: any) {
      logger.warn(`Failed reading sheet values for tab ${tab.sheetTitle}:`, err.message);
      loadError = err.message;
    }

    const headers = rawRows.length > 0 ? rawRows[0] : [];
    const dataRows = rawRows.length > 1 ? rawRows.slice(1) : [];

    return {
      spreadsheetTitle: `CSE_III_Sem_${normSec}_Div Attendance Workbook`,
      spreadsheetId: connection.googleSpreadsheetId,
      spreadsheetUrl: connection.googleSpreadsheetUrl,
      sheetTitle: tab.sheetTitle, // e.g. "CS301"
      sheetId: tab.googleSheetId, // GID e.g. "1097112166"
      subjectCode: (assignment as any).subject?.code || 'BCS301',
      subjectName: (assignment as any).subject?.name || 'ADA',
      semester: assignment.semester,
      section: assignment.section,
      academicYear: assignment.academicYear,
      departmentCode: (assignment as any).department?.code || 'CSE',
      googleAccountEmail: googleAccount.email,
      targetGoogleEmail,
      googleConnected: googleAccount.connected,
      accessStatus,
      accessStatusLabel,
      accessRole: facultyAccess?.accessRole || 'writer',
      isEditable: accessStatus === 'EDITOR_VERIFIED' || accessStatus === 'PENDING_BROWSER_AUTH',
      deepLinkUrl,
      embedUrl,
      grid: rawRows,
      columns: headers,
      rows: dataRows,
      loadError,
    };
  },

  /**
   * Updates attendance cell values in the real Google Sheet via Google Sheets API
   */
  async updateFacultyAttendanceSheetCells(
    userId: string,
    assignmentId: string,
    updates: Array<{
      cellAddress: string;
      value: string;
      oldValue?: string;
      studentUsn?: string;
      date?: string;
      row?: number;
      col?: number;
    }>,
    clientIp?: string,
    userAgent?: string
  ) {
    // 1. Strict Layer-1 Assignment Security Check
    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, userId, status: 'ACTIVE', attendanceAccess: true },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
    });

    if (!assignment) {
      throw new Error('Unauthorized: You do not have permission to edit this attendance sheet.');
    }

    const normSec = normalizeSection(assignment.section);

    const connection = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: 'ATTENDANCE',
        status: 'ACTIVE',
        [Op.or]: [
          { section: normSec },
          { section: assignment.section },
          { section: `Section ${normSec}` },
          { section: { [Op.iLike]: `%${normSec}%` } },
        ],
      },
      include: [{ model: GoogleSheetTab, as: 'tabs' }],
    });

    if (!connection) {
      throw new Error('No active attendance spreadsheet connected for this subject.');
    }

    let tab = (connection.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && connection.tabs?.length) {
      tab = connection.tabs[0];
    }

    if (!tab) {
      throw new Error(`Google tab mapping not found for ${(assignment as any).subject?.name}.`);
    }

    // 2. Validate values (0, 1, EX, or '')
    for (const u of updates) {
      const v = (u.value || '').trim().toUpperCase();
      if (v !== '0' && v !== '1' && v !== 'EX' && v !== 'PRESENT' && v !== 'ABSENT' && v !== '') {
        throw new Error(
          `Invalid attendance value "${u.value}". Attendance cells only accept 1 (Present), 0 (Absent), or EX.`
        );
      }
    }

    // 3. Resolve OAuth access token
    const facultyToken = await GoogleOAuthToken.findOne({
      where: { userId, status: 'ACTIVE' },
    });
    let accessToken = facultyToken?.encryptedAccessToken || undefined;
    if (!accessToken) {
      const deptToken = await GoogleOAuthToken.findOne({
        where: { departmentId: assignment.departmentId, status: 'ACTIVE' },
      });
      accessToken = deptToken?.encryptedAccessToken || undefined;
    }

    // 4. Update real Google Sheet via Google Sheets API batchUpdate
    const result = await googleSheetsService.updateSheetCellValues(
      connection.googleSpreadsheetId,
      tab.sheetTitle,
      updates,
      accessToken
    );

    // 5. Create immutable audit log entry
    try {
      await AuditLog.create({
        userId,
        action: 'FACULTY_GOOGLE_SHEET_ATTENDANCE_EDIT',
        ipAddress: clientIp || '127.0.0.1',
        userAgent: userAgent || 'JCER-ERP-Faculty',
        details: {
          assignmentId,
          spreadsheetId: connection.googleSpreadsheetId,
          tabTitle: tab.sheetTitle,
          tabGid: tab.googleSheetId,
          subjectCode: (assignment as any).subject?.code,
          updatesCount: updates.length,
          updates: updates.slice(0, 20), // Audit sample of modified cells
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr: any) {
      logger.warn('Failed creating audit log for sheet edit:', auditErr.message);
    }

    return {
      success: true,
      updatedCount: result.updatedCount,
      tabTitle: tab.sheetTitle,
      savedAt: new Date().toISOString(),
      message: 'All changes saved to Google Sheets',
    };
  },

  /**
   * Retrieves full in-app Google Sheet view data for a continuous assessment marks assignment
   */
  async getFacultyMarksSheetView(userId: string, assignmentId: string) {
    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, userId, status: 'ACTIVE', marksAccess: true },
      include: [
        { model: Subject, as: 'subject' },
        { model: Department, as: 'department' },
      ],
    });

    if (!assignment) {
      throw new Error('Unauthorized or inactive marks assignment. Access denied.');
    }

    const connection = await GoogleSheetConnection.findOne({
      where: {
        departmentId: assignment.departmentId,
        semester: assignment.semester,
        sheetType: { [Op.in]: ['ACADEMIC_MARKS', 'BITWISE_MARKS'] },
        status: 'ACTIVE',
      },
      include: [{ model: GoogleSheetTab, as: 'tabs' }],
    });

    if (!connection) {
      throw new Error(
        `No active Bitwise Marks spreadsheet is connected for Semester ${assignment.semester}. Contact your HOD.`
      );
    }

    let tab = (connection.tabs || []).find(
      (t: any) => t.subjectId === assignment.subjectId || t.subjectCode === (assignment as any).subject?.code
    );
    if (!tab && connection.tabs?.length) {
      tab = connection.tabs[0];
    }

    if (!tab) {
      throw new Error(
        `Google Sheet Tab for ${(assignment as any).subject?.name} (${(assignment as any).subject?.code}) is not mapped.`
      );
    }

    // Protection: NEVER expose master FINAL MARKS tab
    if (tab.sheetTitle.toUpperCase().includes('FINAL MARKS')) {
      throw new Error('Access denied to master administrative summary tab.');
    }

    const user = await User.findByPk(userId);
    const facultyAccess = await FacultyGoogleSheetAccess.findOne({
      where: {
        facultyId: userId,
        googleSheetConnectionId: connection.id,
      },
    });

    const googleAccount = await this.getFacultyGoogleOAuthStatus(userId);
    const deepLinkUrl = `https://docs.google.com/spreadsheets/d/${connection.googleSpreadsheetId}/edit#gid=${tab.googleSheetId}`;
    const embedUrl = `https://docs.google.com/spreadsheets/d/${connection.googleSpreadsheetId}/edit?gid=${tab.googleSheetId}`;

    const targetGoogleEmail = facultyAccess?.googleEmail || user?.email || '';
    const isGranted = facultyAccess?.status === 'GRANTED';
    const isWriter = (facultyAccess?.accessRole || 'writer') === 'writer';

    let accessStatus:
      | 'EDITOR_VERIFIED'
      | 'PENDING_BROWSER_AUTH'
      | 'VIEWER_ACCESS'
      | 'ACCOUNT_MISMATCH'
      | 'ACCESS_PENDING'
      | 'ACCESS_REVOKED'
      | 'GOOGLE_NOT_CONNECTED'
      | 'VERIFICATION_FAILED' = 'ACCESS_PENDING';
    let accessStatusLabel = 'Google Access Pending';

    if (facultyAccess?.status === 'REVOKED') {
      accessStatus = 'ACCESS_REVOKED';
      accessStatusLabel = 'Google Access Revoked';
    } else if (facultyAccess?.status === 'FAILED') {
      accessStatus = 'VERIFICATION_FAILED';
      accessStatusLabel = 'Access Verification Failed';
    } else if (googleAccount.connected && googleAccount.email) {
      if (googleAccount.email.toLowerCase() === targetGoogleEmail.toLowerCase()) {
        if (!isWriter) {
          accessStatus = 'VIEWER_ACCESS';
          accessStatusLabel = 'Viewer Access';
        } else {
          accessStatus = 'EDITOR_VERIFIED';
          accessStatusLabel = 'Editor Access Verified';
        }
      } else {
        accessStatus = 'ACCOUNT_MISMATCH';
        accessStatusLabel = `Account Mismatch (Granted to: ${targetGoogleEmail})`;
      }
    } else {
      if (isGranted) {
        if (isWriter) {
          accessStatus = 'PENDING_BROWSER_AUTH';
          accessStatusLabel = `Editor Permission Granted (${targetGoogleEmail})`;
        } else {
          accessStatus = 'VIEWER_ACCESS';
          accessStatusLabel = `Viewer Permission Granted (${targetGoogleEmail})`;
        }
      } else {
        accessStatus = 'ACCESS_PENDING';
        accessStatusLabel = 'Google Access Pending';
      }
    }

    const facultyToken = await GoogleOAuthToken.findOne({
      where: { userId, status: 'ACTIVE' },
    });
    let accessToken = facultyToken?.encryptedAccessToken || undefined;
    if (!accessToken) {
      const deptToken = await GoogleOAuthToken.findOne({
        where: { departmentId: assignment.departmentId, status: 'ACTIVE' },
      });
      accessToken = deptToken?.encryptedAccessToken || undefined;
    }

    let rawRows: string[][] = [];
    let loadError: string | null = null;
    try {
      rawRows = await googleSheetsService.readSheetValues(
        connection.googleSpreadsheetId,
        tab.sheetTitle,
        accessToken
      );
    } catch (err: any) {
      logger.warn(`Failed reading marks sheet values for tab ${tab.sheetTitle}:`, err.message);
      loadError = err.message;
    }

    const headers = rawRows.length > 0 ? rawRows[0] : [];
    const dataRows = rawRows.length > 1 ? rawRows.slice(1) : [];

    return {
      spreadsheetTitle: `1st INTERNAL ASSESSMENT MARKS 2025-26`,
      spreadsheetId: connection.googleSpreadsheetId,
      spreadsheetUrl: connection.googleSpreadsheetUrl,
      sheetTitle: tab.sheetTitle, // e.g. "MAT"
      sheetId: tab.googleSheetId,
      subjectCode: (assignment as any).subject?.code || 'BCS301',
      subjectName: (assignment as any).subject?.name || 'ADA',
      semester: assignment.semester,
      section: assignment.section,
      academicYear: assignment.academicYear,
      departmentCode: (assignment as any).department?.code || 'CSE',
      googleAccountEmail: googleAccount.email,
      targetGoogleEmail,
      googleConnected: googleAccount.connected,
      accessStatus,
      accessStatusLabel,
      accessRole: facultyAccess?.accessRole || 'writer',
      isEditable: accessStatus === 'EDITOR_VERIFIED' || accessStatus === 'PENDING_BROWSER_AUTH',
      deepLinkUrl,
      embedUrl,
      columns: headers,
      rows: dataRows,
      loadError,
    };
  },
};

export default facultyService;
