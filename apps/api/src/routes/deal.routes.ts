import { Router } from 'express';
import { dealController } from '../controllers/deal.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { dealFilterSchema } from '@buzzpay/shared';

const router = Router();

router.get('/', authenticate, validate(dealFilterSchema, 'query'), dealController.list);
router.get('/happy-hour', authenticate, dealController.happyHour);
router.get('/featured', authenticate, dealController.featured);
router.get('/:id', authenticate, dealController.getById);

export default router;
