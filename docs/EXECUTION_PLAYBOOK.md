# BuzzPay 5-Month Execution Playbook

**Timeline:** Aug 1 – Dec 31, 2026  
**Objective:** Build a working MVP, onboard merchants, generate real transactions, and reach sustainable daily growth.

---

## Overview

| Phase | Period | Goal | End State |
|-------|--------|------|-----------|
| Phase 1: Build | Aug 1 – Sept 14 | Ship working MVP | Payments + vouchers working |
| Phase 2: Polish + Pre-Launch | Sept 15 – Sept 30 | QA, prep, first merchants | 10+ merchants, app stable |
| Phase 3: Soft Launch | Oct 1 – Oct 31 | Real users + real transactions | 50+ merchants, 200+ users |
| Phase 4: Growth | Nov 1 – Nov 30 | Build momentum | 150+ merchants, 800+ users |
| Phase 5: Scale + Monetize | Dec 1 – Dec 31 | Sustainable revenue | 300+ merchants, 2k+ users |

---

# Infrastructure & Hosting

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                        USERS                             │
│        Students (Mobile)       Vendors (Web)             │
└──────────────┬─────────────────────────┬─────────────────┘
               │                         │
    ┌──────────▼──────────┐   ┌──────────▼──────────┐
    │   Flutter App       │   │   Vercel (Web)      │
    │   iOS + Android     │   │   apps/web          │
    │   App Store / Play  │   │   admin.buzzpay.ng  │
    └──────────┬──────────┘   └──────────┬──────────┘
               │                         │
               └────────────┬────────────┘
                            │ HTTPS REST
                 ┌──────────▼──────────────┐
                 │    Railway (API)         │
                 │    apps/api             │
                 │    api.buzzpay.com.ng   │
                 │    Node 20 + Express 5  │
                 └──────┬──────────────────┘
                        │
          ┌─────────────┼──────────────────┐
          │             │                  │
  ┌───────▼──────┐ ┌────▼──────┐ ┌────────▼──────┐
  │  Railway DB  │ │ Supabase  │ │  Cloudinary   │
  │  PostgreSQL  │ │ Realtime  │ │  Images / CDN │
  │  (Primary)   │ │ WebSocket │ │               │
  └──────────────┘ └───────────┘ └───────────────┘
          │
  ┌───────▼──────────────────┐
  │     External Services    │
  │  Paystack  Termii  FCM   │
  └──────────────────────────┘
```

---

## Hosting: Service by Service

### 1. Backend API — Railway

**Service:** `apps/api`  
**URL:** `https://api.buzzpay.com.ng` (custom domain via Railway settings)  
**Plan:** Starter ($5/mo) → Pro ($20/mo) when traffic grows past ~200 req/min  

**Deploy:**
```bash
npm install -g @railway/cli
railway login
railway link        # link to existing Railway project
railway up          # deploy from local
```

**Production environment variables (set in Railway dashboard):**
```
DATABASE_URL              postgresql://...   (auto-injected by Railway Postgres plugin)
JWT_SECRET                <openssl rand -hex 32>
JWT_REFRESH_SECRET        <openssl rand -hex 32>
PAYSTACK_SECRET_KEY       sk_live_xxxxx
PAYSTACK_PUBLIC_KEY       pk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET   <from Paystack dashboard>
CLOUDINARY_CLOUD_NAME     xxxxx
CLOUDINARY_API_KEY        xxxxx
CLOUDINARY_API_SECRET     xxxxx
TERMII_API_KEY            xxxxx
TERMII_SENDER_ID          BuzzPay
SUPABASE_URL              https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY xxxxx
FCM_PROJECT_ID            xxxxx
FCM_PRIVATE_KEY           xxxxx
FCM_CLIENT_EMAIL          xxxxx
NODE_ENV                  production
PORT                      3000
FRONTEND_URL              https://admin.buzzpay.com.ng
```

**railway.toml** (verify this matches):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/api/Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**Scaling triggers:**
- CPU sustained > 80% → upgrade plan
- Memory > 512MB → optimize or upgrade
- API p99 response > 2s → investigate

---

### 2. PostgreSQL — Railway Postgres Plugin

**Plan:** Starter (1GB) → Pro (10GB) at scale  
**Backups:** Daily automatic backups on Pro plan  
**Connection:** Private network within Railway (zero-latency)  

**Migration rules:**
```bash
# Standard — run on deploy (automated via Dockerfile CMD)
pnpm db:migrate

# Emergency manual run
railway run pnpm db:migrate

# Never do this on production
pnpm db:push   # ← BANNED on production
```

**Hygiene:**
- Every schema change needs a migration file committed to git
- Test migration on staging before running on production
- Never delete migration files from git history

---

### 3. Admin + Vendor Web — Vercel

**Service:** `apps/web`  
**URL:** `https://admin.buzzpay.com.ng`  
**Plan:** Hobby (free) is fine for MVP  

**Deploy:**
```bash
npm install -g vercel
cd apps/web
vercel --prod
```

**Connect GitHub for auto-deploy:** Vercel dashboard → Import repo → select `apps/web` as root.  
Every push to `main` auto-deploys. Every PR gets a preview URL.

**Environment variables (Vercel dashboard):**
```
NEXT_PUBLIC_API_URL              https://api.buzzpay.com.ng
NEXT_PUBLIC_SUPABASE_URL         https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    xxxxx
```

---

### 4. Image Storage — Cloudinary

**Plan:** Free (25GB storage, 25GB bandwidth/mo) — sufficient through Phase 4  
**Usage:** Deal images, vendor logos, student ID uploads  

**Folder structure:**
```
buzzpay/
  deals/           → deal images (public CDN)
  vendors/logos/   → vendor logos (public CDN)
  students/ids/    → student ID uploads (PRIVATE — signed URLs only)
```

**Security rule:** Student ID images must NEVER be served via public URL. Always use signed URLs with expiry (`expires_at`).

---

### 5. Realtime — Supabase

**Plan:** Free tier (500MB DB, 2GB bandwidth) → Pro ($25/mo) at scale  
**Role:** Real-time WebSocket subscriptions only. Primary data lives in Railway PostgreSQL.  

**Active channels:**
- `deals:{campusId}` — new/updated deals broadcast
- `vouchers:{userId}` — voucher status changes
- `payments:{userId}` — payment confirmations

---

### 6. Payments — Paystack

**Webhook URL:** `https://api.buzzpay.com.ng/api/payments/webhook`  

**Paystack dashboard setup (do before launch):**
1. Add webhook URL
2. Enable events: `charge.success`, `transfer.success`, `transfer.failed`
3. Copy webhook secret → set `PAYSTACK_WEBHOOK_SECRET` in Railway
4. Test with Paystack's webhook simulator

**Commission:** BuzzPay takes 5–15% per transaction. Stored as `Payment.commission` (kobo). Vendors receive `Payment.vendorAmount`.  
**Payouts:** Batched weekly via Paystack Transfer API. Every Friday.

---

### 7. SMS / OTP — Termii

**Cost:** ~₦4/SMS  
**Usage:** Phone OTP for student signup  
**Action:** Register "BuzzPay" as Sender ID in Termii dashboard (24–48hr approval)  
**Budget:** ~₦2,000/mo for first 500 users

---

### 8. Push Notifications — Firebase FCM

**Plan:** Free (no limits on FCM)  
**Usage:** Payment confirmations, voucher expiry reminders, deal alerts  

**Setup:**
1. Create Firebase project at `console.firebase.google.com`
2. Add Android app (`com.buzzpay.app`) + iOS app
3. Place `google-services.json` in `apps/mobile/android/app/`
4. Place `GoogleService-Info.plist` in `apps/mobile/ios/Runner/`

---

### 9. Error Tracking — Sentry

**Plan:** Free (5k errors/month)  

```bash
pnpm add @sentry/node --filter=api
pnpm add @sentry/nextjs --filter=web
flutter pub add sentry_flutter
```

Set `SENTRY_DSN` in all environments. Alert rule: if error rate > 10/5min → immediate notification.

---

### 10. Uptime Monitoring — UptimeRobot (Free)

Monitor `GET https://api.buzzpay.com.ng/api/health` every 5 minutes.  
Alerts via email + WhatsApp on downtime.  
Target: 99.5% uptime during MVP.

---

### 11. Domain & DNS

**Domain:** `buzzpay.com.ng` (register at Namecheap or Cloudflare)  

**DNS records:**
```
CNAME  api    →  buzzpay-api.up.railway.app
CNAME  admin  →  buzzpay.vercel.app
CNAME  www    →  buzzpay.vercel.app
A      @      →  Vercel IP
```

SSL auto-provisioned by Railway (Let's Encrypt) and Vercel.

---

### 12. Staging Environment

**Why:** Never break production. Test everything here first.

```
Staging API:  buzzpay-staging.up.railway.app
Staging Web:  buzzpay-staging.vercel.app
Staging DB:   Separate Railway Postgres service (same project)
Paystack:     Test mode keys only
```

**Workflow:** Code change → deploy to staging → test → deploy to production.

---

### 13. Environment File Management

```
.env              → local dev only (git-ignored)
.env.example      → template committed to git
Railway dashboard → staging + production secrets
Vercel dashboard  → web-specific env vars
```

**Rule: Never commit real secrets to git. Ever.**

---

# Phase 1: Build (Aug 1 – Sept 14)

**Goal:** Ship a working MVP. Every core user flow must work end-to-end.

---

## Week 1 (Aug 1–7) — Foundation + Infrastructure

### Day 1–2 (Aug 1–2): Lock Scope + Set Up Infra

**Technical:**
- [ ] Audit current repo — list what's built vs. missing vs. broken
- [ ] Lock MVP feature list (no new features after this week)
- [ ] Set up Railway project (API service + Postgres plugin)
- [ ] Set up Vercel project (connect GitHub repo, select `apps/web`)
- [ ] Set up staging environment with test keys
- [ ] Verify `pnpm dev` runs all apps locally without errors
- [ ] Run `pnpm db:migrate` — confirm schema is current
- [ ] Set up Sentry for API and web
- [ ] Register domain `buzzpay.com.ng` if not already done
- [ ] Create Paystack account (test mode), add webhook URL
- [ ] Create Termii account, submit "BuzzPay" sender ID registration
- [ ] Create Firebase project, download config files

**Product:**
- [ ] Write down the single most important user flow: student pays → vendor scans → done
- [ ] List every bug or incomplete feature from previous work
- [ ] Define "launch-ready" criteria — what must work before Sept 15

---

### Day 3 (Aug 3): Authentication — Audit and Fix

- [ ] Test signup (email + phone OTP) end-to-end
- [ ] Test login + JWT refresh
- [ ] Test role-based access: student vs. vendor vs. admin
- [ ] Fix any auth bugs found
- [ ] Verify Termii OTP delivery in staging

**Acceptance criteria:**
- Invalid token → 401
- Wrong role → 403
- Refresh token rotates on use
- OTP expires after 10 minutes

---

### Day 4 (Aug 4): User + Vendor Profile APIs

- [ ] `GET /api/users/me` — student profile
- [ ] `PATCH /api/users/me` — update name, phone
- [ ] `GET /api/vendor/profile` — vendor profile
- [ ] `PATCH /api/vendor/profile` — update business name, hours, address
- [ ] Vendor logo upload to Cloudinary
- [ ] All inputs validated with Zod schemas

---

### Day 5 (Aug 5): Wallet + Ledger Audit

- [ ] Confirm every credit/debit is a `Payment` record (ledger model)
- [ ] Test balance calculation: sum of `Payment.amount` where status = SUCCESS
- [ ] Verify no double-spend (idempotency key on payment initialize)
- [ ] Test concurrent payment scenarios (two tabs simultaneously)
- [ ] Confirm all amounts in kobo throughout — no floats

---

### Day 6 (Aug 6): Paystack Integration (Test Mode)

- [ ] `POST /api/payments/initialize` → returns `access_code` + `reference`
- [ ] Paystack test checkout works in Flutter app (test card: `4084084084084081`)
- [ ] `GET /api/payments/verify/:reference` → returns payment status
- [ ] Webhook endpoint receives and processes `charge.success` event
- [ ] Voucher created after successful webhook
- [ ] Duplicate webhook → no duplicate voucher (idempotency check)

---

### Day 7 (Aug 7): Internal Test Day 1

- [ ] Run full flow: signup → verify → browse deal → pay → get voucher
- [ ] Fix all critical bugs found
- [ ] Document results in `docs/TEST_CHECKLIST.md`
- [ ] Deploy working build to staging

---

## Week 2 (Aug 8–14) — Core Payments

### Day 8 (Aug 8): Payment Flow Solidification

- [ ] Confirm `Payment` model fields are complete
- [ ] `commission` and `vendorAmount` calculated correctly for each deal
- [ ] `GET /api/payments` — paginated transaction history for student
- [ ] Payment status updates broadcast via Supabase realtime channel

---

### Day 9 (Aug 9): Anti-Fraud + Stock Control

- [ ] Reject payment if `Deal.remainingQty === 0`
- [ ] Reject duplicate payment for same deal by same user (within 1 hour)
- [ ] Decrement `remainingQty` inside a DB transaction (prevent race condition)
- [ ] Rate limit: 3 payment attempts per 10 min per user
- [ ] Log suspicious patterns (multiple failed attempts) to Sentry

---

### Day 10 (Aug 10): QR Code Generation

- [ ] Static QR (UUID) generates correctly on voucher creation
- [ ] Rotating QR (TOTP, 60-second window) generates correctly
- [ ] Expired rotating QR is rejected on redemption attempt
- [ ] QR payload format: `{ voucherId, code, timestamp, hmac }`
- [ ] QR renders in Flutter using `qr_flutter` package
- [ ] QR is readable by device camera from 20cm away

---

### Day 11 (Aug 11): QR Scanner (Vendor Web)

- [ ] Scanner works on `/scanner` page (html5-qrcode)
- [ ] Scanner works on mobile browser (vendor may use their phone)
- [ ] Manual code entry fallback works
- [ ] TOTP validation: expired codes rejected
- [ ] Already-redeemed voucher: clear error message
- [ ] Successful scan pushes realtime event to student

---

### Day 12 (Aug 12): Scan → Redemption Flow

- [ ] Full vendor scan flow: open scanner → scan QR → confirm → success
- [ ] Confirmation screen shows student name + deal name
- [ ] Student receives push notification: "Your voucher was redeemed at [Vendor]"
- [ ] Loyalty stamp increments on redemption
- [ ] Wrong vendor scanning another vendor's voucher → rejected with reason

---

### Day 13 (Aug 13): Transaction History UI

**Mobile app:**
- [ ] Vouchers screen: Active / Redeemed / Expired tabs
- [ ] Each voucher: deal name, vendor, amount paid, status, date
- [ ] Tap active voucher → shows QR code
- [ ] Tap redeemed voucher → shows redemption details
- [ ] Pull-to-refresh works

**Vendor web:**
- [ ] Today's redemptions list (live via Supabase)
- [ ] Today's earnings total in ₦

---

### Day 14 (Aug 14): Payment E2E Test

**Full test script (run top to bottom):**
1. Create student account (email + phone OTP)
2. Submit student ID for verification
3. Admin approves verification
4. Student browses deals on home screen
5. Student pays for deal (Paystack test card)
6. Voucher appears in Active tab
7. Vendor opens scanner page
8. Vendor scans QR code
9. Redemption confirmed on vendor screen
10. Student sees voucher marked Redeemed
11. Vendor dashboard shows updated earnings

**Pass = all 11 steps complete without error.**

---

## Week 3 (Aug 15–21) — Merchant System

### Day 15 (Aug 15): Vendor Dashboard

- [ ] Vendor login works
- [ ] Dashboard loads at `/dashboard` (protected, vendor role only)
- [ ] Stats cards: Today's scans, Today's earnings, This week's total
- [ ] Recent redemptions table (live, Supabase-powered)
- [ ] Vendor cannot see other vendors' data

---

### Day 16 (Aug 16): Vendor Dashboard Features

- [ ] Redemption history with basic date filter (today / this week / this month)
- [ ] Deal management: vendor's active deals listed
- [ ] Payout status: "Next payout: Friday [date], Estimated: ₦X"
- [ ] "Contact Support" button (opens WhatsApp)

---

### Day 17 (Aug 17): Store Profile

- [ ] Vendor can update: business name, address, category, opening hours, logo
- [ ] Logo upload → Cloudinary (public URL stored)
- [ ] Changes reflect on student-facing deal cards immediately
- [ ] Validation: opening time < closing time, phone format correct

---

### Day 18 (Aug 18): QR Sticker Download

- [ ] "Download QR Code" button on vendor dashboard
- [ ] Generates printable PDF: QR + vendor name + "Scan with BuzzPay"
- [ ] A4 format + sticker-size (10cm × 10cm) options
- [ ] Print-test: QR readable by phone at 15cm distance

---

### Day 19 (Aug 19): Deals Discovery

- [ ] `GET /api/deals?campus=unilag` — campus-based filtering
- [ ] `GET /api/deals?category=FOOD` — category filter
- [ ] `GET /api/deals?search=shawarma` — search by name (case-insensitive)
- [ ] Featured section: "Hot in Akoka", "Trending at UNILAG" (manually curated)
- [ ] Sold-out deals show "Sold Out" badge, disable payment CTA

---

### Day 20 (Aug 20): Deals UI in Mobile App

- [ ] Home screen: featured deals + category tabs
- [ ] Deal card: image, vendor name, original price (strikethrough), student price, "X left"
- [ ] Deal detail: full description, vendor info, hours, "Pay ₦X" CTA
- [ ] Infinite scroll or pagination on deals list
- [ ] Empty state: "No deals in [category] right now"

---

### Day 21 (Aug 21): Bug Fix + Performance

- [ ] Profile all API endpoints — flag any responding > 500ms
- [ ] Add DB indexes: `Deal.vendorId`, `Voucher.studentId`, `Payment.userId`
- [ ] Test app on slow 3G connection (use throttle in Chrome DevTools)
- [ ] Fix all UI glitches found this week
- [ ] Verify gzip compression is active on API responses

---

## Week 4 (Aug 22–28) — Admin Dashboard

### Day 22 (Aug 22): Student Verification Queue

- [ ] Admin sees list of PENDING verifications with student ID image preview
- [ ] Approve button → sets `VerificationStatus.APPROVED`, notifies student via push
- [ ] Reject button → requires reason, notifies student via push
- [ ] Filter: All / Pending / Approved / Rejected
- [ ] Process SLA: all new submissions reviewed within 24 hours

---

### Day 23 (Aug 23): Deal Management (Admin)

- [ ] Create deal: title, description, category, image upload, original price, student price, quantity, expiry, vendor assignment
- [ ] Edit existing deal
- [ ] Pause deal (sets `isFeatured = false`, hides from discovery)
- [ ] Feature deal (pins to featured section with `featuredSection` label)
- [ ] Deal image uploaded to Cloudinary

---

### Day 24 (Aug 24): Vendor Management (Admin)

- [ ] Create vendor account: business name, email, password
- [ ] View vendor list with: name, category, active deals count, this week's transactions
- [ ] Toggle vendor active/inactive status
- [ ] View vendor's deal history and earnings

---

### Day 25 (Aug 25): Analytics + Overview Dashboard

- [ ] 8 metric cards on admin home: total users, verified, pending, vendors, deals, transactions, total revenue (₦), redemption rate
- [ ] Daily transaction chart (last 30 days)
- [ ] Top 5 vendors by revenue this month
- [ ] Top 5 deals by redemption count

---

### Day 26 (Aug 26): Analytics Logging

- [ ] Log events to DB or PostHog (free tier):
  - `deal_viewed` — userId, dealId
  - `payment_initiated` — userId, dealId, amount
  - `payment_completed` — userId, dealId, amount
  - `voucher_redeemed` — voucherId, vendorId
  - `app_opened` — userId
- [ ] Admin can see funnel: views → initiations → completions

---

### Day 27 (Aug 27): Error Tracking + Monitoring

- [ ] Sentry catching all unhandled errors in API
- [ ] Sentry catching Flutter crashes in mobile app
- [ ] UptimeRobot monitoring `/api/health` every 5 minutes
- [ ] Alert channel configured (WhatsApp group + email)
- [ ] Sentry alert rule: > 10 errors/5 min → immediate notification

---

### Day 28 (Aug 28): Internal QA Testing Round 1

**QA participants:** You + 1–2 trusted people with fresh accounts  

- [ ] Each tester runs full flow independently (no guidance)
- [ ] Try edge cases: wrong OTP, cancelled payment, expired voucher, sold-out deal
- [ ] Test on real devices: budget Android + iPhone
- [ ] Document every bug in shared Google Sheet (severity: Critical / High / Medium / Low)
- [ ] No new features — observation only

---

## Week 5 (Aug 29 – Sept 7) — Bug Fixes + Performance

### Day 29–30 (Aug 29–30): Fix Critical + High Bugs

- [ ] Fix all CRITICAL bugs from QA
- [ ] Fix all HIGH bugs from QA
- [ ] Re-test each fix on staging before merging
- [ ] No new features this week

---

### Day 31–32 (Sept 1–2): Fix Medium Bugs + Polish

- [ ] Fix MEDIUM bugs from QA list
- [ ] Loading skeletons on all screens (no blank white screens)
- [ ] All error messages are human-readable (not "Error 500" or "Something went wrong")
- [ ] Consistent spacing, typography, and colors throughout app
- [ ] Haptic feedback on payment success

---

### Day 33–35 (Sept 3–5): Performance Pass

- [ ] API: all endpoints respond < 300ms p95 on staging
- [ ] Mobile: app launch to home screen < 3 seconds on mid-range Android
- [ ] Images load fast: Cloudinary auto-format + quality optimization (`f_auto,q_auto`)
- [ ] Paginated lists don't freeze on scroll
- [ ] Supabase realtime reconnects gracefully on network loss

---

### Day 36–37 (Sept 6–7): QA Testing Round 2

- [ ] Re-run full QA script with all fixes applied
- [ ] All CRITICAL and HIGH bugs should be zero
- [ ] Test Paystack live mode on staging (use real card, real small amount ₦50)
- [ ] Verify Paystack webhook fires correctly in production environment

---

## Week 6 (Sept 8–14) — Merchant Prep + App Store

### Day 38–39 (Sept 8–9): Print QR Sticker Batch 1

**Physical prep:**
- [ ] Create 20 vendor accounts in admin dashboard (first wave merchants)
- [ ] Generate and download QR codes for each
- [ ] Print on matte waterproof sticker paper (A6 size)
- [ ] Test each sticker with camera scan — all must pass
- [ ] Package each with laminated onboarding instruction card

**Sticker design must include:**
- Vendor name (large, readable)
- QR code (minimum 8cm × 8cm)
- "Scan with BuzzPay app to pay"
- BuzzPay logo + app download link

---

### Day 40–42 (Sept 10–12): Mobile App Build

- [ ] Android APK/AAB — release build signed and tested on real device
- [ ] iOS — TestFlight build uploaded (if Apple Developer account active)
- [ ] App name: "BuzzPay"
- [ ] App icon and splash screen set
- [ ] Deep linking configured (payment return URL)
- [ ] Test install from fresh phone (no dev environment)

---

### Day 43–44 (Sept 13–14): Launch Materials

**Agent sales script:**
```
"Hi, we're BuzzPay — we bring university students near [campus] directly 
to your business. Students pre-pay in the app and show a QR code. 
No POS terminal needed, no cash handling. You scan their code and it's done.
We put a sticker on your counter. Here's a 60-second demo..."
```

**Merchant onboarding form (Google Form or paper):**
- Business name + owner name
- Phone number + WhatsApp number
- Business category
- Address / stall number / landmark
- Bank account details (for weekly payouts)
- Opening and closing hours
- Signature + date (consent to terms)

**WhatsApp templates (to register with Termii or WhatsApp Business API):**
```
Welcome: "Welcome to BuzzPay, {name}! Your merchant account is ready. 
Download the scanner at: [link]"

Payment alert: "New payment! {student} paid ₦{amount} for {deal}. 
Show your scanner to redeem."

Payout: "Your BuzzPay payout of ₦{amount} has been sent to your account. 
Ref: {reference}"
```

---

# Phase 2: Polish + Pre-Launch (Sept 15–30)

**Goal:** Get 10+ merchants onboarded, app stable, ready for public launch.

---

## Week 7 (Sept 15–21) — First Merchants

### Daily Founder Tasks
- [ ] Visit 3–5 merchants per day personally (first merchants need high-touch)
- [ ] Complete merchant form on spot, create account same day
- [ ] Place QR sticker, demo the scanner to merchant
- [ ] Follow up next day: "Did any students scan yet?"
- [ ] Track in spreadsheet: date, name, category, zone, first transaction date

### Product (Daily)
- [ ] Monitor Sentry every morning — fix critical errors same day
- [ ] Monitor payment success rate (target > 90%)
- [ ] Check uptime (UptimeRobot dashboard)
- [ ] Fix bugs from real usage, not hypothetical edge cases

### Targets (End of Week 7)
| Metric | Target |
|--------|--------|
| Merchants onboarded | 10+ |
| Beta users (invited) | 30+ |
| Transactions completed | 20+ |
| Payment success rate | > 90% |

---

## Week 8 (Sept 22–30) — Beta User Testing

### Beta Program
- Invite 50–100 students from your personal network
- Give each ₦500 BuzzPay credit (admin-applied discount on first deal)
- Ask them to complete full flow and report issues
- Collect feedback via short Google Form (3 questions: What worked? What was confusing? What's missing?)

### Daily Tasks
- [ ] Monitor beta user transactions in admin dashboard
- [ ] Call/WhatsApp 5 beta users daily — ask open questions
- [ ] Log every complaint, no matter how small
- [ ] Fix anything that makes users drop off before paying

### Pre-Launch Checklist (Complete by Sept 30)
**Technical:**
- [ ] Production Paystack live keys set in Railway
- [ ] Paystack webhook URL registered and verified (live mode)
- [ ] All env vars set in Railway production
- [ ] `GET /api/health` → 200 on production
- [ ] Full E2E test on production (not staging) with real ₦50 transaction
- [ ] Sentry receiving events from production
- [ ] UptimeRobot monitoring production API
- [ ] Mobile app build works on real Android + iPhone

**Business:**
- [ ] 10+ merchants onboarded, QR stickers placed
- [ ] Support WhatsApp number active and monitored
- [ ] Refund process documented (what happens if payment fails or voucher can't be redeemed)
- [ ] Merchant payout schedule communicated: every Friday
- [ ] Termii sender ID "BuzzPay" approved

---

# Phase 3: Soft Launch (Oct 1–31)

**Goal:** First real public users, daily transactions, feedback loop.

---

## Week 9 (Oct 1–7) — Public Launch

### Launch Day (Oct 1)

**8am:** Final staging check, confirm production is green  
**9am:** WhatsApp launch blast to all lists  
**10am:** Post on Instagram + TikTok  
**11am:** Agents start visiting stores (drop flyers, remind merchants)  
**1pm:** Check metrics — any errors or payment failures?  
**4pm:** Follow up with early users on WhatsApp  
**7pm:** Evening metrics review  
**9pm:** Fix any critical bugs found today  

### Launch WhatsApp Blast
```
🎉 BuzzPay is officially live for [CAMPUS] students!

Get exclusive deals at stores near campus.
✅ Food from ₦500
✅ Drinks from ₦300
✅ Pay in-app, redeem with QR code

First 100 students → ₦300 cashback on first purchase.

Download: [link]
```

### Channels to Blast
- Class WhatsApp groups (approach class reps the day before)
- Student union groups
- Hostel groups
- Personal contacts at target campus

### Daily Targets (Week 9)
| Metric | Daily Target |
|--------|-------------|
| New signups | 20+ |
| Verified students | 10+ |
| Transactions | 10+ |
| Active merchants | 15+ |

---

## Week 10 (Oct 8–14) — Fix + Grow

### Product (Daily)
- [ ] Review all Sentry errors every morning
- [ ] Fix critical bugs same day — ship hotfix to production
- [ ] Track payment failure reasons (card declined, network error, timeout)
- [ ] Check voucher redemption rate — if < 50%, investigate why

### Growth
- [ ] Agent visits: 5–10 stores/day
- [ ] Follow up with merchants who haven't had a scan yet
- [ ] Post 3× per week on Instagram: deal highlights, vendor features
- [ ] Run first "Deal of the Day" push notification

### Daily Targets (Week 10)
| Metric | Daily Target |
|--------|-------------|
| New signups | 30+ |
| Transactions | 20+ |
| New merchants | 3+ |

---

## Week 11 (Oct 15–21) — Ambassador Program Launch

### Recruitment
- DM active student Instagram accounts (200+ followers, student at campus)
- Post in student Facebook groups
- Ask existing happy users to refer friends

### Ambassador Package
- ₦500 per verified referral (user who completes first transaction)
- Top ambassador monthly bonus: ₦5,000
- BuzzPay branded cap or hoodie
- Private ambassador WhatsApp group

### Ambassador Weekly Task
- Post 3× about BuzzPay deals (stories or reels)
- Bring minimum 10 new verified users/month
- Weekly report: users referred, content posted

### Targets (End of Oct)
| Metric | Target |
|--------|--------|
| Total merchants | 50+ |
| Total registered users | 200+ |
| Verified students | 120+ |
| Total transactions | 400+ |
| Total volume | ₦300,000+ |
| Daily active users | 30+ |
| Ambassadors signed | 5–10 |

---

## Week 12 (Oct 22–31) — Cashback Campaign + Retention

### Cashback Mechanic
- First 300 users to complete a transaction get ₦200 cashback
- Cashback added as wallet credit (usable on next purchase)
- One per verified student account (prevent fraud)
- Campaign budget: 300 users × ₦200 = ₦60,000

### Retention Push Notifications
- Day 3 after signup (no transaction): "3 stores near you have deals this week"
- Day 7 after last transaction: "You haven't paid with BuzzPay in a week — here's a deal"
- After 3rd loyalty stamp: "You're 2 stamps away from a free [meal] at [vendor]!"

---

# Phase 4: Growth (Nov 1–30)

**Goal:** Build momentum. New users coming in daily through referrals and word of mouth.

---

## Week 13 (Nov 1–7) — Referral System Build

### Technical Implementation

**Schema addition:**
```sql
-- Add to User model in Prisma schema
referralCode    String  @unique @default(cuid())
referredById    String?
referralEarned  Int     @default(0)  -- kobo
```

**API endpoints:**
- `GET /api/users/me/referral` — get own referral code + stats
- `POST /api/auth/signup` — accept optional `referralCode`
- Reward trigger: first `Payment.status = SUCCESS` for referred user

**Reward:** ₦200 to referrer + ₦100 to referee (as wallet credit)  

**UI:**
- "Invite Friends" card on profile screen
- Shows referral link/code + count of successful referrals + total earned
- Native share sheet on tap

### Daily Targets (Week 13)
| Metric | Daily Target |
|--------|-------------|
| New signups | 40+ |
| Referral conversions | 10+ |
| Transactions | 30+ |

---

## Week 14 (Nov 8–14) — Merchant Expansion

### Expand Agent Team (target: 4–5 agents)

**New zones:**
- Agent A: UNILAG main campus + Akoka
- Agent B: YABATECH + Yaba area
- Agent C: LASU (Ojo)
- Agent D: Satellite town / Amuwo (student residential areas)

**Agent daily commitment:** 8–10 merchant visits, 2–3 onboarding closures  
**Agent pay:** ₦3,000/day base + ₦500 bonus per merchant with first transaction in 7 days

**Remote onboarding (distant campuses):**
1. Video call demo (10 min)
2. WhatsApp form fill
3. Mail QR sticker via courier (₦800)
4. Follow-up call 3 days after sticker arrives

---

## Week 15 (Nov 15–21) — Product Improvements

### Based on user feedback collected since launch:

- [ ] Store hours indicator on deal card ("Open now" green dot / "Closed" grey)
- [ ] Deal expiry countdown: "Expires in 2 days"
- [ ] Share deal feature: native share → sends app link with deal preview
- [ ] Vendor rating: 1–5 stars after redemption (student rates vendor)
- [ ] Better search: filter by price range, distance, rating
- [ ] Student wallet balance visible on home screen

---

## Week 16 (Nov 22–30) — Push Notification Optimization

### Notification Sequences

**Onboarding sequence:**
- Day 1 (signup, no transaction): "Browse deals near UNILAG — 50+ student offers"
- Day 3 (still no transaction): "₦300 cashback on your first BuzzPay purchase"
- Day 7 (still no transaction): "A deal at [nearest vendor] expires tomorrow"

**Re-engagement sequence:**
- 7 days since last transaction: "Check what's new near campus"
- 14 days since last transaction: "Your loyalty stamps at [vendor] expire soon"
- 30 days since last transaction: "We miss you — here's 10% off your next deal"

**Event-based:**
- Payment success: "₦X paid for [deal]. Show QR at [vendor] to redeem."
- Voucher expiring soon: "Your [deal] voucher expires in 24 hours. Redeem now!"
- Loyalty milestone: "5 stamps collected! Claim your free [reward] at [vendor]."
- New deal from saved vendor: "[Vendor] just added a new deal!"

### End of Phase 4 Targets
| Metric | Target (Nov 30) |
|--------|-----------------|
| Total merchants | 150+ |
| Total registered users | 800+ |
| Verified students | 500+ |
| Monthly transactions | 1,000+ |
| Monthly volume | ₦2,000,000+ |
| Daily active users | 80+ |
| D30 retention | > 25% |
| Payment success rate | > 96% |

---

# Phase 5: Scale + Monetize (Dec 1–31)

**Goal:** Sustainable revenue. BuzzPay pays for itself and starts generating profit.

---

## Week 17 (Dec 1–7) — Transaction Fee Activation

### Platform Fee (1%)

**Implementation:**
```typescript
// paymentService.ts
const PLATFORM_FEE_RATE = 0.01
const platformFee = Math.round(amount * PLATFORM_FEE_RATE)
const vendorAmount = amount - commission - platformFee
```

**Communication (2 weeks before activating):**
- Email all merchants: "Small platform fee activating Dec 1"
- Frame it as: "Less than half what POS charges"
- Highlight what they get: student traffic, no cash handling, weekly payouts

---

## Week 18 (Dec 8–14) — Merchant Promotions (Paid Boosts)

### Featured Deal Product

**Pricing:**
| Placement | Duration | Price |
|-----------|----------|-------|
| Home screen top | 7 days | ₦5,000 |
| Category page top | 7 days | ₦2,000 |
| Flash deal (24hr urgency) | 1 day | ₦1,500 |

**Admin activates boost:** set `Deal.isFeatured = true` + `Deal.featuredSection` label  

**Sales approach:** Call top 20 merchants by redemption count, offer first boost at 50% off (₦2,500 instead of ₦5,000).

**Revenue projection:** 15 boosts/month × avg ₦3,000 = ₦45,000/month

---

## Week 19 (Dec 15–21) — Identify Top Performers

### Data-Driven Decisions

**Rank merchants by:**
1. Total redemption count (this month)
2. Transaction volume (₦)
3. Voucher redemption rate (redeemed ÷ purchased)
4. Student rating (average stars)

**Double down on:**
- Top 10 merchants → feature them prominently
- Top-performing campus zones → send more agents there
- Top deal categories → create more deals in those categories

**Wind down:**
- Merchants with 0 transactions in 30 days → call them, find out why
- Deals with < 5% conversion (viewed but not purchased) → edit price/image/description

---

## Week 20 (Dec 22–31) — Year-End Campaign

### Semester End Deals

University students are leaving campus for Christmas break (final exam period is usually Nov–Dec).

**Campaign: "Last Deals Before Break"**
- 10 flash deals running simultaneously (24-hour each)
- Urgency: "Ends tonight at midnight", "Only 20 left"
- Push notification to all verified students daily

**Post-break retention:**
- "We're ready for second semester" push in January
- Merchant onboarding for January intake (new 100L students)

### End of Phase 5 Targets (Dec 31)
| Metric | Target |
|--------|--------|
| Total merchants | 300+ |
| Total registered users | 3,000+ |
| Verified students | 1,500+ |
| Monthly transactions | 2,500+ |
| Monthly volume | ₦5,000,000+ |
| Daily active users | 200+ |
| Monthly platform revenue | ₦150,000+ |
| D30 retention | > 30% |
| Repeat purchase rate | > 35% |

---

# Team Structure

## Core Team

| Role | Focus | Key Responsibility |
|------|-------|--------------------|
| Founder (You) | Backend / Product / Growth | Build → bugs → merchants → metrics |
| Mobile Dev | Flutter app | Features → bug fixes → app store release |
| Designer | UI/UX + Marketing | Screens → QR stickers → social content |

## Field Team (Agents)

| Phase | Agents | Zones |
|-------|--------|-------|
| Phase 2 (Sept–Oct) | 1–2 | UNILAG + YABATECH |
| Phase 3 (Nov) | 3–5 | Add LASU + residential areas |
| Phase 4–5 (Dec) | 5–8 | All campuses + remote |

**Agent management:**
- WhatsApp check-in by 9am daily
- Evening report by 6pm: stores visited, onboarded, issues
- Sunday team call: performance vs. targets
- Performance bonus: ₦500 per merchant with first transaction within 7 days

## Support

| Channel | Hours | SLA |
|---------|-------|-----|
| WhatsApp +234 xxx | Mon–Sat, 8am–9pm | Reply within 2 hours |
| Payment disputes | Escalate to founder | Resolve within 24 hours |
| Refunds | Admin dashboard | Process within 48 hours |

---

# Financial Plan

## Budget Allocation

| Month | Total | Growth (40%) | Product (30%) | Ops (20%) | Buffer (10%) |
|-------|-------|-------------|---------------|-----------|--------------|
| Aug | ₦350,000 | ₦140,000 | ₦105,000 | ₦70,000 | ₦35,000 |
| Sept | ₦350,000 | ₦140,000 | ₦105,000 | ₦70,000 | ₦35,000 |
| Oct | ₦500,000 | ₦200,000 | ₦150,000 | ₦100,000 | ₦50,000 |
| Nov | ₦850,000 | ₦340,000 | ₦255,000 | ₦170,000 | ₦85,000 |
| Dec | ₦1,100,000 | ₦440,000 | ₦330,000 | ₦220,000 | ₦110,000 |

## Monthly Infrastructure Cost

| Service | Cost/Month |
|---------|-----------|
| Railway API (Starter) | ~₦8,000 ($5) |
| Railway PostgreSQL | ~₦16,000 ($10) |
| Vercel (Hobby) | Free |
| Supabase (Free) | Free |
| Cloudinary (Free) | Free |
| Termii SMS (~500 OTPs) | ~₦2,000 |
| Sentry (Free) | Free |
| UptimeRobot (Free) | Free |
| Domain (annual ÷ 12) | ~₦300 |
| **Total** | **~₦26,300/mo** |

## Revenue Projection

| Stream | Unit Economics | Oct | Nov | Dec |
|--------|---------------|-----|-----|-----|
| Commission (10% avg) | ₦500 deal × 10% = ₦50/tx | ₦20,000 | ₦50,000 | ₦125,000 |
| Platform fee (1%) | ₦500 × 1% = ₦5/tx | ₦2,000 | ₦5,000 | ₦12,500 |
| Featured boosts | ₦3,000 avg/slot | ₦15,000 | ₦30,000 | ₦45,000 |
| **Total MRR** | | **₦37,000** | **₦85,000** | **₦182,500** |

---

# Daily Metrics Dashboard

Track every day. No exceptions.

## Morning Review (9am)
- New signups yesterday
- Verified students yesterday
- Transactions count + volume yesterday
- Payment failure rate yesterday
- New merchants yesterday
- API error rate (Sentry)
- Uptime status (UptimeRobot)

## Evening Review (9pm)
- Update metrics spreadsheet
- Flag any metric below target with reason
- Note today's top-performing deal and merchant
- Set tomorrow's 3 priorities

## Weekly Review (Sunday)
- Week-over-week growth for each metric
- Top 5 merchants by transaction volume
- Top 5 deals by redemption count
- Conversion funnel: signups → verified → first purchase → repeat purchase
- Bugs opened vs. closed this week
- Agent performance vs. targets

## Monthly Review (Last day of month)
- Month-over-month growth
- Revenue vs. projection
- Budget spent vs. allocated
- Top 3 product improvements shipped
- Top 3 learnings from real user conversations
- Next month's priorities

---

# Metrics Milestones

| Metric | Sept 30 | Oct 31 | Nov 30 | Dec 31 |
|--------|---------|--------|--------|--------|
| Total users | 50 | 200 | 800 | 3,000 |
| Verified students | 30 | 120 | 500 | 1,500 |
| Total merchants | 10 | 50 | 150 | 300 |
| Daily transactions | 5 | 15 | 40 | 100 |
| Daily volume ₦ | ₦10,000 | ₦50,000 | ₦150,000 | ₦500,000 |
| Payment success rate | >90% | >93% | >95% | >97% |
| Voucher redemption rate | >55% | >60% | >65% | >70% |
| D7 retention | — | >15% | >22% | >30% |

---

# Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Paystack payment failures | Medium | High | Retry logic + webhook fallback verify |
| QR code scan fails | Medium | High | Manual code entry fallback |
| Agent no-shows | High | Medium | 2 backup agents on standby |
| Student verification backlog | High | Medium | 24hr SLA, admin reviews daily |
| Railway downtime | Low | High | Health checks + auto-restart + UptimeRobot alerts |
| DB connection pool exhausted | Low | High | Set `connection_limit` in DATABASE_URL |
| Voucher expiry cron fails | Medium | Medium | Monitor cron + manual expiry endpoint |
| Paystack webhook missed | Low | High | Verify endpoint fallback on app open |
| Student submits fake ID | High | Medium | Admin manually reviews each ID |
| Merchant ignores scanner | High | Medium | On-site demo + daily follow-up calls |
| Scope creep killing schedule | High | High | Feature freeze after Week 1 |

---

# Code Quality Rules

- Never push to production without testing on staging first
- Never skip Paystack webhook signature verification
- Never hardcode secrets — all secrets in env vars
- `db:push` is banned on production — always use `db:migrate`
- Every payment action must be idempotent (safe to run twice)
- DB stock decrements inside transactions (no race conditions)
- All user inputs validated with Zod before hitting the DB
- Signed URLs for private files (student IDs) — never public URLs

---

# Non-Negotiables

## Daily (No Skip Days)
- Talk to at least 5 users (WhatsApp, in-person, or reviews)
- Check metrics morning + evening
- Fix critical bugs same day
- Respond to support messages within 2 hours
- Read agent reports and respond

## Weekly
- Visit merchants in person (minimum 3)
- Clear Sentry error backlog
- Ship at least one meaningful product update
- Sunday team call
- Financial tracking: actual spend vs. budget

---

# Execution Truth

```
Build right → Ship fast → Talk to users → Fix same day → Repeat.
```

If you do this every day: you will get traction.  
If you skip days: it will fail.

Consistency beats strategy. A working app with 10 real users beats a perfect app with 0 users.

---

*Timeline: Aug 1 – Dec 31, 2026*  
*Owner: Godfred Boakye*  
*Last updated: Aug 1, 2026*
