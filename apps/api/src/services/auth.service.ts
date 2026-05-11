import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { AppError } from '../middleware/error.js';
import type { SignupInput, LoginInput } from '@buzzpay/shared';

export const authService = {
  async signup(input: SignupInput) {
    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new AppError(409, 'Email already registered');
    }

    const existingPhone = await userRepository.findByPhone(input.phone);
    if (existingPhone) {
      throw new AppError(409, 'Phone number already registered');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      phone: input.phone,
      passwordHash,
      fullName: input.fullName,
      role: 'STUDENT',
      university: input.university,
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

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

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

  async refresh(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await userRepository.findById(payload.userId);
      if (!user) {
        throw new AppError(401, 'User not found');
      }

      return {
        accessToken: signAccessToken({ userId: user.id, role: user.role }),
        refreshToken: signRefreshToken({ userId: user.id, role: user.role }),
      };
    } catch {
      throw new AppError(401, 'Invalid refresh token');
    }
  },
};
