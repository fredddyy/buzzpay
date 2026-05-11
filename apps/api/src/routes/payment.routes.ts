import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/initialize', authenticate, paymentLimiter, paymentController.initialize);
router.get('/verify/:reference', authenticate, paymentController.verify);
router.post('/webhook', paymentController.webhook); // No auth — Paystack signature verification

export default router;
