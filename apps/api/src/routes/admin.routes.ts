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
