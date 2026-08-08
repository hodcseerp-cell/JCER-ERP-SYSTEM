import { Request } from 'express';
import AuditLog from '../models/AuditLog';

class SecurityEventsService {
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
      await AuditLog.create({
        userId,
        action: 'ADMISSION_STEP_EDIT',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { admissionId, stepNumber }
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
      await AuditLog.create({
        userId,
        action: 'ADMISSION_DOCUMENT_UPLOAD',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { admissionId, files: fieldNames }
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
      await AuditLog.create({
        userId,
        action: 'ADMISSION_SUBMIT',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { admissionId }
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
      await AuditLog.create({
        userId,
        action: 'DOCUMENT_DOWNLOAD',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { resourceId: id, document: docNameOrField }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in documentDownload:', err);
    }
  }

  /**
   * Logs when an admin views an admission application
   */
  public async admissionView(req: Request, userId: string, id: string, applicantName: string): Promise<void> {
    try {
      await AuditLog.create({
        userId,
        action: 'ADMISSION_VIEW',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { admissionId: id, applicantName }
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
      await AuditLog.create({
        userId: adminId,
        action,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        details: { targetUserId }
      });
    } catch (err) {
      console.error('Failed to write AuditLog in generateCredentials:', err);
    }
  }
}

export default new SecurityEventsService();
