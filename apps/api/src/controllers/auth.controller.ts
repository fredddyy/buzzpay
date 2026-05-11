import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';

export const authController = {
  async signup(req: Request, res: Response) {
    const result = await authService.signup(req.body);
    res.status(201).json({ success: true, data: result });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.json({ success: true, data: tokens });
  },
};
