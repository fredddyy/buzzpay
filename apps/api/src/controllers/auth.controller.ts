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

  async me(req: Request, res: Response) {
    const user = await import('../repositories/user.repository.js').then(m => m.userRepository.findById(req.user!.userId));
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: {
      id: user.id, email: user.email, fullName: user.fullName, role: user.role,
      verificationStatus: user.student?.verificationStatus,
    }});
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.json({ success: true, data: tokens });
  },
};
