import { Request } from 'express';
import AuditLog from '../models/AuditLog';
import Admission from '../models/Admission';
import User from '../models/User';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';

export interface StudentIdentification {
  admissionId?: string;
  applicationNumber?: string;
  studentName?: string;
}

/**
 * Resolves student identification (studentName, applicationNumber, admissionId)
 * from an admissionId, Admission instance, or userId.
 */
export async function resolveStudentIdentification(
  admissionOrIdOrUserId?: string | any | null
): Promise<StudentIdentification> {
  if (!admissionOrIdOrUserId) return {};

  try {
    let admission: any = null;

    if (typeof admissionOrIdOrUserId === 'object' && admissionOrIdOrUserId !== null) {
      admission = admissionOrIdOrUserId;
      // If studentpersonaldetails or user are not loaded, fetch them if needed
      if ((!admission.studentpersonaldetails || !admission.user) && admission.id) {
        admission = await Admission.findByPk(admission.id, {
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username', 'email'] },
            { model: AdmissionPersonalDetail, as: 'studentpersonaldetails', attributes: ['firstName', 'middleName', 'lastName'] }
          ]
        });
      }
    } else if (typeof admissionOrIdOrUserId === 'string') {
      admission = await Admission.findByPk(admissionOrIdOrUserId, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username', 'email'] },
          { model: AdmissionPersonalDetail, as: 'studentpersonaldetails', attributes: ['firstName', 'middleName', 'lastName'] }
        ]
      });

      if (!admission) {
        admission = await Admission.findOne({
          where: { userId: admissionOrIdOrUserId },
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'username', 'email'] },
            { model: AdmissionPersonalDetail, as: 'studentpersonaldetails', attributes: ['firstName', 'middleName', 'lastName'] }
          ]
        });
      }
    }

    if (!admission) return {};

    const pd = admission.studentpersonaldetails;
    const pdName = pd ? `${pd.firstName || ''} ${pd.middleName ? pd.middleName + ' ' : ''}${pd.lastName || ''}`.trim() : '';
    const u = admission.user;
    const userName = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '';
    const studentName = pdName || userName || u?.username || u?.email || 'Unknown Student';

    return {
      admissionId: admission.id,
      applicationNumber: admission.applicationNumber || 'N/A',
      studentName
    };
  } catch (err) {
    console.error('Error resolving student identification for audit log:', err);
    return {};
  }
}

class SecurityEventsService {
  public resolveStudentIdentification = resolveStudentIdentification;

  /**
   * Universal centralized helper for logging any admission/student-related administrative or system action.
   * Enriches details with historical snapshot of { admissionId, applicationNumber, studentName }.
   */
  public async logAdmissionAudit(params: {
    req?: Request;
    userId?: string | null;
    action: string;
    admissionOrId?: string | any | null;
    ip?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, any>;
    transaction?: any;
  }): Promise<void> {
    try {
      const { req, userId, action, admissionOrId, details = {}, transaction } = params;
      const ipAddress = params.ipAddress || params.ip || (req ? (req.ip || (req.headers['x-forwarded-for'] as string) || null) : null);
      const userAgent = params.userAgent || (req ? (req.headers['user-agent'] as string) : null);

      const targetRef = admissionOrId || details.admissionId || details.id;
      const studentInfo = await resolveStudentIdentification(targetRef);

      const enrichedDetails: Record<string, any> = {
        ...details,
        admissionId: studentInfo.admissionId || details.admissionId || (typeof targetRef === 'string' ? targetRef : undefined),
        applicationNumber: studentInfo.applicationNumber || details.applicationNumber,
        studentName: studentInfo.studentName || details.studentName,
      };

      await AuditLog.create({
        userId: userId || null,
        action,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        details: enrichedDetails
      }, transaction ? { transaction } : undefined);
    } catch (err) {
      console.error('Failed to write Admission AuditLog:', err);
    }
  }

  /**
   * Logs a failed login attempt
   */
  public async loginFailure(req: Request, email: string, reason: string, userId?: string | null): Promise<void> {
    try {
      await AuditLog.create({
        userId: userId || null,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { email, reason }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in loginFailure:', err);
    }
  }

  /**
   * Logs a successful login session
   */
  public async loginSuccess(req: Request, user: { id: string; role: string; email: string }): Promise<void> {
    try {
      await AuditLog.create({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { email: user.email, role: user.role }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in loginSuccess:', err);
    }
  }

  /**
   * Logs a user logout event
   */
  public async logout(req: Request, userId: string): Promise<void> {
    try {
      await AuditLog.create({
        userId,
        action: 'LOGOUT',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null
      });
    } catch (err) {
      console.error('Failed to write AuditLog in logout:', err);
    }
  }

  /**
   * Logs when an applicant edits a step of the admission form
   */
  public async stepEdit(req: Request, userId: string, admissionId: string, stepNumber: number): Promise<void> {
    try {
      const studentInfo = await resolveStudentIdentification(admissionId);
      await AuditLog.create({
        userId,
        action: 'ADMISSION_STEP_EDIT',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: {
          admissionId: studentInfo.admissionId || admissionId,
          applicationNumber: studentInfo.applicationNumber,
          studentName: studentInfo.studentName,
          stepNumber
        }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in stepEdit:', err);
    }
  }

  /**
   * Logs when files are uploaded during admission
   */
  public async documentUpload(req: Request, userId: string, admissionId: string, fieldNames: string[]): Promise<void> {
    try {
      const studentInfo = await resolveStudentIdentification(admissionId);
      await AuditLog.create({
        userId,
        action: 'ADMISSION_DOCUMENT_UPLOAD',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: {
          admissionId: studentInfo.admissionId || admissionId,
          applicationNumber: studentInfo.applicationNumber,
          studentName: studentInfo.studentName,
          files: fieldNames
        }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in documentUpload:', err);
    }
  }

  /**
   * Logs when the applicant finalizes and submits their application
   */
  public async admissionSubmit(req: Request, userId: string, admissionId: string): Promise<void> {
    try {
      const studentInfo = await resolveStudentIdentification(admissionId);
      await AuditLog.create({
        userId,
        action: 'ADMISSION_SUBMIT',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: {
          admissionId: studentInfo.admissionId || admissionId,
          applicationNumber: studentInfo.applicationNumber,
          studentName: studentInfo.studentName,
        }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in admissionSubmit:', err);
    }
  }

  /**
   * Logs file downloads by administrators or students
   */
  public async documentDownload(req: Request, userId: string, id: string, docNameOrField: string): Promise<void> {
    try {
      const studentInfo = await resolveStudentIdentification(id);
      await AuditLog.create({
        userId,
        action: 'DOCUMENT_DOWNLOAD',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: {
          admissionId: studentInfo.admissionId || id,
          applicationNumber: studentInfo.applicationNumber,
          studentName: studentInfo.studentName,
          resourceId: id,
          document: docNameOrField
        }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in documentDownload:', err);
    }
  }

  /**
   * Logs when an admin views an admission application
   */
  public async admissionView(req: Request, userId: string, id: string, applicantName?: string): Promise<void> {
    try {
      const studentInfo = await resolveStudentIdentification(id);
      await AuditLog.create({
        userId,
        action: 'ADMISSION_VIEW',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: {
          admissionId: studentInfo.admissionId || id,
          applicationNumber: studentInfo.applicationNumber,
          studentName: studentInfo.studentName || applicantName,
          applicantName: studentInfo.studentName || applicantName
        }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in admissionView:', err);
    }
  }

  /**
   * Logs credential generation actions by administrators
   */
  public async generateCredentials(req: Request, adminId: string, targetUserId: string, action: string): Promise<void> {
    try {
      const studentInfo = await resolveStudentIdentification(targetUserId);
      await AuditLog.create({
        userId: adminId,
        action,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: {
          targetUserId,
          admissionId: studentInfo.admissionId,
          applicationNumber: studentInfo.applicationNumber,
          studentName: studentInfo.studentName,
        }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in generateCredentials:', err);
    }
  }
}

export default new SecurityEventsService();
