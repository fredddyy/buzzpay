import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@buzzpay/db';
import { AppError } from '../middleware/error.js';
import { hashPassword } from '../utils/hash.js';
import { realtimeService } from '../services/realtime.service.js';
import { pushService } from '../services/push.service.js';
import { fcmService } from '../services/fcm.service.js';

function paginationParams(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = (req.query.search as string || '').trim();
  return { page, limit, skip: (page - 1) * limit, search };
}

function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

export const adminController = {
  // ─── Dashboard Stats ──────────────────────────────────────
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      // Time range filter
      const range = (req.query.range as string) || '7d';
      const now = new Date();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dayMatch = range.match(/^(\d+)d$/);
      const rangeStart = range === 'today' ? today
        : range === 'all' ? new Date(0)
        : dayMatch ? new Date(today.getTime() - parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000)
        : new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const rangeFilter = { gte: rangeStart };
      const [
        totalUsers,
        verifiedUsers,
        pendingVerifications,
        totalVendors,
        totalDeals,
        totalTransactions,
        revenueAgg,
        redeemedCount,
        totalVouchers,
      ] = await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { verificationStatus: 'APPROVED' } }),
        prisma.student.count({ where: { verificationStatus: 'PENDING' } }),
        prisma.vendor.count({ where: { isActive: true } }),
        prisma.deal.count({ where: { isActive: true } }),
        prisma.payment.count({ where: { status: 'SUCCESS' } }),
        prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
        prisma.voucher.count({ where: { status: 'REDEEMED' } }),
        prisma.voucher.count(),
      ]);

      // Growth metrics (filtered by range)
      const [signupsToday, signupsInRange, buyersInRange, repeatBuyers, topDeals] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: today } } }),
        prisma.user.count({ where: { role: 'STUDENT', createdAt: rangeFilter } }),
        prisma.payment.groupBy({ by: ['userId'], where: { status: 'SUCCESS', createdAt: rangeFilter }, _count: true }),
        prisma.payment.groupBy({ by: ['userId'], where: { status: 'SUCCESS', createdAt: rangeFilter }, _count: true, having: { userId: { _count: { gte: 2 } } } }),
        prisma.payment.groupBy({
          by: ['dealId'],
          where: { status: 'SUCCESS', createdAt: rangeFilter, dealId: { not: null } },
          _count: true,
          orderBy: { _count: { dealId: 'desc' } },
          take: 5,
        }),
      ]);

      // Get deal titles for top deals
      const topDealIds = topDeals.map(d => d.dealId).filter(Boolean) as string[];
      const dealNames = topDealIds.length > 0 ? await prisma.deal.findMany({
        where: { id: { in: topDealIds } },
        select: { id: true, title: true, vendorId: true, vendor: { select: { businessName: true } } },
      }) : [];
      const dealMap = new Map(dealNames.map(d => [d.id, d]));

      const firstPurchaseRate = signupsInRange > 0 ? Math.round((buyersInRange.length / signupsInRange) * 100) : 0;
      const repeatRate = buyersInRange.length > 0 ? Math.round((repeatBuyers.length / buyersInRange.length) * 100) : 0;

      // High-priority analytics
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const [revenueToday, revenueWeek, revenueMonth, avgOrder, topVendors, deadDeals, categoryRevenue] = await Promise.all([
        prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: today } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: weekAgo } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _avg: { amount: true } }),
        prisma.$queryRaw<{ vendorId: string; businessName: string; revenue: bigint; count: bigint }[]>`
          SELECT v.id as "vendorId", v."businessName", v."logoUrl", COALESCE(SUM(p."vendorAmount"), 0) as revenue, COUNT(p.id) as count
          FROM "Vendor" v
          LEFT JOIN "Deal" d ON d."vendorId" = v.id
          LEFT JOIN "Payment" p ON p."dealId" = d.id AND p.status = 'SUCCESS' AND p."createdAt" >= ${rangeStart}
          GROUP BY v.id, v."businessName", v."logoUrl"
          ORDER BY revenue DESC LIMIT 5
        `,
        prisma.deal.count({ where: { isActive: true, expiresAt: { gt: new Date() }, payments: { none: { status: 'SUCCESS' } } } }),
        prisma.$queryRaw<{ category: string; revenue: bigint; count: bigint }[]>`
          SELECT d.category, COALESCE(SUM(p.amount), 0) as revenue, COUNT(p.id) as count
          FROM "Deal" d
          LEFT JOIN "Payment" p ON p."dealId" = d.id AND p.status = 'SUCCESS'
          WHERE d."isActive" = true
          GROUP BY d.category
          ORDER BY revenue DESC
        `,
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          verifiedUsers,
          pendingVerifications,
          totalVendors,
          totalDeals,
          totalTransactions,
          totalRevenue: revenueAgg._sum.amount ?? 0,
          redemptionRate: totalVouchers > 0 ? Math.round((redeemedCount / totalVouchers) * 100) : 0,
          // Time range
          range,
          rangeStart: rangeStart.toISOString(),
          // Growth metrics
          signupsToday,
          signupsInRange: signupsInRange,
          buyersInRange: buyersInRange.length,
          repeatBuyers: repeatBuyers.length,
          firstPurchaseRate,
          repeatRate,
          topDeals: topDeals.map(d => ({
            dealId: d.dealId,
            title: dealMap.get(d.dealId!)?.title ?? 'Unknown',
            vendor: dealMap.get(d.dealId!)?.vendor?.businessName ?? '',
            purchases: d._count,
          })),
          // Revenue breakdown
          revenueToday: revenueToday._sum.amount ?? 0,
          revenueThisWeek: revenueWeek._sum.amount ?? 0,
          revenueThisMonth: revenueMonth._sum.amount ?? 0,
          avgOrderValue: Math.round(avgOrder._avg.amount ?? 0),
          // Vendor performance
          topVendors: topVendors.map(v => ({ vendorId: v.vendorId, name: v.businessName, logoUrl: (v as any).logoUrl ?? null, revenue: Number(v.revenue), sales: Number(v.count) })),
          deadDeals,
          // Category breakdown
          categoryRevenue: categoryRevenue.map(c => ({ category: c.category, revenue: Number(c.revenue), sales: Number(c.count) })),
        },
      });
    } catch (err) { next(err); }
  },

  // ─── Deals ────────────────────────────────────────────────
  async listDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip, search } = paginationParams(req);
      const category = (req.query.category as string) || undefined;
      const status = req.query.status as string; // "active" | "inactive" | undefined

      const where: any = {};
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { vendor: { businessName: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (category) where.category = category;
      if (status === 'active') {
        where.isActive = true;
        where.expiresAt = { gt: new Date() };
        where.remainingQty = { gt: 0 };
      } else if (status === 'draft') {
        where.isActive = false;
      } else if (status === 'expired') {
        where.OR = [
          { expiresAt: { lte: new Date() } },
          { remainingQty: { lte: 0 } },
        ];
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      const [deals, total] = await Promise.all([
        prisma.deal.findMany({
          where,
          include: { vendor: { select: { businessName: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.deal.count({ where }),
      ]);

      const mapped = deals.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        vendorId: d.vendorId,
        vendorName: d.vendor.businessName,
        imageUrl: d.imageUrl,
        originalPrice: d.originalPrice,
        studentPrice: d.studentPrice,
        totalQuantity: d.totalQuantity,
        remainingQty: d.remainingQty,
        maxPerUser: d.maxPerUser,
        startsAt: d.startsAt.toISOString(),
        expiresAt: d.expiresAt.toISOString(),
        isActive: d.isActive,
        isFeatured: d.isFeatured,
        guestAccess: (d as any).guestAccess ?? false,
        dailyStart: (d as any).dailyStart ?? null,
        dailyEnd: (d as any).dailyEnd ?? null,
        previewStart: (d as any).previewStart ?? null,
        activeDays: (d as any).activeDays ?? [],
        isRecurring: (d as any).isRecurring ?? false,
        featuredSection: (d as any).featuredSection ?? null,
        tags: (d as any).tags ?? [],
        campaignId: (d as any).campaignId ?? null,
      }));

      res.json({ success: true, data: mapped, meta: paginationMeta(total, page, limit) });
    } catch (err) { next(err); }
  },

  async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId, title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, isFeatured, guestAccess, dailyStart, dailyEnd, activeDays, featuredSection, previewStart, isRecurring, tags } = req.body;

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError(404, 'Vendor not found');

      const deal = await prisma.deal.create({
        data: {
          vendorId,
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
          isFeatured: isFeatured ?? false,
          guestAccess: guestAccess ?? false,
          dailyStart: dailyStart || null,
          dailyEnd: dailyEnd || null,
          previewStart: previewStart || null,
          activeDays: activeDays || [],
          isRecurring: isRecurring ?? false,
          featuredSection: featuredSection || null,
          tags: tags || [],
        },
        include: { vendor: { select: { businessName: true } } },
      });

      res.status(201).json({
        success: true,
        data: {
          id: deal.id,
          title: deal.title,
          vendorName: deal.vendor.businessName,
        },
      });
      realtimeService.dealChanged(deal.id, 'created');
    } catch (err) { next(err); }
  },

  async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { vendorId, title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, isFeatured, guestAccess, dailyStart, dailyEnd, previewStart, activeDays, featuredSection, isRecurring, tags } = req.body;

      const existing = await prisma.deal.findUnique({ where: { id } });
      if (!existing) throw new AppError(404, 'Deal not found');

      const deal = await prisma.deal.update({
        where: { id },
        data: {
          ...(vendorId !== undefined && { vendorId }),
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
          ...(imageUrl !== undefined && { imageUrl }),
          ...(originalPrice !== undefined && { originalPrice }),
          ...(studentPrice !== undefined && { studentPrice }),
          ...(totalQuantity !== undefined && { totalQuantity, remainingQty: totalQuantity }),
          ...(maxPerUser !== undefined && { maxPerUser }),
          ...(startsAt !== undefined && { startsAt: new Date(startsAt) }),
          ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
          ...(isFeatured !== undefined && { isFeatured }),
          ...(guestAccess !== undefined && { guestAccess }),
          ...(dailyStart !== undefined && { dailyStart: dailyStart || null }),
          ...(dailyEnd !== undefined && { dailyEnd: dailyEnd || null }),
          ...(previewStart !== undefined && { previewStart: previewStart || null }),
          ...(activeDays !== undefined && { activeDays }),
          ...(featuredSection !== undefined && { featuredSection: featuredSection || null }),
          ...(isRecurring !== undefined && { isRecurring }),
          ...(tags !== undefined && { tags }),
        },
      });

      res.json({ success: true, data: { id: deal.id } });
      realtimeService.dealChanged(deal.id, 'updated');
    } catch (err) { next(err); }
  },

  async toggleDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) throw new AppError(404, 'Deal not found');

      const updated = await prisma.deal.update({
        where: { id },
        data: { isActive: !deal.isActive },
      });

      res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
      realtimeService.dealChanged(updated.id, 'updated');

      // Push notification to all students when a deal goes live
      if (updated.isActive && !deal.isActive) {
        const vendor = await prisma.vendor.findUnique({ where: { id: updated.vendorId }, select: { businessName: true } });
        const price = `₦${(updated.studentPrice / 100).toLocaleString('en-NG')}`;
        const students = await prisma.user.findMany({
          where: { role: 'STUDENT', fcmToken: { not: null } },
          select: { id: true },
          take: 500,
        });
        for (const s of students) {
          fcmService.sendToUser(s.id, `New deal! 🔥 ${updated.title}`, `${price} at ${vendor?.businessName ?? 'a vendor'} — grab it before it's gone!`, { type: 'new_deal', dealId: updated.id }).catch(() => {});
        }
      }
    } catch (err) { next(err); }
  },

  async featureDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) throw new AppError(404, 'Deal not found');

      const updated = await prisma.deal.update({
        where: { id },
        data: { isFeatured: !deal.isFeatured },
      });

      res.json({ success: true, data: { id: updated.id, isFeatured: updated.isFeatured } });
      realtimeService.dealChanged(updated.id, 'updated');
    } catch (err) { next(err); }
  },

  // ─── Vendors ──────────────────────────────────────────────
  async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip, search } = paginationParams(req);
      const status = req.query.status as string; // "active" | "suspended"

      const where: any = {};
      if (search) {
        where.OR = [
          { businessName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (status === 'active') where.isActive = true;
      else if (status === 'suspended') where.isActive = false;

      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where,
          include: {
            user: { select: { fullName: true, email: true } },
            _count: { select: { deals: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.vendor.count({ where }),
      ]);

      // Batch aggregation instead of N+1 queries per vendor
      const vendorIds = vendors.map(v => v.id);

      const [salesByVendor, vouchersByVendor, redeemedByVendor] = await Promise.all([
        prisma.payment.groupBy({
          by: ['dealId'],
          where: { deal: { vendorId: { in: vendorIds } }, status: 'SUCCESS' },
          _sum: { vendorAmount: true },
        }).then(rows => {
          // Need to map dealId -> vendorId, use deals we already know
          return rows;
        }),
        prisma.voucher.groupBy({
          by: ['dealId'],
          where: { deal: { vendorId: { in: vendorIds } } },
          _count: true,
        }),
        prisma.voucher.groupBy({
          by: ['dealId'],
          where: { deal: { vendorId: { in: vendorIds } }, status: 'REDEEMED' },
          _count: true,
        }),
      ]);

      // Build deal -> vendor lookup from the vendors' deals
      const dealVendorMap = new Map<string, string>();
      for (const v of vendors) {
        const deals = await prisma.deal.findMany({ where: { vendorId: v.id }, select: { id: true } });
        for (const d of deals) dealVendorMap.set(d.id, v.id);
      }

      // Aggregate by vendor
      const vendorSales = new Map<string, number>();
      const vendorVouchers = new Map<string, number>();
      const vendorRedeemed = new Map<string, number>();

      for (const row of salesByVendor) {
        const vid = dealVendorMap.get(row.dealId);
        if (vid) vendorSales.set(vid, (vendorSales.get(vid) ?? 0) + (row._sum.vendorAmount ?? 0));
      }
      for (const row of vouchersByVendor) {
        const vid = dealVendorMap.get(row.dealId);
        if (vid) vendorVouchers.set(vid, (vendorVouchers.get(vid) ?? 0) + row._count);
      }
      for (const row of redeemedByVendor) {
        const vid = dealVendorMap.get(row.dealId);
        if (vid) vendorRedeemed.set(vid, (vendorRedeemed.get(vid) ?? 0) + row._count);
      }

      const mapped = vendors.map(v => {
        const totalV = vendorVouchers.get(v.id) ?? 0;
        const redeemedV = vendorRedeemed.get(v.id) ?? 0;
        return {
          id: v.id,
          businessName: v.businessName,
          logoUrl: v.logoUrl,
          businessAddress: v.businessAddress,
          businessPhone: v.businessPhone,
          isActive: v.isActive,
          opensAt: v.opensAt,
          closesAt: v.closesAt,
          commissionRate: v.commissionRate,
          dealCount: v._count.deals,
          isTrending: v.isTrending,
          totalSales: vendorSales.get(v.id) ?? 0,
          pendingPayout: 0,
          redemptionRate: totalV > 0 ? Math.round((redeemedV / totalV) * 100) : 0,
          campus: v.businessAddress,
          user: { fullName: v.user.fullName, email: v.user.email },
        };
      });

      res.json({ success: true, data: mapped, meta: paginationMeta(total, page, limit) });
    } catch (err) { next(err); }
  },

  async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const { businessName, businessAddress, businessPhone, campus, opensAt, closesAt, commissionRate, email, ownerName, logoUrl } = req.body;

      if (!email || !ownerName) throw new AppError(400, 'Owner name and email are required');

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new AppError(409, 'A user with this email already exists');

      const passwordHash = await hashPassword('vendor123456');

      const user = await prisma.user.create({
        data: {
          email,
          fullName: ownerName,
          passwordHash,
          role: 'VENDOR',
          vendor: {
            create: {
              businessName,
              businessAddress: businessAddress || campus || '',
              businessPhone,
              opensAt: opensAt || '08:00',
              closesAt: closesAt || '21:00',
              commissionRate: commissionRate ? parseFloat(commissionRate) / 100 : 0.10,
              logoUrl: logoUrl || null,
            },
          },
        },
        include: { vendor: true },
      });

      res.status(201).json({
        success: true,
        data: { id: user.vendor!.id, businessName },
      });
      realtimeService.vendorChanged(user.vendor!.id, 'created');
    } catch (err) { next(err); }
  },

  async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { businessName, businessAddress, businessPhone, opensAt, closesAt, commissionRate, isActive, logoUrl } = req.body;

      const vendor = await prisma.vendor.findUnique({ where: { id } });
      if (!vendor) throw new AppError(404, 'Vendor not found');

      const updated = await prisma.vendor.update({
        where: { id },
        data: {
          ...(businessName !== undefined && { businessName }),
          ...(businessAddress !== undefined && { businessAddress }),
          ...(businessPhone !== undefined && { businessPhone }),
          ...(opensAt !== undefined && { opensAt }),
          ...(closesAt !== undefined && { closesAt }),
          ...(commissionRate !== undefined && { commissionRate: typeof commissionRate === 'string' ? parseFloat(commissionRate) / 100 : commissionRate }),
          ...(isActive !== undefined && { isActive }),
          ...(logoUrl !== undefined && { logoUrl }),
        },
      });

      res.json({ success: true, data: { id: updated.id } });
      const action = isActive === false ? 'suspended' : isActive === true ? 'activated' : 'updated';
      realtimeService.vendorChanged(updated.id, action);
    } catch (err) { next(err); }
  },

  async toggleTrending(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const vendor = await prisma.vendor.findUnique({ where: { id } });
      if (!vendor) throw new AppError(404, 'Vendor not found');

      const updated = await prisma.vendor.update({
        where: { id },
        data: { isTrending: !vendor.isTrending },
      });

      res.json({ success: true, data: { id: updated.id, isTrending: updated.isTrending } });
      realtimeService.vendorChanged(updated.id, 'updated');
    } catch (err) { next(err); }
  },

  // ─── Students ─────────────────────────────────────────────
  async listStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip, search } = paginationParams(req);
      const status = ((req.query.status || 'PENDING') as string);

      const where: any = { verificationStatus: status };
      if (search) {
        where.OR = [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search } } },
          { university: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where,
          include: { user: { select: { fullName: true, email: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.student.count({ where }),
      ]);

      const mapped = students.map(s => ({
        id: s.id,
        userId: s.userId,
        university: s.university,
        verificationStatus: s.verificationStatus,
        studentIdImageUrl: s.studentIdImageUrl,
        schoolEmail: s.schoolEmail,
        schoolEmailVerified: s.schoolEmailVerified,
        rejectionReason: s.rejectionReason,
        createdAt: s.createdAt.toISOString(),
        user: s.user,
      }));

      res.json({ success: true, data: mapped, meta: paginationMeta(total, page, limit) });
    } catch (err) { next(err); }
  },

  async approveStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) throw new AppError(404, 'Student not found');

      await prisma.student.update({
        where: { id },
        data: { verificationStatus: 'APPROVED', verifiedAt: new Date(), rejectionReason: null },
      });

      res.json({ success: true, data: { id, status: 'APPROVED' } });
      pushService.verificationApproved(student.userId);
      realtimeService.studentVerificationChanged(student.userId, id, 'APPROVED');
    } catch (err) { next(err); }
  },

  async rejectStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;

      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) throw new AppError(404, 'Student not found');

      await prisma.student.update({
        where: { id },
        data: { verificationStatus: 'REJECTED', rejectionReason: reason || 'Rejected by admin' },
      });

      res.json({ success: true, data: { id, status: 'REJECTED' } });
      pushService.verificationRejected(student.userId, reason || 'Rejected by admin');
      realtimeService.studentVerificationChanged(student.userId, id, 'REJECTED');
    } catch (err) { next(err); }
  },

  async revokeStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;

      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) throw new AppError(404, 'Student not found');

      await prisma.student.update({
        where: { id },
        data: { verificationStatus: 'PENDING', verifiedAt: null, rejectionReason: reason || null },
      });

      res.json({ success: true, data: { id, status: 'PENDING' } });
      realtimeService.studentVerificationChanged(student.userId, id, 'PENDING');
    } catch (err) { next(err); }
  },

  // ─── Transactions ─────────────────────────────────────────
  async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip, search } = paginationParams(req);
      const status = (req.query.status as string) || undefined;

      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { deal: { title: { contains: search, mode: 'insensitive' } } },
          { paystackReference: { contains: search } },
        ];
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            user: { select: { fullName: true } },
            deal: { select: { title: true } },
            orderItems: { select: { deal: { select: { title: true } }, quantity: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.payment.count({ where }),
      ]);

      const mapped = payments.map(p => ({
        id: p.id,
        amount: p.amount,
        commission: p.commission,
        vendorAmount: p.vendorAmount,
        status: p.status,
        paystackReference: p.paystackReference,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        user: p.user,
        deal: p.deal,
        orderItems: (p as any).orderItems?.map((oi: any) => ({ title: oi.deal?.title, quantity: oi.quantity })),
      }));

      res.json({ success: true, data: mapped, meta: paginationMeta(total, page, limit) });
    } catch (err) { next(err); }
  },

  // ─── Vouchers ─────────────────────────────────────────────
  async listVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, skip, search } = paginationParams(req);
      const status = (req.query.status as string) || undefined;

      const where: any = {};
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { student: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
          { deal: { title: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [vouchers, total] = await Promise.all([
        prisma.voucher.findMany({
          where,
          include: {
            student: { include: { user: { select: { fullName: true } } } },
            deal: { include: { vendor: { select: { businessName: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.voucher.count({ where }),
      ]);

      const mapped = vouchers.map(v => ({
        id: v.id,
        code: v.code,
        status: v.status,
        expiresAt: v.expiresAt.toISOString(),
        redeemedAt: v.redeemedAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
        student: { user: { fullName: v.student.user.fullName } },
        deal: { title: v.deal.title, vendor: { businessName: v.deal.vendor.businessName } },
      }));

      res.json({ success: true, data: mapped, meta: paginationMeta(total, page, limit) });
    } catch (err) { next(err); }
  },

  async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) throw new AppError(404, 'Deal not found');

      await prisma.deal.delete({ where: { id } });
      res.json({ success: true, data: { id, deleted: true } });
      realtimeService.dealChanged(id, 'deleted');
    } catch (err) { next(err); }
  },

  // ─── Campaigns ────────────────────────────────────────────
  async listCampaigns(_req: Request, res: Response, next: NextFunction) {
    try {
      const campaigns = await prisma.campaign.findMany({
        include: { _count: { select: { deals: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: campaigns.map(c => ({
        ...c, dealCount: c._count.deals,
      }))});
    } catch (err) { next(err); }
  },

  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, featuredSection, dailyStart, dailyEnd, previewStart, activeDays } = req.body;
      if (!name) throw new AppError(400, 'Campaign name required');

      const campaign = await prisma.campaign.create({
        data: { name, featuredSection, dailyStart, dailyEnd, previewStart, activeDays: activeDays || [] },
      });
      res.status(201).json({ success: true, data: campaign });
    } catch (err) { next(err); }
  },

  async addDealToCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const campaignId = req.params.campaignId as string;
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) throw new AppError(404, 'Campaign not found');

      // Link existing deal to campaign
      if (req.body.existingDealId) {
        const updated = await prisma.deal.update({
          where: { id: req.body.existingDealId },
          data: {
            campaignId,
            featuredSection: campaign.featuredSection,
            dailyStart: campaign.dailyStart,
            dailyEnd: campaign.dailyEnd,
            previewStart: campaign.previewStart,
            activeDays: campaign.activeDays,
            isRecurring: !!campaign.dailyStart,
            isActive: campaign.status === 'PUBLISHED' ? true : undefined,
          },
          include: { vendor: { select: { businessName: true } } },
        });
        res.status(201).json({ success: true, data: { id: updated.id, title: updated.title, vendorName: updated.vendor.businessName } });
        return;
      }

      const { vendorId, title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, tags } = req.body;

      const deal = await prisma.deal.create({
        data: {
          vendorId, title, description: description || title, category,
          imageUrl: imageUrl || null, originalPrice, studentPrice,
          totalQuantity, remainingQty: totalQuantity, maxPerUser: maxPerUser ?? 1,
          startsAt: new Date(startsAt), expiresAt: new Date(expiresAt),
          isActive: campaign.status === 'PUBLISHED', // auto-activate if campaign is already live
          isFeatured: !!campaign.featuredSection,
          featuredSection: campaign.featuredSection,
          dailyStart: campaign.dailyStart, dailyEnd: campaign.dailyEnd,
          previewStart: campaign.previewStart, activeDays: campaign.activeDays,
          isRecurring: !!campaign.dailyStart,
          campaignId, tags: tags || [],
        },
      });
      res.status(201).json({ success: true, data: { id: deal.id, title: deal.title } });
    } catch (err) { next(err); }
  },

  async publishCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const campaign = await prisma.campaign.findUnique({ where: { id }, include: { deals: true } });
      if (!campaign) throw new AppError(404, 'Campaign not found');

      // Activate all deals in this campaign at once
      await prisma.deal.updateMany({
        where: { campaignId: id },
        data: { isActive: true },
      });

      await prisma.campaign.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });

      // Broadcast so student apps refresh
      realtimeService.dealChanged(id, 'created');

      res.json({ success: true, data: { id, status: 'PUBLISHED', dealsActivated: campaign.deals.length } });
    } catch (err) { next(err); }
  },

  async deleteCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const campaign = await prisma.campaign.findUnique({ where: { id }, include: { _count: { select: { deals: true } } } });
      if (!campaign) throw new AppError(404, 'Campaign not found');

      // Unlink deals from campaign (don't delete the deals themselves)
      await prisma.deal.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
      await prisma.campaign.delete({ where: { id } });

      res.json({ success: true, data: { id, deleted: true } });
    } catch (err) { next(err); }
  },

  // ─── QR Code Management ───────────────────────────────────

  async listVendorQrCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params.vendorId as string;
      const qrCodes = await prisma.vendorQrCode.findMany({
        where: { vendorId },
        orderBy: { assignedAt: 'desc' },
      });
      res.json({ success: true, data: qrCodes });
    } catch (err) { next(err); }
  },

  async linkQrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const vendorId = req.params.vendorId as string;
      const { serialNumber } = req.body;

      if (!serialNumber) throw new AppError(400, 'Serial number is required');

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError(404, 'Vendor not found');

      // Check if serial already exists
      const existing = await prisma.vendorQrCode.findUnique({ where: { serialNumber } });

      if (existing) {
        if (existing.vendorId && existing.vendorId !== vendorId) {
          throw new AppError(409, `Sticker ${serialNumber} is already linked to another vendor`);
        }
        // Re-link to this vendor
        const updated = await prisma.vendorQrCode.update({
          where: { serialNumber },
          data: { vendorId, assignedAt: new Date(), assignedBy: req.user?.userId, isActive: true },
        });
        res.json({ success: true, data: updated });
      } else {
        // Create new QR record and link
        const created = await prisma.vendorQrCode.create({
          data: { serialNumber, vendorId, assignedAt: new Date(), assignedBy: req.user?.userId },
        });
        res.status(201).json({ success: true, data: created });
      }
    } catch (err) { next(err); }
  },

  async unlinkQrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const qr = await prisma.vendorQrCode.findUnique({ where: { id } });
      if (!qr) throw new AppError(404, 'QR code not found');

      await prisma.vendorQrCode.update({
        where: { id },
        data: { vendorId: null, assignedAt: null, assignedBy: null, isActive: false },
      });

      res.json({ success: true, data: { id, unlinked: true } });
    } catch (err) { next(err); }
  },

  async batchCreateQrCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { prefix, count } = req.body;
      const pfx = prefix || 'BZ';
      const qty = Math.min(parseInt(count) || 10, 500);

      const codes: { serialNumber: string }[] = [];
      for (let i = 0; i < qty; i++) {
        const num = Math.floor(1000 + Math.random() * 9000);
        const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                       String.fromCharCode(65 + Math.floor(Math.random() * 26));
        codes.push({ serialNumber: `${pfx}-${num}${suffix}` });
      }

      const result = await prisma.vendorQrCode.createMany({ data: codes, skipDuplicates: true });

      res.status(201).json({ success: true, data: { created: result.count, serials: codes.map(c => c.serialNumber) } });
    } catch (err) { next(err); }
  },

  async lookupQrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const serialNumber = (req.query.serial as string) || '';
      if (!serialNumber) throw new AppError(400, 'Serial number required');

      const qr = await prisma.vendorQrCode.findUnique({
        where: { serialNumber },
        include: { vendor: { select: { id: true, businessName: true } } },
      });

      if (!qr) throw new AppError(404, 'QR code not found');

      res.json({ success: true, data: qr });
    } catch (err) { next(err); }
  },
};
