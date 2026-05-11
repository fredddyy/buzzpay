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

  async redeemByQr(req: Request, res: Response) {
    const { qrData } = req.body;
    const result = await voucherService.redeemByQr(qrData, req.user!.userId);
    res.json({ success: true, data: result });
  },
};
