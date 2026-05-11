import { prisma } from '@buzzpay/db';
import type { UserRole } from '@prisma/client';

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: { student: true, vendor: true } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { student: true, vendor: true } });
  },

  async findByPhone(phone: string) {
    return prisma.user.findUnique({ where: { phone } });
  },

  async create(data: {
    email: string;
    phone: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    university?: string;
  }) {
    const { university, ...userData } = data;

    return prisma.user.create({
      data: {
        ...userData,
        student: university
          ? {
              create: {
                university,
              },
            }
          : undefined,
      },
      include: { student: true },
    });
  },
};
