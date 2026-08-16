import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger.util';
import { getRegistrationOtpEmailHtml } from '../templates/emails/registrationOtp';
import { getForgotPasswordOtpEmailHtml } from '../templates/emails/forgotPasswordOtp';

class EmailService {
  private transporter: Transporter | null = null;
  private initPromise: Promise<Transporter> | null = null;

  constructor() {
    this.initTransporter().catch((err) => {
      logger.error('Gmail SMTP Verification Error:', err);
    });
  }

  private async initTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      if (process.env.EMAIL_OTP_ENABLED !== 'true') {
        logger.info('Nodemailer SMTP email sending is disabled (EMAIL_OTP_ENABLED !== true). Using mock transporter.');
        this.transporter = {
          sendMail: async (options: any) => {
            logger.info(`[MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
            return { messageId: 'mock-id-' + Date.now() };
          },
          verify: async () => true
        } as any;
        return this.transporter!;
      }

      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;

      if (!user || !pass) {
        logger.error('Nodemailer configuration error: EMAIL_USER or EMAIL_PASS environment variable is missing.');
      }

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: true,
        },
      });

      try {
        await transporter.verify();
        logger.info('✅ Gmail SMTP Connected');
      } catch (error) {
        logger.error('Gmail SMTP verification failed:', error);
      }

      this.transporter = transporter;
      return transporter;
    })();

    return this.initPromise;
  }

  private getFromAddress(): string {
    return process.env.EMAIL_FROM || process.env.EMAIL_USER || 'JCER Admissions <collegeadmission.erp@gmail.com>';
  }

  private async sendMailWithRetry(mailOptions: nodemailer.SendMailOptions): Promise<nodemailer.SentMessageInfo> {
    const transporter = await this.initTransporter();
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error: any) {
      const isTimeout =
        error?.code === 'ETIMEOUT' ||
        (typeof error?.message === 'string' && error.message.includes('ETIMEOUT'));

      if (isTimeout) {
        logger.warn(`ETIMEOUT encountered while sending email to ${mailOptions.to}. Retrying sendMail one more time...`);
        return await transporter.sendMail(mailOptions);
      }
      throw error;
    }
  }

  /**
   * Send Registration OTP Email using Nodemailer Gmail SMTP
   */
  public async sendRegistrationOTP(email: string, name: string, otp: string): Promise<boolean> {
    try {
      const html = getRegistrationOtpEmailHtml({ name, otp });
      const from = this.getFromAddress();

      const mailOptions = {
        from,
        to: email,
        subject: 'Verify Your Email Address – JCER Admission Portal',
        html,
      };

      const info = await this.sendMailWithRetry(mailOptions);

      logger.info(`Registration OTP email successfully sent via Gmail SMTP to ${email} (Message ID: ${info.messageId})`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send Registration OTP email via Nodemailer to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send Forgot Password OTP Email using Nodemailer Gmail SMTP
   */
  public async sendForgotPasswordOTP(email: string, name: string, otp: string): Promise<boolean> {
    try {
      const html = getForgotPasswordOtpEmailHtml({ name, otp });
      const from = this.getFromAddress();

      const mailOptions = {
        from,
        to: email,
        subject: 'Reset Your JCER Admission Portal Password',
        html,
      };

      const info = await this.sendMailWithRetry(mailOptions);

      logger.info(`Forgot Password OTP email successfully sent via Gmail SMTP to ${email} (Message ID: ${info.messageId})`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send Forgot Password OTP email via Nodemailer to ${email}:`, error);
      return false;
    }
  }
  /**
   * Send Application Approved Email & SMS Notification to Student
   */
  public async sendApplicationApprovedNotification(email: string, name: string, appNumber: string): Promise<boolean> {
    try {
      const from = this.getFromAddress();
      const mailOptions = {
        from,
        to: email,
        subject: `Application Approved — Pay ₹500 Admission Fee (${appNumber})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #16a34a;">Congratulations ${name}!</h2>
            <p>Your admission application (<strong>${appNumber}</strong>) has been approved by the Admissions Team.</p>
            <p><strong>Next Step:</strong> Please visit the <strong>Jain College of Engineering & Research Admission Office</strong> within 7 days and pay the ₹500 Admission Processing Fee.</p>
            <p>After receiving your official printed college fee receipt, log into your student dashboard and upload a clear photo or PDF of the receipt to continue your admission process.</p>
            <br/>
            <p>Regards,<br/>Admissions Office<br/>Jain College of Engineering & Research</p>
          </div>
        `,
      };
      await this.sendMailWithRetry(mailOptions);
      logger.info(`Application approved notification email sent to ${email}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send application approved email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send Application Correction Required Email & SMS Notification to Student
   */
  public async sendCorrectionRequiredNotification(email: string, name: string, appNumber: string, reason: string, remarks?: string): Promise<boolean> {
    try {
      const from = this.getFromAddress();
      const mailOptions = {
        from,
        to: email,
        subject: `Correction Required — Application #${appNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #dc2626;">Action Required for Application #${appNumber}</h2>
            <p>Dear <strong>${name}</strong>,</p>
            <p>Your admission application has been sent back by the Principal / Admissions Committee for correction.</p>
            <p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 4px; font-weight: bold; color: #991b1b;">
              Reason: ${reason}${remarks ? `<br/>Remarks: ${remarks}` : ''}
            </p>
            <p>Please log into your student dashboard to review the remarks and re-submit your details or documents.</p>
            <br/>
            <p>Regards,<br/>Admissions Committee<br/>Jain College of Engineering & Research</p>
          </div>
        `,
      };
      await this.sendMailWithRetry(mailOptions);
      logger.info(`Correction required notification email sent to ${email}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send correction required email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send Notification to Admin when Student Resubmits Corrections
   */
  public async sendStudentResubmittedNotificationToAdmin(data: { studentName: string; applicationNumber: string; correctedSections: string[] }): Promise<boolean> {
    try {
      const from = this.getFromAddress();
      const adminEmail = process.env.SMTP_ADMIN_EMAIL || 'admissions@jcer.edu.in';
      const mailOptions = {
        from,
        to: adminEmail,
        subject: `⚠️ Resubmitted: Application #${data.applicationNumber} Corrected`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d97706;">Application Resubmitted After Corrections</h2>
            <p>Dear Administrator,</p>
            <p>Candidate <strong>${data.studentName}</strong> has corrected and resubmitted their application (<strong>#${data.applicationNumber}</strong>).</p>
            <p>The following sections were corrected and require verification:</p>
            <ul style="font-weight: bold; color: #b45309;">
              ${data.correctedSections.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <p>Please log in to the Admin Review Workspace to review the updated details.</p>
            <br/>
            <p>Regards,<br/>JCER ERP System</p>
          </div>
        `,
      };
      await this.sendMailWithRetry(mailOptions);
      logger.info(`Student resubmitted notification email sent to Admin: ${adminEmail}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send student resubmitted email to admin:`, error);
      return false;
    }
  }

  /**
   * Send Notification to Admin when Student Uploads Fee Receipt
   */
  public async sendFeeReceiptUploadedNotification(data: { studentName: string; applicationNumber: string; studentEmail: string }): Promise<boolean> {
    try {
      const from = this.getFromAddress();
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@college.com';
      const mailOptions = {
        from,
        to: adminEmail,
        subject: `Fee Receipt Uploaded — ${data.applicationNumber} (${data.studentName})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h3>Fee Receipt Uploaded</h3>
            <p>Student <strong>${data.studentName}</strong> (${data.applicationNumber}) has uploaded their ₹500 Admission Fee Receipt.</p>
            <p>Please log in to the Admin Dashboard under <strong>💰 Admission Fees</strong> queue to verify the receipt.</p>
          </div>
        `,
      };
      await this.sendMailWithRetry(mailOptions);
      logger.info(`Fee receipt uploaded notification sent to admin`);
      return true;
    } catch (error: any) {
      logger.error('Failed to send fee receipt uploaded notification:', error);
      return false;
    }
  }

  /**
   * Send Notification to Principal when Admin verifies Fee Receipt
   */
  public async sendFeeVerifiedNotificationToPrincipal(data: { studentName: string; applicationNumber: string }): Promise<boolean> {
    try {
      const from = this.getFromAddress();
      const principalEmail = process.env.PRINCIPAL_EMAIL || process.env.EMAIL_USER || 'principal@college.com';
      const mailOptions = {
        from,
        to: principalEmail,
        subject: `Admission Pending Sign-off — ${data.applicationNumber} (${data.studentName})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h3>Admission Application Ready for Confirmation</h3>
            <p>Application <strong>${data.applicationNumber}</strong> for student <strong>${data.studentName}</strong> has been fully verified (documents & fee receipt).</p>
            <p>Please review and confirm the admission in the Principal Portal under <strong>Admission Confirmation</strong>.</p>
          </div>
        `,
      };
      await this.sendMailWithRetry(mailOptions);
      logger.info(`Fee verified notification sent to principal`);
      return true;
    } catch (error: any) {
      logger.error('Failed to send fee verified notification to principal:', error);
      return false;
    }
  }

  /**
   * Send Final Admission Confirmed Notification to Student
   */
  public async sendAdmissionConfirmedNotification(email: string, name: string, appNumber: string, usn: string): Promise<boolean> {
    try {
      const from = this.getFromAddress();
      const mailOptions = {
        from,
        to: email,
        subject: `🎉 Admission Confirmed! USN: ${usn} (${appNumber})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #7c3aed;">🎉 Congratulations ${name}!</h2>
            <p>Your admission at <strong>Jain College of Engineering & Research</strong> has been officially confirmed by the Principal.</p>
            <p style="font-size: 18px; font-weight: bold; background: #f3e8ff; padding: 12px; border-radius: 8px; color: #6b21a8; text-align: center;">
              Your Allocated USN: ${usn}
            </p>
            <p>Welcome to JCER! You can download your official confirmed admission slip from your Student Dashboard.</p>
            <br/>
            <p>Best regards,<br/>Principal & Admissions Committee<br/>Jain College of Engineering & Research</p>
          </div>
        `,
      };
      await this.sendMailWithRetry(mailOptions);
      logger.info(`Admission confirmed notification email sent to ${email}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send admission confirmed email to ${email}:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;
