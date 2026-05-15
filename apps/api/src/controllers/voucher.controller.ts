import type { Request, Response } from 'express';
import { voucherService } from '../services/voucher.service.js';
import { userRepository } from '../repositories/user.repository.js';

export const voucherController = {
  async list(req: Request, res: Response) {
    const user = await userRepository.findById(req.user!.userId);
    if (!user?.student) {
      res.status(400).json({ success: false, message: 'Student profile not found' });
      return;
    }

    const params = res.locals.validated;
    const result = await voucherService.listForStudent(user.student.id, {
      status: params.status as string | undefined,
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 20,
    });
    res.json({ success: true, data: result });
  },

  async getById(req: Request, res: Response) {
    const user = await userRepository.findById(req.user!.userId);
    const voucher = await voucherService.getById(req.params.id, user?.student?.id);
    res.json({ success: true, data: voucher });
  },

  async getRotatingQr(req: Request, res: Response) {
    try {
      const user = await userRepository.findById(req.user!.userId);
      if (!user?.student) {
        res.status(400).json({ success: false, message: 'Student profile not found' });
        return;
      }
      const result = await voucherService.getRotatingQr(req.params.id as string, user.student.id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  },

  async redeemByQr(req: Request, res: Response) {
    const { qrData } = req.body;
    const result = await voucherService.redeemByQr(qrData, req.user!.userId);
    res.json({ success: true, data: result });
  },

  async redeemByStaticQr(req: Request, res: Response) {
    try {
      const { qrData } = req.body;
      if (!qrData) { res.status(400).json({ success: false, message: 'qrData or code required' }); return; }

      // Try as QR data (UUID) first, then as manual code
      try {
        const result = await voucherService.redeemByQr(qrData, req.user!.userId);
        res.json({ success: true, data: result });
        return;
      } catch (_) {}

      // Try as manual code (e.g. Y9W5S6BG)
      const result = await voucherService.redeemByCode(qrData, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  },

  async redeemByRotatingQr(req: Request, res: Response) {
    try {
      const { qrPayload } = req.body;
      const result = await voucherService.redeemByRotatingQr(qrPayload, req.user!.userId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  },
};
