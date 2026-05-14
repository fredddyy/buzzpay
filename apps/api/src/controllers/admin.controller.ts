import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@buzzpay/db';
import { AppError } from '../middleware/error.js';
import { hashPassword } from '../utils/hash.js';
import { realtimeService } from '../services/realtime.service.js';
import { pushService } from '../services/push.service.js';

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
  async stats(_req: Request, res: Response, next: NextFunction) {
    try {
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
      if (status === 'active') where.isActive = true;
      else if (status === 'inactive') where.isActive = false;

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
        activeDays: (d as any).activeDays ?? [],
        featuredSection: (d as any).featuredSection ?? null,
      }));

      res.json({ success: true, data: mapped, meta: paginationMeta(total, page, limit) });
    } catch (err) { next(err); }
  },

  async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const { vendorId, title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, isFeatured, guestAccess, dailyStart, dailyEnd, activeDays, featuredSection } = req.body;

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
          activeDays: activeDays || [],
          featuredSection: featuredSection || null,
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
      const { vendorId, title, description, category, imageUrl, originalPrice, studentPrice, totalQuantity, maxPerUser, startsAt, expiresAt, isFeatured, guestAccess, dailyStart, dailyEnd, activeDays, featuredSection } = req.body;

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
          ...(activeDays !== undefined && { activeDays }),
          ...(featuredSection !== undefined && { featuredSection: featuredSection || null }),
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
      const { businessName, businessAddress, businessPhone, campus, opensAt, closesAt, commissionRate, email, ownerName } = req.body;

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
      const { businessName, businessAddress, businessPhone, opensAt, closesAt, commissionRate, isActive } = req.body;

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
