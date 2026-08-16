import nodemailer, { Transporter } from 'nodemailer';
import axios from 'axios';
import logger from '../utils/logger.util';

export interface CommonEmailParams {
  recipientName: string;
  subject: string;
  badgeTitle?: string;
  headingText?: string;
  mainMessage: string;
  otpCode?: string;
  otpExpiryMinutes?: number;
  securityNote?: string;
  details?: Array<{ label: string; value: string }>;
  actionMessage?: string;
  footerText?: string;
}

/**
 * Generate ONE unified, production-grade, JCER-branded HTML email.
 * Reuses the existing public logo asset with horizontal alignment.
 */
export function getJcerCommonEmailHtml(params: CommonEmailParams): string {
  const logoUrl = process.env.PUBLIC_LOGO_URL || 'https://resulting-pensions-migration-regularly.trycloudflare.com/logo.png';
  const currentYear = new Date().getFullYear();
  const academicYearStr = `${currentYear}–${currentYear + 1}`;

  const detailsRows = params.details && params.details.length > 0
    ? `
      <div style="margin: 24px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em;">Application Details</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${params.details.map(d => `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 40%; font-size: 12px;">${d.label}:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 13px;">${d.value}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  const otpBlock = params.otpCode
    ? `
      <div style="background: linear-gradient(135deg, #e0e7ff 0%, #e0f2fe 100%); border: 2px dashed #6366f1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #4338ca; margin: 0;">${params.otpCode}</div>
        ${params.otpExpiryMinutes ? `<div style="font-size: 12px; font-weight: 700; color: #4f46e5; margin-top: 8px;">⏱ Valid for ${params.otpExpiryMinutes} minutes</div>` : ''}
      </div>
    `
    : '';

  const securityBlock = params.securityNote
    ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #991b1b; margin-bottom: 20px; font-weight: 500;">
        🔒 <strong>Security Guidance:</strong> ${params.securityNote}
      </div>
    `
    : '';

  const actionBlock = params.actionMessage
    ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 16px; font-size: 13px; color: #166534; font-weight: 600; margin-bottom: 20px;">
        💡 ${params.actionMessage}
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 0; line-height: 1.6; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 28px 32px; }
    .header-table { width: 100%; border-collapse: collapse; }
    .logo-td { width: 64px; vertical-align: middle; }
    .logo-img { width: 56px; height: 56px; border-radius: 50%; background-color: #ffffff; padding: 2px; display: block; object-fit: contain; }
    .title-td { padding-left: 16px; vertical-align: middle; }
    .college-name { margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2; }
    .portal-subtitle { margin: 4px 0 0 0; font-size: 12px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge { display: inline-block; margin-top: 8px; padding: 3px 10px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; color: #c7d2fe; font-weight: 700; }
    .body-content { padding: 32px 32px 24px 32px; }
    .greeting { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
    .main-text { font-size: 14px; color: #334155; margin-bottom: 20px; line-height: 1.6; }
    .footer { background-color: #f8fafc; padding: 20px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 3px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <table class="header-table">
        <tr>
          <td class="logo-td">
            <img src="${logoUrl}" alt="JCER Logo" class="logo-img" />
          </td>
          <td class="title-td">
            <h1 class="college-name">Jain College of Engineering & Research</h1>
            <p class="portal-subtitle">Official ERP Notification</p>
            <div class="badge">${params.badgeTitle || `Academic Year ${academicYearStr}`}</div>
          </td>
        </tr>
      </table>
    </div>

    <div class="body-content">
      <div class="greeting">Dear ${params.recipientName},</div>
      <div class="main-text">${params.mainMessage}</div>
      ${otpBlock}
      ${securityBlock}
      ${detailsRows}
      ${actionBlock}
    </div>

    <div class="footer">
      <p><strong>Jain College of Engineering & Research</strong> — JCER Admission ERP</p>
      <p>Belagavi, Karnataka | Website: <a href="https://jcer.in" style="color: #4f46e5; text-decoration: none;">jcer.in</a></p>
      <p style="margin-top: 8px; color: #94a3b8; font-size: 10px;">${params.footerText || 'This is an automated notification. Please do not reply directly to this email.'}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

class EmailService {
  private transporter: Transporter | null = null;
  private brevoApiKey: string | null = null;
  private senderEmail: string;
  private senderName: string;

  constructor() {
    this.brevoApiKey = process.env.BREVO_API_KEY || null;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'admissions@jcer.in';
    this.senderName = process.env.BREVO_SENDER_NAME || 'JCER Admission ERP';

    if (this.brevoApiKey) {
      logger.info('✅ Brevo Transactional Email Service configured via REST API');
    } else {
      this.initNodemailer();
    }
  }

  private initNodemailer() {
    if (process.env.EMAIL_OTP_ENABLED !== 'true') {
      logger.info('Nodemailer SMTP email sending is disabled (EMAIL_OTP_ENABLED !== true). Using mock transporter.');
      this.transporter = {
        sendMail: async (options: any) => {
          logger.info(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
          return { messageId: 'mock-id-' + Date.now() };
        },
        verify: async () => true,
      } as any;
      return;
    }

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 30000,
    });
  }

  /**
   * Internal dispatcher: Tries Brevo REST API first if configured, else Nodemailer
   */
  private async dispatchEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (this.brevoApiKey) {
        // Send via Brevo REST API
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: this.senderName, email: this.senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent: html,
          },
          {
            headers: {
              'api-key': this.brevoApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            timeout: 15000,
          }
        );

        logger.info(`✅ Brevo Email sent to ${to} (MessageID: ${response.data?.messageId || 'sent'})`);
        return true;
      }

      // Fallback to Nodemailer
      if (this.transporter) {
        const from = `${this.senderName} <${this.senderEmail}>`;
        const info = await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        logger.info(`✅ Nodemailer email sent to ${to} (MessageID: ${info.messageId})`);
        return true;
      }

      logger.warn(`No active email transporter available to send email to ${to}`);
      return false;
    } catch (error: any) {
      logger.error(`❌ Failed to send email to ${to}: ${error.response?.data?.message || error.message}`);
      // Never throw error to caller (prevent transaction rollbacks)
      return false;
    }
  }

  // ─── 1. OTP EMAILS ─────────────────────────────────────────────────────────

  /** Student Registration OTP */
  public async sendRegistrationOTP(email: string, name: string, otp: string): Promise<boolean> {
    const html = getJcerCommonEmailHtml({
      recipientName: name,
      subject: 'JCER Admission Portal - Email Verification OTP',
      badgeTitle: 'Email Verification',
      mainMessage: 'Thank you for registering on the JCER Admission Portal. Please verify your email address using the One-Time Password (OTP) code below to complete your registration.',
      otpCode: otp,
      otpExpiryMinutes: 5,
      securityNote: 'Do not share this OTP with anyone. Your account registration requires successful OTP verification.',
    });
    return this.dispatchEmail(email, 'JCER Admission Portal - Email Verification OTP', html);
  }

  /** Admin / Principal Daily Login OTP */
  public async sendDailyLoginOTP(email: string, name: string, otp: string, role: 'ADMIN' | 'PRINCIPAL' | string): Promise<boolean> {
    const portalName = role === 'PRINCIPAL' ? 'Principal Portal' : 'Admin Portal';
    const subject = `JCER ${portalName} - Daily Login OTP`;

    const html = getJcerCommonEmailHtml({
      recipientName: name,
      subject,
      badgeTitle: `${role} Security Authentication`,
      mainMessage: `A daily login request was initiated for your ${portalName} account. Please verify your identity using the OTP below.`,
      otpCode: otp,
      otpExpiryMinutes: 5,
      securityNote: 'Once verified, today\'s OTP verification remains valid for the current calendar date. You will still need your email and password for future logins today.',
      actionMessage: 'If you did not request this OTP, please contact the IT Administrator immediately.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  /** Forgot Password OTP for All Roles */
  public async sendForgotPasswordOTP(email: string, name: string, otp: string, role?: string): Promise<boolean> {
    const rolePrefix = role ? `${role.charAt(0) + role.slice(1).toLowerCase()} ` : '';
    const subject = `JCER ${rolePrefix}Portal - Password Reset OTP`;

    const html = getJcerCommonEmailHtml({
      recipientName: name,
      subject,
      badgeTitle: 'Password Recovery',
      mainMessage: 'We received a request to reset your password for your JCER ERP account. Use the verification code below to authorize your password reset.',
      otpCode: otp,
      otpExpiryMinutes: 5,
      securityNote: 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  // ─── 2. NOTIFICATION EMAILS ────────────────────────────────────────────────

  /** Registration Successful Email */
  public async sendRegistrationSuccessEmail(email: string, name: string, applicationType: 'FRESH_ADMISSION' | 'LATERAL_ENTRY' | string): Promise<boolean> {
    const typeLabel = applicationType === 'LATERAL_ENTRY' ? 'Diploma Lateral Entry (3rd Semester)' : 'Fresh Admission (1st Semester)';
    const html = getJcerCommonEmailHtml({
      recipientName: name,
      subject: 'JCER Admission Portal - Registration Successful',
      badgeTitle: 'Account Created',
      mainMessage: 'Your JCER Admission Portal account has been successfully created! You can now log into your dashboard and complete your admission application.',
      details: [
        { label: 'Registered Email', value: email },
        { label: 'Application Track', value: typeLabel },
      ],
      actionMessage: 'Log in to your portal to start filling your 7-step admission details.',
    });
    return this.dispatchEmail(email, 'JCER Admission Portal - Registration Successful', html);
  }

  /** Application Submitted (Fresh / Lateral) */
  public async sendApplicationSubmittedNotification(email: string, data: {
    studentName: string;
    applicationNumber: string;
    applicationType: 'FRESH_ADMISSION' | 'LATERAL_ENTRY' | string;
    semester: string;
    academicYear: string;
    submissionDate: string;
  }): Promise<boolean> {
    const isLateral = data.applicationType === 'LATERAL_ENTRY';
    const typeTitle = isLateral ? 'Diploma Lateral Entry Application Submitted' : 'Admission Application Submitted';
    const subject = `JCER Admission Portal - ${typeTitle}`;

    const html = getJcerCommonEmailHtml({
      recipientName: data.studentName,
      subject,
      badgeTitle: 'Application Submitted',
      mainMessage: `Your ${isLateral ? 'Diploma Lateral Entry' : 'Fresh Admission'} application has been successfully submitted and is under verification by the Admissions Office.`,
      details: [
        { label: 'Application No', value: data.applicationNumber },
        { label: 'Application Type', value: isLateral ? 'Diploma Lateral Entry' : 'Fresh Admission' },
        { label: 'Entry Semester', value: data.semester },
        { label: 'Academic Year', value: data.academicYear },
        { label: 'Submission Date', value: data.submissionDate },
        { label: 'Status', value: 'UNDER_REVIEW' },
      ],
      actionMessage: 'You can log into your student portal anytime to track verification status in real-time.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  /** Provisional Admission Submitted */
  public async sendProvisionalSubmittedNotification(email: string, data: {
    studentName: string;
    provisionalAdmissionNumber: string;
    semester: string;
    academicYear: string;
    submissionDate: string;
  }): Promise<boolean> {
    const subject = 'JCER Admission Portal - Provisional Admission Submitted';

    const html = getJcerCommonEmailHtml({
      recipientName: data.studentName,
      subject,
      badgeTitle: 'Provisional Admission',
      mainMessage: 'Your Provisional Admission request has been submitted successfully.',
      details: [
        { label: 'Provisional Admission No', value: data.provisionalAdmissionNumber },
        { label: 'Application Type', value: 'Provisional Admission' },
        { label: 'Target Semester', value: data.semester },
        { label: 'Academic Year', value: data.academicYear },
        { label: 'Submission Date', value: data.submissionDate },
        { label: 'Status', value: 'PENDING_APPROVAL' },
      ],
      actionMessage: 'Your application is awaiting verification by the HOD / Admissions Office.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  /** Correction Required Notification */
  public async sendCorrectionRequiredNotification(email: string, data: {
    studentName: string;
    applicationNumber: string;
    applicationType: string;
    semester?: string;
    academicYear?: string;
    reason: string;
    remarks?: string;
  }): Promise<boolean> {
    const isLateral = data.applicationType === 'LATERAL_ENTRY';
    const isProvisional = data.applicationType === 'PROVISIONAL_ADMISSION';
    const typeLabel = isProvisional ? 'Provisional Admission' : isLateral ? 'Lateral Entry' : 'Admission';
    const subject = `JCER Admission Portal - ${typeLabel} Correction Required`;

    const details: Array<{ label: string; value: string }> = [
      { label: 'Application / PA No', value: data.applicationNumber },
      { label: 'Application Type', value: typeLabel },
    ];
    if (data.semester) details.push({ label: 'Semester', value: data.semester });
    if (data.academicYear) details.push({ label: 'Academic Year', value: data.academicYear });
    details.push({ label: 'Correction Reason', value: data.reason });
    if (data.remarks) details.push({ label: 'Remarks', value: data.remarks });

    const html = getJcerCommonEmailHtml({
      recipientName: data.studentName,
      subject,
      badgeTitle: 'Action Required',
      mainMessage: `Your ${typeLabel} application requires corrections before it can proceed further. Please review the remarks below and update your details.`,
      details,
      actionMessage: 'Log into your student portal to update the highlighted sections and resubmit.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  /** Approval Notification (Fresh / Lateral / Provisional) */
  public async sendApprovalNotification(email: string, data: {
    studentName: string;
    applicationNumber: string;
    applicationType: string;
    semester?: string;
    course?: string;
    branch?: string;
    academicYear?: string;
  }): Promise<boolean> {
    const isLateral = data.applicationType === 'LATERAL_ENTRY';
    const isProvisional = data.applicationType === 'PROVISIONAL_ADMISSION';
    const typeLabel = isProvisional ? 'Provisional Admission' : isLateral ? 'Lateral Entry' : 'Fresh Admission';
    const subject = `JCER Admission Portal - ${typeLabel} Approved`;

    const details: Array<{ label: string; value: string }> = [
      { label: 'Application / PA No', value: data.applicationNumber },
      { label: 'Application Type', value: typeLabel },
    ];
    if (data.semester) details.push({ label: 'Semester', value: data.semester });
    if (data.course) details.push({ label: 'Course', value: data.course });
    if (data.branch) details.push({ label: 'Branch / Dept', value: data.branch });
    if (data.academicYear) details.push({ label: 'Academic Year', value: data.academicYear });
    details.push({ label: 'Status', value: 'APPROVED' });

    const html = getJcerCommonEmailHtml({
      recipientName: data.studentName,
      subject,
      badgeTitle: 'Application Approved',
      mainMessage: `Congratulations! Your ${typeLabel} application (<strong>${data.applicationNumber}</strong>) has been officially approved by the Admissions Committee.`,
      details,
      actionMessage: 'Please log into your student dashboard for next steps and instructions.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  /** Rejection Notification */
  public async sendRejectionNotification(email: string, data: {
    studentName: string;
    applicationNumber: string;
    applicationType: string;
    semester?: string;
    academicYear?: string;
    rejectionReason: string;
  }): Promise<boolean> {
    const isLateral = data.applicationType === 'LATERAL_ENTRY';
    const isProvisional = data.applicationType === 'PROVISIONAL_ADMISSION';
    const typeLabel = isProvisional ? 'Provisional Admission' : isLateral ? 'Lateral Entry' : 'Admission';
    const subject = `JCER Admission Portal - ${typeLabel} Rejected`;

    const details: Array<{ label: string; value: string }> = [
      { label: 'Application / PA No', value: data.applicationNumber },
      { label: 'Application Type', value: typeLabel },
    ];
    if (data.semester) details.push({ label: 'Semester', value: data.semester });
    if (data.academicYear) details.push({ label: 'Academic Year', value: data.academicYear });
    details.push({ label: 'Rejection Reason', value: data.rejectionReason });

    const html = getJcerCommonEmailHtml({
      recipientName: data.studentName,
      subject,
      badgeTitle: 'Application Status Update',
      mainMessage: `We regret to inform you that your ${typeLabel} application (<strong>${data.applicationNumber}</strong>) could not be approved.`,
      details,
      footerText: 'For further queries regarding this decision, please contact the college admissions office.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  /** Final Confirmation Notification (Fresh / Lateral / Provisional) */
  public async sendConfirmationNotification(email: string, data: {
    studentName: string;
    applicationNumber: string;
    applicationType: string;
    usn?: string;
    semester?: string;
    academicYear?: string;
  }): Promise<boolean> {
    const isLateral = data.applicationType === 'LATERAL_ENTRY';
    const isProvisional = data.applicationType === 'PROVISIONAL_ADMISSION';
    const typeLabel = isProvisional ? 'Provisional Admission' : isLateral ? 'Lateral Entry' : 'Admission';
    const subject = `JCER Admission Portal - ${typeLabel} Confirmed`;

    const details: Array<{ label: string; value: string }> = [
      { label: 'Application / PA No', value: data.applicationNumber },
      { label: 'Application Type', value: typeLabel },
    ];
    if (data.usn) details.push({ label: 'Allocated USN', value: data.usn });
    if (data.semester) details.push({ label: 'Semester', value: data.semester });
    if (data.academicYear) details.push({ label: 'Academic Year', value: data.academicYear });
    details.push({ label: 'Final Status', value: 'CONFIRMED / ENROLLED' });

    const html = getJcerCommonEmailHtml({
      recipientName: data.studentName,
      subject,
      badgeTitle: 'Admission Confirmed 🎉',
      mainMessage: `🎉 Congratulations <strong>${data.studentName}</strong>! Your ${typeLabel} has been officially confirmed by the Principal. Welcome to Jain College of Engineering & Research!`,
      details,
      actionMessage: 'You can download your official confirmed admission slip from your Student Dashboard.',
    });

    return this.dispatchEmail(email, subject, html);
  }

  // ─── LEGACY HELPER METHODS FOR BACKWARD COMPATIBILITY ────────────────────
  public async sendApplicationApprovedNotification(email: string, name: string, appNumber: string): Promise<boolean> {
    return this.sendApprovalNotification(email, { studentName: name, applicationNumber: appNumber, applicationType: 'FRESH_ADMISSION' });
  }

  public async sendStudentResubmittedNotificationToAdmin(data: { studentName: string; applicationNumber: string; correctedSections: string[] }): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admissions@jcer.in';
    const html = getJcerCommonEmailHtml({
      recipientName: 'Administrator',
      subject: `Resubmitted: Application #${data.applicationNumber}`,
      badgeTitle: 'Correction Resubmitted',
      mainMessage: `Candidate <strong>${data.studentName}</strong> has corrected and resubmitted their application (<strong>#${data.applicationNumber}</strong>).`,
      details: [
        { label: 'Application No', value: data.applicationNumber },
        { label: 'Corrected Sections', value: data.correctedSections.join(', ') },
      ],
      actionMessage: 'Please review the updated details in the Admin Review Workspace.',
    });
    return this.dispatchEmail(adminEmail, `Resubmitted: Application #${data.applicationNumber}`, html);
  }

  public async sendFeeReceiptUploadedNotification(data: { studentName: string; applicationNumber: string; studentEmail: string }): Promise<boolean> {
    const adminEmail = process.env.ADMIN_EMAIL || 'admissions@jcer.in';
    const html = getJcerCommonEmailHtml({
      recipientName: 'Administrator',
      subject: `Fee Receipt Uploaded — ${data.applicationNumber}`,
      badgeTitle: 'Fee Receipt Verification',
      mainMessage: `Student <strong>${data.studentName}</strong> (${data.applicationNumber}) has uploaded their ₹500 Admission Fee Receipt.`,
      details: [
        { label: 'Application No', value: data.applicationNumber },
        { label: 'Student Name', value: data.studentName },
      ],
      actionMessage: 'Log in to Admin Dashboard under Admission Fees queue to verify.',
    });
    return this.dispatchEmail(adminEmail, `Fee Receipt Uploaded — ${data.applicationNumber}`, html);
  }

  public async sendFeeVerifiedNotificationToPrincipal(data: { studentName: string; applicationNumber: string }): Promise<boolean> {
    const principalEmail = process.env.PRINCIPAL_EMAIL || 'principal@jcer.in';
    const html = getJcerCommonEmailHtml({
      recipientName: 'Principal',
      subject: `Admission Pending Sign-off — ${data.applicationNumber}`,
      badgeTitle: 'Final Sign-off Required',
      mainMessage: `Application <strong>${data.applicationNumber}</strong> for student <strong>${data.studentName}</strong> has been fully verified.`,
      details: [
        { label: 'Application No', value: data.applicationNumber },
        { label: 'Student Name', value: data.studentName },
      ],
      actionMessage: 'Please review and confirm the admission in the Principal Portal.',
    });
    return this.dispatchEmail(principalEmail, `Admission Pending Sign-off — ${data.applicationNumber}`, html);
  }

  public async sendAdmissionConfirmedNotification(email: string, name: string, appNumber: string, usn: string): Promise<boolean> {
    return this.sendConfirmationNotification(email, { studentName: name, applicationNumber: appNumber, applicationType: 'FRESH_ADMISSION', usn });
  }
}

export const emailService = new EmailService();
export default emailService;
