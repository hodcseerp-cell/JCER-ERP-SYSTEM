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

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate ONE unified, production-grade, JCER-branded responsive HTML email.
 * Optimized for Gmail Mobile & Desktop, Apple Mail, Outlook, and Dark Mode compatibility.
 */
export function getJcerCommonEmailHtml(params: CommonEmailParams): string {
  const DEFAULT_LOGO_URL = 'https://jcer.in/wp-content/uploads/2020/09/jcer-logo.png';
  const logoUrl = process.env.EMAIL_LOGO_URL || process.env.PUBLIC_LOGO_URL || DEFAULT_LOGO_URL;
  const currentYear = new Date().getFullYear();
  const academicYearStr = `${currentYear}–${currentYear + 1}`;

  const safeRecipientName = escapeHtml(params.recipientName || 'User');
  const safeSubject = escapeHtml(params.subject || 'JCER ERP Notification');

  const detailsRows = params.details && params.details.length > 0
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: separate;">
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
            <div style="font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin: 0;">
              Application Details
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 14px 18px 6px 18px;">
            ${params.details.map((d, index) => `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px; ${index < params.details!.length - 1 ? 'border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;' : ''}">
                <tr>
                  <td style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 3px;">
                    ${escapeHtml(d.label)}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 13px; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; word-break: break-word; line-height: 1.4;">
                    ${escapeHtml(d.value)}
                  </td>
                </tr>
              </table>
            `).join('')}
          </td>
        </tr>
      </table>
    `
    : '';

  const otpBlock = params.otpCode
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td align="center" style="background-color: #f0f7ff; border: 2px dashed #4f46e5; border-radius: 14px; padding: 22px 16px; text-align: center;">
            <div style="font-size: 11px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
              One-Time Verification Code (OTP)
            </div>
            <div class="otp-text" style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #3730a3 !important; margin: 0; line-height: 1.2;">
              ${escapeHtml(params.otpCode)}
            </div>
            ${params.otpExpiryMinutes ? `
              <div style="font-size: 12px; font-weight: 700; color: #4f46e5; margin-top: 10px;">
                ⏱ Valid for ${params.otpExpiryMinutes} minutes
              </div>
            ` : ''}
          </td>
        </tr>
      </table>
    `
    : '';

  const securityBlock = params.securityNote
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #991b1b; line-height: 1.5; font-weight: 500;">
            🔒 <strong>Security Guidance:</strong> ${escapeHtml(params.securityNote)}
          </td>
        </tr>
      </table>
    `
    : '';

  const actionBlock = params.actionMessage
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
        <tr>
          <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #166534; font-weight: 600; line-height: 1.5;">
            💡 ${escapeHtml(params.actionMessage)}
          </td>
        </tr>
      </table>
    `
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${safeSubject}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; }
    
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid-padding { padding-left: 16px !important; padding-right: 16px !important; }
      .header-title { font-size: 17px !important; line-height: 1.3 !important; }
      .otp-text { font-size: 26px !important; letter-spacing: 6px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 20px 8px;">
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border-collapse: separate;">
          
          <!-- HEADER -->
          <tr>
            <td style="background: #0f172a; padding: 24px 24px; border-bottom: 3px solid #3b82f6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="64" valign="middle" style="width: 64px; padding-right: 14px;">
                    <img
                      src="${logoUrl}"
                      alt="Jain College of Engineering &amp; Research"
                      width="56"
                      height="56"
                      style="display: block; width: 56px; height: 56px; border: 0; outline: none; border-radius: 50%; background-color: #ffffff; padding: 2px;"
                    />
                  </td>
                  <td valign="middle" style="text-align: left;">
                    <div class="header-title" style="font-size: 19px; font-weight: 800; color: #ffffff; line-height: 1.25; margin: 0; font-family: Arial, Helvetica, sans-serif; overflow-wrap: break-word; word-break: normal;">
                      Jain College of Engineering &amp; Research
                    </div>
                    <div style="font-size: 11px; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px;">
                      OFFICIAL ERP NOTIFICATION
                    </div>
                    <div style="margin-top: 6px;">
                      <span style="display: inline-block; padding: 3px 10px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(147, 197, 253, 0.4); border-radius: 12px; font-size: 11px; color: #e0e7ff; font-weight: 700;">
                        ${escapeHtml(params.badgeTitle || `Academic Year ${academicYearStr}`)}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td class="fluid-padding" style="padding: 28px 28px 20px 28px; background-color: #ffffff;">
              <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; overflow-wrap: break-word; word-break: normal;">
                Dear ${safeRecipientName},
              </div>
              <div style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 20px; overflow-wrap: break-word; word-break: normal;">
                ${params.mainMessage}
              </div>
              ${otpBlock}
              ${securityBlock}
              ${detailsRows}
              ${actionBlock}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
                Jain College of Engineering &amp; Research
              </div>
              <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                JCER Admission ERP &mdash; Belagavi, Karnataka
              </div>
              <div style="font-size: 12px; color: #475569;">
                Website: <a href="https://jcer.in" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; font-weight: 700; text-decoration: none;">jcer.in</a>
              </div>
              <div style="margin-top: 10px; font-size: 10px; color: #94a3b8; line-height: 1.4;">
                ${escapeHtml(params.footerText || 'This is an automated notification from JCER ERP. Please do not reply directly to this email.')}
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`.trim();
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
      mainMessage: `Congratulations! Your ${typeLabel} application (${data.applicationNumber}) has been officially approved by the Admissions Committee.`,
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
      mainMessage: `We regret to inform you that your ${typeLabel} application (${data.applicationNumber}) could not be approved.`,
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
      mainMessage: `🎉 Congratulations ${data.studentName}! Your ${typeLabel} has been officially confirmed by the Principal. Welcome to Jain College of Engineering & Research!`,
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
      mainMessage: `Candidate ${data.studentName} has corrected and resubmitted their application (#${data.applicationNumber}).`,
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
      mainMessage: `Student ${data.studentName} (${data.applicationNumber}) has uploaded their ₹500 Admission Fee Receipt.`,
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
      mainMessage: `Application ${data.applicationNumber} for student ${data.studentName} has been fully verified.`,
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

  // ─── EMAIL CHANGE NOTIFICATIONS ──────────────────────────────────────────
  /** Send 6-digit OTP code to the requested NEW email address */
  public async sendEmailChangeOtp(
    newEmail: string,
    recipientName: string,
    otpCode: string,
    expiryMinutes: number = 10
  ): Promise<boolean> {
    const subject = 'JCER ERP — Email Address Update Verification';
    const html = getJcerCommonEmailHtml({
      recipientName,
      subject,
      badgeTitle: 'Email Update OTP',
      headingText: 'Verify Your New Email Address',
      mainMessage: `You have requested to update your JCER ERP account email address to <strong>${escapeHtml(newEmail)}</strong>. Please enter the verification code below to authorize this change.`,
      otpCode,
      otpExpiryMinutes: expiryMinutes,
      securityNote: 'If you did not initiate this email change request, please ignore this message and ensure your account password remains secure.',
    });

    return this.dispatchEmail(newEmail, subject, html);
  }

  /** Send email change confirmation to the NEW email address */
  public async sendEmailChangeConfirmation(
    newEmail: string,
    recipientName: string
  ): Promise<boolean> {
    const subject = 'JCER ERP — Email Address Updated Successfully';
    const html = getJcerCommonEmailHtml({
      recipientName,
      subject,
      badgeTitle: 'Email Address Updated',
      mainMessage: `Your JCER ERP account email address has been successfully updated.`,
      details: [
        { label: 'New Email Address', value: newEmail },
        { label: 'Status', value: 'VERIFIED & UPDATED' },
      ],
      actionMessage: 'You can now use this email address to sign in to the JCER ERP portal with your existing password.',
      securityNote: 'If you did not make this change, please contact the college administration immediately.',
    });

    return this.dispatchEmail(newEmail, subject, html);
  }

  /** Send security advisory notice to the OLD email address */
  public async sendOldEmailChangeNotification(
    oldEmail: string,
    recipientName: string,
    newEmail: string
  ): Promise<boolean> {
    const subject = 'JCER ERP — Your Email Address Was Changed';
    const html = getJcerCommonEmailHtml({
      recipientName,
      subject,
      badgeTitle: 'Security Alert 🔒',
      mainMessage: `The primary email address for your JCER ERP account was recently changed to <strong>${escapeHtml(newEmail)}</strong>.`,
      actionMessage: 'This notification was sent to your former email address as a security precaution.',
      securityNote: 'If you authorized this change, no further action is required. If you did NOT make this change, please contact the college administration immediately to secure your account.',
    });

    return this.dispatchEmail(oldEmail, subject, html);
  }
}

export const emailService = new EmailService();
export default emailService;
