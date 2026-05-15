import { Router } from 'express';
import { prisma } from '@buzzpay/db';
import { authenticate } from '../middleware/auth.js';
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

// Vendor-facing endpoints
router.get('/vendor/my-deals', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
    if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
    const deals = await prisma.deal.findMany({
      where: { vendorId: user.vendor.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: deals.map(d => ({
      id: d.id, title: d.title, category: d.category,
      studentPrice: d.studentPrice, remainingQty: d.remainingQty,
      totalQuantity: d.totalQuantity, isActive: d.isActive,
      featuredSection: (d as any).featuredSection,
      dailyStart: (d as any).dailyStart, dailyEnd: (d as any).dailyEnd,
    }))});
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/vendor/stats', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
    if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
    const vendorId = user.vendor.id;

    const [todayEarnings, monthEarnings, scansToday, recentScans, pendingPayout] = await Promise.all([
      prisma.payment.aggregate({
        where: { deal: { vendorId }, status: 'SUCCESS', paidAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
        _sum: { vendorAmount: true },
      }),
      prisma.payment.aggregate({
        where: { deal: { vendorId }, status: 'SUCCESS', paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { vendorAmount: true },
      }),
      prisma.voucher.count({
        where: { deal: { vendorId }, status: 'REDEEMED', redeemedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      }),
      prisma.voucher.findMany({
        where: { deal: { vendorId }, status: 'REDEEMED' },
        include: { student: { include: { user: { select: { fullName: true } } } }, deal: { select: { title: true, studentPrice: true } } },
        orderBy: { redeemedAt: 'desc' },
        take: 20,
      }),
      prisma.payment.aggregate({
        where: { deal: { vendorId }, status: 'SUCCESS' },
        _sum: { vendorAmount: true },
      }),
    ]);

    res.json({ success: true, data: {
      todayEarnings: todayEarnings._sum.vendorAmount ?? 0,
      monthEarnings: monthEarnings._sum.vendorAmount ?? 0,
      pendingPayout: pendingPayout._sum.vendorAmount ?? 0,
      scansToday,
      recentScans: recentScans.map(v => ({
        id: v.id,
        studentName: v.student.user.fullName,
        dealTitle: v.deal.title,
        amount: v.deal.studentPrice,
        redeemedAt: v.redeemedAt?.toISOString(),
      })),
    }});
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

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
