import type { Request, Response } from 'express';
import { paymentService } from '../services/payment.service.js';
import { paystackService } from '../services/paystack.service.js';
import { payoutService } from '../services/payout.service.js';
import { walletService } from '../services/wallet.service.js';

export const paymentController = {
  async initialize(req: Request, res: Response) {
    const { dealId } = req.body;
    const result = await paymentService.initialize(req.user!.userId, dealId);
    res.status(201).json({ success: true, data: result });
  },

  async cartCheckout(req: Request, res: Response) {
    const { vendorId, items } = req.body;
    if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'vendorId and items[] required' });
      return;
    }
    const result = await paymentService.cartCheckout(req.user!.userId, vendorId, items);
    res.status(201).json({ success: true, data: result });
  },

  async verify(req: Request, res: Response) {
    const result = await paymentService.verifyPayment(req.params.reference);
    res.json({ success: true, data: result });
  },

  async pollStatus(req: Request, res: Response) {
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

    // Handle wallet top-up
    if (event === 'charge.success' && data?.metadata?.type === 'wallet_topup') {
      const userId = data.metadata.userId as string;
      const amount = data.amount as number;
      const reference = data.reference as string;
      await walletService.creditWallet(userId, amount, 'TOP_UP', { reference });
    }
    // Handle payment events
    else if (event.startsWith('charge.')) {
      await paymentService.handleWebhook(event, data);
    }
    // Handle transfer events (payouts)
    if (event.startsWith('transfer.')) {
      await payoutService.handleTransferWebhook(event, data);
    }

    res.sendStatus(200);
  },
};
