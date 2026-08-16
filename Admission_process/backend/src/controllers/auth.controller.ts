import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';
import User from '../models/User';
import Student from '../models/Student';
import Admission from '../models/Admission';
import authService from '../services/auth.service';
import securityEvents from '../services/securityEvents.service';
import otpService from '../services/otp.service';
import emailService from '../services/email.service';
import Otp from '../models/Otp';
import SystemConfiguration from '../models/SystemConfiguration';
import logger from '../utils/logger.util';

const IS_PROD = process.env.NODE_ENV === 'production';

// Cookie options for the refresh token
const cookieOptions = {
  httpOnly: true,
  secure: IS_PROD, // Secure in production (HTTPS)
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

const getUserPayload = async (user: User) => {
  const student = user.role === 'STUDENT' ? await Student.findOne({ where: { userId: user.id } }) : null;
  const admission = user.role === 'STUDENT' ? await Admission.findOne({ where: { userId: user.id } }) : null;
  const system = (user.role === 'STUDENT' && (!admission || admission.applicationStatus !== 'ENROLLED') && !student)
    ? 'ADMISSION'
    : 'ERP';
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
    profileImage: user.profileImage,
    mustChangePassword: user.mustChangePassword,
    system,
  };
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn(`LOGIN_FAILED: Missing email or password in request body`);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    logger.info(`LOGIN_ATTEMPT: Email received: ${normalizedEmail}`);

    // Query user by email
    let user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      logger.warn(`LOGIN_FAILED: User not found for email: ${normalizedEmail}`);
      securityEvents.loginFailure(req, email, 'User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    logger.info(`LOGIN_DEBUG: User found - ID: ${user.id}, Role: ${user.role}, Status: ${user.status}, Email: ${user.email}`);
    logger.info(`LOGIN_DEBUG: Stored password hash exists: ${!!user.passwordHash} (length: ${user.passwordHash ? user.passwordHash.length : 0})`);

    // Check status
    if (user.status !== 'ACTIVE') {
      logger.warn(`LOGIN_FAILED: User account is ${user.status} for email: ${user.email}`);
      securityEvents.loginFailure(req, email, `Account ${user.status.toLowerCase()}`, user.id);
      return res.status(403).json({ error: 'Your account is inactive or suspended' });
    }

    // Compare entered password with stored hash using bcrypt.compare
    const isMatch = await user.comparePassword(password);
    logger.info(`LOGIN_DEBUG: bcrypt.compare result for email ${user.email}: ${isMatch}`);

    if (!isMatch) {
      logger.warn(`LOGIN_FAILED: Invalid password (bcrypt.compare returned false) for user: ${user.email}`);
      securityEvents.loginFailure(req, email, 'Invalid password', user.id);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens and store session via AuthService
    const { accessToken, refreshToken } = await authService.generateTokens(user);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Audit Success
    securityEvents.loginSuccess(req, { id: user.id, role: user.role, email: user.email });
    logger.info(`LOGIN_SUCCESS: Successfully authenticated user: ${user.email} (Role: ${user.role})`);

    return res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        user: await getUserPayload(user),
      },
    });
  } catch (error) {
    logger.error('LOGIN_ERROR: Server exception during login execution:', error);
    return next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;

    if (!currentRefreshToken) {
      return res.status(401).json({ error: 'Refresh token not found. Please log in again.' });
    }

    const sessionData = await authService.refreshSession(currentRefreshToken);

    if (!sessionData) {
      // Clear cookie if session is invalid or expired
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    // Set the new rotated refresh token
    res.cookie('refreshToken', sessionData.refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      data: {
        token: sessionData.accessToken,
        user: await getUserPayload(sessionData.user),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
  try {
    const authReq = req as any;
    if (authReq.user?.id) {
      // Revoke the session in Redis
      await authService.revokeSession(authReq.user.id);
      securityEvents.logout(req, authReq.user.id);
    }
    
    // Clear the httpOnly cookie
    res.clearCookie('refreshToken');

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error during logout' });
  }
};

export const status = async (req: Request, res: Response): Promise<any> => {
  const authReq = req as any;
  if (!authReq.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const user = await User.findByPk(authReq.user.id, {
      attributes: ['id', 'email', 'role', 'firstName', 'lastName', 'profileImage', 'status', 'mustChangePassword']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'User account is inactive or suspended' });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: await getUserPayload(user),
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error check' });
  }
};

export const checkPhone = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const existing = await User.findOne({ where: { phone } });
    return res.status(200).json({ exists: !!existing });
  } catch (error) {
    return next(error);
  }
};

// ─── EMAIL OTP: REGISTRATION ENDPOINTS ───────────────────────────────────────

export const sendRegistrationOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (process.env.EMAIL_OTP_ENABLED !== 'true') {
      return res.status(200).json({
        success: true,
        message: 'OTP verification is disabled. You can register directly.',
      });
    }

    const { firstName, lastName, email, phone } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'First name, last name, and email are required.' });
    }

    // Check if admissions are open
    const config = await SystemConfiguration.findOne();
    if (config && config.admissionOpen === false) {
      return res.status(403).json({ error: 'Admissions are currently closed. Please contact the college office for further information.' });
    }

    // Check email uniqueness
    const existingEmail = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingPhone = await User.findOne({ where: { phone: phone.trim() } });
      if (existingPhone) {
        return res.status(409).json({ error: 'An account with this mobile number already exists.' });
      }
    }

    // Generate and save OTP
    const genResult = await otpService.generateAndSaveOtp(email, 'REGISTER');
    if (!genResult.success || !genResult.otp) {
      return res.status(429).json({ error: genResult.error || 'Failed to generate OTP.' });
    }

    // Send OTP email
    const studentName = `${firstName} ${lastName}`.trim();
    const emailSent = await emailService.sendRegistrationOTP(email, studentName, genResult.otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send OTP email. Please verify your email address.' });
    }

    return res.status(200).json({
      success: true,
      message: 'A 6-digit OTP has been sent to your email address. Please check your inbox.',
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyRegistrationOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (process.env.EMAIL_OTP_ENABLED !== 'true') {
      return res.status(200).json({
        success: true,
        message: 'OTP verification is disabled.',
      });
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const verifyResult = await otpService.verifyOtp(email, otp, 'REGISTER');
    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.error || 'OTP verification failed.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { firstName, lastName, email, password, phone, registrationType } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
    }

    let finalRegType: 'FRESH' | 'LATERAL_ENTRY' = 'FRESH';
    if (registrationType === 'LATERAL_ENTRY') {
      finalRegType = 'LATERAL_ENTRY';
    }

    // Check if admissions are open
    const config = await SystemConfiguration.findOne();
    if (config) {
      if (finalRegType === 'FRESH' && config.freshAdmissionOpen === false) {
        return res.status(403).json({ error: 'Fresh admissions are currently closed.' });
      }
      if (finalRegType === 'LATERAL_ENTRY' && config.lateralEntryOpen === false) {
        return res.status(403).json({ error: 'Lateral entry admissions are currently closed.' });
      }
      if (config.admissionOpen === false) {
        return res.status(403).json({ error: 'Admissions are currently closed. Please contact the college office for further information.' });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();



    // Check email uniqueness
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingPhone = await User.findOne({ where: { phone: phone.trim() } });
      if (existingPhone) {
        return res.status(409).json({ error: 'An account with this mobile number already exists.' });
      }
    }

    // Auto-generate username from email
    const username = normalizedEmail.split('@')[0] + Math.floor(100 + Math.random() * 900);

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      username,
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      role: 'STUDENT',
      status: 'ACTIVE',
      registrationType: finalRegType,
    });

    // Generate tokens and return login payload
    const { accessToken, refreshToken: newRefreshToken } = await authService.generateTokens(newUser);
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: {
        token: accessToken,
        user: await getUserPayload(newUser),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// ─── EMAIL OTP: FORGOT PASSWORD ENDPOINTS ─────────────────────────────────────

export const sendForgotPasswordOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (process.env.EMAIL_OTP_ENABLED !== 'true') {
      return res.status(400).json({
        error: 'Password recovery is temporarily unavailable. Please contact the administrator.',
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'No registered student account found with this email address.' });
    }

    // Generate OTP
    const genResult = await otpService.generateAndSaveOtp(normalizedEmail, 'FORGOT_PASSWORD');
    if (!genResult.success || !genResult.otp) {
      return res.status(429).json({ error: genResult.error || 'Failed to generate OTP.' });
    }

    // Send email using Nodemailer Gmail SMTP
    const studentName = `${user.firstName} ${user.lastName}`.trim();
    const emailSent = await emailService.sendForgotPasswordOTP(normalizedEmail, studentName, genResult.otp);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send password reset OTP email. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP has been sent to your email address.',
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyForgotPasswordOtp = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (process.env.EMAIL_OTP_ENABLED !== 'true') {
      return res.status(400).json({
        error: 'Password recovery is temporarily unavailable. Please contact the administrator.',
      });
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email address and OTP code are required.' });
    }

    const verifyResult = await otpService.verifyOtp(email, otp, 'FORGOT_PASSWORD');
    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.error || 'OTP verification failed.' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You may now enter your new password.',
    });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (process.env.EMAIL_OTP_ENABLED !== 'true') {
      return res.status(400).json({
        error: 'Password recovery is temporarily unavailable. Please contact the administrator.',
      });
    }

    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email address and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if OTP was verified for FORGOT_PASSWORD
    const verifiedOtp = await Otp.findOne({
      where: {
        email: normalizedEmail,
        purpose: 'FORGOT_PASSWORD',
        verified: true,
      },
      order: [['updatedAt', 'DESC']],
    });

    if (!verifiedOtp) {
      return res.status(403).json({ error: 'Password reset unauthorized. OTP verification required.' });
    }

    // Find user
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update user password
    await user.update({ passwordHash: newPasswordHash });

    logger.info(`Password successfully reset for user ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! Please log in with your new password.',
    });
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await user.update({
      passwordHash: hash,
      mustChangePassword: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return next(error);
  }
};
