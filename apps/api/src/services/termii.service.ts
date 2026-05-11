import axios from 'axios';

const TERMII_BASE = 'https://v3.api.termii.com/api';
const API_KEY = process.env.TERMII_API_KEY || '';

export const termiiService = {
  /**
   * Generate OTP token via Termii.
   * Uses /sms/otp/generate which doesn't require a sender ID.
   * Once BUZZPAY sender is approved, switch to /sms/otp/send for real SMS delivery.
   */
  async sendOtp(phone: string): Promise<{ pinId: string; otp?: string }> {
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
      otp: response.data.otp, // Available in generate mode — for testing
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
