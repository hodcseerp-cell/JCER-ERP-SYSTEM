import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import Otp, { OtpPurpose } from '../models/Otp';
import logger from '../utils/logger.util';

export interface GenerateOtpResult {
  success: boolean;
  otp?: string;
  error?: string;
  cooldownSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
}

class OtpService {
  /**
   * Generate 6-digit numeric OTP and save hashed copy in database.
   */
  public async generateAndSaveOtp(email: string, purpose: OtpPurpose): Promise<GenerateOtpResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    // 1. Rate Limit: Check requests in past 1 hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourlyRequestCount = await Otp.count({
      where: {
        email: normalizedEmail,
        purpose,
        createdAt: {
          [Op.gte]: oneHourAgo,
        },
      },
    });

    if (hourlyRequestCount >= 5) {
      logger.warn(`OTP rate limit exceeded for ${normalizedEmail} (${purpose})`);
      return {
        success: false,
        error: 'Too many OTP requests. Maximum 5 requests allowed per hour. Please try again later.',
      };
    }

    // 2. Cooldown Guard: Check if an OTP was created less than 60 seconds ago
    const latestOtp = await Otp.findOne({
      where: {
        email: normalizedEmail,
        purpose,
      },
      order: [['createdAt', 'DESC']],
    });

    if (latestOtp) {
      const elapsedSeconds = Math.floor((now.getTime() - new Date(latestOtp.createdAt).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remainingCooldown = 60 - elapsedSeconds;
        return {
          success: false,
          error: `Please wait ${remainingCooldown} seconds before requesting a new OTP.`,
          cooldownSeconds: remainingCooldown,
        };
      }
    }

    // 3. Invalidate any existing active OTPs for this email and purpose
    await Otp.update(
      { verified: true },
      {
        where: {
          email: normalizedEmail,
          purpose,
          verified: false,
        },
      }
    );

    // 4. Generate random 6-digit numeric OTP
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5. Hash OTP with bcrypt
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(plainOtp, salt);

    // 6. Expiry = 5 minutes
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // 7. Save into Otp table
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      purpose,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    logger.info(`OTP generated and hashed for ${normalizedEmail} (purpose: ${purpose}, expires: ${expiresAt.toISOString()})`);

    return {
      success: true,
      otp: plainOtp,
    };
  }

  /**
   * Verify an OTP entered by user.
   */
  public async verifyOtp(email: string, plainOtp: string, purpose: OtpPurpose): Promise<VerifyOtpResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = plainOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || isNaN(Number(cleanOtp))) {
      return {
        success: false,
        error: 'Invalid OTP format. Please enter a 6-digit numerical code.',
      };
    }

    // Find the latest active unverified OTP for email & purpose
    const otpRecord = await Otp.findOne({
      where: {
        email: normalizedEmail,
        purpose,
        verified: false,
      },
      order: [['createdAt', 'DESC']],
    });

    if (!otpRecord) {
      return {
        success: false,
        error: 'No active OTP found. Please request a new OTP.',
      };
    }

    // Check expiry
    const now = new Date();
    if (now > new Date(otpRecord.expiresAt)) {
      await otpRecord.update({ verified: true });
      return {
        success: false,
        error: 'OTP has expired (validity is 5 minutes). Please request a new OTP.',
      };
    }

    // Check attempt count
    if (otpRecord.attempts >= 5) {
      await otpRecord.update({ verified: true });
      return {
        success: false,
        error: 'Maximum verification attempts (5) exceeded. This OTP is now invalidated. Please request a new OTP.',
      };
    }

    // Verify hashed OTP using bcrypt
    const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otpHash);

    if (!isMatch) {
      const newAttempts = otpRecord.attempts + 1;
      const attemptsLeft = 5 - newAttempts;

      await otpRecord.update({ attempts: newAttempts });

      if (attemptsLeft <= 0) {
        await otpRecord.update({ verified: true });
        return {
          success: false,
          error: 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP.',
          attemptsRemaining: 0,
        };
      }

      return {
        success: false,
        error: `Incorrect OTP. You have ${attemptsLeft} attempt(s) remaining.`,
        attemptsRemaining: attemptsLeft,
      };
    }

    // OTP is valid! Invalidate immediately after successful verification
    await otpRecord.update({ verified: true });

    logger.info(`OTP successfully verified for ${normalizedEmail} (${purpose})`);
    return {
      success: true,
    };
  }
}

export const otpService = new OtpService();
export default otpService;
