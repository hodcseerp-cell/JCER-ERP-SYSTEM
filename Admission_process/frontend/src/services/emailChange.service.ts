import API from './api';

export interface EmailChangeRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EmailChangeVerifyResponse {
  success: boolean;
  message?: string;
  email?: string;
  error?: string;
}

class EmailChangeService {
  /**
   * Request OTP for changing email to newEmail.
   */
  async requestEmailChange(newEmail: string): Promise<EmailChangeRequestResponse> {
    const response = await API.post<EmailChangeRequestResponse>('/auth/email-change/request', {
      newEmail,
    });
    return response.data;
  }

  /**
   * Verify 6-digit OTP code to complete email change.
   */
  async verifyEmailChange(otp: string): Promise<EmailChangeVerifyResponse> {
    const response = await API.post<EmailChangeVerifyResponse>('/auth/email-change/verify', {
      otp,
    });
    return response.data;
  }
}

export const emailChangeService = new EmailChangeService();
export default emailChangeService;
