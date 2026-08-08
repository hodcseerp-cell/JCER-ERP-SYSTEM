import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import admissionService from '../services/admission.service';
import securityEvents from '../services/securityEvents.service';
import AuditLog from '../models/AuditLog';
import AdmissionDocument from '../models/AdmissionDocument';
import Admission from '../models/Admission';
import SystemConfiguration from '../models/SystemConfiguration';
import { generateHandbookPDFBuffer } from '../utils/handbookGenerator.util';
import { validateDocument } from '../utils/documentValidation.util';
import logger from '../utils/logger.util';
import db from '../config/database';
import User from '../models/User';
import Department from '../models/Department';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';
import AdmissionParentDetail from '../models/AdmissionParentDetail';
import AdmissionAddress from '../models/AdmissionAddress';
import AdmissionAcademicDetail from '../models/AdmissionAcademicDetail';
import Student from '../models/Student';
import UsnRegistry from '../models/UsnRegistry';
import Notification from '../models/Notification';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

const DOCUMENT_FIELD_MAP: Record<string, keyof AdmissionDocument> = {
  photo: 'photoUrl',
  signature: 'signatureUrl',
  tenthMarksheet: 'tenthMarksheetUrl',
  twelfthMarksheet: 'twelfthMarksheetUrl',
  diplomaSemester5Marksheet: 'diplomaSemester5MarksheetUrl',
  diplomaSemester6Marksheet: 'diplomaSemester6MarksheetUrl',
  cetScoreCard: 'cetScoreCardUrl',
  aadhaar: 'aadhaarUrl',
  casteCertificate: 'casteCertificateUrl',
  domicileCertificate: 'domicileCertificateUrl',
  gapCertificate: 'gapCertificateUrl',
  feesPaidReceipt: 'feesPaidReceiptUrl',
  admissionFeeReceipt: 'admissionFeeReceiptUrl',
};

// ─── Student Endpoints ───────────────────────────────────────────────────────

/** POST /api/student/validate-document (Instant Single File Validation) */
export const validateSingleDocument = async (
  req: AuthRequest, res: Response, _next: NextFunction
): Promise<any> => {
  try {
    const file = req.file;
    const documentType = req.body.documentType || req.body.docType || (file ? file.fieldname : 'unknown');

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded for validation.' });
    }

    // Perform quality validation (Color + Blur)
    const result = await validateDocument(documentType, file.path, file.originalname);

    // Delete temp validation file immediately
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      // Ignore
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        reason: result.reason,
        message: result.message,
      });
    }

    return res.json({ success: true, message: 'Document validation passed!' });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Validation failed.' });
  }
};

/** GET /api/student/my-admission */
export const getMyAdmission = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const data = await admissionService.getMyAdmission(req.user!.id);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/student/step-status */
export const getStepStatus = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const data = await admissionService.getStepStatus(req.user!.id);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/application/full-details */
export const getFullDetails = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const data = await admissionService.getFullDetails(req.user!.id);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/student/admission/step/:stepName */
export const getStepData = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { stepName } = req.params;
    const data = await admissionService.getStepData(req.user!.id, stepName);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/create  (Step 1) */
export const saveStep1 = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const existing = await Admission.findOne({ where: { userId: req.user!.id } });
    if (!existing) {
      const config = await SystemConfiguration.findOne();
      if (config && config.admissionOpen === false) {
        return res.status(403).json({ success: false, error: 'Admissions are currently closed. Please contact the college office for further information.' });
      }
    }
    const admissionId = await admissionService.saveStep1(req.user!.id, req.body);
    securityEvents.stepEdit(req, req.user!.id, admissionId, 1);
    return res.json({ success: true, message: 'Admission details saved.' });
  } catch (err) {
    return next(err);
  }
};

/** PUT /api/student/personal  (Step 2) */
export const saveStep2 = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const admissionId = await admissionService.saveStep2(req.user!.id, req.body);
    securityEvents.stepEdit(req, req.user!.id, admissionId, 2);
    return res.json({ success: true, message: 'Personal details saved.' });
  } catch (err) {
    return next(err);
  }
};

/** PUT /api/student/parent  (Step 3) */
export const saveStep3 = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const admissionId = await admissionService.saveStep3(req.user!.id, req.body);
    securityEvents.stepEdit(req, req.user!.id, admissionId, 3);
    return res.json({ success: true, message: 'Parent details saved.' });
  } catch (err) {
    return next(err);
  }
};

/** PUT /api/student/address  (Step 4) */
export const saveStep4 = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const admissionId = await admissionService.saveStep4(req.user!.id, req.body);
    securityEvents.stepEdit(req, req.user!.id, admissionId, 4);
    return res.json({ success: true, message: 'Address saved.' });
  } catch (err) {
    return next(err);
  }
};

/** PUT /api/student/academic  (Step 5) */
export const saveStep5 = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const admissionId = await admissionService.saveStep5(req.user!.id, req.body);
    securityEvents.stepEdit(req, req.user!.id, admissionId, 5);
    return res.json({ success: true, message: 'Academic details saved.' });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/documents  (Step 6 — multipart/form-data) */
export const saveStep6 = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const studentId = req.user!.id;
    // Build URL map: fieldname → /uploads/admissions/studentId/fieldname/filename (served as static)
    const fileUrls: Record<string, string> = {};
    for (const field of Object.keys(files)) {
      const file = files[field][0];
      fileUrls[`${file.fieldname}Url`] = `/uploads/admissions/${studentId}/${file.fieldname}/${file.filename}`;
    }

    const admissionId = await admissionService.saveStep6(studentId, fileUrls);
    securityEvents.documentUpload(req, studentId, admissionId, Object.keys(fileUrls));
    return res.json({ success: true, message: 'Documents uploaded.', data: fileUrls });
  } catch (err) {
    return next(err);
  }
};

/** DELETE /api/student/documents/:field */
export const removeDocument = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { field } = req.params;
    const validFields = [
      'photo', 'signature', 'tenthMarksheet', 'twelfthMarksheet',
      'diplomaSemester5Marksheet', 'diplomaSemester6Marksheet',
      'cetScoreCard', 'aadhaar', 'casteCertificate', 'domicileCertificate',
      'gapCertificate', 'feesPaidReceipt'
    ];
    if (!validFields.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid document field.' });
    }

    const dbKey = `${field}Url`;
    const studentId = req.user!.id;
    const admissionId = await admissionService.saveStep6(studentId, { [dbKey]: null });
    
    return res.json({ success: true, message: 'Document removed.', data: { [dbKey]: null } });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/submit  (Step 7 final submit) */
export const submitApplication = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const admissionId = await admissionService.submitApplication(req.user!.id);
    securityEvents.admissionSubmit(req, req.user!.id, admissionId);
    return res.json({ success: true, message: 'Application submitted successfully!' });
  } catch (err: any) {
    if (err.message?.includes('cannot be submitted')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

/** POST /api/student/check-aadhaar */
export const checkAadhaar = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar || aadhaar.length !== 12) {
      return res.json({ exists: false });
    }
    const exists = await admissionService.checkAadhaar(aadhaar, req.user?.id);
    return res.json({ exists });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/check-cet */
export const checkCet = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { cetNumber, type } = req.body;
    if (!cetNumber || !type) return res.json({ exists: false });
    const exists = await admissionService.checkCet(cetNumber, type, req.user?.id);
    return res.json({ exists });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/branches */
export const getBranches = async (
  _req: Request, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const branches = await admissionService.getBranches();
    return res.json({ success: true, data: branches });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/application/download-pdf */
export const downloadPDF = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const data = await admissionService.getFullDetails(req.user!.id);
    if (!data) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const appNum = data.applicationNumber || 'UNKNOWN';
    const user = data.user || {};
    const personal = data.studentpersonaldetails || {};
    const branch = data.branch || {};

    // Build a simple text-based PDF without external dependencies
    // (If pdfkit is available, use it; fallback to plain text download)
    const content = [
      '='.repeat(60),
      '        COLLEGE ERP - ADMISSION ACKNOWLEDGMENT',
      '='.repeat(60),
      '',
      `Application Number : ${appNum}`,
      `Applicant Name     : ${user.firstName || ''} ${user.lastName || ''}`,
      `Email              : ${user.email || ''}`,
      `Phone              : ${personal.phone || user.phone || ''}`,
      `Date of Birth      : ${personal.dateOfBirth || ''}`,
      `Gender             : ${personal.gender || ''}`,
      `Admission Type     : ${data.admissionType || ''}`,
      `Branch             : ${branch.name || ''} (${branch.code || ''})`,
      `Status             : ${data.applicationStatus || ''}`,
      '',
      '-'.repeat(60),
      'This is an auto-generated acknowledgment.',
      `Generated on: ${new Date().toLocaleDateString('en-IN')}`,
      '='.repeat(60),
    ].join('\n');

    const buffer = Buffer.from(content, 'utf-8');
    
    // Log audit event
    securityEvents.documentDownload(req, req.user!.id, data.id, 'Admission Acknowledgment');

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="Admission_${appNum}.txt"`,
      'Content-Length': buffer.length,
    });
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
};

/** GET /api/public/handbook - Download official Admission Handbook PDF (Public, No Auth Required) */
export const downloadHandbook = async (
  _req: Request, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const config = await SystemConfiguration.findOne();
    if (config?.handbookUrl) {
      const relativePath = config.handbookUrl.startsWith('/') ? config.handbookUrl.slice(1) : config.handbookUrl;
      const fullPath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(fullPath)) {
        return res.download(fullPath, 'Jain_College_Admission_Handbook.pdf');
      }
    }

    // Check if generated static file already exists on disk
    const staticHandbookPath = path.join(process.cwd(), 'uploads', 'Jain_College_Admission_Handbook.pdf');
    if (fs.existsSync(staticHandbookPath)) {
      return res.download(staticHandbookPath, 'Jain_College_Admission_Handbook.pdf');
    }

    // Generate handbook PDF buffer
    const pdfBuffer = generateHandbookPDFBuffer();

    // Persist file to uploads and public/static directories
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const publicStaticDir = path.join(process.cwd(), 'public', 'static');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      if (!fs.existsSync(publicStaticDir)) fs.mkdirSync(publicStaticDir, { recursive: true });

      fs.writeFileSync(staticHandbookPath, pdfBuffer);
      fs.writeFileSync(path.join(publicStaticDir, 'Jain_College_Admission_Handbook.pdf'), pdfBuffer);
    } catch (saveErr: any) {
      logger.warn(`Could not save static handbook PDF file: ${saveErr.message}`);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Jain_College_Admission_Handbook.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    return res.send(pdfBuffer);
  } catch (err) {
    return next(err);
  }
};

// ─── Admin Endpoints ─────────────────────────────────────────────────────────

/** GET /api/admin/admissions */
export const listAdmissions = async (
  req: AuthRequest, res: Response, _next: NextFunction
): Promise<any> => {
  try {
    const {
      status,
      branchId,
      admissionType,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
      qualification,
      gender,
      category,
      district,
      academicYear,
      startDate,
      endDate
    } = req.query as any;
    const result = await admissionService.listApplications({
      status,
      branchId,
      admissionType,
      search,
      sortBy,
      sortOrder,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      qualification,
      gender,
      category,
      district,
      academicYear,
      startDate,
      endDate,
      includeFullDetails: req.query.includeFullDetails === 'true'
    });
    
    if (!result || result.total === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0
      });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Error in listAdmissions controller:", err);
    return res.json({
      success: true,
      data: [],
      total: 0
    });
  }
};

/** GET /api/admin/admissions/:id */
export const getAdmissionById = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const data = await admissionService.getApplicationById(id);
    if (!data) return res.status(404).json({ error: 'Application not found' });

    // Requirement 8 Logging before sending response
    const studentId = data.userId || data.user?.id || data.user?.student?.id || 'N/A';
    const docsObj = data.studentdocuments || data.documents || {};
    const docEntries = Object.entries(docsObj).filter(
      ([key, val]) => val !== null && val !== undefined && val !== '' && key !== 'id' && key !== 'admissionId' && key !== 'createdAt' && key !== 'updatedAt'
    );
    const docUrls = docEntries.map(([key, val]) => `${key}: ${val}`);

    console.log("==================== [BACKEND ADMISSION REVIEW] ====================");
    console.log("Application ID:", id);
    console.log("Student ID:", studentId);
    console.log("Number of documents found:", docEntries.length);
    console.log("Document URLs:", docUrls);
    console.log("====================================================================");

    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/admin/admissions/:id/documents/:field */
export const viewAdmissionDocument = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { id, field } = req.params;
    const documentColumn = DOCUMENT_FIELD_MAP[field];

    if (!documentColumn) {
      return res.status(400).json({ error: 'Invalid document field.' });
    }

    const documents = await AdmissionDocument.findOne({ where: { admissionId: id } });
    if (!documents) {
      return res.status(404).json({ error: 'No documents found for this application.' });
    }

    const fileUrl = documents.get(documentColumn as string) as string | null;
    if (!fileUrl) {
      return res.status(404).json({ error: 'Document not uploaded.' });
    }

    const relativePath = fileUrl.replace(/^\/+/, '');
    if (!relativePath.startsWith('uploads/')) {
      return res.status(400).json({ error: 'Invalid document path.' });
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const isInsideUploads =
      absolutePath === uploadsRoot || absolutePath.startsWith(`${uploadsRoot}${path.sep}`);

    if (!isInsideUploads || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Document file not found.' });
    }

    securityEvents.documentDownload(req, req.user!.id, id, field);

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(absolutePath)}"`);
    return res.sendFile(absolutePath);
  } catch (err) {
    return next(err);
  }
};

export const updateAdmissionStatus = async (
  req: AuthRequest, res: Response, _next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { status, remarks, rejectionReason, rejectionReasonCode, sections, deadline } = req.body;
    const validStatuses = ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED', 'CORRECTION_REQUIRED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be UNDER_REVIEW, APPROVED, REJECTED, ENROLLED, or CORRECTION_REQUIRED.' });
    }

    if (status === 'REJECTED') {
      if (!rejectionReasonCode) {
        return res.status(400).json({ error: 'rejectionReasonCode is required when status is REJECTED.' });
      }
      if (rejectionReasonCode === 'OTHER' && (!remarks || !remarks.trim())) {
        return res.status(400).json({ error: 'Remarks are mandatory when rejection reason is OTHER.' });
      }
    }

    if (status === 'CORRECTION_REQUIRED') {
      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: 'At least one section must be specified for correction.' });
      }
      if (!remarks || !remarks.trim()) {
        return res.status(400).json({ error: 'Correction remarks/instructions are required.' });
      }
    }

    const data = await admissionService.getApplicationById(id);
    const oldStatus = data ? data.applicationStatus : 'UNKNOWN';

    const enrollmentNumber = await admissionService.updateStatus(
      id,
      status,
      req.user!.id,
      remarks,
      rejectionReason,
      rejectionReasonCode,
      sections,
      deadline
    );

    // Log audit status change
    if (status === 'ENROLLED' && enrollmentNumber) {
      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMIN_APPROVED_ADMISSION',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { admissionId: id, enrollmentNumber, oldStatus },
      });
    } else if (status === 'APPROVED') {
      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMIN_VERIFIED_DOCUMENTS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { admissionId: id, oldStatus, newStatus: status },
      });
    } else if (status === 'REJECTED') {
      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMISSION_STATUS_CHANGE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          action: 'ADMISSION_REJECTED',
          reason: rejectionReasonCode,
          remarks: remarks || '',
          performedBy: req.user!.id,
        },
      });
    } else if (status === 'CORRECTION_REQUIRED') {
      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMISSION_STATUS_CHANGE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          action: 'ADMISSION_CORRECTION_REQUIRED',
          sections,
          remarks: remarks || '',
          deadline,
          performedBy: req.user!.id,
        },
      });
    } else {
      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMISSION_STATUS_CHANGE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { admissionId: id, oldStatus, newStatus: status },
      });
    }

    return res.json({ message: `Application ${status.toLowerCase()}`, enrollmentNumber });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

export const verifyAdmissionChecklist = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (req.user!.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'SUPER_ADMIN cannot perform routine document verification. This is an ADMIN task.' });
    }

    const { id } = req.params;
    const payload = req.body;
    
    await admissionService.verifyChecklist(id, req.user!.id, payload);
    
    await AuditLog.create({
      userId: req.user!.id,
      action: 'ADMIN_VERIFIED_DOCUMENTS',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { admissionId: id, payload },
    });
    
    return res.json({ message: 'Validation checklist updated successfully' });
  } catch (error: any) {
    console.error('Error verifying checklist:', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};

/** GET /api/admin/stats */
export const getAdminStats = async (
  _req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const stats = await admissionService.getDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/cancellation-request */
export const requestAdmissionCancellation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { reason, remarks } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const admission = await Admission.findOne({ where: { userId: req.user!.id } });
    if (!admission) {
      return res.status(404).json({ error: 'Admission application not found' });
    }

    if (admission.applicationStatus !== 'ENROLLED') {
      return res.status(403).json({ error: 'Only confirmed admissions can be cancelled' });
    }

    admission.applicationStatus = 'CANCELLATION_REQUESTED';
    admission.cancellationReason = reason;
    admission.cancellationRemarks = remarks || null;
    admission.cancellationRequestedAt = new Date();
    admission.cancellationRequestedById = req.user!.id;
    await admission.save();

    await AuditLog.create({
      userId: req.user!.id,
      action: 'ADMISSION_STATUS_CHANGE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        admissionId: admission.id,
        action: 'ADMISSION_CANCELLATION_REQUESTED',
        reason,
        remarks: remarks || '',
        performedBy: req.user!.id,
      },
    });

    return res.json({ success: true, message: 'Cancellation request submitted successfully' });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/admissions/:id/cancellation-process */
export const processCancellationRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!action || (action !== 'APPROVE' && action !== 'REJECT')) {
      return res.status(400).json({ error: 'Valid action (APPROVE or REJECT) is required' });
    }

    const admission = await Admission.findByPk(id);
    if (!admission) {
      return res.status(404).json({ error: 'Admission application not found' });
    }

    if (admission.applicationStatus !== 'CANCELLATION_REQUESTED') {
      return res.status(400).json({ error: 'Admission application is not in Cancellation Requested status' });
    }

    if (action === 'APPROVE') {
      admission.applicationStatus = 'CANCELLED';
      admission.cancellationApprovedAt = new Date();
      admission.cancellationApprovedById = req.user!.id;
      admission.cancellationAdminRemarks = remarks || null;
      await admission.save();

      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMISSION_STATUS_CHANGE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          admissionId: id,
          action: 'ADMISSION_CANCELLATION_APPROVED',
          remarks: remarks || '',
          performedBy: req.user!.id,
        },
      });

      return res.json({ success: true, message: 'Admission cancellation approved successfully' });
    } else {
      // Revert back to ENROLLED (Admission Confirmed)
      admission.applicationStatus = 'ENROLLED';
      admission.cancellationRejectedAt = new Date();
      admission.cancellationRejectedById = req.user!.id;
      admission.cancellationAdminRemarks = remarks || null;
      await admission.save();

      await AuditLog.create({
        userId: req.user!.id,
        action: 'ADMISSION_STATUS_CHANGE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          admissionId: id,
          action: 'ADMISSION_CANCELLATION_REJECTED',
          remarks: remarks || '',
          performedBy: req.user!.id,
        },
      });

      return res.json({ success: true, message: 'Admission cancellation request rejected' });
    }
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/admissions/:id/cancellation-direct */
export const directCancelAdmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const admission = await Admission.findByPk(id);
    if (!admission) {
      return res.status(404).json({ error: 'Admission application not found' });
    }

    if (admission.applicationStatus !== 'ENROLLED' && admission.applicationStatus !== 'APPROVED') {
      return res.status(400).json({ error: 'Only confirmed/approved admissions can be directly cancelled' });
    }

    admission.applicationStatus = 'CANCELLED';
    admission.cancellationReason = reason;
    admission.cancellationRemarks = remarks || null;
    admission.cancellationApprovedAt = new Date();
    admission.cancellationApprovedById = req.user!.id;
    admission.cancellationAdminRemarks = remarks || null;
    await admission.save();

    await AuditLog.create({
      userId: req.user!.id,
      action: 'ADMISSION_STATUS_CHANGE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        admissionId: id,
        action: 'ADMISSION_CANCELLED_DIRECT',
        reason,
        remarks: remarks || '',
        performedBy: req.user!.id,
      },
    });

    return res.json({ success: true, message: 'Admission cancelled directly by administrator' });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/student/upload-fee-receipt */
export const uploadFeeReceipt = async (
  req: AuthRequest, res: Response, _next: NextFunction
): Promise<any> => {
  try {
    const file = req.file;
    let receiptUrl = req.body.receiptUrl;
    if (file) {
      receiptUrl = `/uploads/${file.filename}`;
    }
    if (!receiptUrl) {
      return res.status(400).json({ success: false, message: 'Fee receipt file is required.' });
    }

    const result = await admissionService.uploadFeeReceipt(req.user!.id, receiptUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

/** POST /api/admin/admissions/:id/fee-verify */
export const verifyFeeReceipt = async (
  req: AuthRequest, res: Response, _next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { approve, remarks, rejectionReason } = req.body;
    if (typeof approve !== 'boolean') {
      return res.status(400).json({ error: 'approve parameter (boolean) is required.' });
    }

    const result = await admissionService.verifyFeeReceipt(id, req.user!.id, { approve, remarks, rejectionReason });
    
    await AuditLog.create({
      userId: req.user!.id,
      action: approve ? 'ADMIN_VERIFIED_FEE_RECEIPT' : 'ADMIN_REJECTED_FEE_RECEIPT',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { admissionId: id, approve, remarks, rejectionReason },
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

/** PUT /api/admin/admissions/:id */
export const updateAdmissionDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const transaction = await db.transaction();
  try {
    const { id } = req.params;
    const payload = req.body;

    const admission = await Admission.findByPk(id, { transaction });
    if (!admission) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Admission application not found.' });
    }

    const sanitizePayload = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const sanitized = { ...obj };
      for (const key of Object.keys(sanitized)) {
        if (sanitized[key] === '') {
          sanitized[key] = null;
        }
      }
      return sanitized;
    };

    // Update main Admission fields
    if (payload.admissionType !== undefined) admission.admissionType = payload.admissionType;
    if (payload.branchId !== undefined) admission.branchId = payload.branchId === 'ALL' || payload.branchId === '' ? null : payload.branchId;
    if (payload.academicYear !== undefined) admission.academicYear = payload.academicYear;
    if (payload.aadhaar !== undefined) admission.aadhaar = payload.aadhaar;
    if (payload.cetNumber !== undefined) admission.cetNumber = payload.cetNumber;
    if (payload.dcetNumber !== undefined) admission.dcetNumber = payload.dcetNumber;
    await admission.save({ transaction });

    // Update associated User fields
    if (payload.user) {
      const user = await User.findByPk(admission.userId, { transaction });
      if (user) {
        const sanitizedUser = sanitizePayload(payload.user);
        if (sanitizedUser.firstName !== undefined) user.firstName = sanitizedUser.firstName;
        if (sanitizedUser.lastName !== undefined) user.lastName = sanitizedUser.lastName;
        if (sanitizedUser.email !== undefined) user.email = sanitizedUser.email;
        if (sanitizedUser.phone !== undefined) user.phone = sanitizedUser.phone;
        await user.save({ transaction });
      }
    }

    // Update AdmissionPersonalDetail fields
    if (payload.studentpersonaldetails) {
      const [pd] = await AdmissionPersonalDetail.findOrCreate({
        where: { admissionId: id },
        defaults: { admissionId: id },
        transaction
      });
      await pd.update(sanitizePayload(payload.studentpersonaldetails), { transaction });
    }

    // Update AdmissionParentDetail fields
    if (payload.studentparentdetails) {
      const [par] = await AdmissionParentDetail.findOrCreate({
        where: { admissionId: id },
        defaults: { admissionId: id },
        transaction
      });
      await par.update(sanitizePayload(payload.studentparentdetails), { transaction });
    }

    // Update AdmissionAddress fields
    if (payload.studentaddress) {
      const [addr] = await AdmissionAddress.findOrCreate({
        where: { admissionId: id },
        defaults: { admissionId: id },
        transaction
      });
      await addr.update(sanitizePayload(payload.studentaddress), { transaction });
    }

    // Update AdmissionAcademicDetail fields
    if (payload.studentacademicdetails) {
      const [acad] = await AdmissionAcademicDetail.findOrCreate({
        where: { admissionId: id },
        defaults: { admissionId: id },
        transaction
      });
      await acad.update(sanitizePayload(payload.studentacademicdetails), { transaction });
    }

    await transaction.commit();
    return res.json({ success: true, message: 'Admission application details updated successfully.' });
  } catch (err) {
    await transaction.rollback();
    return next(err);
  }
};

/** POST /api/admin/admissions/:id/documents (Admin Document Upload) */
export const saveAdminDocuments = async (
  req: AuthRequest & { studentUserId?: string }, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (!files || Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const studentId = req.studentUserId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Could not resolve student identity.' });
    }

    // Build URL map: fieldname → /uploads/admissions/studentId/fieldname/filename (served as static)
    const fileUrls: Record<string, string> = {};
    for (const field of Object.keys(files)) {
      const file = files[field][0];
      fileUrls[`${file.fieldname}Url`] = `/uploads/admissions/${studentId}/${file.fieldname}/${file.filename}`;
    }

    const admissionId = await admissionService.saveStep6(studentId, fileUrls);
    securityEvents.documentUpload(req, studentId, admissionId, Object.keys(fileUrls));
    return res.json({ success: true, message: 'Documents uploaded.', data: fileUrls });
  } catch (err) {
    return next(err);
  }
};

/** DELETE /api/admin/admissions/:id/documents/:field (Admin Remove Document) */
export const removeAdminDocument = async (
  req: AuthRequest & { studentUserId?: string }, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const { field } = req.params;
    const validFields = [
      'photo', 'signature', 'tenthMarksheet', 'twelfthMarksheet',
      'diplomaSemester5Marksheet', 'diplomaSemester6Marksheet',
      'cetScoreCard', 'aadhaar', 'casteCertificate', 'domicileCertificate',
      'gapCertificate', 'feesPaidReceipt'
    ];
    if (!validFields.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid document field.' });
    }

    const dbKey = `${field}Url`;
    const studentId = req.studentUserId;
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Could not resolve student identity.' });
    }
    const admissionId = await admissionService.saveStep6(studentId, { [dbKey]: null });
    
    return res.json({ success: true, message: 'Document removed.', data: { [dbKey]: null } });
  } catch (err) {
    return next(err);
  }
};

/** DELETE /api/admin/admissions/bulk-delete-cancelled */
export const bulkDeleteCancelledAdmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const transaction = await db.transaction();
  try {
    // 1. Fetch all cancelled admissions
    const cancelledAdmissions = await Admission.findAll({
      where: { applicationStatus: 'CANCELLED' },
      transaction
    });

    if (cancelledAdmissions.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'No cancelled admission applications found to delete.' });
    }

    const admissionIds = cancelledAdmissions.map(a => a.id);
    const userIds = cancelledAdmissions.map(a => a.userId).filter(Boolean);

    // Fetch corresponding student profile records to release USNs
    const cancelledStudents = await Student.findAll({
      where: { userId: userIds },
      transaction
    });

    // 2. Perform database deletes in order
    // Delete Admission documents
    await AdmissionDocument.destroy({ where: { admissionId: admissionIds }, transaction });

    // Delete Admission details
    await AdmissionAcademicDetail.destroy({ where: { admissionId: admissionIds }, transaction });
    await AdmissionAddress.destroy({ where: { admissionId: admissionIds }, transaction });
    await AdmissionParentDetail.destroy({ where: { admissionId: admissionIds }, transaction });
    await AdmissionPersonalDetail.destroy({ where: { admissionId: admissionIds }, transaction });

    // Release USN in UsnRegistry if any was claimed
    const studentUSNs = cancelledStudents.map(s => s.usn).filter(Boolean);
    if (studentUSNs.length > 0) {
      await UsnRegistry.update(
        { status: 'AVAILABLE' },
        { where: { usn: studentUSNs }, transaction }
      );
    }

    // Delete Student records
    await Student.destroy({ where: { userId: userIds }, transaction });

    // Delete Notifications
    await Notification.destroy({ where: { userId: userIds }, transaction });

    // Delete Admission applications
    await Admission.destroy({ where: { id: admissionIds }, transaction });

    // Delete associated User accounts
    await User.destroy({ where: { id: userIds }, transaction });

    // 3. Record Audit Log inside the transaction
    const adminUser = await User.findByPk(req.user!.id, { transaction });
    const adminName = adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() : 'Admin';

    await AuditLog.create({
      userId: req.user!.id,
      action: 'BULK_DELETE_CANCELLED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        adminId: req.user!.id,
        adminName,
        timestamp: new Date(),
        count: cancelledAdmissions.length,
        admissionIds,
        userIds,
        applicationNumbers: cancelledAdmissions.map(a => a.applicationNumber).filter(Boolean),
        performedBy: req.user!.id,
      },
    }, { transaction });

    // 4. Commit database transaction
    await transaction.commit();

    // 5. File System Cleanup (Post-commit)
    const baseUploadDir = path.join(process.cwd(), 'uploads', 'admissions');
    for (const userId of userIds) {
      if (!userId) continue;

      // Validate UUID strictly to prevent path traversal
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        logger.error(`Skipping file cleanup for invalid student user UUID: ${userId}`);
        continue;
      }

      const studentFolder = path.join(baseUploadDir, userId);

      // Verify path belongs to uploads/admissions directory
      const relativePath = path.relative(baseUploadDir, studentFolder);
      const isSafe = relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

      if (!isSafe) {
        logger.error(`Security Alert: Blocked path traversal attempt for student user ID: ${userId}`);
        continue;
      }

      try {
        if (fs.existsSync(studentFolder)) {
          fs.rmSync(studentFolder, { recursive: true, force: true });
          logger.info(`Successfully deleted upload folder for student user ID: ${userId}`);
        }
      } catch (fileErr) {
        logger.error(`Failed to delete upload folder for student user ID ${userId}:`, fileErr);
      }
    }

    return res.json({
      success: true,
      message: `${cancelledAdmissions.length} cancelled student record(s) permanently deleted.`
    });
  } catch (err) {
    await transaction.rollback();
    return next(err);
  }
};
