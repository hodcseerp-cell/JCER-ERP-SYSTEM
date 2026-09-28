import { Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import GoogleSheetConnection from '../models/GoogleSheetConnection';
import GoogleSheetTab from '../models/GoogleSheetTab';
import FacultyGoogleSheetAccess from '../models/FacultyGoogleSheetAccess';
import GoogleSheetSyncLog from '../models/GoogleSheetSyncLog';
import FacultyAssignment from '../models/FacultyAssignment';
import Subject from '../models/Subject';
import User from '../models/User';
import Department from '../models/Department';
import AuditLog from '../models/AuditLog';
import googleOAuthService from '../services/googleOAuth.service';
import googleSheetsService from '../services/googleSheets.service';
import logger from '../utils/logger.util';

import Section from '../models/Section';

/**
 * Helper to record structured audit logs
 */
async function recordAudit(req: AuthenticatedRequest, action: string, details: any) {
  try {
    await AuditLog.create({
      userId: req.user?.id || null,
      action,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      details: {
        departmentId: req.departmentId || null,
        role: req.user?.role || null,
        timestamp: new Date().toISOString(),
        ...details,
      },
    });
  } catch (err: any) {
    logger.warn('Failed to write audit log:', err.message);
  }
}

// ─── 1. Semester Google Sheets Endpoints ─────────────────────────────────────

/**
 * GET /api/hod/semesters/:semesterId/google-sheets
 * Returns Attendance and Academic Marks sheet connections for the specified semester.
 */
// Helper to normalize section (e.g., 'Division A', 'Section A', 'A' -> 'A')
const normalizeSection = (sec?: string | null): string => {
  if (!sec) return 'A';
  const clean = sec.trim().toUpperCase();
  if (clean.startsWith('DIVISION ')) return clean.replace('DIVISION ', '').trim();
  if (clean.startsWith('SECTION ')) return clean.replace('SECTION ', '').trim();
  return clean;
};

// ─── 1. Semester-Level Google Sheet Endpoints ─────────────────────────────────

/**
 * GET /api/hod/semesters/:semesterId/google-sheets
 * Retrieves connected Google Sheets and division-wise status for a semester.
 */
export const getSemesterGoogleSheets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const semester = parseInt(req.params.semesterId, 10);
    const academicYear = (req.query.academicYear as string) || '2026-27';
    const requestedSection = req.query.section ? normalizeSection(req.query.section as string) : undefined;

    if (isNaN(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ error: 'Valid semester (1-8) is required.' });
    }

    const connections = await GoogleSheetConnection.findAll({
      where: {
        departmentId,
        semester,
        academicYear,
        status: { [Op.ne]: 'DISCONNECTED' },
      },
      include: [
        {
          model: GoogleSheetTab,
          as: 'tabs',
          include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
        },
        { model: User, as: 'connectedByUser', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const formatConnection = (conn: any) =>
      conn
        ? {
            id: conn.id,
            sheetType: conn.sheetType,
            section: conn.section || 'A',
            spreadsheetId: conn.googleSpreadsheetId,
            spreadsheetUrl: conn.googleSpreadsheetUrl,
            accountEmail: conn.googleAccountEmail,
            status: conn.status,
            connectedAt: conn.connectedAt,
            lastSyncedAt: conn.lastSyncedAt,
            connectedBy: conn.connectedByUser,
            tabs: (conn.tabs || []).map((t: any) => ({
              id: t.id,
              sheetId: t.googleSheetId,
              title: t.sheetTitle,
              index: t.sheetIndex,
              sheetType: t.sheetType,
              subjectId: t.subjectId,
              subjectCode: t.subjectCode,
              status: t.status,
              mappedSubject: t.subject ? { id: t.subject.id, name: t.subject.name, code: t.subject.code } : null,
            })),
          }
        : null;

    // Fetch actual sections from database for this department and semester
    const startYear = academicYear.split(/[-–/]/)[0].trim();
    const deptDbSections = await Section.findAll({
      where: {
        departmentId,
        semester,
        status: 'ACTIVE',
      },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    const divisionSet = new Set<string>();
    deptDbSections.forEach((s) => {
      divisionSet.add(normalizeSection(s.name));
    });

    // Also include any sections present in active connections
    connections.forEach((c) => {
      if (c.sheetType === 'ATTENDANCE' && c.section) {
        divisionSet.add(normalizeSection(c.section));
      }
    });

    if (requestedSection) {
      divisionSet.add(normalizeSection(requestedSection));
    }

    // Default fallback if no sections in DB yet
    if (divisionSet.size === 0) {
      divisionSet.add('A');
      divisionSet.add('B');
    }

    const divisionsList = Array.from(divisionSet).sort((a, b) => a.localeCompare(b));
    const divisions = divisionsList.map((div) => {
      const conn = connections.find(
        (c) => c.sheetType === 'ATTENDANCE' && normalizeSection(c.section) === div
      );
      return {
        section: div,
        divisionName: `Division ${div}`,
        sectionName: `Section ${div}`,
        isConnected: Boolean(conn && conn.status === 'ACTIVE'),
        connection: formatConnection(conn),
      };
    });

    // Determine primary attendance connection based on requested section or first active
    let attendanceConnection: any = null;
    if (requestedSection) {
      attendanceConnection = connections.find(
        (c) => c.sheetType === 'ATTENDANCE' && normalizeSection(c.section) === requestedSection
      );
    }
    if (!attendanceConnection) {
      attendanceConnection = connections.find((c) => c.sheetType === 'ATTENDANCE') || null;
    }

    const marksConnection = connections.find((c) => c.sheetType === 'BITWISE_MARKS' || c.sheetType === 'ACADEMIC_MARKS') || null;

    return res.json({
      success: true,
      data: {
        semester,
        academicYear,
        divisions,
        attendance: formatConnection(attendanceConnection),
        attendanceConnections: connections.filter((c) => c.sheetType === 'ATTENDANCE').map(formatConnection),
        bitwiseMarks: formatConnection(marksConnection),
        marks: formatConnection(marksConnection),
        allConnections: connections.map(formatConnection),
      },
    });
  } catch (error) {
    logger.error('GET_SEMESTER_GOOGLE_SHEETS_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/semesters/:semesterId/google-sheets/attendance/batch
 * Connects multiple section-specific Attendance Google Sheets for a semester in one action.
 */
export const connectSemesterAttendanceSheetsBatch = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const semester = parseInt(req.params.semesterId, 10);
    const { connections, academicYear = '2026-27' } = req.body;

    if (isNaN(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ error: 'Valid semester (1-8) is required.' });
    }

    if (!Array.isArray(connections) || connections.length === 0) {
      return res.status(400).json({ error: 'At least one section connection is required.' });
    }

    // Validate no duplicate sections in the request
    const seenSections = new Set<string>();
    for (let i = 0; i < connections.length; i++) {
      const item = connections[i];
      if (!item.section || !String(item.section).trim()) {
        return res.status(400).json({ error: `Row ${i + 1}: Select a section.` });
      }
      if (!item.spreadsheetUrl || !String(item.spreadsheetUrl).trim()) {
        return res.status(400).json({ error: `Row ${i + 1}: Enter the Google Spreadsheet URL.` });
      }

      const normSec = normalizeSection(item.section);
      if (seenSections.has(normSec)) {
        return res.status(400).json({ error: 'Each section can have only one attendance sheet.' });
      }
      seenSections.add(normSec);

      const sId = googleSheetsService.extractSpreadsheetId(item.spreadsheetUrl);
      if (!sId) {
        return res.status(400).json({ error: `Row ${i + 1}: Enter a valid Google Sheets URL.` });
      }
    }

    // Check Google Account OAuth connection strictly for authenticated HOD user
    const currentUserId = req.user?.id || '';
    const authStatus = await googleOAuthService.getUserGoogleAccount(currentUserId);
    const tokenInfo = await googleOAuthService.getValidAccessTokenForUser(currentUserId);

    if (!authStatus.connected || !tokenInfo?.token) {
      return res.status(400).json({
        error: 'No active Google account connected for your HOD account. Please connect your Google account before linking spreadsheets.',
      });
    }

    const connectedEmail = authStatus.email || tokenInfo.email || req.user?.email || '';

    // Fetch department subjects for tab mapping
    const departmentSubjects = await Subject.findAll({
      where: { departmentId, semester },
    });

    const results: any[] = [];

    for (let i = 0; i < connections.length; i++) {
      const item = connections[i];
      const normSec = normalizeSection(item.section);
      const spreadsheetId = googleSheetsService.extractSpreadsheetId(item.spreadsheetUrl)!;

      // Validate Drive file, MIME type (XLSX check), and Sheets tab discovery
      const validation = await googleSheetsService.validateGoogleSpreadsheetAccess(
        spreadsheetId,
        tokenInfo.token,
        { id: authStatus.googleAccountId, email: connectedEmail }
      );

      if (validation.errorCode || !validation.supportedType || !validation.tabs || validation.tabs.length === 0) {
        logger.warn(`Spreadsheet validation failed for Section ${normSec}:`, validation);
        return res.status(400).json({
          error: `Section ${normSec}: ${validation.errorMessage || 'Unable to connect spreadsheet.'}`,
          diagnostic: validation,
        });
      }

      const sheetMetadata = {
        title: validation.file?.name || 'Spreadsheet',
        tabs: validation.tabs,
      };

      // Deactivate previous active connection for this semester + section
      const previousConnection = await GoogleSheetConnection.findOne({
        where: {
          departmentId,
          semester,
          academicYear,
          section: normSec,
          sheetType: 'ATTENDANCE',
          status: 'ACTIVE',
        },
      });

      if (previousConnection) {
        await previousConnection.update({
          status: 'DISCONNECTED',
          disconnectedBy: req.user?.id,
          disconnectedAt: new Date(),
        });
      }

      // Create GoogleSheetConnection record
      const connection = await GoogleSheetConnection.create({
        departmentId,
        academicYear,
        semester,
        section: normSec,
        sheetType: 'ATTENDANCE',
        googleSpreadsheetId: spreadsheetId,
        googleSpreadsheetUrl: item.spreadsheetUrl.trim(),
        googleAccountEmail: connectedEmail,
        status: 'ACTIVE',
        connectedBy: req.user?.id,
        connectedAt: new Date(),
      });

      // Create tabs
      const createdTabs: any[] = [];
      for (const tab of sheetMetadata.tabs) {
        const cleanUpper = tab.title.trim().toUpperCase();
        const isSpecialTab = cleanUpper.includes('FINAL MARKS') || cleanUpper === 'FINAL' || cleanUpper.includes('FORM RESPONSES');

        const tabNumberMatch = cleanUpper.match(/\d+/);
        const tabNumber = tabNumberMatch ? tabNumberMatch[0] : '';

        const matchedSubject = !isSpecialTab
          ? departmentSubjects.find((sub) => {
              const cleanCode = (sub.code || '').trim().toUpperCase();
              const cleanName = (sub.name || '').trim().toUpperCase();
              const codeNumberMatch = cleanCode.match(/\d+/);
              const codeNumber = codeNumberMatch ? codeNumberMatch[0] : '';

              return (
                cleanUpper === cleanCode ||
                cleanUpper.includes(cleanCode) ||
                cleanCode.includes(cleanUpper) ||
                cleanName.includes(cleanUpper) ||
                (Boolean(tabNumber) && Boolean(codeNumber) && tabNumber === codeNumber)
              );
            })
          : null;

        const tabRecord = await GoogleSheetTab.create({
          googleSheetConnectionId: connection.id,
          googleSpreadsheetId: connection.googleSpreadsheetId,
          googleSheetId: String(tab.sheetId),
          sheetTitle: tab.title,
          sheetIndex: tab.index,
          sheetType: isSpecialTab ? 'SPECIAL' : 'SUBJECT',
          subjectId: matchedSubject?.id || null,
          subjectCode: matchedSubject?.code || (isSpecialTab ? null : tab.title),
          status: matchedSubject ? 'MAPPED' : isSpecialTab ? 'IGNORED' : 'UNMAPPED',
          isHidden: tab.hidden,
        });

        createdTabs.push({
          id: tabRecord.id,
          sheetId: tabRecord.googleSheetId,
          title: tabRecord.sheetTitle,
          index: tabRecord.sheetIndex,
          sheetType: tabRecord.sheetType,
          subjectId: tabRecord.subjectId,
          subjectCode: tabRecord.subjectCode,
          status: tabRecord.status,
          mappedSubject: matchedSubject ? { id: matchedSubject.id, name: matchedSubject.name, code: matchedSubject.code } : null,
        });
      }

      results.push({
        connection: {
          id: connection.id,
          section: normSec,
          sheetType: 'ATTENDANCE',
          spreadsheetId: connection.googleSpreadsheetId,
          spreadsheetUrl: connection.googleSpreadsheetUrl,
          accountEmail: connection.googleAccountEmail,
          status: connection.status,
          connectedAt: connection.connectedAt,
        },
        tabs: createdTabs,
      });
    }

    await recordAudit(req, 'GOOGLE_SHEET_ATTENDANCE_BATCH_CONNECTED', {
      semester,
      academicYear,
      connectedCount: results.length,
      sections: Array.from(seenSections),
    });

    return res.status(201).json({
      success: true,
      message: `Successfully connected Attendance Google Sheets for ${results.length} section(s).`,
      data: results,
    });
  } catch (error) {
    logger.error('CONNECT_SEMESTER_ATTENDANCE_BATCH_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/semesters/:semesterId/google-sheets/connect
 * Connects an Attendance or Academic/Bitwise Marks Google Sheet for a semester + division and auto-discovers tabs.
 */
export const connectSemesterGoogleSheet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const semester = parseInt(req.params.semesterId, 10);
    const { spreadsheetUrl, sheetType, academicYear = '2026-27', section = 'A' } = req.body;
    const normalizedSec = normalizeSection(section);

    if (isNaN(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({ error: 'Valid semester (1-8) is required.' });
    }

    if (!spreadsheetUrl || !sheetType || !['ATTENDANCE', 'ACADEMIC_MARKS', 'BITWISE_MARKS'].includes(sheetType)) {
      return res.status(400).json({ error: 'Spreadsheet URL and valid Sheet Type (ATTENDANCE | BITWISE_MARKS | ACADEMIC_MARKS) are required.' });
    }

    const spreadsheetId = googleSheetsService.extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Invalid Google Spreadsheet URL or ID.' });
    }

    // Check Google Account OAuth connection strictly for authenticated HOD user
    const currentUserId = req.user?.id || '';
    const authStatus = await googleOAuthService.getUserGoogleAccount(currentUserId);
    const tokenInfo = await googleOAuthService.getValidAccessTokenForUser(currentUserId);

    if (!authStatus.connected || !tokenInfo?.token) {
      return res.status(400).json({
        error: 'No active Google account connected for your HOD account. Please connect your Google account before linking spreadsheets.',
      });
    }

    const connectedEmail = authStatus.email || tokenInfo.email || req.user?.email || '';

    // Validate Drive file, MIME type (XLSX check), and Sheets tab discovery
    const validation = await googleSheetsService.validateGoogleSpreadsheetAccess(
      spreadsheetId,
      tokenInfo.token,
      { id: authStatus.googleAccountId, email: connectedEmail }
    );

    if (validation.errorCode || !validation.supportedType || !validation.tabs || validation.tabs.length === 0) {
      logger.warn('Spreadsheet validation failed:', validation);
      return res.status(400).json({
        error: validation.errorMessage || 'Unable to connect spreadsheet.',
        diagnostic: validation,
      });
    }

    const sheetMetadata = {
      title: validation.file?.name || 'Spreadsheet',
      tabs: validation.tabs,
    };

    // Fetch department subjects to automatically map tabs
    const departmentSubjects = await Subject.findAll({
      where: { departmentId, semester },
    });

    // Normalize sheetType lookup for previous connection
    const targetSheetTypes = sheetType === 'ATTENDANCE' ? ['ATTENDANCE'] : ['BITWISE_MARKS', 'ACADEMIC_MARKS'];

    // Deactivate previous active connection of this type for this semester + section
    const previousConnectionWhere: any = {
      departmentId,
      semester,
      academicYear,
      sheetType: { [Op.in]: targetSheetTypes },
      status: 'ACTIVE',
    };
    if (sheetType === 'ATTENDANCE') {
      previousConnectionWhere.section = normalizedSec;
    }

    const previousConnection = await GoogleSheetConnection.findOne({
      where: previousConnectionWhere,
    });

    if (previousConnection) {
      await previousConnection.update({
        status: 'DISCONNECTED',
        disconnectedBy: req.user?.id,
        disconnectedAt: new Date(),
      });
    }

    // Create new GoogleSheetConnection record
    const connection = await GoogleSheetConnection.create({
      departmentId,
      academicYear,
      semester,
      section: normalizedSec,
      sheetType,
      googleSpreadsheetId: spreadsheetId,
      googleSpreadsheetUrl: spreadsheetUrl,
      googleAccountEmail: connectedEmail,
      status: 'ACTIVE',
      connectedBy: req.user?.id,
      connectedAt: new Date(),
    });

    // Create tabs and auto-map
    const createdTabs: any[] = [];
    for (const tab of sheetMetadata.tabs) {
      const cleanUpper = tab.title.trim().toUpperCase();
      const isFinalMarksTab = cleanUpper.includes('FINAL MARKS') || cleanUpper === 'FINAL';
      const isFormResponseTab = cleanUpper.includes('FORM RESPONSES');
      const isSpecialTab = isFinalMarksTab || isFormResponseTab;

      const tabNumberMatch = cleanUpper.match(/\d+/);
      const tabNumber = tabNumberMatch ? tabNumberMatch[0] : '';

      // Find matching subject by exact code or substring match or numeric match (e.g. CS301 -> BCS301)
      const matchedSubject = !isSpecialTab
        ? departmentSubjects.find((sub) => {
            const cleanCode = (sub.code || '').trim().toUpperCase();
            const cleanName = (sub.name || '').trim().toUpperCase();
            const codeNumberMatch = cleanCode.match(/\d+/);
            const codeNumber = codeNumberMatch ? codeNumberMatch[0] : '';

            return (
              cleanUpper === cleanCode ||
              cleanUpper.includes(cleanCode) ||
              cleanCode.includes(cleanUpper) ||
              cleanName.includes(cleanUpper) ||
              (Boolean(tabNumber) && Boolean(codeNumber) && tabNumber === codeNumber)
            );
          })
        : null;

      const tabRecord = await GoogleSheetTab.create({
        googleSheetConnectionId: connection.id,
        googleSpreadsheetId: connection.googleSpreadsheetId,
        googleSheetId: String(tab.sheetId),
        sheetTitle: tab.title,
        sheetIndex: tab.index,
        sheetType: isSpecialTab ? 'SPECIAL' : 'SUBJECT',
        subjectId: matchedSubject?.id || null,
        subjectCode: matchedSubject?.code || (isSpecialTab ? null : tab.title),
        status: matchedSubject ? 'MAPPED' : isSpecialTab ? 'IGNORED' : 'UNMAPPED',
        isHidden: tab.hidden,
      });

      createdTabs.push({
        id: tabRecord.id,
        sheetId: tabRecord.googleSheetId,
        googleSpreadsheetId: tabRecord.googleSpreadsheetId,
        title: tabRecord.sheetTitle,
        index: tabRecord.sheetIndex,
        subjectId: tabRecord.subjectId,
        subjectCode: tabRecord.subjectCode,
        status: tabRecord.status,
        mappedSubject: matchedSubject ? { id: matchedSubject.id, name: matchedSubject.name, code: matchedSubject.code } : null,
      });
    }

    await recordAudit(req, previousConnection ? 'GOOGLE_SHEET_RECONNECTED' : 'GOOGLE_SHEET_CONNECTED', {
      semester,
      section: normalizedSec,
      sheetType,
      spreadsheetId,
      tabsCount: createdTabs.length,
      previousConnectionId: previousConnection?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: `${sheetType === 'ATTENDANCE' ? `Division ${normalizedSec} Attendance` : 'Academic Marks'} Google Sheet connected successfully.`,
      data: {
        connection: {
          id: connection.id,
          sheetType: connection.sheetType,
          section: connection.section,
          spreadsheetId: connection.googleSpreadsheetId,
          spreadsheetUrl: connection.googleSpreadsheetUrl,
          accountEmail: connection.googleAccountEmail,
          status: connection.status,
          connectedAt: connection.connectedAt,
        },
        tabs: createdTabs,
      },
    });
  } catch (error) {
    logger.error('CONNECT_SEMESTER_GOOGLE_SHEET_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/hod/semesters/:semesterId/google-sheets/tabs
 */
export const getSemesterGoogleSheetTabs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const semester = parseInt(req.params.semesterId, 10);
    const { sheetType = 'ATTENDANCE', academicYear = '2026-27', section = 'A' } = req.query;
    const normalizedSec = normalizeSection(section as string);

    const whereClause: any = {
      departmentId,
      semester,
      academicYear: academicYear as string,
      sheetType: sheetType as any,
      status: 'ACTIVE',
    };
    if (sheetType === 'ATTENDANCE') {
      whereClause.section = normalizedSec;
    }

    let connection = await GoogleSheetConnection.findOne({
      where: whereClause,
      include: [
        {
          model: GoogleSheetTab,
          as: 'tabs',
          include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
        },
      ],
    });

    // Fallback if specific section not found but another section exists
    if (!connection && sheetType === 'ATTENDANCE') {
      connection = await GoogleSheetConnection.findOne({
        where: {
          departmentId,
          semester,
          academicYear: academicYear as string,
          sheetType: 'ATTENDANCE',
          status: 'ACTIVE',
        },
        include: [
          {
            model: GoogleSheetTab,
            as: 'tabs',
            include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
          },
        ],
      });
    }

    if (!connection) {
      return res.json({ success: true, data: { isConnected: false, tabs: [] } });
    }

    return res.json({
      success: true,
      data: {
        isConnected: true,
        connectionId: connection.id,
        section: connection.section,
        spreadsheetUrl: connection.googleSpreadsheetUrl,
        tabs: connection.tabs,
      },
    });
  } catch (error) {
    logger.error('GET_SEMESTER_GOOGLE_SHEET_TABS_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/google-sheets/:connectionId/map-tab
 * Maps a discovered tab to an ERP Subject
 */
export const mapGoogleSheetTab = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const { connectionId } = req.params;
    const { tabId, subjectId } = req.body;

    const connection = await GoogleSheetConnection.findOne({
      where: { id: connectionId, departmentId, status: 'ACTIVE' },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found in department scope.' });
    }

    const tab = await GoogleSheetTab.findOne({
      where: { id: tabId, googleSheetConnectionId: connection.id },
    });

    if (!tab) {
      return res.status(404).json({ error: 'Tab record not found.' });
    }

    if (subjectId === 'IGNORED') {
      await tab.update({
        subjectId: null,
        subjectCode: null,
        status: 'IGNORED',
      });
      return res.json({
        success: true,
        message: 'Tab marked as Ignored / System tab.',
        data: tab,
      });
    }

    if (!subjectId || subjectId === 'UNMAPPED') {
      await tab.update({
        subjectId: null,
        subjectCode: null,
        status: 'UNMAPPED',
      });
      return res.json({
        success: true,
        message: 'Tab unmapped.',
        data: tab,
      });
    }

    const subject = await Subject.findOne({
      where: {
        id: subjectId,
        departmentId,
        semester: connection.semester,
      },
    });
    if (!subject) {
      return res.status(400).json({ error: `Subject not found for Semester ${connection.semester} in department scope.` });
    }

    // Verify no duplicate mapping across tabs within the same spreadsheet
    const existingDuplicate = await GoogleSheetTab.findOne({
      where: {
        googleSheetConnectionId: connection.id,
        subjectId: subject.id,
        id: { [Op.ne]: tab.id },
      },
    });
    if (existingDuplicate) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_SUBJECT_MAPPING',
        message: `Subject ${subject.name} (${subject.code}) is already mapped to tab "${existingDuplicate.sheetTitle}". Each tab must map to a unique ERP subject.`,
      });
    }

    await tab.update({
      subjectId: subject.id,
      subjectCode: subject.code,
      status: 'MAPPED',
    });

    // Create or update google_sheet_resources record (Requirement 14 Step 9)
    try {
      const assignment = await FacultyAssignment.findOne({
        where: {
          subjectId: subject.id,
          departmentId,
          semester: connection.semester,
        },
      });

      const GoogleSheetResource = (await import('../models/GoogleSheetResource')).default;
      await GoogleSheetResource.create({
        facultyAssignmentId: assignment?.id || null,
        sheetType: connection.sheetType,
        googleSpreadsheetId: connection.googleSpreadsheetId,
        googleSheetTabId: tab.googleSheetId,
        sheetUrl: connection.googleSpreadsheetUrl,
        status: 'MAPPED',
      });
    } catch (resourceErr) {
      logger.warn('GOOGLE_SHEET_RESOURCE_CREATE_NOTICE:', resourceErr);
    }

    return res.json({
      success: true,
      message: `Tab mapped to ${subject.name} (${subject.code})`,
      data: tab,
    });
  } catch (error) {
    logger.error('MAP_GOOGLE_SHEET_TAB_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/google-sheets/:connectionId/refresh
 * Refreshes tab list from Google Sheets API
 */
export const refreshGoogleSheet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const { connectionId } = req.params;

    const connection = await GoogleSheetConnection.findOne({
      where: { id: connectionId, departmentId, status: 'ACTIVE' },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Active Google Sheet connection not found.' });
    }

    const tokenInfo = await googleOAuthService.getValidAccessTokenForUser(req.user?.id || '', departmentId || undefined);
    if (!tokenInfo?.token) {
      return res.status(400).json({ error: 'No active Google account connected. Please connect your Google account.' });
    }

    const validation = await googleSheetsService.validateGoogleSpreadsheetAccess(
      connection.googleSpreadsheetId,
      tokenInfo.token,
      { email: tokenInfo.email }
    );

    if (validation.errorCode || !validation.supportedType || !validation.tabs || validation.tabs.length === 0) {
      return res.status(400).json({
        error: validation.errorMessage || 'Unable to refresh tabs from Google Sheets.',
        diagnostic: validation,
      });
    }

    const sheetMetadata = {
      title: validation.file?.name || 'Spreadsheet',
      tabs: validation.tabs,
    };

    const departmentSubjects = await Subject.findAll({
      where: { departmentId, semester: connection.semester },
    });

    const currentGids = sheetMetadata.tabs.map((t) => String(t.sheetId));

    // Remove any stale tabs no longer present in Google spreadsheet
    await GoogleSheetTab.destroy({
      where: {
        googleSheetConnectionId: connection.id,
        googleSheetId: { [Op.notIn]: currentGids },
      },
    });

    // Update existing tabs or create new ones
    for (const tab of sheetMetadata.tabs) {
      let existingTab = await GoogleSheetTab.findOne({
        where: { googleSheetConnectionId: connection.id, googleSheetId: String(tab.sheetId) },
      });

      if (existingTab) {
        await existingTab.update({
          googleSpreadsheetId: connection.googleSpreadsheetId,
          sheetTitle: tab.title,
          sheetIndex: tab.index,
          isHidden: tab.hidden,
        });
      } else {
        const cleanUpper = tab.title.trim().toUpperCase();
        const tabNumberMatch = cleanUpper.match(/\d+/);
        const tabNumber = tabNumberMatch ? tabNumberMatch[0] : '';

        const matchedSubject = departmentSubjects.find((sub) => {
          const cleanCode = (sub.code || '').trim().toUpperCase();
          const cleanName = (sub.name || '').trim().toUpperCase();
          const codeNumberMatch = cleanCode.match(/\d+/);
          const codeNumber = codeNumberMatch ? codeNumberMatch[0] : '';

          return (
            cleanUpper === cleanCode ||
            cleanUpper.includes(cleanCode) ||
            cleanCode.includes(cleanUpper) ||
            cleanName.includes(cleanUpper) ||
            (Boolean(tabNumber) && Boolean(codeNumber) && tabNumber === codeNumber)
          );
        });

        const isSpecialTab =
          cleanUpper.includes('FINAL MARKS') ||
          cleanUpper === 'FINAL' ||
          cleanUpper.includes('FORM RESPONSES');

        await GoogleSheetTab.create({
          googleSheetConnectionId: connection.id,
          googleSpreadsheetId: connection.googleSpreadsheetId,
          googleSheetId: String(tab.sheetId),
          sheetTitle: tab.title,
          sheetIndex: tab.index,
          sheetType: isSpecialTab ? 'SPECIAL' : 'SUBJECT',
          subjectId: matchedSubject?.id || null,
          subjectCode: matchedSubject?.code || (isSpecialTab ? null : tab.title),
          status: matchedSubject ? 'MAPPED' : isSpecialTab ? 'IGNORED' : 'UNMAPPED',
          isHidden: tab.hidden,
        });
      }
    }

    const updatedTabs = await GoogleSheetTab.findAll({
      where: { googleSheetConnectionId: connection.id },
      include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
      order: [['sheetIndex', 'ASC']],
    });

    await recordAudit(req, 'GOOGLE_SHEET_REFRESHED', { connectionId, tabsCount: updatedTabs.length });

    return res.json({
      success: true,
      message: 'Google Sheet tabs refreshed successfully.',
      data: { connection, tabs: updatedTabs },
    });
  } catch (error) {
    logger.error('REFRESH_GOOGLE_SHEET_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/google-sheets/:connectionId/disconnect
 * Marks connection as DISCONNECTED without deleting historical attendance/marks.
 */
export const disconnectGoogleSheet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const { connectionId } = req.params;

    const connection = await GoogleSheetConnection.findOne({
      where: { id: connectionId, departmentId },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found in department scope.' });
    }

    await connection.update({
      status: 'DISCONNECTED',
      disconnectedBy: req.user?.id,
      disconnectedAt: new Date(),
    });

    await recordAudit(req, 'GOOGLE_SHEET_DISCONNECTED', {
      connectionId,
      semester: connection.semester,
      section: connection.section,
      sheetType: connection.sheetType,
    });

    return res.json({
      success: true,
      message: 'Google Sheet disconnected successfully. Historical records preserved.',
    });
  } catch (error) {
    logger.error('DISCONNECT_GOOGLE_SHEET_ERROR:', error);
    return next(error);
  }
};

// ─── 2. Faculty Google Access Endpoints ──────────────────────────────────────

/**
 * GET /api/hod/faculty/google-sheet-access
 * Matrix of faculty assignments with Drive permission statuses.
 */
export const getFacultyGoogleSheetAccessMatrix = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;
    const { academicYear, semester, section, facultyId, subjectId } = req.query;

    const assignmentWhere: any = { departmentId };
    if (academicYear) assignmentWhere.academicYear = academicYear;
    if (semester && semester !== 'ALL') assignmentWhere.semester = parseInt(semester as string, 10);
    if (section && section !== 'ALL') assignmentWhere.section = normalizeSection(section as string);
    if (facultyId && facultyId !== 'ALL') assignmentWhere.userId = facultyId;
    if (subjectId && subjectId !== 'ALL') assignmentWhere.subjectId = subjectId;

    const assignments = await FacultyAssignment.findAll({
      where: assignmentWhere,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        {
          model: FacultyGoogleSheetAccess,
          as: 'googleSheetAccesses',
          include: [{ model: GoogleSheetConnection, as: 'googleSheetConnection' }],
        },
      ],
      order: [['semester', 'ASC'], ['section', 'ASC']],
    });

    // Check connected sheets for each semester & section
    const activeConnections = await GoogleSheetConnection.findAll({
      where: { departmentId, status: 'ACTIVE' },
    });

    const matrix = assignments.map((a: any) => {
      const aSec = normalizeSection(a.section);
      const attConnection = activeConnections.find(
        (c) =>
          c.semester === a.semester &&
          c.sheetType === 'ATTENDANCE' &&
          normalizeSection(c.section) === aSec
      ) || activeConnections.find(
        (c) => c.semester === a.semester && c.sheetType === 'ATTENDANCE'
      );

      const marksConnection = activeConnections.find(
        (c) => c.semester === a.semester && c.sheetType === 'ACADEMIC_MARKS'
      );

      const accesses = a.googleSheetAccesses || [];
      const primaryAccess = accesses[0] || null;

      // Status determination
      let overallDriveStatus = 'NOT_GRANTED';
      if (primaryAccess) {
        overallDriveStatus = primaryAccess.status;
      } else if (a.googleSheetsAccess) {
        overallDriveStatus = 'PENDING';
      }

      return {
        assignmentId: a.id,
        facultyId: a.userId,
        facultyName: `${a.user?.firstName || ''} ${a.user?.lastName || ''}`.trim() || 'Faculty',
        facultyEmail: a.user?.email,
        googleEmail: primaryAccess?.googleEmail || a.user?.email,
        subjectId: a.subject?.id,
        subjectName: a.subject?.name,
        subjectCode: a.subject?.code,
        semester: a.semester,
        section: a.section || 'A',
        academicYear: a.academicYear,
        attendanceAccess: a.attendanceAccess,
        marksAccess: a.marksAccess,
        googleSheetsAccess: a.googleSheetsAccess,
        googleAccessId: primaryAccess?.id || null,
        permissionId: primaryAccess?.permissionId || null,
        permissionStatus: primaryAccess?.status || 'PENDING',
        status: a.status,
        attendanceSheetConnected: Boolean(attConnection),
        marksSheetConnected: Boolean(marksConnection),
        attendanceSpreadsheetUrl: attConnection?.googleSpreadsheetUrl || null,
        marksSpreadsheetUrl: marksConnection?.googleSpreadsheetUrl || null,
        lastVerifiedAt: primaryAccess?.lastVerifiedAt || null,
      };
    });

    return res.json({ success: true, data: matrix });
  } catch (error) {
    logger.error('GET_FACULTY_GOOGLE_SHEET_ACCESS_MATRIX_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/faculty/:facultyId/google-sheet-access
 * Grants or updates Google Sheet permission for faculty assignment with deduplication.
 */
export const grantFacultyGoogleSheetAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = (req.departmentId || '') as string;
    const { facultyId } = req.params;
    const {
      assignmentId,
      googleEmail,
      attendanceAccess,
      marksAccess,
      role = 'writer',
    } = req.body;

    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, departmentId, userId: facultyId },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Faculty teaching allocation not found in your department scope.' });
    }

    const facultyUser = await User.findByPk(facultyId);
    const targetGoogleEmail = (googleEmail || facultyUser?.email || '').trim();

    if (!targetGoogleEmail) {
      return res.status(400).json({ error: 'Faculty Google email address is required.' });
    }

    // Update assignment toggles
    await assignment.update({
      ...(attendanceAccess !== undefined ? { attendanceAccess: Boolean(attendanceAccess) } : {}),
      ...(marksAccess !== undefined ? { marksAccess: Boolean(marksAccess) } : {}),
      googleSheetsAccess: true,
    });

    const targetSection = normalizeSection(assignment.section);

    // Find active connections for this semester + section
    const connections = await GoogleSheetConnection.findAll({
      where: {
        departmentId,
        semester: assignment.semester,
        academicYear: assignment.academicYear,
        status: 'ACTIVE',
        [Op.or]: [
          { sheetType: 'ACADEMIC_MARKS' },
          { sheetType: 'ATTENDANCE', section: targetSection },
          { sheetType: 'ATTENDANCE', section: null },
        ],
      },
    });

    const tokenInfo = await googleOAuthService.getValidAccessToken(departmentId);
    const results: any[] = [];

    for (const conn of connections) {
      // Deduplication: Check if access record with valid permissionId already exists for this faculty and connection
      const existingAccessForConn = await FacultyGoogleSheetAccess.findOne({
        where: {
          facultyId,
          googleSheetConnectionId: conn.id,
          permissionId: { [Op.ne]: null },
          status: 'GRANTED',
        },
      });

      let accessRecord = await FacultyGoogleSheetAccess.findOne({
        where: {
          facultyId,
          facultyAssignmentId: assignment.id,
          googleSheetConnectionId: conn.id,
        },
      });

      let permissionId = existingAccessForConn?.permissionId || null;
      let driveStatus: 'GRANTED' | 'PENDING' | 'FAILED' = existingAccessForConn ? 'GRANTED' : 'PENDING';
      let failureReason: string | null = null;

      if (!existingAccessForConn) {
        // Call Google Drive API to share spreadsheet
        const driveRes = await googleSheetsService.grantDrivePermission(
          conn.googleSpreadsheetId,
          targetGoogleEmail,
          role,
          tokenInfo?.token
        );
        permissionId = driveRes.permissionId || null;
        driveStatus = driveRes.status as any;
        failureReason = driveRes.error || null;
      }

      if (accessRecord) {
        await accessRecord.update({
          section: targetSection,
          googleEmail: targetGoogleEmail,
          permissionId: permissionId || accessRecord.permissionId,
          accessRole: role,
          status: driveStatus,
          grantedAt: driveStatus === 'GRANTED' ? new Date() : accessRecord.grantedAt,
          lastVerifiedAt: new Date(),
          grantedBy: req.user?.id,
          failureReason,
        });
      } else {
        accessRecord = await FacultyGoogleSheetAccess.create({
          facultyId,
          facultyAssignmentId: assignment.id,
          googleSheetConnectionId: conn.id,
          section: targetSection,
          googleEmail: targetGoogleEmail,
          permissionId,
          accessRole: role,
          status: driveStatus,
          invitationSentAt: new Date(),
          grantedAt: driveStatus === 'GRANTED' ? new Date() : null,
          lastVerifiedAt: new Date(),
          grantedBy: req.user?.id,
          failureReason,
        });
      }

      results.push({
        connectionId: conn.id,
        sheetType: conn.sheetType,
        section: conn.section,
        status: driveStatus,
        permissionId,
        reusedPermission: Boolean(existingAccessForConn),
      });
    }

    await recordAudit(req, 'FACULTY_GOOGLE_ACCESS_GRANTED', {
      facultyId,
      assignmentId,
      section: targetSection,
      googleEmail: targetGoogleEmail,
      results,
    });

    return res.json({
      success: true,
      message: 'Google Sheet access granted and Drive sharing invitation dispatched.',
      data: { assignment, results },
    });
  } catch (error) {
    logger.error('GRANT_FACULTY_GOOGLE_SHEET_ACCESS_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/faculty/:facultyId/google-sheet-access/verify
 * Verifies permission existence in Google Drive API.
 */
export const verifyFacultyGoogleSheetAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = (req.departmentId || '') as string;
    const { facultyId } = req.params;
    const { accessId, assignmentId } = req.body;

    const accessWhere: any = { facultyId };
    if (accessId) accessWhere.id = accessId;
    if (assignmentId) accessWhere.facultyAssignmentId = assignmentId;

    const accesses = await FacultyGoogleSheetAccess.findAll({
      where: accessWhere,
      include: [{ model: GoogleSheetConnection, as: 'googleSheetConnection' }],
    });

    const tokenInfo = await googleOAuthService.getValidAccessToken(departmentId);
    const verifiedList: any[] = [];

    for (const acc of accesses) {
      if (acc.googleSheetConnection && acc.permissionId) {
        const verifyRes = await googleSheetsService.verifyDrivePermission(
          acc.googleSheetConnection.googleSpreadsheetId,
          acc.permissionId,
          tokenInfo?.token
        );

        const newStatus = verifyRes.exists ? 'GRANTED' : 'REVOKED';
        await acc.update({
          status: newStatus,
          lastVerifiedAt: new Date(),
        });

        verifiedList.push({ id: acc.id, status: newStatus, role: verifyRes.role });
      }
    }

    return res.json({
      success: true,
      message: 'Drive permissions verified with Google API.',
      data: verifiedList,
    });
  } catch (error) {
    logger.error('VERIFY_FACULTY_GOOGLE_ACCESS_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/faculty/:facultyId/google-sheet-access/revoke
 * Revokes Google Drive sharing permission for faculty.
 */
export const revokeFacultyGoogleSheetAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = (req.departmentId || '') as string;
    const { facultyId } = req.params;
    const { assignmentId } = req.body;

    const assignment = await FacultyAssignment.findOne({
      where: { id: assignmentId, departmentId, userId: facultyId },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found in department scope.' });
    }

    await assignment.update({ googleSheetsAccess: false });

    const accesses = await FacultyGoogleSheetAccess.findAll({
      where: { facultyId, facultyAssignmentId: assignmentId },
      include: [{ model: GoogleSheetConnection, as: 'googleSheetConnection' }],
    });

    const tokenInfo = await googleOAuthService.getValidAccessToken(departmentId);

    for (const acc of accesses) {
      if (acc.googleSheetConnection && acc.permissionId) {
        await googleSheetsService.revokeDrivePermission(
          acc.googleSheetConnection.googleSpreadsheetId,
          acc.permissionId,
          tokenInfo?.token
        );
      }
      await acc.update({
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: req.user?.id,
      });
    }

    await recordAudit(req, 'FACULTY_GOOGLE_ACCESS_REVOKED', { facultyId, assignmentId });

    return res.json({
      success: true,
      message: 'Google Sheet access revoked successfully.',
    });
  } catch (error) {
    logger.error('REVOKE_FACULTY_GOOGLE_ACCESS_ERROR:', error);
    return next(error);
  }
};

// ─── 3. Google OAuth & Account Endpoints ────────────────────────────────────

/**
 * GET /api/google/account
 * GET /api/google/oauth/status
 * Retrieves the Google account currently connected to the authenticated ERP user/HOD.
 */
export const getCurrentUserGoogleAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id || '';
    const departmentId = (req.departmentId || '') as string;
    const status = await googleOAuthService.getUserGoogleAccount(userId, departmentId);
    return res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('GET_CURRENT_USER_GOOGLE_ACCOUNT_ERROR:', error);
    return next(error);
  }
};

export const getGoogleOAuthStatus = getCurrentUserGoogleAccount;

/**
 * GET /api/google/oauth/auth-url
 * Generates OAuth URL with prompt=consent select_account to force Google account selection.
 */
export const getGoogleOAuthAuthUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id || '';
    const departmentId = (req.departmentId || '') as string;
    const forceSelect = req.query.forceSelect !== 'false';
    const authUrl = googleOAuthService.getOAuthAuthUrl(userId, departmentId, undefined, forceSelect);
    return res.json({ success: true, data: { authUrl } });
  } catch (error) {
    logger.error('GET_GOOGLE_OAUTH_AUTH_URL_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/google/oauth/mock-connect
 * Developer & test OAuth flow simulation
 */
export const mockConnectGoogleOAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const state = (req.query.state as string) || '';
    const verifiedState = googleOAuthService.verifyOAuthState(state);
    const targetUserId = verifiedState?.userId || req.user?.id;
    const targetDeptId = verifiedState?.departmentId || req.departmentId;

    if (!targetUserId) {
      return res.status(401).send('Unauthorized: Cannot resolve ERP user.');
    }

    const erpUser = await User.findByPk(targetUserId);
    const userFullName = erpUser ? `${erpUser.firstName || ''} ${erpUser.lastName || ''}`.trim() : 'HOD User';
    const userDefaultEmail = erpUser?.email || 'hod@college.edu';

    const mockEmail = (req.query.email as string) || userDefaultEmail;
    const mockProfile = {
      googleAccountId: `google_${targetUserId}`,
      displayName: userFullName || mockEmail.split('@')[0],
      profilePicture: undefined,
    };

    await googleOAuthService.saveUserToken(
      targetUserId,
      mockEmail,
      `mock-access-token-${Date.now()}`,
      `mock-refresh-token-${Date.now()}`,
      3600,
      targetDeptId,
      mockProfile
    );

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Account Authentication</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; }
            .card { background: white; padding: 32px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; border: 1px solid #e2e8f0; }
            .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #ecfdf5; color: #059669; font-weight: 700; font-size: 12px; border-radius: 9999px; margin-top: 12px; }
            .email { font-family: monospace; font-size: 14px; font-weight: 700; color: #1e293b; margin: 12px 0 6px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <svg style="width: 48px; height: 48px; margin: 0 auto 12px auto;" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h3 style="margin: 0; font-size: 18px;">Google Account Connected</h3>
            <div class="email">${mockEmail}</div>
            <div class="badge">🟢 Authorized with Google</div>
            <p style="font-size: 12px; color: #64748b; margin-top: 16px;">This popup will close automatically...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', email: '${mockEmail}' }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                setTimeout(() => { window.location.href = '/hod/students?oauth_callback=true'; }, 1500);
              }
            } catch(e) {
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('MOCK_CONNECT_GOOGLE_OAUTH_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/google/oauth/callback
 * Validates OAuth state, resolves ERP user_id, exchanges code for Google tokens, and saves under that user_id.
 */
export const handleGoogleOAuthCallback = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required.' });
    }

    // Validate state securely
    const verifiedState = googleOAuthService.verifyOAuthState(state);
    const targetUserId = verifiedState?.userId || req.user?.id;
    const targetDeptId = verifiedState?.departmentId || req.departmentId;

    if (!targetUserId) {
      return res.status(401).json({ error: 'Unauthorized: Unable to verify ERP user from OAuth state.' });
    }

    const erpUser = await User.findByPk(targetUserId);
    const userFallback = {
      email: erpUser?.email || 'hod@college.edu',
      name: erpUser ? `${erpUser.firstName || ''} ${erpUser.lastName || ''}`.trim() : 'HOD User',
    };

    const tokens = await googleOAuthService.exchangeCodeForTokens(code, undefined, userFallback);
    const saved = await googleOAuthService.saveUserToken(
      targetUserId,
      tokens.email,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
      targetDeptId,
      {
        googleAccountId: tokens.googleAccountId,
        displayName: tokens.displayName,
        profilePicture: tokens.profilePicture,
      }
    );

    await recordAudit(req, 'GOOGLE_ACCOUNT_CONNECTED', { email: tokens.email, userId: targetUserId });

    return res.json({
      success: true,
      message: 'Google Account connected successfully.',
      data: {
        email: tokens.email,
        displayName: tokens.displayName || null,
        googleAccountId: tokens.googleAccountId || null,
        profilePicture: tokens.profilePicture || null,
        connected: true,
        isConnected: true,
        status: 'CONNECTED',
        connectedAt: saved.createdAt,
        lastUsedAt: saved.lastUsedAt,
      },
    });
  } catch (error) {
    logger.error('HANDLE_GOOGLE_OAUTH_CALLBACK_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/google/oauth/callback
 * Handles direct browser redirect from Google OAuth consent flow.
 */
export const handleGoogleOAuthCallbackGet = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      return res.status(400).send('<h3>Error: Authorization code is missing.</h3>');
    }

    const verifiedState = googleOAuthService.verifyOAuthState(state);
    const targetUserId = verifiedState?.userId;
    const targetDeptId = verifiedState?.departmentId;

    if (!targetUserId) {
      return res.status(401).send('<h3>Error: Invalid or expired OAuth state parameter.</h3>');
    }

    const erpUser = await User.findByPk(targetUserId);
    const userFallback = {
      email: erpUser?.email || 'hod@college.edu',
      name: erpUser ? `${erpUser.firstName || ''} ${erpUser.lastName || ''}`.trim() : 'HOD User',
    };

    const tokens = await googleOAuthService.exchangeCodeForTokens(code, undefined, userFallback);
    await googleOAuthService.saveUserToken(
      targetUserId,
      tokens.email,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
      targetDeptId,
      {
        googleAccountId: tokens.googleAccountId,
        displayName: tokens.displayName,
        profilePicture: tokens.profilePicture,
      }
    );

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google OAuth Success</title></head>
        <body style="font-family:system-ui, -apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; background:#f8fafc; color:#1e293b;">
          <div style="background:white; padding:32px; border-radius:16px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1); text-align:center; max-width:400px;">
            <div style="width:48px; height:48px; background:#dcfce7; color:#16a34a; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px; font-size:24px;">✓</div>
            <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:700;">Account Connected</h2>
            <p style="color:#64748b; font-size:14px; margin:0 0 16px 0;">Google Account <strong>${tokens.email}</strong> is now connected to JCER ERP.</p>
            <p style="color:#94a3b8; font-size:12px; margin:0;">This window will close automatically...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', email: '${tokens.email}' }, '*');
            }
            setTimeout(() => {
              window.close();
            }, 1200);
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    logger.error('GOOGLE_OAUTH_GET_CALLBACK_ERROR:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google OAuth Failed</title></head>
        <body style="font-family:system-ui, -apple-system, sans-serif; padding:40px; text-align:center;">
          <h2 style="color:#dc2626;">Authentication Failed</h2>
          <p>${error.message || 'Unable to connect Google account.'}</p>
        </body>
      </html>
    `);
  }
};

/**
 * POST /api/google/oauth/disconnect
 */
export const disconnectGoogleOAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id || '';
    const departmentId = (req.departmentId || '') as string;
    await googleOAuthService.disconnectUserGoogleAccount(userId, departmentId);
    await recordAudit(req, 'GOOGLE_ACCOUNT_DISCONNECTED', { userId });
    return res.json({ success: true, message: 'Google account disconnected successfully.' });
  } catch (error) {
    logger.error('DISCONNECT_GOOGLE_OAUTH_ERROR:', error);
    return next(error);
  }
};

/**
 * POST /api/hod/google-sheets/validate
 * Validates spreadsheet accessibility, Drive permissions, MIME type (XLSX check), and tab discovery.
 */
export const validateGoogleSpreadsheet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { spreadsheetUrl, spreadsheetId: inputId } = req.body;
    const urlOrId = spreadsheetUrl || inputId;
    if (!urlOrId) {
      return res.status(400).json({ error: 'Spreadsheet URL or ID is required.' });
    }

    const currentUserId = req.user?.id || '';
    const authStatus = await googleOAuthService.getUserGoogleAccount(currentUserId);
    const tokenInfo = await googleOAuthService.getValidAccessTokenForUser(currentUserId);

    if (!authStatus.connected || !tokenInfo?.token) {
      return res.status(400).json({
        error: 'No active Google account connected for your HOD account. Please connect your Google account before validating spreadsheets.',
      });
    }

    const validation = await googleSheetsService.validateGoogleSpreadsheetAccess(
      urlOrId,
      tokenInfo.token,
      { id: authStatus.googleAccountId, email: authStatus.email || tokenInfo.email }
    );

    return res.json({
      success: validation.errorCode === null,
      data: validation,
      error: validation.errorMessage || undefined,
    });
  } catch (error) {
    logger.error('VALIDATE_GOOGLE_SPREADSHEET_ERROR:', error);
    return next(error);
  }
};

// ─── 4. Sync Endpoints ──────────────────────────────────────────────────────

/**
 * POST /api/google-sheets/sync/attendance
 */
export const syncGoogleAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = (req.departmentId || '') as string;
    const { connectionId, tabId, tabGid, tabTitle, overrideValues } = req.body;

    const facultyUserId = req.user?.role === 'FACULTY' ? req.user.id : undefined;

    const result = await googleSheetsService.syncAttendanceTab({
      connectionId,
      tabId,
      tabGid,
      tabTitle,
      facultyUserId,
      departmentId,
      authenticatedUserId: req.user?.id || '',
      overrideValues,
    });

    await recordAudit(req, 'GOOGLE_ATTENDANCE_SYNC', {
      connectionId,
      tabTitle,
      status: result.status,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      rejected: result.recordsRejected,
    });

    return res.json({
      success: result.status !== 'FAILED',
      message:
        result.status === 'SUCCESS'
          ? 'Attendance synchronized successfully.'
          : result.status === 'PARTIAL'
          ? `Sync completed with ${result.errorCount} rejected row(s).`
          : 'Attendance sync failed.',
      data: result,
    });
  } catch (error: any) {
    logger.error('SYNC_GOOGLE_ATTENDANCE_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to sync attendance.' });
  }
};

/**
 * POST /api/google-sheets/sync/marks
 */
export const syncGoogleMarks = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = (req.departmentId || '') as string;
    const { connectionId, tabId, tabGid, tabTitle, assessmentName, overrideValues } = req.body;

    const facultyUserId = req.user?.role === 'FACULTY' ? req.user.id : undefined;

    const result = await googleSheetsService.syncMarksTab({
      connectionId,
      tabId,
      tabGid,
      tabTitle,
      facultyUserId,
      departmentId,
      authenticatedUserId: req.user?.id || '',
      assessmentName,
      overrideValues,
    });

    await recordAudit(req, 'GOOGLE_MARKS_SYNC', {
      connectionId,
      tabTitle,
      status: result.status,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      rejected: result.recordsRejected,
    });

    return res.json({
      success: result.status !== 'FAILED',
      message:
        result.status === 'SUCCESS'
          ? 'Academic marks synchronized successfully.'
          : result.status === 'PARTIAL'
          ? `Sync completed with ${result.errorCount} rejected row(s).`
          : 'Marks sync failed.',
      data: result,
    });
  } catch (error: any) {
    logger.error('SYNC_GOOGLE_MARKS_ERROR:', error);
    return res.status(400).json({ error: error.message || 'Failed to sync academic marks.' });
  }
};

/**
 * GET /api/google-sheets/sync-history
 */
export const getGoogleSheetSyncHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const departmentId = req.departmentId;

    const connections = await GoogleSheetConnection.findAll({
      where: { departmentId },
      attributes: ['id'],
    });
    const connectionIds = connections.map((c) => c.id);

    const logs = await GoogleSheetSyncLog.findAll({
      where: { googleSheetConnectionId: { [Op.in]: connectionIds } },
      include: [
        { model: GoogleSheetConnection, as: 'connection', attributes: ['semester', 'sheetType', 'googleSpreadsheetUrl'] },
        { model: GoogleSheetTab, as: 'tab', attributes: ['sheetTitle', 'subjectCode'] },
        { model: User, as: 'triggeredByUser', attributes: ['firstName', 'lastName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('GET_SYNC_HISTORY_ERROR:', error);
    return next(error);
  }
};

/**
 * GET /api/faculty/my-sheets
 * Returns assigned sheets for the logged-in faculty user
 */
export const getFacultyMySheets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const facultyUserId = req.user?.id;
    if (!facultyUserId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const assignments = await FacultyAssignment.findAll({
      where: { userId: facultyUserId, status: 'ACTIVE' },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
        {
          model: FacultyGoogleSheetAccess,
          as: 'googleSheetAccesses',
          where: { status: 'GRANTED' },
          required: false,
          include: [{ model: GoogleSheetConnection, as: 'googleSheetConnection' }],
        },
      ],
    });

    const sheets = assignments.map((a: any) => {
      const accesses = a.googleSheetAccesses || [];
      const attendanceAccess = accesses.find(
        (acc: any) => acc.googleSheetConnection?.sheetType === 'ATTENDANCE'
      );
      const marksAccess = accesses.find(
        (acc: any) => acc.googleSheetConnection?.sheetType === 'ACADEMIC_MARKS'
      );

      return {
        assignmentId: a.id,
        subjectId: a.subject?.id,
        subjectName: a.subject?.name,
        subjectCode: a.subject?.code,
        semester: a.semester,
        section: a.section,
        attendanceAccess: a.attendanceAccess,
        marksAccess: a.marksAccess,
        attendanceSheet: attendanceAccess
          ? {
              status: attendanceAccess.status,
              url: attendanceAccess.googleSheetConnection?.googleSpreadsheetUrl,
              lastVerifiedAt: attendanceAccess.lastVerifiedAt,
            }
          : null,
        marksSheet: marksAccess
          ? {
              status: marksAccess.status,
              url: marksAccess.googleSheetConnection?.googleSpreadsheetUrl,
              lastVerifiedAt: marksAccess.lastVerifiedAt,
            }
          : null,
      };
    });

    return res.json({ success: true, data: sheets });
  } catch (error) {
    logger.error('GET_FACULTY_MY_SHEETS_ERROR:', error);
    return next(error);
  }
};
