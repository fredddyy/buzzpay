import { Router } from 'express';
import authRoutes from './auth.routes.js';
import dealRoutes from './deal.routes.js';
import paymentRoutes from './payment.routes.js';
import voucherRoutes from './voucher.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/deals', dealRoutes);
router.use('/payments', paymentRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trending vendors (public for student app)
router.get('/vendors/trending', async (_req, res) => {
  const { prisma } = await import('@buzzpay/db');
  const vendors = await prisma.vendor.findMany({
    where: { isTrending: true, isActive: true },
    select: { id: true, businessName: true, logoUrl: true, businessAddress: true },
    take: 10,
  });
  res.json({ success: true, data: vendors });
});

export default router;
