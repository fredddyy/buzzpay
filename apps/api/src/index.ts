import app from './app.js';
import { env } from './config/env.js';
import cron from 'node-cron';
import { voucherService } from './services/voucher.service.js';
import { paymentService } from './services/payment.service.js';

// Expire overdue vouchers every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    const count = await voucherService.expireOverdue();
    if (count > 0) {
      console.log(`Expired ${count} overdue vouchers`);
    }
  } catch (err) {
    console.error('Voucher expiry cron error:', err);
  }
});

// Release stock from abandoned cart payments every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const released = await paymentService.releaseAbandonedStock();
    if (released > 0) {
      console.log(`Released stock from ${released} abandoned payments`);
    }
  } catch (err) {
    console.error('Stock release cron error:', err);
  }
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`BuzzPay API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
