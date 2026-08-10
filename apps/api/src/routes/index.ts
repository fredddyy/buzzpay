import { Router } from 'express';
import { prisma } from '@buzzpay/db';
import { authenticate } from '../middleware/auth.js';
import { vendorController } from '../controllers/vendor.controller.js';
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
// FCM token registration
import { fcmService } from '../services/fcm.service.js';
router.post('/users/fcm-token', authenticate, async (req, res) => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ success: false, message: 'token required' }); return; }
  await fcmService.registerToken(req.user!.userId, token);
  res.json({ success: true });
});

// Student verification — upload ID photo
import multer from 'multer';
import { cloudinaryService } from '../services/cloudinary.service.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/students/verify', authenticate, upload.single('photo'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { student: true } });
    if (!user?.student) { res.status(403).json({ success: false, message: 'Not a student' }); return; }
    if (user.student.verificationStatus === 'APPROVED') { res.json({ success: true, message: 'Already verified' }); return; }

    let imageUrl = req.body.imageUrl as string | undefined;

    // Upload photo if provided as file
    if (req.file && cloudinaryService.isConfigured) {
      imageUrl = await cloudinaryService.uploadBuffer(req.file.buffer, 'buzzpay/student-ids');
    }

    if (!imageUrl) { res.status(400).json({ success: false, message: 'Photo required — upload a file or provide imageUrl' }); return; }

    // Update student record
    await prisma.student.update({
      where: { id: user.student.id },
      data: {
        studentIdImageUrl: imageUrl,
        verificationStatus: 'PENDING',
        schoolEmail: req.body.schoolEmail || user.student.schoolEmail,
      },
    });

    res.json({ success: true, message: 'Verification submitted. We\'ll review within 24 hours.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed. Try again.' });
  }
});

// Student profile update
router.patch('/users/me', authenticate, async (req, res) => {
  const { fullName, phone } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      ...(fullName && { fullName }),
      ...(phone && { phone }),
    },
    select: { id: true, fullName: true, email: true, phone: true, role: true },
  });
  res.json({ success: true, data: updated });
});

router.get('/vendor/profile', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
  res.json({ success: true, data: {
    id: user.vendor.id,
    businessName: user.vendor.businessName,
    businessAddress: user.vendor.businessAddress,
    businessPhone: user.vendor.businessPhone,
    logoUrl: user.vendor.logoUrl,
    opensAt: user.vendor.opensAt,
    closesAt: user.vendor.closesAt,
    commissionRate: user.vendor.commissionRate,
  }});
});

router.patch('/vendor/profile', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }

  const { businessName, businessAddress, businessPhone, logoUrl, opensAt, closesAt } = req.body;

  const updated = await prisma.vendor.update({
    where: { id: user.vendor.id },
    data: {
      ...(businessName && { businessName }),
      ...(businessAddress && { businessAddress }),
      ...(businessPhone && { businessPhone }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(opensAt && { opensAt }),
      ...(closesAt && { closesAt }),
    },
  });

  res.json({ success: true, data: {
    id: updated.id,
    businessName: updated.businessName,
    businessAddress: updated.businessAddress,
    businessPhone: updated.businessPhone,
    logoUrl: updated.logoUrl,
    opensAt: updated.opensAt,
    closesAt: updated.closesAt,
  }});
});

router.get('/vendor/my-deals', authenticate, vendorController.listMyDeals);
router.post('/vendor/deals', authenticate, vendorController.createDeal);
router.put('/vendor/deals/:id', authenticate, vendorController.updateDeal);
router.delete('/vendor/deals/:id', authenticate, vendorController.deleteDeal);

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

// Trending vendors (must be before /vendors/:id)
router.get('/vendors/trending', async (_req, res) => {
  const vendors = await prisma.vendor.findMany({
    where: { isTrending: true, isActive: true },
    select: { id: true, businessName: true, logoUrl: true, businessAddress: true },
    take: 10,
  });
  res.json({ success: true, data: vendors });
});

// Public vendor detail + deals
router.get('/vendors/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { user: { select: { fullName: true } } },
    });
    if (!vendor) { res.status(404).json({ success: false, message: 'Vendor not found' }); return; }

    const deals = await prisma.deal.findMany({
      where: { vendorId: id, isActive: true, expiresAt: { gt: new Date() }, remainingQty: { gt: 0 } },
      include: { vendor: { select: { businessName: true, logoUrl: true, opensAt: true, closesAt: true, commissionRate: true, userId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const { dealService } = await import('../services/deal.service.js');
    // @ts-ignore — mapDeal is not exported, use list instead
    const mappedDeals = deals.map((d: any) => ({
      id: d.id, vendorId: d.vendorId, vendorName: d.vendor.businessName, vendorLogo: d.vendor.logoUrl,
      vendorIsOpen: true, vendorOpensAt: d.vendor.opensAt, vendorClosesAt: d.vendor.closesAt,
      title: d.title, description: d.description, category: d.category, imageUrl: d.imageUrl,
      originalPrice: d.originalPrice, studentPrice: d.studentPrice, savings: d.originalPrice - d.studentPrice,
      totalQuantity: d.totalQuantity, remainingQty: d.remainingQty, maxPerUser: d.maxPerUser,
      startsAt: d.startsAt.toISOString(), expiresAt: d.expiresAt.toISOString(),
      isActive: d.isActive, isFeatured: d.isFeatured, guestAccess: d.guestAccess ?? false,
      dailyStart: d.dailyStart, dailyEnd: d.dailyEnd, featuredSection: d.featuredSection, tags: d.tags ?? [],
      dealStatus: 'available', canRedeem: true, minutesRemaining: 0, startsInMinutes: 0,
    }));

    res.json({ success: true, data: {
      id: vendor.id,
      businessName: vendor.businessName,
      businessAddress: vendor.businessAddress,
      businessPhone: vendor.businessPhone,
      logoUrl: vendor.logoUrl,
      opensAt: vendor.opensAt,
      closesAt: vendor.closesAt,
      isActive: vendor.isActive,
      isTrending: vendor.isTrending,
      ownerName: vendor.user.fullName,
      deals: mappedDeals,
    }});
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trending vendors (public for student app)
export default router;
