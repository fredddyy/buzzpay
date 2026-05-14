import type { Request, Response, NextFunction } from 'express';
import { phoneAuthService } from '../services/phone-auth.service.js';

export const phoneAuthController = {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      if (!phone || phone.length < 10) {
        res.status(400).json({ success: false, message: 'Valid phone number required' });
        return;
      }
      const result = await phoneAuthService.sendOtp(phone);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) {
        res.status(400).json({ success: false, message: 'Phone and pin required' });
        return;
      }
      const result = await phoneAuthService.verifyOtp(phone, pin);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async completeSignup(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, fullName, university } = req.body;
      if (!phone || !fullName || !university) {
        res.status(400).json({ success: false, message: 'Phone, name, and university required' });
        return;
      }
      const result = await phoneAuthService.completeSignup(phone, fullName, university);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
