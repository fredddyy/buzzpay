# PRD — BuzzPay: Student Discount & Access Platform (MVP)

# 1. Product Overview

## Product Name

BuzzPay

## Product Vision

A mobile-first platform that verifies students once and gives them access to exclusive student-priced deals, subscriptions, food offers, and lifestyle discounts in one place.

The platform allows students to:

* Discover student-only deals
* Pay directly inside the app
* Redeem offers instantly using QR vouchers or verification codes

The platform allows vendors to:

* Attract more students
* Fill low-traffic hours
* Receive prepaid orders
* Track redemptions and payouts

---

# 2. Problem Statement

Student discounts already exist, but:

* They are fragmented across different platforms
* Many students do not know where to find them
* Redemption is inconsistent
* Vendors lack a simple system for offering student pricing
* Existing student discount platforms focus mainly on global digital brands rather than local campus ecosystems

Students in Nigeria especially spend heavily on:

* Food
* Transport
* Data
* Entertainment
* Everyday essentials

But there is no unified mobile platform where verified students can:

* Access local discounts
* Pay instantly
* Redeem seamlessly

---

# 3. Target Users

## Primary Users

### University Students

Age:

* 16–28

Locations:

* Universities and polytechnics in Nigeria

Behaviors:

* Frequent food purchases
* High mobile usage
* Price-sensitive spending habits
* Strong social sharing behavior

Initial Campus Focus:

* UNILAG
* YABATECH
* LASU
* FUTA

---

## Secondary Users

### Vendors

Examples:

* Restaurants
* Cafes
* Fast food spots
* Mini marts
* Game centers
* Lifestyle businesses near campuses

Pain Points:

* Slow sales periods
* Student acquisition cost
* Low visibility among students

---

# 4. Core Value Proposition

## For Students

"Pay less because you're a student."

Students can:

* Access verified student pricing
* Discover nearby discounts
* Pay instantly
* Redeem quickly
* Save money consistently

---

## For Vendors

"Bring more students during low-traffic hours."

Vendors can:

* Generate incremental revenue
* Increase visibility
* Receive prepaid purchases
* Attract repeat customers

---

# 5. Product Scope (MVP)

The MVP focuses on:

* Student verification
* Deal discovery
* In-app payments
* Voucher generation
* QR redemption
* Vendor settlement

The MVP will NOT initially include:

* Full logistics/delivery network
* Wallet system
* AI verification
* Social features
* Vendor mobile apps
* Advanced analytics

---

# 6. MVP Features

## 6.1 Student Authentication

### Features

* Email signup/login
* Phone number verification
* Password authentication

### Inputs

* Name
* Email
* Phone number
* Password

---

## 6.2 Student Verification

### Verification Methods

#### Method 1 — Student ID Upload

Students upload:

* Student ID card
  OR
* Admission letter

Verification initially handled manually through admin dashboard.

#### Method 2 — School Email Verification

Supported domains:

* .edu domains
* university domains

OTP verification required.

---

## 6.3 Deals Feed

### Categories

* Food
* Drinks
* Subscriptions
* Transport
* Shopping
* Lifestyle

### Deal Card Includes

* Deal image
* Vendor name
* Original price
* Student price
* Amount saved
* CTA button

---

## 6.4 Deal Details Page

### Content

* Vendor info
* Deal description
* Terms & conditions
* Redemption instructions
* Deal validity

### CTA

* Purchase Deal

---

## 6.5 Payment System

### Payment Provider

* Paystack

### Supported Payments

* Card
* Bank transfer
* USSD

### Flow

1. Student selects deal
2. Student pays
3. System generates voucher
4. Student receives redemption QR/code

---

## 6.6 Voucher System

### Voucher Structure

Each voucher includes:

* Unique voucher ID
* QR code
* Expiry timestamp
* Deal metadata
* Redemption status

### Voucher Statuses

* Active
* Redeemed
* Expired

---

## 6.7 Redemption System

### Smartphone Vendors

Use web-based QR scanner.

Vendor flow:

1. Open scan link
2. Scan QR
3. Validate voucher
4. Confirm redemption

### Non-Smartphone Vendors

Use daily rotating verification code.

---

## 6.8 Purchase History

Students can view:

* Active vouchers
* Previous purchases
* Expired vouchers

---

## 6.9 Admin Dashboard

### Admin Functions

* Approve students
* Reject students
* Create/edit deals
* Manage vendors
* View transactions
* View redemptions
* Track payouts

---

# 7. User Flows

## 7.1 Student Purchase Flow

1. Download app
2. Create account
3. Verify student status
4. Browse deals
5. Select deal
6. Make payment
7. Receive QR voucher
8. Redeem at vendor location

---

## 7.2 Vendor Redemption Flow

### QR Vendor

1. Open scanner page
2. Scan QR
3. Confirm validity
4. Redeem voucher

### Low-Tech Vendor

1. Student presents code
2. Vendor checks daily code
3. Vendor serves student
4. Redemption manually updated

---

# 8. Anti-Fraud System

## Core Protection Rules

### 1. One-Time Voucher Usage

Each voucher can only be redeemed once.

---

### 2. Voucher Expiry

Default expiry:

* 24–48 hours

---

### 3. Dynamic QR Validation

Server-side validation required.

---

### 4. Redemption Confirmation

Only vendors can confirm redemption.

---

### 5. Usage Limits

Limits per:

* User
* Deal
* Day

---

### 6. Vendor Settlement Rules

Vendors only paid for redeemed vouchers.

---

# 9. Vendor System

## Vendor Benefits

* Increased traffic
* Exposure to students
* Prepaid purchases
* Better low-hour utilization

---

## Vendor Offer Structures

### Time-Based Deals

Example:

* Valid only from 2PM–5PM

### Limited Quantity Deals

Example:

* First 20 vouchers daily

### Bundle Deals

Example:

* Free drink with meal

### First-Time User Deals

Example:

* Discount for first purchase only

---

# 10. Monetization

## Revenue Streams

### 1. Transaction Commission

Platform takes:

* Flat fee
  OR
* Percentage per transaction

Target:

* 5–15%

---

### 2. Featured Listings

Vendors pay for:

* Homepage placement
* Sponsored visibility

---

### 3. Premium Student Plans (Future)

Additional student perks.

---

# 11. Delivery Strategy

## MVP Decision

Delivery is optional and vendor-managed.

### Flow

* Student selects delivery or pickup
* Vendor handles delivery independently

### Platform Role

* Coordinate order
* Not manage logistics

---

# 12. Design System

## Design Style

Soft Minimalist Design System
(Hybrid Neumorphism)

## Design Philosophy — Transaction UI, Not Discovery UI

BuzzPay is NOT a brand browsing/discovery platform like UNiDAYS.
It is a transaction platform where every screen drives toward: Tap -> Pay -> Use.

### Key Design Principles

1. **Deal-first, not brand-first** — Each card shows what you get + how much you save
2. **Strong purchase CTAs** — "Pay N1,500", "Get Deal Now" (never "View offer")
3. **Checkout layer** — Deal summary, price breakdown, payment method, "Confirm & Pay"
4. **Post-payment voucher screen** — QR code center, countdown timer, "Show to vendor"
5. **Urgency UX** — "Expires in 2 hours", "Only 10 left today", "Valid till 5PM"
6. **Decision-oriented home feed** — "Deals Near You (Now)" > "Hot Right Now" > Categories
7. **My Vouchers as core tab** — Active/Used/Expired, making the app a utility not a marketplace

The UI should feel like a food delivery or ticket booking app — fast decisions, clear pricing, instant action.

---

## Color Palette

Primary:

* #7B61FF

Background:

* #F8F9FF

Card:

* #FFFFFF

Text:

* #1A1A1A

Secondary Text:

* #6B7280

Success:

* #22C55E

Danger:

* #EF4444

---

## Typography

Fonts:

* Poppins
* Manrope

---

## UI Characteristics

* Large rounded corners
* Soft shadows
* Clean spacing
* Minimal clutter
* Fintech-style interactions

---

# 13. MVP Screens

## Student App (Flutter)

1. Splash Screen
2. Signup/Login
3. Verification Screen
4. Home Feed
5. Deal Details
6. Checkout
7. Voucher Screen (QR + countdown)
8. My Vouchers (Active/Used/Expired tabs)
9. Purchase History
10. Profile

---

## Vendor Interface (Web)

1. QR Scanner Page
2. Redemption Confirmation Page

---

## Admin Dashboard (Web)

1. Student Verification Queue
2. Deals Management
3. Vendor Management
4. Transactions
5. Payout Tracking

---

# 14. Technical Architecture

## Mobile Frontend

Flutter (Dart)

State Management: Riverpod
Navigation: GoRouter
HTTP: Dio
Local Storage: SharedPreferences + Flutter Secure Storage

---

## Backend

Node.js + Express (TypeScript)

Architecture: Routes -> Controllers -> Services -> Repositories
ORM: Prisma
Validation: Zod

---

## Database

PostgreSQL

All prices stored in kobo (1 NGN = 100 kobo) to avoid floating-point errors.

---

## Payments

Paystack

* Paystack Inline / WebView for mobile
* Webhooks as source of truth for payment confirmation
* Supported: Card, Bank Transfer, USSD

---

## Image Storage

Cloudinary

---

## Hosting

* Railway (Backend + PostgreSQL)
* Vercel (Admin/Vendor Web)

---

# 15. Initial Launch Strategy

## Phase 1 — Single Campus Validation

Launch in one ecosystem only.

Suggested locations:

* UNILAG
* YABATECH
* LASU

---

## Initial Vendor Targets

Focus on:

* Food vendors
* Cafes
* Small restaurants
* Mini marts
* Lifestyle businesses

---

## Initial User Acquisition

Methods:

* Campus ambassadors
* WhatsApp groups
* Flyers
* Student influencers
* Referral rewards

---

# 16. Success Metrics

## Primary Metrics

* Verified students
* Number of transactions
* Redemption rate
* Repeat purchases
* Vendor retention

---

## MVP Validation Metrics

Target after first 30–60 days:

* 500+ verified students
* 10+ active vendors
* 200+ transactions
* 30% repeat purchase rate

---

# 17. Future Expansion

## Potential Future Features

* Wallet system
* Subscription integrations
* BNPL/student financing
* Event tickets
* Transport partnerships
* Campus marketplace
* Internship/job offers
* Vendor app
* AI fraud detection
* POS integrations

---

# 18. Key Risks

## 1. Fraud

Mitigation:

* Dynamic QR
* One-time vouchers
* Expiry system

---

## 2. Vendor Adoption

Mitigation:

* Focus on slow-hour deals
* Prepaid transactions
* Small local vendors first

---

## 3. Student Retention

Mitigation:

* High-frequency categories
* Daily-use deals
* Personalized offers

---

# 19. Product Positioning

## Core Positioning

"The platform where students pay less for everything they already buy."

---

## Differentiation

Unlike traditional student discount platforms:

* We process payments
* We support local vendors
* We enable instant redemption
* We focus on campus ecosystems
* We combine verification + payments + redemption

---

# 20. Final MVP Goal

The MVP succeeds if students:

* Verify successfully
* Purchase deals consistently
* Redeem without friction
* Return to use the app again

The goal is to validate:

* Student demand
* Vendor demand
* Transaction behavior
* Repeat usage

before scaling nationally.

---

# 21. Product Roadmap

## Phase 1: "IT WORKS" (Launch MVP) — Week 0-2

Goal: First 50-200 real transactions

* Core flow: Browse → Pay → Voucher → Redeem
* Scarcity + urgency indicators
* Campus-based feed
* Basic push notifications

## Phase 2: "GET HOOKED" (Retention) — Week 3-6

Goal: Make users come back within 2-3 days

* Loyalty Stickers: Buy 5 → Get 1 free
* Flash Deals: Time-window + limited quantity
* Social Proof: "12 people bought this today"
* Cashback: Small rewards (₦200 after purchase)

## Phase 3: "CONVENIENCE WINS" (Differentiation) — Month 2-3

Goal: Beat competitors

* Skip-the-Queue: Pay → Show → No waiting
* Pre-order: Select pickup time
* Exclusive BuzzPay-only deals

## Phase 4: "NETWORK EFFECTS" (Growth Engine) — Month 3+

Goal: Organic growth

* Group Ordering with split payment
* Gamification: Badges + challenges
* Referral System: Invite → earn credit

## Phase 5: "EXPANSION" (Scale)

* Delivery integration
* Multi-campus switching
* Advanced analytics
* Vendor tools + POS

## Priority Matrix

Highest ROI: Core flow → Scarcity → Loyalty → Skip queue
Medium: Cashback, Social proof
Later: Group ordering, Gamification, Delivery

## Execution Plan

* Week 1: Finish payments, test voucher + scanning
* Week 2: Launch on 1 campus, push 50-100 users
* Week 3: Add loyalty stickers + scarcity indicators
* Week 4-6: Add flash deals, improve notifications
* Month 2: Add skip-the-queue + pre-order

---

# 22. Discount & Pricing Model

## Core Concept

BuzzPay is a demand engine that sells controlled inventory — not a permanent discount app.

"Sell limited, time-bound discounted slots — not permanent cheap prices"

## Revenue Model: Margin Split

* User pays: ₦1,000
* Vendor receives: ₦800 (agreed payout)
* BuzzPay keeps: ₦200
* Minus Paystack fee (~₦115)
* Net profit: ~₦85 per transaction

## Deal Types

### 1. Time-Based Deals (Primary)
* "Valid 1PM–3PM only"
* Solves vendor idle-hour problem
* Creates urgency

### 2. Quantity-Limited Deals
* "Only 15 plates available"
* Creates scarcity + fairness
* Predictable for vendors

### 3. First-Timer Deals
* "₦500 off your first order"
* BuzzPay subsidizes acquisition cost

## Pricing Rules

* Discount depth: 20%–40% sweet spot
* Target margin: ₦100–₦300 per transaction
* Never always-on — scarcity = value

## Vendor Pitch

"You control how many discounted meals you sell and when. We fill your slow hours with guaranteed paying customers."

## UX Signals

* 🔥 "12 left" (quantity urgency)
* ⏳ "Ends in 45 mins" (time urgency)
* 💸 "Save ₦500" (value clarity)

---

# 23. Loyalty System

## Model: Buy 5 → Get 1 Free

Per-vendor loyalty cards. Each purchase at a vendor earns 1 stamp. At 5 stamps, student unlocks a free meal.

## UI Placement

1. Deal Cards: "⭐ Earn 1 stamp" + compact sticker row (3/5)
2. Vendor Profile: Full loyalty card with progress + "Claim Free Meal" button
3. Post-Redemption: Sticker earned popup with progress animation
4. Profile Page: "My Rewards" section showing all vendor loyalty cards

## States

* No progress: [⬜⬜⬜⬜⬜] 0/5
* In progress: [⭐⭐⭐⬜⬜] 3/5
* Complete: [⭐⭐⭐⭐⭐] 5/5 → "🎁 Claim Free Meal"

## Psychology

* Visual progress triggers completion instinct
* Small wins create repeated behavior
* Clear reward provides motivation


---

# 24. Feature Checklist (Ship Priority)

## Student App

### MVP (Must Ship)
- [x] Phone/email login + JWT auth
- [x] Student verification (ID upload, school email OTP, admission letter)
- [x] Campus-based feed ("Hot in Akoka", "Trending at UNILAG")
- [x] Deal cards (image, price, discount, urgency badges, vendor link)
- [x] Deal detail screen (immersive hero, value card, stock bar, floating CTA)
- [x] Checkout screen (receipt card, savings highlight, payment flow)
- [x] QR voucher generation + manual code fallback
- [x] Voucher status (active/redeemed/expired)
- [x] Expiry countdown timer (live pulse animation)
- [x] Redemption bottom sheet (SVG ticket, QR, manual code)
- [x] Vendor open/closed status (grayscale when closed)
- [x] Deal type system (time-window, quantity-limited, bundle, first-timer)
- [x] Vendor profile (immersive header, menu, follow, loyalty card)
- [x] Profile screen (3D avatar, stats, referral, settings)
- [x] Search overlay (live search, popular searches)
- [x] Verification gate (gradual escalation, lock on checkout)
- [ ] Paystack WebView integration (real payments)
- [ ] Push notifications (Firebase FCM)
- [ ] Splash / onboarding screens
- [ ] Forgot password flow

### Post-MVP (Retention)
- [x] Loyalty stickers (3D stars, progress tracking, reward claim)
- [x] Flash deals / Happy Hour (countdown, time-window)
- [x] Social proof ("200+ students bought")
- [ ] Cashback rewards
- [ ] Sticker earned popup after redemption
- [ ] Referral system (invite → earn credit)

### Scale
- [ ] Pre-order (pickup time selection)
- [ ] Skip-the-queue badge
- [ ] Group ordering + split payment
- [ ] Wallet / credits
- [ ] Multi-campus switching
- [ ] Dark mode

## Vendor Web App

### MVP (Must Ship)
- [x] Email/password login (role=VENDOR check)
- [x] Fullscreen QR scanner (html5-qrcode)
- [x] Valid/Invalid result states
- [x] Confirm redemption button
- [x] Today's redemption counter
- [ ] Manual code entry fallback
- [ ] Camera HTTPS for mobile browsers

### Post-MVP
- [x] Dashboard (today's stats, revenue, payout estimate)
- [x] Redemption history list
- [ ] Weekly/monthly totals
- [ ] Payout tracking

### Scale
- [ ] Pre-order notifications
- [ ] Order queue view
- [ ] Staff accounts
- [ ] Inventory sync

## Admin Dashboard

### MVP (Must Ship)
- [x] Admin login (role=ADMIN check)
- [x] Overview stats (8 metric cards + quick actions)
- [x] Student verification queue (approve/reject, ID preview)
- [x] Deals table (title, vendor, price, stock, status, pause/activate)
- [x] Vendor management (cards with hours, commission, enable/disable)
- [x] Transaction log (student, deal, amount, commission, status, reference)
- [x] Voucher tracking (code, student, deal, status, time left)
- [ ] Create/edit deal form
- [ ] Add vendor form
- [ ] Manual voucher redeem/invalidate

### Post-MVP
- [ ] Fraud flags (suspicious activity detection)
- [ ] Advanced analytics (conversion rate, repeat users, top vendors)
- [ ] Automated payouts (Paystack transfers)

### Scale
- [ ] Role-based permissions (Super Admin vs Ops)
- [ ] Vendor earnings dashboard
- [ ] Export reports (CSV)

## Cross-System (Critical)
- [x] Payment → Voucher flow (webhook creates voucher)
- [x] Voucher → Redemption (one-time use, vendor-specific)
- [x] Deal time + quantity enforcement
- [x] Anti-fraud (rate limiting, per-user limits, idempotent webhooks)
- [ ] Loyalty → Redemption triggers sticker → Reward creates free voucher

## Priority Stack

Tier 1 (Ship): Payments, Voucher system, QR redemption, Deal limits
Tier 2 (Addictive): Loyalty, Flash deals, Notifications
Tier 3 (Scale): Pre-order, Referrals, Group ordering

---

# Test Credentials

- Student: student@unilag.edu.ng / student123456
- Vendor: mama@buzzpay.ng / vendor123456
- Admin: admin@buzzpay.ng / admin123456