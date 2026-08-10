import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@buzzpay/db';
import { AppError } from '../middleware/error.js';
import { realtimeService } from '../services/realtime.service.js';

export const vendorController = {
  async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { vendor: true },
      });
      if (!user?.vendor) throw new AppError(403, 'Not a vendor');

      const { title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, dailyStart, dailyEnd, featuredSection, tags } = req.body;

      if (!title || !category || !originalPrice || !studentPrice || !totalQuantity || !startsAt || !expiresAt) {
        throw new AppError(400, 'Missing required fields: title, category, originalPrice, studentPrice, totalQuantity, startsAt, expiresAt');
      }

      if (studentPrice >= originalPrice) {
        throw new AppError(400, 'Student price must be less than original price');
      }

      const deal = await prisma.deal.create({
        data: {
          vendorId: user.vendor.id,
          title,
          description: description || title,
          category,
          imageUrl: imageUrl || null,
          originalPrice,
          studentPrice,
          totalQuantity,
          remainingQty: totalQuantity,
          maxPerUser: maxPerUser ?? 1,
          startsAt: new Date(startsAt),
          expiresAt: new Date(expiresAt),
          isActive: false, // DRAFT — admin must approve
          isFeatured: false,
          dailyStart: dailyStart || null,
          dailyEnd: dailyEnd || null,
          featuredSection: featuredSection || null,
          tags: tags || [],
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: deal.id,
          title: deal.title,
          status: 'DRAFT',
          message: 'Deal submitted for review. Admin will approve it shortly.',
        },
      });
    } catch (err) { next(err); }
  },

  async listMyDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { vendor: true },
      });
      if (!user?.vendor) throw new AppError(403, 'Not a vendor');

      const deals = await prisma.deal.findMany({
        where: { vendorId: user.vendor.id },
        orderBy: { createdAt: 'desc' },
      });

      const now = new Date();
      const mapped = deals.map(d => {
        let status = 'DRAFT';
        if (d.isActive && d.expiresAt > now && d.remainingQty > 0) status = 'LIVE';
        else if (d.isActive && (d.expiresAt <= now || d.remainingQty <= 0)) status = 'EXPIRED';
        else if (!d.isActive) status = 'DRAFT';

        return {
          id: d.id,
          title: d.title,
          description: d.description,
          category: d.category,
          imageUrl: d.imageUrl,
          originalPrice: d.originalPrice,
          studentPrice: d.studentPrice,
          totalQuantity: d.totalQuantity,
          remainingQty: d.remainingQty,
          maxPerUser: d.maxPerUser,
          startsAt: d.startsAt.toISOString(),
          expiresAt: d.expiresAt.toISOString(),
          isActive: d.isActive,
          dailyStart: (d as any).dailyStart,
          dailyEnd: (d as any).dailyEnd,
          featuredSection: (d as any).featuredSection,
          tags: (d as any).tags || [],
          status,
          createdAt: d.createdAt.toISOString(),
        };
      });

      res.json({ success: true, data: mapped });
    } catch (err) { next(err); }
  },

  async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { vendor: true },
      });
      if (!user?.vendor) throw new AppError(403, 'Not a vendor');

      const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
      if (!deal) throw new AppError(404, 'Deal not found');
      if (deal.vendorId !== user.vendor.id) throw new AppError(403, 'Not your deal');

      const { title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, dailyStart, dailyEnd, featuredSection, tags } = req.body;

      const updated = await prisma.deal.update({
        where: { id: req.params.id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(category && { category }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
          ...(originalPrice && { originalPrice }),
          ...(studentPrice && { studentPrice }),
          ...(totalQuantity && { totalQuantity }),
          ...(maxPerUser && { maxPerUser }),
          ...(startsAt && { startsAt: new Date(startsAt) }),
          ...(expiresAt && { expiresAt: new Date(expiresAt) }),
          ...(dailyStart !== undefined && { dailyStart: dailyStart || null }),
          ...(dailyEnd !== undefined && { dailyEnd: dailyEnd || null }),
          ...(featuredSection !== undefined && { featuredSection: featuredSection || null }),
          ...(tags && { tags }),
          // Reset to draft if edited after approval
          isActive: false,
        },
      });

      res.json({
        success: true,
        data: { id: updated.id, title: updated.title, status: 'DRAFT', message: 'Deal updated and sent back for review.' },
      });
    } catch (err) { next(err); }
  },

  async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: { vendor: true },
      });
      if (!user?.vendor) throw new AppError(403, 'Not a vendor');

      const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
      if (!deal) throw new AppError(404, 'Deal not found');
      if (deal.vendorId !== user.vendor.id) throw new AppError(403, 'Not your deal');

      // Only allow deleting draft deals
      if (deal.isActive) throw new AppError(400, 'Cannot delete a live deal. Contact admin to deactivate it.');

      await prisma.deal.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Deal deleted' });
    } catch (err) { next(err); }
  },
};
