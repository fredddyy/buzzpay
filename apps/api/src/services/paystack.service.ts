import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';

const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const paystackService = {
  async initializeTransaction(params: {
    email: string;
    amount: number; // in kobo
    reference: string;
    callbackUrl?: string;
    metadata?: Record<string, any>;
  }) {
    const response = await paystackApi.post('/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    });
    return response.data.data as {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  },

  async verifyTransaction(reference: string) {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    return response.data.data as {
      status: string;
      amount: number;
      reference: string;
      metadata: any;
    };
  },

  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex');
    return hash === signature;
  },
};
