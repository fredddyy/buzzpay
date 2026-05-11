import type { Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { paystackService } from '../services/paystack.service.js';

export const paymentController = {
  async initialize(req: Request, res: Response) {
    const { dealId } = req.body;
    const result = await paymentService.initialize(req.user!.userId, dealId);
    res.status(201).json({ success: true, data: result });
  },

  async verify(req: Request, res: Response) {
    const result = await paymentService.verifyPayment(req.params.reference);
    res.json({ success: true, data: result });
  },

  async webhook(req: Request, res: Response) {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody as string;

    if (!signature || !paystackService.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const { event, data } = req.body;
    await paymentService.handleWebhook(event, data);

    res.sendStatus(200);
  },
};
