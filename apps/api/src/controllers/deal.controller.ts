import type { Request, Response, NextFunction } from 'express';
import { dealService } from '../services/deal.service.js';

export const dealController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const params = res.locals.validated;
      const result = await dealService.list(params);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async happyHour(_req: Request, res: Response, next: NextFunction) {
    try {
      const deals = await dealService.happyHour();
      res.json({ success: true, data: deals });
    } catch (err) {
      next(err);
    }
  },

  async featured(_req: Request, res: Response, next: NextFunction) {
    try {
      const deals = await dealService.featured();
      res.json({ success: true, data: deals });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const deal = await dealService.getById(req.params.id);
      res.json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  },
};
