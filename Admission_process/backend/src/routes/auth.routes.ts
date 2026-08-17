import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', authLimiter, authController.login);
router.post('/verify-daily-otp', authLimiter, authController.verifyDailyOtp);
router.post('/check-phone', authController.checkPhone);
router.post('/refresh-token', refreshLimiter, authController.refreshToken);

// Student Registration OTP Endpoints
router.post('/send-registration-otp', authLimiter, authController.sendRegistrationOtp);
router.post('/verify-registration-otp', authLimiter, authController.verifyRegistrationOtp);
router.post('/register', authLimiter, authController.register);

// Forgot Password OTP Endpoints
router.post('/send-forgot-password-otp', authLimiter, authController.sendForgotPasswordOtp);
router.post('/verify-forgot-password-otp', authLimiter, authController.verifyForgotPasswordOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

import multer from 'multer';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Authenticated Endpoints
router.post('/logout', authMiddleware, authController.logout);
router.get('/status', authMiddleware, authController.status);
router.post('/change-password', authMiddleware, authController.changePassword);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/profile-image', authMiddleware, avatarUpload.single('avatar'), authController.uploadProfileImage);

// Email Change Endpoints (Authenticated)
router.post('/email-change/request', authMiddleware, authLimiter, authController.requestEmailChange);
router.post('/email-change/verify', authMiddleware, authLimiter, authController.verifyEmailChange);

export default router;
