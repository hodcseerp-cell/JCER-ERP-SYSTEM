import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { authLimiter, refreshLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', authLimiter, authController.login);
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

// Authenticated Endpoints
router.post('/logout', authMiddleware, authController.logout);
router.get('/status', authMiddleware, authController.status);
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
