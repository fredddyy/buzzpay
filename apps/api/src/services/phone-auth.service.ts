import { prisma } from '@buzzpay/db';
import { termiiService } from './termii.service.js';
import { hashPassword } from '../utils/hash.js';
import { signAccessToken, signRefreshToken } from '../utils/token.js';
import { AppError } from '../middleware/error.js';

// Store pinIds temporarily (in production, use Redis)
const pinStore = new Map<string, string>();

export const phoneAuthService = {
  async sendOtp(phone: string) {
    // Normalize phone: 08012345678 → +2348012345678
    const normalized = phone.startsWith('+') ? phone
      : phone.startsWith('0') ? `+234${phone.substring(1)}` : `+234${phone}`;

    try {
      const result = await termiiService.sendOtp(normalized);
      pinStore.set(normalized, result.pinId);
      // In dev mode, return OTP for testing (remove in production)
      return { phone: normalized, sent: true, otp: result.otp };
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send OTP';
      throw new AppError(500, `SMS failed: ${message}`);
    }
  },

  async verifyOtp(phone: string, pin: string) {
    const normalized = phone.startsWith('+') ? phone
      : phone.startsWith('0') ? `+234${phone.substring(1)}` : `+234${phone}`;

    const pinId = pinStore.get(normalized);
    if (!pinId) {
      throw new AppError(400, 'No OTP was sent to this number. Request a new one.');
    }

    const { verified } = await termiiService.verifyOtp(pinId, pin);
    if (!verified) {
      throw new AppError(400, 'Invalid or expired code. Try again.');
    }

    // Clean up
    pinStore.delete(normalized);

    // Check if user exists with this phone
    const existingUser = await prisma.user.findUnique({ where: { phone: normalized }, include: { student: true } });

    if (existingUser) {
      // Existing user — return tokens
      const tokens = {
        accessToken: signAccessToken({ userId: existingUser.id, role: existingUser.role }),
        refreshToken: signRefreshToken({ userId: existingUser.id, role: existingUser.role }),
      };
      return {
        isNewUser: false,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          fullName: existingUser.fullName,
          role: existingUser.role,
          verificationStatus: existingUser.student?.verificationStatus,
        },
        tokens,
      };
    }

    // New user — return phone so client can complete signup
    return {
      isNewUser: true,
      phone: normalized,
      tokens: null,
    };
  },
};
