import { getJcerCommonEmailHtml } from '../../services/email.service';

export interface RegistrationOtpTemplateParams {
  name: string;
  otp: string;
}

export function getRegistrationOtpEmailHtml({ name, otp }: RegistrationOtpTemplateParams): string {
  return getJcerCommonEmailHtml({
    recipientName: name,
    subject: 'Verify Your Email Address - JCER Admission Portal',
    badgeTitle: 'Email Verification',
    mainMessage: 'Welcome to the Jain College of Engineering & Research Online Admission Portal. Thank you for registering with us.<br><br>To continue your registration, please verify your email address using the One-Time Password (OTP) below.',
    otpCode: otp,
    otpExpiryMinutes: 5,
    securityNote: 'Do not share this OTP with anyone. Your account will only be created after successful OTP verification.',
  });
}
