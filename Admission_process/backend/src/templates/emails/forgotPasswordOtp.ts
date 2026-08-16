import { getJcerCommonEmailHtml } from '../../services/email.service';

export interface ForgotPasswordOtpTemplateParams {
  name: string;
  otp: string;
}

export function getForgotPasswordOtpEmailHtml({ name, otp }: ForgotPasswordOtpTemplateParams): string {
  return getJcerCommonEmailHtml({
    recipientName: name,
    subject: 'Reset Your JCER Admission Portal Password',
    badgeTitle: 'Password Recovery',
    mainMessage: 'A request has been received to reset the password for your JCER Admission Portal account.<br><br>Please use the One-Time Password (OTP) below to complete your password reset request.',
    otpCode: otp,
    otpExpiryMinutes: 5,
    securityNote: 'If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account remains secure.',
  });
}
