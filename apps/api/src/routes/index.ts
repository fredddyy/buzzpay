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

// Wallet
import { walletService } from '../services/wallet.service.js';

router.get('/wallet/balance', authenticate, async (req, res) => {
  const balance = await walletService.getBalance(req.user!.userId);
  res.json({ success: true, data: { balance } });
});

router.get('/wallet/history', authenticate, async (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const offset = Number(req.query.offset) || 0;
  const result = await walletService.getHistory(req.user!.userId, limit, offset);
  res.json({ success: true, data: result });
});

router.post('/wallet/top-up', authenticate, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 10000) { res.status(400).json({ success: false, message: 'Minimum top-up is ₦100' }); return; }
  if (amount > 5000000) { res.status(400).json({ success: false, message: 'Maximum top-up is ₦50,000' }); return; }
  const result = await walletService.initializeTopUp(req.user!.userId, amount);
  res.status(201).json({ success: true, data: result });
});

router.post('/wallet/pay', authenticate, async (req, res) => {
  try {
    const { dealId, qty } = req.body;
    if (!dealId) { res.status(400).json({ success: false, message: 'dealId required' }); return; }
    const quantity = qty || 1;

    const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { vendor: { select: { commissionRate: true, businessName: true, id: true } } } });
    if (!deal) { res.status(404).json({ success: false, message: 'Deal not found' }); return; }
    if (!deal.isActive) { res.status(400).json({ success: false, message: 'Deal is not active' }); return; }
    if (deal.remainingQty < quantity) { res.status(400).json({ success: false, message: `Only ${deal.remainingQty} left` }); return; }

    const totalAmount = deal.studentPrice * quantity;

    // Debit wallet
    await walletService.debitWallet(req.user!.userId, totalAmount, dealId);

    // Create payment record
    const { nanoid } = await import('nanoid');
    const reference = `wallet_pay_${nanoid(16)}`;
    const commission = Math.round(totalAmount * deal.vendor.commissionRate);

    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.userId,
        dealId,
        amount: totalAmount,
        commission,
        vendorAmount: totalAmount - commission,
        paystackReference: reference,
        status: 'SUCCESS',
        paidAt: new Date(),
      },
    });

    // Generate vouchers
    const { v4: uuidv4 } = await import('uuid');
    const { customAlphabet } = await import('nanoid');
    const voucherCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { student: true } });

    const vouchers = [];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    for (let i = 0; i < quantity; i++) {
      if (user?.student) {
        const voucher = await prisma.voucher.create({
          data: {
            studentId: user.student.id,
            dealId,
            paymentId: payment.id,
            code: voucherCode(8),
            qrData: uuidv4(),
            expiresAt,
          },
        });
        vouchers.push(voucher);
      }
      await prisma.deal.update({ where: { id: dealId }, data: { remainingQty: { decrement: 1 } } });
    }

    // Update streak
    const { streakService } = await import('../services/streak.service.js');
    streakService.recordPurchase(req.user!.userId).catch(() => {});

    // Analytics
    const { analyticsService } = await import('../services/analytics.service.js');
    analyticsService.track('payment_completed', { userId: req.user!.userId, dealId, metadata: { amount: totalAmount, method: 'wallet' } });

    // Push notification
    const { fcmService } = await import('../services/fcm.service.js');
    fcmService.paymentSuccess(req.user!.userId, deal.title, totalAmount).catch(() => {});

    res.json({ success: true, data: {
      balance: await walletService.getBalance(req.user!.userId),
      voucherCount: vouchers.length,
      dealTitle: deal.title,
    }});
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment failed';
    res.status(400).json({ success: false, message: msg });
  }
});

// Referrals
import { referralService } from '../services/referral.service.js';

router.get('/referral/my-code', authenticate, async (req, res) => {
  const stats = await referralService.getStats(req.user!.userId);
  res.json({ success: true, data: stats });
});

router.post('/referral/apply', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ success: false, message: 'Referral code required' }); return; }
    const result = await referralService.applyCode(req.user!.userId, code);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Invalid code' });
  }
});

// Student loyalty cards
import { loyaltyService } from '../services/loyalty.service.js';
router.get('/users/loyalty', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { student: true } });
  if (!user?.student) { res.json({ success: true, data: [] }); return; }
  const cards = await loyaltyService.getCards(user.student.id);
  res.json({ success: true, data: cards.map(c => ({
    id: c.id, vendorId: c.vendorId, vendorName: (c as any).vendor?.businessName,
    vendorLogo: (c as any).vendor?.logoUrl, stamps: c.stamps, target: c.target, rewardsUsed: c.rewardsUsed,
  }))});
});

// Student streak
import { streakService } from '../services/streak.service.js';
router.get('/users/streak', authenticate, async (req, res) => {
  const data = await streakService.getStreak(req.user!.userId);
  res.json({ success: true, data });
});

// Student savings stats
router.get('/users/savings', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const payments = await prisma.payment.findMany({
      where: { userId, status: 'SUCCESS' },
      include: { deal: { select: { originalPrice: true, studentPrice: true, vendorId: true, vendor: { select: { businessName: true } } } } },
    });

    let totalSpent = 0;
    let totalSaved = 0;
    let dealCount = 0;
    const vendorSpend: Record<string, { name: string; count: number; saved: number }> = {};

    for (const p of payments) {
      if (!p.deal) continue;
      totalSpent += p.deal.studentPrice;
      totalSaved += p.deal.originalPrice - p.deal.studentPrice;
      dealCount++;

      const vid = p.deal.vendorId;
      if (!vendorSpend[vid]) vendorSpend[vid] = { name: p.deal.vendor.businessName, count: 0, saved: 0 };
      vendorSpend[vid].count++;
      vendorSpend[vid].saved += p.deal.originalPrice - p.deal.studentPrice;
    }

    // Also count cart order items
    const orderItems = await prisma.orderItem.findMany({
      where: { payment: { userId, status: 'SUCCESS' } },
      include: { deal: { select: { originalPrice: true, studentPrice: true, vendorId: true, vendor: { select: { businessName: true } } } } },
    });

    for (const oi of orderItems) {
      totalSpent += oi.unitPrice * oi.quantity;
      totalSaved += (oi.deal.originalPrice - oi.deal.studentPrice) * oi.quantity;
      dealCount += oi.quantity;

      const vid = oi.deal.vendorId;
      if (!vendorSpend[vid]) vendorSpend[vid] = { name: oi.deal.vendor.businessName, count: 0, saved: 0 };
      vendorSpend[vid].count += oi.quantity;
      vendorSpend[vid].saved += (oi.deal.originalPrice - oi.deal.studentPrice) * oi.quantity;
    }

    const favoriteVendor = Object.values(vendorSpend).sort((a, b) => b.count - a.count)[0] ?? null;

    res.json({ success: true, data: {
      totalSpent,
      totalSaved,
      dealCount,
      favoriteVendor: favoriteVendor ? { name: favoriteVendor.name, count: favoriteVendor.count, saved: favoriteVendor.saved } : null,
    }});
  } catch { res.status(500).json({ success: false, message: 'Server error' }); }
});

// Image uploads
import multer from 'multer';
import { cloudinaryService } from '../services/cloudinary.service.js';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// General image upload — returns Cloudinary URL (for deal images, vendor logos, etc.)
router.post('/upload/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'No image file provided' }); return; }
    if (!cloudinaryService.isConfigured) { res.status(500).json({ success: false, message: 'Image upload not configured' }); return; }
    const folder = (req.body.folder as string) || 'buzzpay/general';
    const url = await cloudinaryService.uploadBuffer(req.file.buffer, folder);
    res.json({ success: true, data: { url } });
  } catch {
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// Student verification — upload ID photo

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

// Vendor bank account
router.get('/vendor/bank-account', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: { include: { bankAccount: true } } } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
  res.json({ success: true, data: user.vendor.bankAccount || null });
});

router.post('/vendor/bank-account', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
  const { accountNumber, bankCode, bankName, accountName } = req.body;
  if (!accountNumber || !bankCode || !bankName || !accountName) {
    res.status(400).json({ success: false, message: 'accountNumber, bankCode, bankName, accountName required' }); return;
  }
  const account = await prisma.vendorBankAccount.upsert({
    where: { vendorId: user.vendor.id },
    create: { vendorId: user.vendor.id, accountNumber, bankCode, bankName, accountName },
    update: { accountNumber, bankCode, bankName, accountName, isVerified: false, recipientCode: null },
  });
  res.json({ success: true, data: account });
});

// Vendor payout history
import { payoutService } from '../services/payout.service.js';

router.get('/vendor/payouts/pending', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: { include: { bankAccount: true } } } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
  const { amount } = await payoutService.calculatePending(user.vendor.id);
  const lastPayout = await prisma.payout.findFirst({ where: { vendorId: user.vendor.id, status: 'PAID' }, orderBy: { paidAt: 'desc' } });
  res.json({ success: true, data: {
    pendingAmount: amount,
    lastPayoutAt: lastPayout?.paidAt ?? null,
    bankAccountVerified: user.vendor.bankAccount?.isVerified ?? false,
    nextPayoutWindow: 'Friday 10:00 WAT',
  }});
});

router.get('/vendor/payouts/history', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }
  const result = await payoutService.vendorHistory(user.vendor.id);
  res.json({ success: true, data: result });
});

// Vendor QR sticker (printable HTML page)
router.get('/vendor/qr-sticker', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { vendor: true } });
  if (!user?.vendor) { res.status(403).json({ success: false, message: 'Not a vendor' }); return; }

  const vendor = user.vendor;
  const qrData = `buzzpay://vendor/${vendor.id}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>BuzzPay QR - ${vendor.businessName}</title>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
    .sticker { width: 300px; background: white; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { font-size: 24px; font-weight: 800; color: #6C4FFF; margin-bottom: 4px; }
    .vendor { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 20px; }
    #qr { margin: 0 auto 20px; }
    .cta { font-size: 14px; font-weight: 600; color: #6C4FFF; background: #F0EDFF; padding: 8px 16px; border-radius: 20px; display: inline-block; }
    .footer { font-size: 11px; color: #999; margin-top: 16px; }
    @media print { body { background: white; } .sticker { box-shadow: none; border: 2px solid #eee; } .no-print { display: none; } }
    .print-btn { margin-top: 20px; padding: 12px 24px; background: #6C4FFF; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div>
    <div class="sticker">
      <div class="logo">BuzzPay</div>
      <div class="vendor">${vendor.businessName}</div>
      <canvas id="qr"></canvas>
      <div class="cta">Scan with BuzzPay</div>
      <div class="footer">${vendor.businessAddress || ''}</div>
    </div>
    <div class="no-print" style="text-align:center">
      <button class="print-btn" onclick="window.print()">Print Sticker</button>
    </div>
  </div>
  <script>
    QRCode.toCanvas(document.getElementById('qr'), '${qrData}', { width: 200, margin: 2 });
  </script>
</body>
</html>`);
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
