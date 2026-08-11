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
    channels?: string[];
  }) {
    const response = await paystackApi.post('/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      channels: params.channels ?? ['bank_transfer'],
    });
    return response.data.data as {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  },

  /** Fetch transfer details (account number, bank) after initialization */
  async getTransferDetails(accessCode: string) {
    try {
      const response = await paystackApi.get(`/transaction/charge/${accessCode}`);
      return response.data.data;
    } catch {
      return null;
    }
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

  async createTransferRecipient(accountNumber: string, bankCode: string, name: string) {
    const response = await paystackApi.post('/transferrecipient', {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    });
    return response.data.data as { recipient_code: string };
  },

  async initiateTransfer(amount: number, recipientCode: string, reference: string) {
    const response = await paystackApi.post('/transfer', {
      source: 'balance',
      amount,
      recipient: recipientCode,
      reference,
      reason: 'BuzzPay vendor payout',
    });
    return response.data.data as { transfer_code: string; id: number; status: string };
  },

  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex');
    return hash === signature;
  },
};
