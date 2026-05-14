import { prisma } from '@buzzpay/db';
import { signAccessToken, signRefreshToken } from '../utils/token.js';
import { hashPassword } from '../utils/hash.js';
import { AppError } from '../middleware/error.js';

// In-memory OTP store (in production, use Redis with TTL)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const phoneAuthService = {
  async sendOtp(phone: string) {
    // Normalize phone: 08012345678 → +2348012345678
    const normalized = phone.startsWith('+') ? phone
      : phone.startsWith('0') ? `+234${phone.substring(1)}` : `+234${phone}`;

    const code = generateOtp();
    otpStore.set(normalized, { code, expiresAt: Date.now() + OTP_TTL_MS });

    console.log(`[OTP] ${normalized} → ${code}`); // visible in API logs for dev

    // Return OTP in response for dev/testing (remove in production)
    return { phone: normalized, sent: true, otp: code };
  },

  async verifyOtp(phone: string, pin: string) {
    const normalized = phone.startsWith('+') ? phone
      : phone.startsWith('0') ? `+234${phone.substring(1)}` : `+234${phone}`;

    const stored = otpStore.get(normalized);
    if (!stored) {
      throw new AppError(400, 'No OTP was sent to this number. Request a new one.');
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(normalized);
      throw new AppError(400, 'OTP expired. Request a new one.');
    }

    if (stored.code !== pin) {
      throw new AppError(400, 'Invalid code. Try again.');
    }

    // Clean up
    otpStore.delete(normalized);

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

  async completeSignup(phone: string, fullName: string, university: string) {
    const normalized = phone.startsWith('+') ? phone
      : phone.startsWith('0') ? `+234${phone.substring(1)}` : `+234${phone}`;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { phone: normalized } });
    if (existing) {
      throw new AppError(409, 'Account already exists with this phone number');
    }

    // Create user + student record
    const passwordHash = await hashPassword(`bp_${normalized}_${Date.now()}`); // auto-generated, user logs in via OTP
    const user = await prisma.user.create({
      data: {
        email: `${normalized.replace('+', '')}@phone.buzzpay.ng`, // placeholder email
        phone: normalized,
        fullName,
        passwordHash,
        role: 'STUDENT',
        student: {
          create: {
            university,
            verificationStatus: 'PENDING',
          },
        },
      },
      include: { student: true },
    });

    const tokens = {
      accessToken: signAccessToken({ userId: user.id, role: user.role }),
      refreshToken: signRefreshToken({ userId: user.id, role: user.role }),
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        verificationStatus: user.student?.verificationStatus,
      },
      tokens,
    };
  },
};
