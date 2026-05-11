import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { phoneAuthController } from '../controllers/phone-auth.controller.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema, refreshTokenSchema } from '@buzzpay/shared';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Phone OTP auth
router.post('/phone/send-otp', authLimiter, phoneAuthController.sendOtp);
router.post('/phone/verify-otp', authLimiter, phoneAuthController.verifyOtp);

// Email/password auth
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

export default router;
