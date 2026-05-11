import app from './app.js';
import { env } from './config/env.js';
import cron from 'node-cron';
import { voucherService } from './services/voucher.service.js';

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

app.listen(env.PORT, () => {
  console.log(`BuzzPay API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
