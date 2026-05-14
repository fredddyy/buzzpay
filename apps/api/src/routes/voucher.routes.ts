import { Router } from 'express';
import { voucherController } from '../controllers/voucher.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { redeemByQrSchema, voucherFilterSchema } from '@buzzpay/shared';

const router = Router();

router.get('/', authenticate, validate(voucherFilterSchema, 'query'), voucherController.list);
router.get('/:id', authenticate, voucherController.getById);
router.get('/:id/qr', authenticate, voucherController.getRotatingQr);
router.post('/:id/redeem', authenticate, requireRole('VENDOR'), validate(redeemByQrSchema), voucherController.redeemByQr);
router.post('/redeem-rotating', authenticate, requireRole('VENDOR'), voucherController.redeemByRotatingQr);

export default router;
