import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// Dashboard
router.get('/stats', adminController.stats);

// Deals
router.get('/deals', adminController.listDeals);
router.post('/deals', adminController.createDeal);
router.put('/deals/:id', adminController.updateDeal);
router.put('/deals/:id/toggle', adminController.toggleDeal);
router.put('/deals/:id/feature', adminController.featureDeal);
router.delete('/deals/:id', adminController.deleteDeal);

// Campaigns
router.get('/campaigns', adminController.listCampaigns);
router.post('/campaigns', adminController.createCampaign);
router.post('/campaigns/:campaignId/deals', adminController.addDealToCampaign);
router.put('/campaigns/:id', async (req, res, next) => {
  try {
    const { name, featuredSection, dailyStart, dailyEnd, previewStart, activeDays } = req.body;
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(featuredSection !== undefined && { featuredSection }),
        ...(dailyStart !== undefined && { dailyStart }),
        ...(dailyEnd !== undefined && { dailyEnd }),
        ...(previewStart !== undefined && { previewStart }),
        ...(activeDays && { activeDays }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
router.post('/campaigns/:id/sync', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) { res.status(404).json({ success: false, message: 'Not found' }); return; }

    // Extend expiresAt for expired deals to 30 days from now
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.deal.updateMany({
      where: { campaignId: campaign.id },
      data: {
        featuredSection: campaign.featuredSection,
        dailyStart: campaign.dailyStart,
        dailyEnd: campaign.dailyEnd,
        previewStart: campaign.previewStart,
        activeDays: campaign.activeDays,
        isRecurring: !!campaign.dailyStart,
        isActive: campaign.status === 'PUBLISHED',
        expiresAt: newExpiry,
        startsAt: new Date(),
      },
    });
    res.json({ success: true, data: { updated: result.count } });
  } catch (err) { next(err); }
});
router.post('/campaigns/:id/publish', adminController.publishCampaign);
router.delete('/campaigns/:id', adminController.deleteCampaign);

// Vendors
router.get('/vendors', adminController.listVendors);
router.post('/vendors', adminController.createVendor);
router.put('/vendors/:id', adminController.updateVendor);
router.put('/vendors/:id/trending', adminController.toggleTrending);

// Students
router.get('/students/pending', adminController.listStudents);
router.post('/students/:id/approve', adminController.approveStudent);
router.post('/students/:id/reject', adminController.rejectStudent);
router.post('/students/:id/revoke', adminController.revokeStudent);

// Transactions
router.get('/transactions', adminController.listTransactions);

// Vouchers
router.get('/vouchers', adminController.listVouchers);

// QR Code Management
router.get('/qr/lookup', adminController.lookupQrCode);
router.post('/qr/batch', adminController.batchCreateQrCodes);
router.get('/vendors/:vendorId/qr', adminController.listVendorQrCodes);
router.patch('/vendors/:vendorId/qr/link', adminController.linkQrCode);
router.delete('/qr/:id', adminController.unlinkQrCode);

// Analytics
import { analyticsService } from '../services/analytics.service.js';
router.get('/analytics', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 7;
    const [stats, topDeals] = await Promise.all([
      analyticsService.getStats(days),
      analyticsService.getTopDeals(days),
    ]);
    res.json({ success: true, data: { stats, topDeals } });
  } catch (err) { next(err); }
});

// Payouts
import { payoutService } from '../services/payout.service.js';
import { prisma } from '@buzzpay/db';

router.get('/payouts/pending', async (_req, res, next) => {
  try {
    const data = await payoutService.listPending();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/payouts/trigger', async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) { res.status(400).json({ success: false, message: 'vendorId required' }); return; }
    const payout = await payoutService.createPayout(vendorId);
    res.status(201).json({ success: true, data: payout });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payout failed';
    res.status(400).json({ success: false, message: msg });
  }
});

router.get('/payouts/history', async (req, res, next) => {
  try {
    const vendorId = req.query.vendorId as string | undefined;
    const where: Record<string, unknown> = {};
    if (vendorId) where.vendorId = vendorId;
    const payouts = await prisma.payout.findMany({
      where,
      include: { vendor: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: payouts });
  } catch (err) { next(err); }
});

// Bank account verification
router.post('/bank-accounts/:id/verify', async (req, res, next) => {
  try {
    const account = await prisma.vendorBankAccount.update({
      where: { id: req.params.id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
    res.json({ success: true, data: account });
  } catch (err) { next(err); }
});

router.get('/bank-accounts/pending', async (_req, res, next) => {
  try {
    const accounts = await prisma.vendorBankAccount.findMany({
      where: { isVerified: false },
      include: { vendor: { select: { businessName: true } } },
    });
    res.json({ success: true, data: accounts });
  } catch (err) { next(err); }
});

export default router;
