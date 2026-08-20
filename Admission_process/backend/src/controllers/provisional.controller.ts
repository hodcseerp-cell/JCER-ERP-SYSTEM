import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import User from '../models/User';
import Student from '../models/Student';
import Admission from '../models/Admission';
import AdmissionDocument from '../models/AdmissionDocument';
import Department from '../models/Department';
import SystemConfiguration from '../models/SystemConfiguration';
import ProvisionalAdmission from '../models/ProvisionalAdmission';
import ProvisionalAdmissionSemesterRecord from '../models/ProvisionalAdmissionSemesterRecord';
import ProvisionalAdmissionDocument from '../models/ProvisionalAdmissionDocument';
import StudentPromotionHistory from '../models/StudentPromotionHistory';
import AuditLog from '../models/AuditLog';
import * as r2 from '../services/r2.service';
import { buildR2Folder } from '../utils/r2Key.util';
import logger from '../utils/logger.util';
import emailService from '../services/email.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Mapped document display names for R2 key generation
const PROVISIONAL_DOC_NAMES: Record<string, string> = {
  FEE_RECEIPT: 'fee-receipt',
  1: '1st-semester-marks-card',
  2: '2nd-semester-marks-card',
  3: '3rd-semester-marks-card',
  4: '4th-semester-marks-card',
  5: '5th-semester-marks-card',
  6: '6th-semester-marks-card',
};

// Helper to check target semester configuration
const isSemesterEnabled = async (semester: number): Promise<boolean> => {
  const config = await SystemConfiguration.findOne();
  if (!config) return false;
  if (!config.provisionalAdmissionOpen) return false;
  if (semester === 3) return !!config.provisionalAdmission3Open;
  if (semester === 5) return !!config.provisionalAdmission5Open;
  if (semester === 7) return !!config.provisionalAdmission7Open;
  return false;
};

// Helper to build student R2 key for renewals
const resolveStudentR2Base = async (userId: string) => {
  const student = await Student.findOne({ where: { userId } });
  if (!student) throw new Error('Student profile not found.');

  const admission = await Admission.findOne({
    where: { userId },
    include: [{ model: Department, as: 'branch' }]
  });
  if (!admission) throw new Error('Original admission application not found.');

  const userRecord = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
  const studentName = userRecord
    ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim()
    : 'Student';

  const folder = buildR2Folder({
    academicYear: admission.academicYear || '2026-2027',
    branchCode: admission.branch?.code || 'GEN',
    studentName,
    applicationNumber: admission.applicationNumber || `TEMP-${userId}`,
  });

  return { folder, academicYear: admission.academicYear || '2026-2027', student, admission, studentName };
};

// ─── Student Endpoints ────────────────────────────────────────────────────────

/** GET /api/student/provisional/config - Get active provisional settings */
export const getProvisionalConfig = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const config = await SystemConfiguration.findOne();
    if (!config) {
      return res.status(200).json({ success: true, data: { active: false, semesters: [] } });
    }
    return res.status(200).json({
      success: true,
      data: {
        admissionCycle: config.admissionCycle,
        provisionalAdmission3Open: config.provisionalAdmission3Open,
        provisionalAdmission5Open: config.provisionalAdmission5Open,
        provisionalAdmission7Open: config.provisionalAdmission7Open,
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/student/provisional/my-admission - Get current provisional application status and snapshots */
export const getMyProvisionalAdmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found. Provisional Admission is only available for fully enrolled students.' });
    }

    // Fetch original admission for branch and qualification/admissionType check
    const originalAdmission = await Admission.findOne({
      where: { userId },
      include: [{ model: Department, as: 'branch' }]
    });

    const isLateral = student.admissionType === 'LATERAL' ||
                      student.initialSemester === 3 ||
                      originalAdmission?.admissionType === 'DCET' ||
                      originalAdmission?.qualification === 'DIPLOMA' ||
                      originalAdmission?.applicationType === 'LATERAL_ENTRY';

    const hasPromotionFrom3 = await StudentPromotionHistory.findOne({
      where: { studentId: student.id, fromSemester: 3 }
    });

    const isInitialLateralEntry = isLateral && student.semester === 3 && !hasPromotionFrom3;
    const isProvisionalEligible = !isInitialLateralEntry && [3, 5, 7].includes(student.semester);

    const application = await ProvisionalAdmission.findOne({
      where: { 
        studentId: student.id,
        semester: student.semester
      },
      include: [
        { model: ProvisionalAdmissionSemesterRecord, as: 'semesterRecords' },
        { model: ProvisionalAdmissionDocument, as: 'documents' }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!application) {
      if (isInitialLateralEntry) {
        // Initial Lateral entry in 3rd semester does not apply for provisional admission
        const userRecord = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
        const studentName = userRecord ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim() : 'Student';
        return res.status(200).json({
          success: true,
          data: {
            application: null,
            studentName,
            usn: student.usn,
            semester: student.semester,
            admissionType: student.admissionType,
            initialSemester: student.initialSemester,
            isInitialLateralEntry: true,
            isProvisionalEligible: false,
            branchName: originalAdmission?.branch?.name || 'Engineering',
            applicationNumber: originalAdmission?.applicationNumber || 'N/A',
            originalPhotoUrl: null,
          }
        });
      }

      const semOpen = [3, 5, 7].includes(student.semester);
      if (!semOpen) {
        return res.status(403).json({ success: false, error: 'Provisional admission is currently closed or you are not eligible.' });
      }
    }

    const originalDocs = originalAdmission ? await AdmissionDocument.findOne({ where: { admissionId: originalAdmission.id } }) : null;

    const userRecord = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
    const studentName = userRecord
      ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim()
      : 'Student';

    let serializedApp: any = null;
    if (application) {
      serializedApp = application.toJSON ? application.toJSON() : application;
      if (serializedApp.documents) {
        serializedApp.documents = serializedApp.documents.map((doc: any) => ({
          ...doc,
          url: r2.getSignedUrlSync(doc.r2Key)
        }));
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        application: serializedApp,
        studentName,
        usn: student.usn,
        semester: student.semester,
        admissionType: student.admissionType,
        initialSemester: student.initialSemester,
        isLateral,
        isInitialLateralEntry,
        isProvisionalEligible,
        branchName: originalAdmission?.branch?.name || 'Engineering',
        applicationNumber: originalAdmission?.applicationNumber || 'N/A',
        originalPhotoUrl: originalDocs?.photoUrl || null,
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/provisional/step1 - Save Step 1: Basic details (semester & academicYear) */
export const saveProvisionalStep1 = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { semester } = req.body;

    if (![3, 5, 7].includes(Number(semester))) {
      return res.status(400).json({ error: 'Please select a valid admission semester (3rd, 5th, or 7th).' });
    }

    const { student, academicYear, studentName } = await resolveStudentR2Base(userId);

    // Check if initial lateral entry student
    const originalAdmission = await Admission.findOne({ where: { userId } });
    const isLateral = student.admissionType === 'LATERAL' ||
                      student.initialSemester === 3 ||
                      originalAdmission?.admissionType === 'DCET' ||
                      originalAdmission?.qualification === 'DIPLOMA' ||
                      originalAdmission?.applicationType === 'LATERAL_ENTRY';

    const hasPromotionFrom3 = await StudentPromotionHistory.findOne({
      where: { studentId: student.id, fromSemester: 3 }
    });

    if (isLateral && student.semester === 3 && !hasPromotionFrom3) {
      return res.status(403).json({ error: 'Provisional Admission is not applicable for your initial 3rd Semester lateral entry.' });
    }

    // Verify semester is enabled OR student is already in that semester
    const enabled = await isSemesterEnabled(Number(semester));
    if (!enabled && student.semester !== Number(semester)) {
      return res.status(403).json({ error: `Provisional Admission for ${semester}th Semester is currently closed.` });
    }

    // Verify student is eligible based on their current academic semester
    if (student.semester !== Number(semester)) {
      return res.status(403).json({ error: 'Provisional admission is available only for eligible semesters.' });
    }

    // Prevent duplicate active applications
    const existing = await ProvisionalAdmission.findOne({
      where: {
        studentId: student.id,
        semester,
        academicYear,
        status: { [Op.notIn]: ['REJECTED'] }
      }
    });

    if (existing && existing.status !== 'CORRECTION_REQUIRED' && existing.status !== 'DRAFT') {
      return res.status(400).json({ error: `You already have an active application for ${semester}th Semester. Status: ${existing.status}` });
    }

    let application = existing;
    if (!application) {
      // Create draft
      const yearShort = academicYear.replace(/-20(\d\d)$/, '-$1');
      const count = await ProvisionalAdmission.count({ where: { academicYear } });
      const paNumber = `PA-${yearShort}-${String(count + 1).padStart(5, '0')}`;

      application = await ProvisionalAdmission.create({
        provisionalAdmissionNumber: paNumber,
        studentId: student.id,
        semester,
        academicYear,
        status: 'DRAFT',
        studentNameSnapshot: studentName,
        usnSnapshot: student.usn,
      });
    } else {
      await application.update({ semester });
    }

    return res.status(200).json({
      success: true,
      message: 'Basic details saved successfully.',
      data: application
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};

/**
 * Helper: Determine admission type (FRESH vs LATERAL) and initial semester for a student.
 * Uses student record + original admission for cross-checks.
 */
const resolveAdmissionTypeInfo = async (studentId: string, userId: string) => {
  const student = await Student.findByPk(studentId);
  const originalAdmission = await Admission.findOne({ where: { userId } });
  const isLateral =
    student?.admissionType === 'LATERAL' ||
    student?.initialSemester === 3 ||
    originalAdmission?.admissionType === 'DCET' ||
    originalAdmission?.qualification === 'DIPLOMA' ||
    originalAdmission?.applicationType === 'LATERAL_ENTRY';
  const initialSemester = isLateral ? 3 : 1;
  return { isLateral, initialSemester, student };
};

/**
 * Centralized academic semester requirements.
 * FRESH: 3 → [1, 2] | 5 → [1, 2, 3, 4] | 7 → [1, 2, 3, 4, 5, 6]
 * LATERAL: 5 → [3, 4] | 7 → [3, 4, 5, 6]
 */
export const getRequiredAcademicSemesters = (isLateral: boolean, targetSemester: number): number[] => {
  const sem = Number(targetSemester);
  if (isLateral) {
    if (sem === 5) return [3, 4];
    if (sem === 7) return [3, 4, 5, 6];
    return [];
  }
  if (sem === 3) return [1, 2];
  if (sem === 5) return [1, 2, 3, 4];
  if (sem === 7) return [1, 2, 3, 4, 5, 6];
  return [];
};

/**
 * Centralized semester document rules.
 * FRESH: 3 → prev:[], now:[1,2] | 5 → prev:[1,2], now:[3,4] | 7 → prev:[1,2,3,4], now:[5,6]
 * LATERAL: 5 → prev:[], now:[3,4] | 7 → prev:[3,4], now:[5,6]
 */
export const getSemesterRules = (isLateral: boolean, targetSemester: number) => {
  if (isLateral) {
    if (targetSemester === 5) return { previousSemesters: [] as number[], requiredNow: [3, 4] };
    if (targetSemester === 7) return { previousSemesters: [3, 4], requiredNow: [5, 6] };
    // Lateral entry at 3rd semester is not eligible for provisional admission (guarded elsewhere)
    return { previousSemesters: [] as number[], requiredNow: [] as number[] };
  }
  // FRESH
  if (targetSemester === 3) return { previousSemesters: [] as number[], requiredNow: [1, 2] };
  if (targetSemester === 5) return { previousSemesters: [1, 2], requiredNow: [3, 4] };
  if (targetSemester === 7) return { previousSemesters: [1, 2, 3, 4], requiredNow: [5, 6] };
  return { previousSemesters: [] as number[], requiredNow: [] as number[] };
};

/**
 * Helper: Fetch ALL semester marks card documents for a student across ALL their
 * provisional admission applications. Returns a map keyed by semesterNumber.
 * Deduplicates: prefers VERIFIED > PENDING > REJECTED, then most recent.
 */
const fetchAllHistoricalSemesterDocs = async (studentId: string): Promise<Map<number, any>> => {
  const allApplications = await ProvisionalAdmission.findAll({
    where: { studentId },
    include: [{ model: ProvisionalAdmissionDocument, as: 'documents' }],
    order: [['createdAt', 'ASC']],
  });

  const byStatus = { VERIFIED: 3, PENDING: 2, REJECTED: 1 };
  const semMap = new Map<number, any>();

  for (const app of allApplications) {
    for (const doc of (app.documents || [])) {
      if (doc.documentType !== 'SEMESTER_MARKS_CARD' || !doc.semesterNumber) continue;
      const semNum = doc.semesterNumber;
      const existing = semMap.get(semNum);
      const newPriority = byStatus[doc.verificationStatus as keyof typeof byStatus] || 0;
      const existingPriority = existing ? (byStatus[existing.verificationStatus as keyof typeof byStatus] || 0) : -1;
      // Prefer higher verification status; tie-break: more recent (later in array since ASC order)
      if (!existing || newPriority > existingPriority || (newPriority === existingPriority)) {
        semMap.set(semNum, doc);
      }
    }
  }

  return semMap;
};

/** GET /api/student/provisional/historical-docs — Get all prior semester marks cards for the student */
export const getStudentHistoricalSemesterDocs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found.' });
    }

    const { isLateral } = await resolveAdmissionTypeInfo(student.id, userId);
    const semMap = await fetchAllHistoricalSemesterDocs(student.id);

    const result: any[] = [];
    semMap.forEach((doc, semNum) => {
      result.push({
        semesterNumber: semNum,
        id: doc.id,
        provisionalAdmissionId: doc.provisionalAdmissionId,
        r2Key: doc.r2Key,
        originalFileName: doc.originalFileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        verificationStatus: doc.verificationStatus,
        verificationRemarks: doc.verificationRemarks,
        url: r2.getSignedUrlSync(doc.r2Key),
        uploadedAt: doc.createdAt,
      });
    });

    return res.json({
      success: true,
      isLateral,
      initialSemester: isLateral ? 3 : 1,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
};

/** PUT /api/student/provisional/step2 - Save Step 2: Lower Examination Records */
export const saveProvisionalStep2 = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { applicationId, records } = req.body;

    if (!applicationId || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid application ID or exam records payload.' });
    }

    const application = await ProvisionalAdmission.findByPk(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Provisional Admission application not found.' });
    }

    const student = await Student.findOne({ where: { userId } });
    if (!student || application.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'CORRECTION_REQUIRED') {
      return res.status(400).json({ error: 'Application is not editable.' });
    }

    // Validate expected semesters count based on target semester and student admission type
    const { isLateral } = await resolveAdmissionTypeInfo(student.id, userId);
    const expectedSemesters = getRequiredAcademicSemesters(isLateral, application.semester);

    if (records.length !== expectedSemesters.length) {
      return res.status(400).json({ error: `Please provide records for exactly all completed semesters: ${expectedSemesters.join(', ')}.` });
    }

    // Validate each record details
    for (const rec of records) {
      const semNum = Number(rec.semesterNumber);
      if (!expectedSemesters.includes(semNum)) {
        return res.status(400).json({ error: `Invalid semester record number: ${semNum}` });
      }
      if (!rec.examMonth || !rec.examYear || rec.subjectsPassed === undefined || rec.subjectsFailed === undefined) {
        return res.status(400).json({ error: `Please complete all required fields for Semester ${semNum}.` });
      }
      const passed = Number(rec.subjectsPassed);
      const failed = Number(rec.subjectsFailed);
      if (passed < 0 || failed < 0) {
        return res.status(400).json({ error: `Subjects passed and failed cannot be negative.` });
      }

      // If failed > 0, failed subject codes list must match failed count
      const codes = Array.isArray(rec.failedSubjectCodes) ? rec.failedSubjectCodes : [];
      if (failed > 0 && codes.filter(c => c && c.trim()).length !== failed) {
        return res.status(400).json({ error: `Please enter exactly ${failed} failed subject code(s) for Semester ${semNum}.` });
      }
    }

    // Remove existing records and re-create them
    await ProvisionalAdmissionSemesterRecord.destroy({ where: { provisionalAdmissionId: application.id } });

    for (const rec of records) {
      await ProvisionalAdmissionSemesterRecord.create({
        provisionalAdmissionId: application.id,
        semesterNumber: rec.semesterNumber,
        examMonth: rec.examMonth,
        examYear: rec.examYear,
        subjectsPassed: rec.subjectsPassed,
        subjectsFailed: rec.subjectsFailed,
        failedSubjectCodes: rec.subjectsFailed > 0 ? rec.failedSubjectCodes.filter(Boolean) : [],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lower examination records saved successfully.'
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/provisional/documents - Upload/Replace Provisional document */
export const uploadProvisionalDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { applicationId, documentType, semesterNumber } = req.body;
    const file = req.file;

    if (!applicationId || !documentType || !file) {
      return res.status(400).json({ error: 'Missing application ID, document type, or file upload.' });
    }

    const application = await ProvisionalAdmission.findByPk(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Provisional Admission application not found.' });
    }

    const student = await Student.findOne({ where: { userId } });
    if (!student || application.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'CORRECTION_REQUIRED') {
      return res.status(400).json({ error: 'Application is not currently in an editable state.' });
    }

    // 1. Find existing document record BEFORE uploading to R2 to get exact target r2Key
    let docRecord = await ProvisionalAdmissionDocument.findOne({
      where: {
        provisionalAdmissionId: application.id,
        documentType,
        semesterNumber: documentType === 'SEMESTER_MARKS_CARD' ? Number(semesterNumber) : null,
      }
    });

    let targetR2Key = '';

    if (docRecord && docRecord.r2Key) {
      // CRITICAL RULE: Reuse the exact SAME r2Key for replacement so R2 overwrites in place
      targetR2Key = docRecord.r2Key;
    } else {
      // Construct canonical R2 key for first-time upload
      const { folder, academicYear } = await resolveStudentR2Base(userId);
      const shortYear = academicYear.replace(/-20(\d\d)$/, '-$1');
      const semFolder = application.semester === 3 ? '3rd-semester' :
                        application.semester === 5 ? '5th-semester' : '7th-semester';

      const docNameKey = documentType === 'FEE_RECEIPT' ? 'FEE_RECEIPT' : Number(semesterNumber);
      const docFileName = PROVISIONAL_DOC_NAMES[docNameKey];
      if (!docFileName) {
        return res.status(400).json({ error: 'Invalid document type or semester marks card parameter.' });
      }

      const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
      targetR2Key = `${folder}/provisional-admission/${shortYear}/${semFolder}/${docFileName}${ext}`;
    }

    // 2. Upload replacement/new file to Cloudflare R2 at targetR2Key (overwrite in place)
    await r2.uploadFromDisk(file.path, targetR2Key, file.mimetype);

    const isReplacement = !!docRecord;
    const oldFileName = docRecord ? docRecord.originalFileName : null;

    // 3. Update DB record or create new
    if (docRecord) {
      await docRecord.update({
        r2Key: targetR2Key,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        verificationStatus: 'PENDING',
        verificationRemarks: 'CORRECTED',
      });
    } else {
      docRecord = await ProvisionalAdmissionDocument.create({
        provisionalAdmissionId: application.id,
        documentType,
        semesterNumber: documentType === 'SEMESTER_MARKS_CARD' ? Number(semesterNumber) : null,
        r2Key: targetR2Key,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        verificationStatus: 'PENDING',
      });
    }

    // 4. Record Audit Log for document replacement/upload
    await AuditLog.create({
      userId,
      action: isReplacement ? 'REPLACE_DOCUMENT_CORRECTION' : 'UPLOAD_PROVISIONAL_DOCUMENT',
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
      details: {
        documentId: docRecord.id,
        provisionalAdmissionId: application.id,
        documentType,
        semesterNumber: semesterNumber || null,
        oldFileName,
        newFileName: file.originalname,
        r2Key: targetR2Key,
        replacedAt: new Date(),
      }
    }).catch((auditErr: any) => logger.warn('[AuditLog] Failed to log document replacement:', auditErr));

    // Clean up multer temp local file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const signedUrl = r2.getSignedUrlSync(targetR2Key);
    return res.status(200).json({
      success: true,
      message: isReplacement ? 'Document replaced successfully.' : 'Document uploaded successfully.',
      data: {
        document: docRecord,
        url: signedUrl,
      }
    });
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};

/** POST /api/student/provisional/submit - Submit application for review */
export const submitProvisionalAdmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { applicationId } = req.body;

    const application = await ProvisionalAdmission.findByPk(applicationId, {
      include: [
        { model: ProvisionalAdmissionSemesterRecord, as: 'semesterRecords' },
        { model: ProvisionalAdmissionDocument, as: 'documents' }
      ]
    });
    if (!application) {
      return res.status(404).json({ error: 'Provisional Admission application not found.' });
    }

    const student = await Student.findOne({ where: { userId } });
    if (!student || application.studentId !== student.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (application.status !== 'DRAFT' && application.status !== 'CORRECTION_REQUIRED') {
      return res.status(400).json({ error: 'Application is not editable.' });
    }

    // Validate toggles again on submit
    const enabled = await isSemesterEnabled(application.semester);
    if (!enabled) {
      return res.status(403).json({ error: 'Provisional Admission is currently closed.' });
    }

    // Determine admission type for the student
    const { isLateral } = await resolveAdmissionTypeInfo(student.id, userId);
    const expectedAcademicSemesters = getRequiredAcademicSemesters(isLateral, application.semester);
    const { previousSemesters, requiredNow } = getSemesterRules(isLateral, application.semester);

    // Validate academic records for all required semesters
    for (const sem of expectedAcademicSemesters) {
      const hasRecord = application.semesterRecords?.some((r: any) => Number(r.semesterNumber) === sem);
      if (!hasRecord) {
        return res.status(400).json({ error: `Please enter academic record for Semester ${sem}.` });
      }
    }

    // Fee receipt must be in current application
    const feeReceipt = application.documents?.find((d: any) => d.documentType === 'FEE_RECEIPT');
    if (!feeReceipt) {
      return res.status(400).json({ error: 'Please upload the College Fee Receipt.' });
    }

    // Current application marks cards
    const currentMarksCards = application.documents?.filter((d: any) => d.documentType === 'SEMESTER_MARKS_CARD') || [];

    // Validate requiredNow semesters exist in current application
    for (const sem of requiredNow) {
      const hasCard = currentMarksCards.some((m: any) => m.semesterNumber === sem);
      if (!hasCard) {
        return res.status(400).json({ error: `Please upload the Semester ${sem} Marks Card.` });
      }
    }

    // Validate previousSemesters: must exist historically (in any past provisional application)
    // OR as a REJECTED doc in current app that the student was asked to re-upload
    if (previousSemesters.length > 0) {
      const semMap = await fetchAllHistoricalSemesterDocs(student.id);
      for (const sem of previousSemesters) {
        const currentDoc = currentMarksCards.find((m: any) => m.semesterNumber === sem);
        const historicalDoc = semMap.get(sem);
        if (!currentDoc && (!historicalDoc || historicalDoc.verificationStatus === 'REJECTED')) {
          return res.status(400).json({ error: `Semester ${sem} Marks Card is missing or was rejected. Please upload it.` });
        }
      }
    }

    // Update snapshots for historical accuracy
    const admission = await Admission.findOne({
      where: { userId },
      include: [{ model: Department, as: 'branch' }]
    });

    const userRecord = await User.findByPk(userId, { attributes: ['firstName', 'lastName'] });
    const studentName = userRecord
      ? `${userRecord.firstName || ''} ${userRecord.lastName || ''}`.trim()
      : 'Student';

    const nextStatus = application.status === 'CORRECTION_REQUIRED' ? 'RESUBMITTED' : 'SUBMITTED';

    await application.update({
      status: nextStatus,
      studentNameSnapshot: studentName,
      usnSnapshot: student.usn,
      branchSnapshot: admission?.branch?.name || null,
      courseSnapshot: 'Bachelor of Engineering (B.E.)',
      submittedAt: new Date(),
    });

    // Safely send email notification for Provisional Admission
    try {
      const user = await User.findByPk(userId);
      if (user) {
        const submissionDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        await emailService.sendProvisionalSubmittedNotification(user.email, {
          studentName,
          provisionalAdmissionNumber: application.provisionalAdmissionNumber,
          semester: `${application.semester}th Semester`,
          academicYear: application.academicYear || '2026-2027',
          submissionDate,
        });
      }
    } catch (emailErr) {
      logger.error('Failed to send provisional admission submitted email:', emailErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Provisional Admission application submitted successfully.',
      data: application
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};

/** GET /api/student/provisional/acknowledgement/:id - Fetch full print parameters */
export const getProvisionalAcknowledgement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const application = await ProvisionalAdmission.findByPk(id, {
      include: [
        { model: ProvisionalAdmissionSemesterRecord, as: 'semesterRecords' },
        { model: ProvisionalAdmissionDocument, as: 'documents' }
      ]
    });
    if (!application) {
      return res.status(404).json({ error: 'Provisional Admission application not found.' });
    }

    // Verify ownership or admin role
    const isStudent = req.user!.role === 'STUDENT';
    if (isStudent) {
      const student = await Student.findOne({ where: { userId } });
      if (!student || application.studentId !== student.id) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    // Fetch original admission record details as source of truth
    const studentProfile = await Student.findByPk(application.studentId, {
      include: [{ model: User, as: 'user' }, { model: Department, as: 'department' }]
    });
    const originalAdmission = await Admission.findOne({
      where: { userId: studentProfile!.userId },
      include: [{ model: AdmissionDocument, as: 'studentdocuments' }]
    });

    // Signed doc links for viewing (current application docs)
    const signedDocs = (application.documents || []).map((doc: any) => {
      return {
        id: doc.id,
        documentType: doc.documentType,
        semesterNumber: doc.semesterNumber,
        originalFileName: doc.originalFileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        verificationStatus: doc.verificationStatus,
        verificationRemarks: doc.verificationRemarks,
        url: r2.getSignedUrlSync(doc.r2Key),
        sourceApplicationId: application.id,
      };
    });

    // ── ADMIN: Build complete aggregated semester document history ──────────────
    // Fetch admission type info for this student
    const studentUserId = studentProfile!.userId;
    const { isLateral } = await resolveAdmissionTypeInfo(application.studentId, studentUserId);
    const { previousSemesters: prevSems, requiredNow: nowSems } = getSemesterRules(isLateral, application.semester);
    const allAdminSems = [...prevSems, ...nowSems];

    // Build a map of current application docs by (type, semesterNumber)
    const currentDocMap = new Map<string, any>();
    for (const doc of signedDocs) {
      const mapKey = doc.documentType === 'FEE_RECEIPT' ? 'FEE_RECEIPT' : `SEM_${doc.semesterNumber}`;
      currentDocMap.set(mapKey, doc);
    }

    // Fetch historical semester docs from all prior applications for previousSemesters
    const historicalSemMap = await fetchAllHistoricalSemesterDocs(application.studentId);

    // Build allSemesterDocuments: FEE_RECEIPT first, then semester docs in ascending order
    const allSemesterDocuments: any[] = [];

    // Fee receipt (always from current application)
    const feeReceiptDoc = currentDocMap.get('FEE_RECEIPT');
    if (feeReceiptDoc) {
      allSemesterDocuments.push({ ...feeReceiptDoc, _source: 'current' });
    }

    // Semester marks cards
    const seenSemNums = new Set<number>();
    for (const semNum of allAdminSems) {
      if (seenSemNums.has(semNum)) continue;
      seenSemNums.add(semNum);

      const currentDoc = currentDocMap.get(`SEM_${semNum}`);
      if (currentDoc) {
        allSemesterDocuments.push({ ...currentDoc, _source: 'current' });
      } else {
        const histDoc = historicalSemMap.get(semNum);
        if (histDoc) {
          allSemesterDocuments.push({
            id: histDoc.id,
            documentType: 'SEMESTER_MARKS_CARD',
            semesterNumber: semNum,
            originalFileName: histDoc.originalFileName,
            mimeType: histDoc.mimeType,
            fileSize: histDoc.fileSize,
            verificationStatus: histDoc.verificationStatus,
            verificationRemarks: histDoc.verificationRemarks,
            url: r2.getSignedUrlSync(histDoc.r2Key),
            sourceApplicationId: histDoc.provisionalAdmissionId,
            _source: 'historical',
          });
        }
      }
    }

    // Original photo signed URL fallback
    let originalPhotoUrl: string | null = null;
    if (originalAdmission?.studentdocuments?.photoUrl) {
      originalPhotoUrl = r2.getSignedUrlSync(originalAdmission.studentdocuments.photoUrl);
    }

    return res.status(200).json({
      success: true,
      data: {
        application,
        semesterRecords: application.semesterRecords,
        documents: signedDocs,
        allSemesterDocuments,
        isLateral,
        student: {
          photoUrl: originalPhotoUrl,
          name: studentProfile?.user ? `${studentProfile.user.firstName || ''} ${studentProfile.user.lastName || ''}`.trim() : 'Student',
          usn: studentProfile?.usn,
          email: studentProfile?.user?.email,
          phone: studentProfile?.user?.phone,
          fatherName: studentProfile?.fatherName,
          motherName: studentProfile?.motherName,
          parentPhone: studentProfile?.parentPhone,
          parentEmail: studentProfile?.parentEmail,
          address: studentProfile?.address,
          branch: studentProfile?.department?.name || application.branchSnapshot,
          dateOfBirth: studentProfile?.dateOfBirth,
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error.' });
  }
};


// ─── Admin Endpoints ──────────────────────────────────────────────────────────

/** GET /api/admin/provisional - List applications with pagination and filters */
export const listProvisionalAdmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { semester, academicYear, status, branchId, search } = req.query;
    const whereClause: any = {};

    if (semester) whereClause.semester = Number(semester);
    if (academicYear) whereClause.academicYear = String(academicYear);
    if (status) whereClause.status = String(status);

    let studentIds: string[] = [];
    let hasBranchFilter = false;

    if (branchId) {
      hasBranchFilter = true;
      const students = await Student.findAll({ where: { departmentId: String(branchId) }, attributes: ['id'] });
      studentIds = students.map(s => s.id);
    }

    if (search) {
      const searchStr = `%${search}%`;
      const matchingStudents = await Student.findAll({
        where: {
          [Op.or]: [
            { usn: { [Op.iLike]: searchStr } },
            { enrollmentNumber: { [Op.iLike]: searchStr } },
          ]
        },
        include: [{
          model: User,
          as: 'user',
          where: {
            [Op.or]: [
              { firstName: { [Op.iLike]: searchStr } },
              { lastName: { [Op.iLike]: searchStr } },
              { email: { [Op.iLike]: searchStr } }
            ]
          },
          required: false
        }],
        attributes: ['id']
      });

      const matchedIds = matchingStudents.map(s => s.id);
      if (hasBranchFilter) {
        studentIds = studentIds.filter(id => matchedIds.includes(id));
      } else {
        studentIds = matchedIds;
        hasBranchFilter = true;
      }
      
      whereClause[Op.or] = [
        { provisionalAdmissionNumber: { [Op.iLike]: searchStr } },
        { studentNameSnapshot: { [Op.iLike]: searchStr } },
        { usnSnapshot: { [Op.iLike]: searchStr } }
      ];
    }

    if (hasBranchFilter) {
      whereClause.studentId = { [Op.in]: studentIds };
    }

    const applications = await ProvisionalAdmission.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'phone'] },
            { model: Department, as: 'department', attributes: ['name', 'code'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: applications
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/provisional/:id/verify-doc - Verify a single uploaded document */
export const verifyProvisionalDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { documentId, status, remarks } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid document verification status.' });
    }

    const application = await ProvisionalAdmission.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Provisional Admission application not found.' });
    }

    const document = await ProvisionalAdmissionDocument.findOne({
      where: { id: documentId, provisionalAdmissionId: application.id }
    });
    if (!document) {
      return res.status(404).json({ error: 'Document record not found.' });
    }

    await document.update({
      verificationStatus: status,
      verificationRemarks: remarks || null,
      verifiedBy: req.user!.id,
      verifiedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'Document status updated successfully.',
      data: document
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/provisional/:id/action - Process review action (APPROVE, CORRECTION, REJECT) */
export const processProvisionalAction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    const application = await ProvisionalAdmission.findByPk(id);
    if (!application) {
      return res.status(404).json({ error: 'Provisional Admission application not found.' });
    }

    if (action === 'APPROVE') {
      // Validate that all documents are VERIFIED
      const docs = await ProvisionalAdmissionDocument.findAll({ where: { provisionalAdmissionId: application.id } });
      const allVerified = docs.every(d => d.verificationStatus === 'VERIFIED');
      if (!allVerified) {
        return res.status(400).json({ error: 'Cannot approve application. Some documents are not verified.' });
      }

      await application.update({
        status: 'APPROVED',
        approvedBy: req.user!.id,
        approvedAt: new Date(),
        correctionReason: null,
        rejectionReason: null,
      });

      // Update student active semester registry in ERP
      const student = await Student.findByPk(application.studentId);
      if (student) {
        await student.update({ semester: application.semester });
      }
    } else if (action === 'CORRECTION_REQUIRED') {
      if (!remarks) {
        return res.status(400).json({ error: 'Correction remarks are required.' });
      }
      await application.update({
        status: 'CORRECTION_REQUIRED',
        correctionReason: remarks,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      });
    } else if (action === 'REJECT') {
      if (!remarks) {
        return res.status(400).json({ error: 'Rejection remarks are required.' });
      }
      await application.update({
        status: 'REJECTED',
        rejectionReason: remarks,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      });
    } else {
      return res.status(400).json({ error: 'Invalid review action.' });
    }

    // Dispatch safe email notification to student for Provisional Admission review action
    try {
      const studentProfile = await Student.findByPk(application.studentId, {
        include: [{ model: User, as: 'user' }]
      });
      if (studentProfile && studentProfile.user) {
        const studentName = `${studentProfile.user.firstName || ''} ${studentProfile.user.lastName || ''}`.trim();
        const studentEmail = studentProfile.user.email;

        if (action === 'APPROVE') {
          await emailService.sendApprovalNotification(studentEmail, {
            studentName,
            applicationNumber: application.provisionalAdmissionNumber,
            applicationType: 'PROVISIONAL_ADMISSION',
            semester: `${application.semester}th Semester`,
            academicYear: application.academicYear || '2026-2027',
          });
        } else if (action === 'CORRECTION_REQUIRED') {
          await emailService.sendCorrectionRequiredNotification(studentEmail, {
            studentName,
            applicationNumber: application.provisionalAdmissionNumber,
            applicationType: 'PROVISIONAL_ADMISSION',
            semester: `${application.semester}th Semester`,
            academicYear: application.academicYear || '2026-2027',
            reason: remarks || 'Please correct requested fields.',
          });
        } else if (action === 'REJECT') {
          await emailService.sendRejectionNotification(studentEmail, {
            studentName,
            applicationNumber: application.provisionalAdmissionNumber,
            applicationType: 'PROVISIONAL_ADMISSION',
            semester: `${application.semester}th Semester`,
            academicYear: application.academicYear || '2026-2027',
            rejectionReason: remarks || 'Application rejected during verification.',
          });
        }
      }
    } catch (emailErr) {
      logger.error('Failed to send provisional action email notification:', emailErr);
    }

    return res.status(200).json({
      success: true,
      message: `Provisional Admission application processed successfully: ${action}.`,
      data: application
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/provisional/bulk-approve - Bulk approve multiple provisional admission applications */
export const bulkApproveProvisionalAdmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide a list of application IDs to approve.' });
    }

    const approved: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        const application = await ProvisionalAdmission.findByPk(id);
        if (!application) {
          failed.push(`${id} — Application not found.`);
          continue;
        }

        if (application.status !== 'SUBMITTED' && application.status !== 'RESUBMITTED' && application.status !== 'UNDER_REVIEW') {
          failed.push(`${application.provisionalAdmissionNumber} — Status is ${application.status}. Only pending applications can be approved.`);
          continue;
        }

        // Validate that all documents exist and are verified
        const docs = await ProvisionalAdmissionDocument.findAll({ where: { provisionalAdmissionId: application.id } });
        const expectedSemesters = application.semester === 3 ? [1, 2] :
                                 application.semester === 5 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6];

        const hasReceipt = docs.some(d => d.documentType === 'FEE_RECEIPT' && d.verificationStatus === 'VERIFIED');
        if (!hasReceipt) {
          failed.push(`${application.provisionalAdmissionNumber} — Fee Receipt not verified.`);
          continue;
        }

        let allMarksCardsVerified = true;
        for (const sem of expectedSemesters) {
          const verifiedCard = docs.some(d => d.documentType === 'SEMESTER_MARKS_CARD' && d.semesterNumber === sem && d.verificationStatus === 'VERIFIED');
          if (!verifiedCard) {
            allMarksCardsVerified = false;
            break;
          }
        }

        if (!allMarksCardsVerified) {
          failed.push(`${application.provisionalAdmissionNumber} — All completed semester marks cards are not verified.`);
          continue;
        }

        // Approve
        await application.update({
          status: 'APPROVED',
          approvedBy: req.user!.id,
          approvedAt: new Date(),
          correctionReason: null,
          rejectionReason: null,
        });

        // Promote student semester
        const student = await Student.findByPk(application.studentId);
        if (student) {
          await student.update({ semester: application.semester });
        }

        approved.push(application.provisionalAdmissionNumber);
      } catch (singleErr: any) {
        failed.push(`${id} — ${singleErr.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        approved,
        failed,
      }
    });
  } catch (err) {
    return next(err);
  }
};
