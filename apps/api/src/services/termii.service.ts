import axios from 'axios';

const TERMII_BASE = 'https://v3.api.termii.com/api';
const API_KEY = process.env.TERMII_API_KEY || '';
const SENDER_ID = process.env.TERMII_SENDER_ID || 'BuzzPay';

// Flip to true when Termii Nigeria is activated for real SMS
const USE_REAL_SMS = process.env.TERMII_REAL_SMS === 'true';

export const termiiService = {
  async sendOtp(phone: string): Promise<{ pinId: string; otp?: string }> {
    if (USE_REAL_SMS) {
      // Real SMS delivery — costs ₦4 per message
      const response = await axios.post(`${TERMII_BASE}/sms/otp/send`, {
        api_key: API_KEY,
        message_type: 'NUMERIC',
        to: phone,
        from: SENDER_ID,
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 5,
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: 'Your BuzzPay code is < 1234 >. Valid for 5 minutes.',
      });
      return { pinId: response.data.pinId };
    }

    // Generate mode — free, OTP returned in response (no SMS sent)
    const response = await axios.post(`${TERMII_BASE}/sms/otp/generate`, {
      api_key: API_KEY,
      pin_type: 'NUMERIC',
      phone_number: phone,
      pin_attempts: 3,
      pin_time_to_live: 5,
      pin_length: 6,
    });

    return {
      pinId: response.data.pin_id,
      otp: response.data.otp,
    };
  },

  async verifyOtp(pinId: string, pin: string): Promise<{ verified: boolean }> {
    try {
      const response = await axios.post(`${TERMII_BASE}/sms/otp/verify`, {
        api_key: API_KEY,
        pin_id: pinId,
        pin,
      });
      return { verified: response.data.verified === 'True' || response.data.verified === true };
    } catch {
      return { verified: false };
    }
  },
};
