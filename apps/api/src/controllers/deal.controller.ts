import type { Request, Response, NextFunction } from 'express';
import { dealService } from '../services/deal.service.js';
import { analyticsService } from '../services/analytics.service.js';

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

  async collections(_req: Request, res: Response, next: NextFunction) {
    try {
      const collections = await dealService.collections();
      res.json({ success: true, data: collections });
    } catch (err) {
      next(err);
    }
  },

  async upcoming(_req: Request, res: Response, next: NextFunction) {
    try {
      const deals = await dealService.upcoming();
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

  async stockCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const { dealIds } = req.body;
      if (!dealIds || !Array.isArray(dealIds)) {
        res.status(400).json({ success: false, message: 'dealIds[] required' });
        return;
      }
      const result = await dealService.stockCheck(dealIds);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const deal = await dealService.getById(req.params.id);
      analyticsService.track('deal_viewed', { userId: req.user?.userId, dealId: req.params.id });
      res.json({ success: true, data: deal });
    } catch (err) {
      next(err);
    }
  },
};
