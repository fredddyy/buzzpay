import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
const { hashSync } = bcryptjs;

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.oTP.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.student.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@buzzpay.ng',
      phone: '+2349000000000',
      passwordHash: hashSync('admin123456', 12),
      role: 'ADMIN',
      fullName: 'BuzzPay Admin',
    },
  });

  // Create vendor users + vendors
  const vendorUser1 = await prisma.user.create({
    data: {
      email: 'mama@buzzpay.ng',
      phone: '+2348011111111',
      passwordHash: hashSync('vendor123456', 12),
      role: 'VENDOR',
      fullName: 'Mama Nkechi',
    },
  });

  const vendor1 = await prisma.vendor.create({
    data: {
      userId: vendorUser1.id,
      businessName: 'Mama Nkechi Kitchen',
      businessAddress: 'Shop 5, UNILAG Main Gate',
      businessPhone: '+2348011111111',
      opensAt: '07:00',
      closesAt: '21:00',
      commissionRate: 0.10,
    },
  });

  const vendorUser2 = await prisma.user.create({
    data: {
      email: 'chill@buzzpay.ng',
      phone: '+2348022222222',
      passwordHash: hashSync('vendor123456', 12),
      role: 'VENDOR',
      fullName: 'ChillZone Manager',
    },
  });

  const vendor2 = await prisma.vendor.create({
    data: {
      userId: vendorUser2.id,
      businessName: 'ChillZone Cafe',
      businessAddress: '12 University Road, Akoka',
      businessPhone: '+2348022222222',
      opensAt: '10:00',
      closesAt: '22:00',
      commissionRate: 0.12,
    },
  });

  // Create a verified student
  const studentUser = await prisma.user.create({
    data: {
      email: 'student@unilag.edu.ng',
      phone: '+2348033333333',
      passwordHash: hashSync('student123456', 12),
      role: 'STUDENT',
      fullName: 'Tunde Bakare',
    },
  });

  await prisma.student.create({
    data: {
      userId: studentUser.id,
      university: 'UNILAG',
      verificationStatus: 'APPROVED',
      verifiedAt: new Date(),
      schoolEmail: 'tunde@unilag.edu.ng',
      schoolEmailVerified: true,
    },
  });

  // Create deals
  const now = new Date();
  const in30min = new Date(now.getTime() + 30 * 60 * 1000);
  const in45min = new Date(now.getTime() + 45 * 60 * 1000);
  const in55min = new Date(now.getTime() + 55 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Happy Hour deals — expire within 60 minutes
  const happyHourDeals = [
    {
      vendorId: vendor1.id,
      title: 'Amala + Ewedu Combo',
      description: 'Mama Nkechi\'s famous amala with ewedu and assorted meat. Happy hour only!',
      category: 'FOOD' as const,
      imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600',
      originalPrice: 200000,
      studentPrice: 120000,
      totalQuantity: 15,
      remainingQty: 6,
      maxPerUser: 1,
      startsAt: now,
      expiresAt: in45min,
      isFeatured: false,
    },
    {
      vendorId: vendor2.id,
      title: 'Milkshake + Cookie',
      description: 'Thick milkshake with a warm chocolate chip cookie. Gone in 30 minutes!',
      category: 'DRINKS' as const,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600',
      originalPrice: 150000,
      studentPrice: 80000,
      totalQuantity: 10,
      remainingQty: 4,
      maxPerUser: 1,
      startsAt: now,
      expiresAt: in30min,
      isFeatured: false,
    },
    {
      vendorId: vendor1.id,
      title: 'Suya Platter',
      description: 'Hot suya with onions and pepper. Only available for the next hour!',
      category: 'FOOD' as const,
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
      originalPrice: 180000,
      studentPrice: 100000,
      totalQuantity: 20,
      remainingQty: 9,
      maxPerUser: 2,
      startsAt: now,
      expiresAt: in55min,
      isFeatured: false,
    },
  ];

  for (const deal of happyHourDeals) {
    await prisma.deal.create({ data: deal });
  }

  const deals = [
    {
      vendorId: vendor1.id,
      title: 'Jollof Rice + Chicken Combo',
      description: 'Delicious home-style jollof rice with a big piece of chicken and plantain. Best seller at Mama Nkechi Kitchen!',
      category: 'FOOD' as const,
      imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600',
      originalPrice: 250000,
      studentPrice: 180000,
      totalQuantity: 50,
      remainingQty: 8,
      maxPerUser: 2,
      startsAt: now,
      expiresAt: nextWeek,
      isFeatured: true,
    },
    {
      vendorId: vendor1.id,
      title: 'Fried Rice + Turkey',
      description: 'Tasty fried rice served with turkey and coleslaw. Perfect for lunch!',
      category: 'FOOD' as const,
      imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600',
      originalPrice: 300000,
      studentPrice: 220000,
      totalQuantity: 30,
      remainingQty: 30,
      maxPerUser: 1,
      startsAt: now,
      expiresAt: nextWeek,
    },
    {
      vendorId: vendor1.id,
      title: 'Shawarma Special',
      description: 'Loaded chicken shawarma with extra sauce. Student size!',
      category: 'FOOD' as const,
      imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600',
      originalPrice: 200000,
      studentPrice: 150000,
      totalQuantity: 40,
      remainingQty: 5,
      maxPerUser: 3,
      startsAt: now,
      expiresAt: nextWeek,
      isFeatured: true,
    },
    {
      vendorId: vendor2.id,
      title: 'Smoothie Bowl',
      description: 'Fresh fruit smoothie bowl with granola and honey. Perfect study fuel!',
      category: 'DRINKS' as const,
      imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600',
      originalPrice: 180000,
      studentPrice: 120000,
      totalQuantity: 20,
      remainingQty: 20,
      maxPerUser: 2,
      startsAt: now,
      expiresAt: nextWeek,
    },
    {
      vendorId: vendor2.id,
      title: 'Iced Coffee + Pastry',
      description: 'Chill with an iced coffee and freshly baked pastry. Valid 2PM-5PM only.',
      category: 'DRINKS' as const,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600',
      originalPrice: 150000,
      studentPrice: 100000,
      totalQuantity: 25,
      remainingQty: 3,
      maxPerUser: 1,
      startsAt: now,
      expiresAt: nextWeek,
      isFeatured: true,
    },
    {
      vendorId: vendor2.id,
      title: 'Game Pass (2 Hours)',
      description: 'Two hours of gaming at ChillZone. PS5, pool table, or board games.',
      category: 'LIFESTYLE' as const,
      imageUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600',
      originalPrice: 200000,
      studentPrice: 130000,
      totalQuantity: 15,
      remainingQty: 15,
      maxPerUser: 1,
      startsAt: now,
      expiresAt: nextWeek,
    },
    {
      vendorId: vendor1.id,
      title: '1GB Data Bundle',
      description: 'MTN 1GB data valid for 30 days. Collected at Mama Nkechi Shop.',
      category: 'SUBSCRIPTIONS' as const,
      imageUrl: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600',
      originalPrice: 50000,
      studentPrice: 35000,
      totalQuantity: 100,
      remainingQty: 100,
      maxPerUser: 5,
      startsAt: now,
      expiresAt: nextWeek,
    },
    {
      vendorId: vendor2.id,
      title: 'Campus Shuttle Pass (Weekly)',
      description: 'Weekly unlimited shuttle rides between campus and Yaba. Show voucher to driver.',
      category: 'TRANSPORT' as const,
      imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600',
      originalPrice: 300000,
      studentPrice: 200000,
      totalQuantity: 30,
      remainingQty: 7,
      maxPerUser: 1,
      startsAt: now,
      expiresAt: nextWeek,
    },
  ];

  const createdDeals = [];
  for (const deal of deals) {
    const created = await prisma.deal.create({ data: deal });
    createdDeals.push(created);
  }

  // Get student record
  const student = await prisma.student.findFirst({ where: { userId: studentUser.id } });

  // Create sample vouchers for the student
  const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Voucher 1 — Active, 6h left (Jollof Rice)
  const payment1 = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      dealId: createdDeals[0].id,
      amount: createdDeals[0].studentPrice,
      commission: Math.round(createdDeals[0].studentPrice * 0.10),
      vendorAmount: Math.round(createdDeals[0].studentPrice * 0.90),
      paystackReference: 'bp_seed_active_001',
      status: 'SUCCESS',
      paidAt: now,
    },
  });
  await prisma.voucher.create({
    data: {
      studentId: student!.id,
      dealId: createdDeals[0].id,
      paymentId: payment1.id,
      code: 'BZ7742XP',
      qrData: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      status: 'ACTIVE',
      expiresAt: in6h,
    },
  });

  // Voucher 2 — Active, 2h left (Shawarma — urgent)
  const payment2 = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      dealId: createdDeals[2].id,
      amount: createdDeals[2].studentPrice,
      commission: Math.round(createdDeals[2].studentPrice * 0.10),
      vendorAmount: Math.round(createdDeals[2].studentPrice * 0.90),
      paystackReference: 'bp_seed_active_002',
      status: 'SUCCESS',
      paidAt: now,
    },
  });
  await prisma.voucher.create({
    data: {
      studentId: student!.id,
      dealId: createdDeals[2].id,
      paymentId: payment2.id,
      code: 'BZ9921KM',
      qrData: 'f1e2d3c4-b5a6-7890-dcba-098765432100',
      status: 'ACTIVE',
      expiresAt: in2h,
    },
  });

  // Voucher 3 — Active (Iced Coffee)
  const payment3 = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      dealId: createdDeals[4].id,
      amount: createdDeals[4].studentPrice,
      commission: Math.round(createdDeals[4].studentPrice * 0.10),
      vendorAmount: Math.round(createdDeals[4].studentPrice * 0.90),
      paystackReference: 'bp_seed_active_003',
      status: 'SUCCESS',
      paidAt: now,
    },
  });
  await prisma.voucher.create({
    data: {
      studentId: student!.id,
      dealId: createdDeals[4].id,
      paymentId: payment3.id,
      code: 'BZ5533QR',
      qrData: 'c3c3c3c3-d4d4-5555-aaaa-bbbbccccdddd',
      status: 'ACTIVE',
      expiresAt: in6h,
    },
  });

  // Voucher 4 — Redeemed (Smoothie Bowl)
  const payment4 = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      dealId: createdDeals[3].id,
      amount: createdDeals[3].studentPrice,
      commission: Math.round(createdDeals[3].studentPrice * 0.10),
      vendorAmount: Math.round(createdDeals[3].studentPrice * 0.90),
      paystackReference: 'bp_seed_redeemed_001',
      status: 'SUCCESS',
      paidAt: yesterday,
    },
  });
  await prisma.voucher.create({
    data: {
      studentId: student!.id,
      dealId: createdDeals[3].id,
      paymentId: payment4.id,
      code: 'BZ1122AB',
      qrData: 'eeee1111-2222-3333-4444-555566667777',
      status: 'REDEEMED',
      expiresAt: yesterday,
      redeemedAt: yesterday,
    },
  });

  // Voucher 5 — Expired (Fried Rice)
  const payment5 = await prisma.payment.create({
    data: {
      userId: studentUser.id,
      dealId: createdDeals[1].id,
      amount: createdDeals[1].studentPrice,
      commission: Math.round(createdDeals[1].studentPrice * 0.10),
      vendorAmount: Math.round(createdDeals[1].studentPrice * 0.90),
      paystackReference: 'bp_seed_expired_001',
      status: 'SUCCESS',
      paidAt: yesterday,
    },
  });
  await prisma.voucher.create({
    data: {
      studentId: student!.id,
      dealId: createdDeals[1].id,
      paymentId: payment5.id,
      code: 'BZ8844ZZ',
      qrData: 'ffff8888-9999-aaaa-bbbb-ccccddddeeee',
      status: 'EXPIRED',
      expiresAt: yesterday,
    },
  });

  console.log('Seed completed:');
  console.log(`  - 1 admin: admin@buzzpay.ng / admin123456`);
  console.log(`  - 2 vendors: Mama Nkechi Kitchen, ChillZone Cafe`);
  console.log(`  - 1 student: student@unilag.edu.ng / student123456`);
  console.log(`  - ${deals.length + happyHourDeals.length} deals across categories`);
  console.log(`  - 5 vouchers (3 active, 1 redeemed, 1 expired)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
