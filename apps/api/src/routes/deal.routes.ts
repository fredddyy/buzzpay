import { Router } from 'express';
import { dealController } from '../controllers/deal.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { dealFilterSchema } from '@buzzpay/shared';

const router = Router();

router.get('/', authenticate, validate(dealFilterSchema, 'query'), dealController.list);
router.get('/happy-hour', authenticate, dealController.happyHour);
router.get('/upcoming', authenticate, dealController.upcoming);
router.get('/featured', authenticate, dealController.featured);
router.get('/collections', authenticate, dealController.collections);
router.get('/campaigns', authenticate, async (_req, res) => {
  const { prisma } = await import('@buzzpay/db');
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      deals: {
        where: { isActive: true, expiresAt: { gt: new Date() }, remainingQty: { gt: 0 } },
        include: { vendor: { select: { businessName: true, logoUrl: true, opensAt: true, closesAt: true } } },
        take: 10,
      },
    },
    orderBy: { publishedAt: 'desc' },
  });

  const result = campaigns
    .filter(c => c.deals.length > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      featuredSection: c.featuredSection,
      dailyStart: c.dailyStart,
      dailyEnd: c.dailyEnd,
      dealCount: c.deals.length,
      deals: c.deals.map(d => ({
        id: d.id, vendorId: d.vendorId, vendorName: d.vendor.businessName,
        title: d.title, category: d.category, imageUrl: d.imageUrl,
        originalPrice: d.originalPrice, studentPrice: d.studentPrice,
        remainingQty: d.remainingQty, totalQuantity: d.totalQuantity,
      })),
    }));

  res.json({ success: true, data: result });
});

router.post('/stock-check', authenticate, dealController.stockCheck);
router.get('/:id', authenticate, dealController.getById);

export default router;
