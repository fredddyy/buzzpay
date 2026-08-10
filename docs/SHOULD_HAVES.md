# BuzzPay — Should-Have Feature Tracker

**Last updated:** Aug 10, 2026  
**Purpose:** Track features that are partially built, stubbed, or missing from MVP.

---

## MVP-Critical (Must ship before Sept 15)

| # | Feature | State | Files | Target Week |
|---|---------|-------|-------|-------------|
| 1 | **Student ID Upload** — photo upload to Cloudinary + submit for review | Stub — `_submitUpload()` has TODO, no actual upload | `mobile/lib/screens/auth/verify_screen.dart`, API needs `POST /students/verify` | Week 3 |
| 2 | **Push Notifications (FCM)** — payment confirmations, voucher expiry, verification status | Stub — `pushService.send()` logs to console, no FCM delivery | `api/src/services/push.service.ts`, needs Firebase config | Week 3 |
| 3 | **OTP Resend** — resend button doesn't call API | Stub — `// TODO: Call API to resend OTP` | `mobile/lib/screens/auth/otp_screen.dart:117` | Week 2 |
| 4 | **Profile Edit** — student update name/phone, vendor update hours/address | Not started — `GET /auth/me` exists but no `PATCH` | API needs `PATCH /users/me`, `PATCH /vendor/profile` | Week 3 |

---

## Should-Have (Ship before Oct launch)

| # | Feature | State | Files | Target Week |
|---|---------|-------|-------|-------------|
| 5 | **Loyalty Stamps** — stamp on redemption, free deal on completion | Not started — `LoyaltyCard` model exists, no API endpoints | `schema.prisma`, mobile reads mock data only | Week 4 |
| 6 | **Payout System** — weekly batch payouts to vendors via Paystack Transfer | Not started — `Payout` model exists, no logic | `schema.prisma`, needs cron job + admin UI | Week 4 |
| 7 | **Campaigns → Student Feed** — admin campaigns visible on student app | Partial — admin creates campaigns, student feed ignores `campaignId` | `admin/campaigns/page.tsx`, deals provider | Week 3 |
| 8 | **Analytics Events** — `deal_viewed`, `payment_completed`, `voucher_redeemed` | Not started — no event logging anywhere | Needs PostHog or custom events table | Week 4 |
| 9 | **Vendor Scanner Offline Mode** — queue scans when offline, sync later | Not started — documented in CORE_USER_FLOW.md | Scanner page, needs SQLite/local storage | Week 5 |
| 10 | **QR Sticker PDF Download** — generate printable QR stickers for vendors | Not started — playbook Day 18 task | Admin vendors page, needs PDF generation | Week 4 |
| 11 | **VendorQrCode Validation** — verify scanned QR belongs to correct vendor sticker | Partial — model + admin endpoints exist, scanner doesn't validate | `admin/vendors`, scanner page | Week 4 |
| 12 | **Sentry Error Tracking** — API + web + mobile error reporting | Not started — mentioned in playbook, no packages installed | All apps | Week 3 |
| 13 | **Vendor Self-Serve Profile** — vendor updates own business hours, address, logo | Not started — only admin can update vendors | API needs `PATCH /vendor/profile` | Week 3 |
| 14 | **Auto-Refresh Verification Status** — poll while PENDING, no manual refresh needed | Not started — student must pull-to-refresh | Auth provider, home screen | Week 3 |

---

## Nice-to-Have (Post-launch)

| # | Feature | State | Target |
|---|---------|-------|--------|
| 15 | **Referral System** — invite friends, earn credits | Not started — no model fields | Phase 4 (Nov) |
| 16 | **WhatsApp Share** — share voucher redemption to WhatsApp | Stub — `// TODO` in voucher detail | Phase 3 (Oct) |
| 17 | **Deal Notifications** — "New deal from Mama Nkechi!" push | Not started — needs FCM first | Phase 3 (Oct) |
| 18 | **Vendor Dashboard Stats** — charts, weekly trends, top deals | Basic — today's count only | Phase 3 (Oct) |
| 19 | **Student Spend History** — monthly spend breakdown, savings total | Not started | Phase 4 (Nov) |
| 20 | **Multi-University Support** — campus selector, different vendor pools | Not started — hardcoded "UNILAG, Akoka" | Phase 5 (Dec) |

---

## Completed ✅

| Feature | Completed |
|---------|-----------|
| Cart system (multi-deal, per-vendor checkout) | Aug 6 |
| Pay with Bank Transfer (Paystack) | Aug 6 |
| QR Code — static + rotating TOTP (60s) | Aug 10 |
| QR Scanner — camera + manual code entry | Aug 10 |
| Vendor redemption — correct vendor check, double-redeem prevention | Aug 10 |
| Admin dashboard — deals, vendors, students, vouchers, transactions | Pre-existing |
| Dropping Soon groups (Amala Rush) | Aug 5 |
| Happy Hour / Lunch Rush live deals | Aug 5 |
| Railway deployment (API + Postgres) | Aug 6 |
| Home screen simplification | Aug 5 |

---

## How to use this doc

1. Before starting a new week, check this list
2. Move items to "Completed" when done
3. Add new items as they're discovered
4. Priority order: MVP-Critical → Should-Have → Nice-to-Have
