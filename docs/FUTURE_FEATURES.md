# BuzzPay — Future Features Roadmap

**Last updated:** Aug 10, 2026  
**Purpose:** Document planned features beyond MVP with design decisions, flows, and anti-abuse strategies.

---

## 1. Group Buy (Target: Week 5-6, Sept)

### Overview
Students unlock a better price by getting friends to buy the same deal. Built-in virality — every group buy is a WhatsApp share.

### How It Works
1. Vendor creates group deal: "Shawarma ₦1,000 each (min 5 people)" — normal price ₦1,500
2. Student sees deal → taps "Join Group" → reserves a spot (no payment yet)
3. Student shares link to WhatsApp → friends tap link → join group
4. Progress bar: "4/5 joined — 1 more needed!"
5. Group fills → everyone gets charged simultaneously → 5 vouchers created
6. Each student redeems their voucher independently at the vendor
7. If group doesn't fill by deadline → everyone's spot released, no charge

### Key Rule
**No money moves until the group is full. Zero risk for students.**

### Each Person Gets Their Own Voucher
Group buy is a pricing unlock, not a shared order. Everyone pays individually, gets their own voucher, redeems independently.

### Anti-Scam / Anti-Cheat

| Risk | Solution |
|------|----------|
| Group doesn't fill | Nobody pays until full. Auto-cancel at deadline |
| Fake accounts filling group | Must be verified students. One phone = one slot |
| Same person buying all slots | Max 1 slot per student per group deal |
| Vendor doesn't honor group price | Voucher locks in group price. Vendor agreed when creating deal |
| Someone joins but doesn't redeem | Doesn't matter — vendor got paid. Their loss |
| Organizer scams friends | No organizer. BuzzPay manages the group. Students just join |

### Data Model (Prisma)
```prisma
model GroupDeal {
  id            String   @id @default(cuid())
  dealId        String
  deal          Deal     @relation(fields: [dealId], references: [id])
  minMembers    Int      // minimum to unlock group price
  maxMembers    Int      // cap
  groupPrice    Int      // kobo — price when group fills
  deadline      DateTime // auto-cancel if not full by this time
  status        String   @default("OPEN") // OPEN, FILLED, CANCELLED, EXPIRED
  createdAt     DateTime @default(now())

  members GroupDealMember[]
}

model GroupDealMember {
  id           String   @id @default(cuid())
  groupDealId  String
  groupDeal    GroupDeal @relation(fields: [groupDealId], references: [id])
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  joinedAt     DateTime @default(now())
  paymentId    String?  // set when group fills and payment is charged
  voucherId    String?  // set after payment succeeds

  @@unique([groupDealId, userId]) // one slot per student
}
```

### API Endpoints
- `POST /group-deals` — create group deal (admin/vendor)
- `POST /group-deals/:id/join` — student joins (reserves spot)
- `POST /group-deals/:id/leave` — student leaves before deadline
- `GET /group-deals/:id` — group details with member count, progress
- `GET /group-deals/active` — list open group deals for students
- Cron job: check deadline → cancel expired groups OR charge filled groups

### Mobile UI
- Group deal card: progress bar, member avatars, countdown, "Join" button
- Share sheet: WhatsApp deep link → friends tap → app opens → auto-join
- My Groups: list of joined groups with status
- Push notification: "1 more person needed!", "Group filled — you saved ₦500!"

### Admin UI
- Create group deal with min/max members, group price, deadline
- View active groups, member counts
- Cancel groups manually

### Priority: Week 5-6 (September)
**Why not now:** Needs payment holding logic, group state management, deep links. MVP must be stable first.

---

## 2. BuzzPay Wallet / Credits (Target: Phase 3-5, Oct-Dec)

### Overview
Students top up once, spend all week with instant one-tap purchases. No bank transfer wait for every transaction.

### Phased Approach

#### Phase 3 (Oct): BuzzPay Credits — Simple Store Credit
- Student tops up wallet via Paystack (₦2,000, ₦5,000, ₦10,000 presets)
- Balance shown on home screen
- "Pay with Balance" option at checkout — instant, no transfer wait
- Non-withdrawable — can only spend on BuzzPay deals
- Refunds go to wallet credit (instant) instead of bank reversal (3-5 days)
- Group buy failures → instant wallet credit

**Legally simpler:** Non-withdrawable store credit ≠ e-money. No CBN license needed.

#### Phase 5 (Dec): Full Wallet (if volume justifies)
- Partner with Flutterwave or OPay for licensed wallet infrastructure
- Withdrawable balance
- P2P transfers between students
- Auto top-up when balance drops below threshold
- Spend analytics: "You saved ₦12,000 this month"

### Data Model (Phase 3)
```prisma
model WalletTransaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // TOP_UP, PURCHASE, REFUND, GROUP_BUY_REFUND
  amount    Int      // kobo (positive for credit, negative for debit)
  balance   Int      // balance after this transaction
  reference String?  // Paystack reference for top-ups
  dealId    String?  // which deal was purchased
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

Add to User model:
```prisma
model User {
  // ... existing fields
  walletBalance Int @default(0) // kobo
}
```

### API Endpoints
- `POST /wallet/top-up` — initialize Paystack top-up
- `GET /wallet/balance` — current balance
- `GET /wallet/history` — transaction history
- `POST /wallet/pay` — pay for deal from balance (instant)
- Internal: `creditWallet(userId, amount, type)` — for refunds

### Checkout Flow with Wallet
1. Student taps "Pay ₦1,500"
2. If wallet balance ≥ ₦1,500 → "Pay with Balance" (instant) or "Pay with Transfer"
3. If wallet balance < ₦1,500 → "Top up ₦X and pay" or "Pay with Transfer"
4. Wallet payment = instant voucher, no waiting

### Why Wallet Matters for Group Buy
- Group fills → charge each member's wallet instantly (no bank transfer coordination)
- Group fails → credit back to wallet instantly (no Paystack refund wait)
- Makes group buy UX seamless

### Regulatory Notes (Nigeria)
- **Non-withdrawable store credit** (Phase 3): Legally simpler, no CBN license
- **Withdrawable wallet** (Phase 5): Requires partnership with licensed provider
- Consult a fintech lawyer before Phase 5

### Priority: Phase 3 for credits, Phase 5 for full wallet

---

## 3. WhatsApp Share (Target: This week)

### Already Built (partially)
- Share button on deal cards and deal detail screen
- Uses `share_plus` package
- Message: "🔥 [Deal] for ₦[price] (save ₦[savings]!) at [Vendor] — Grab it on BuzzPay! 📲 https://buzzpay.ng"

### Still Needed
- Share on voucher redemption: "I just saved ₦500 on Shawarma with BuzzPay!"
- Deep links: shared links open directly to the deal in the app
- Track shares → analytics (which deals get shared most)

---

## 4. Deal Notifications (Target: Phase 3, Oct)

### Push Notifications for Deals
- "New deal from Mama Nkechi!" — when vendor's deal goes live
- "Dropping in 30 minutes: Amala Rush!" — reminder for upcoming deals
- "Only 3 left: Shawarma Special!" — low stock urgency
- "Your favorite vendor has a new deal" — personalized based on purchase history

### Requires
- FCM already set up ✅
- User preferences: which vendors to follow, notification frequency
- Cron job: check upcoming deals, send reminders 30 min before

---

## 5. Referral System (Target: Phase 4, Nov)

### Overview
"Invite a friend, both get ₦200 credit."

### Flow
1. Student gets a unique referral code (auto-generated)
2. Shares code or link to friends
3. Friend signs up with code → friend gets ₦200 wallet credit
4. When friend makes first purchase → referrer gets ₦200 wallet credit
5. Cap: max 20 referrals per student (₦4,000 max earnings)

### Requires
- Wallet/credits system (Phase 3)
- `referralCode` and `referredById` fields on User model
- Referral tracking + payout logic

---

## 6. Student Spend History (Target: Phase 4, Nov)

### Overview
Monthly spend breakdown showing how much they've saved.

- "August: Spent ₦12,000, Saved ₦4,500 (27% off!)"
- Category breakdown: Food ₦8k, Drinks ₦2k, Transport ₦2k
- Favorite vendor: Mama Nkechi (8 purchases)
- Shareable savings card for social media

---

## 7. Multi-University Support (Target: Phase 5, Dec)

### Overview
Expand beyond UNILAG to other campuses.

- Campus selector on signup
- Deals filtered by campus
- Vendors tagged to a campus
- Admin can manage multiple campuses
- "UNILAG, Akoka" hardcoded → dynamic from user profile

### Requires
- `university` field already exists on Student model ✅
- Vendor → campus mapping
- Deal → campus filtering
- Campus-specific trending, featured sections

---

## Feature Priority Matrix

| Feature | Impact | Effort | Priority | Target |
|---------|--------|--------|----------|--------|
| WhatsApp Share | High (viral) | Low | NOW | This week |
| Group Buy | Very High (viral + volume) | High | Week 5-6 | Sept |
| BuzzPay Credits | High (UX + retention) | Medium | Phase 3 | Oct |
| Deal Notifications | Medium (engagement) | Low | Phase 3 | Oct |
| Referral System | High (growth) | Medium | Phase 4 | Nov |
| Spend History | Medium (retention) | Low | Phase 4 | Nov |
| Full Wallet | High (UX) | High | Phase 5 | Dec |
| Multi-University | Very High (scale) | High | Phase 5 | Dec |

---

## Dependencies

```
WhatsApp Share (now)
    └→ Deep Links (Phase 3)
        └→ Group Buy Share Links (Week 5-6)

BuzzPay Credits (Phase 3)
    └→ Group Buy Payment (Week 5-6)
    └→ Referral Rewards (Phase 4)
    └→ Full Wallet (Phase 5)

FCM Push (done ✅)
    └→ Deal Notifications (Phase 3)
    └→ Group Buy Notifications (Week 5-6)

Student Model (done ✅)
    └→ Multi-University (Phase 5)
```
