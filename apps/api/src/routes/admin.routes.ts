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

export default router;
