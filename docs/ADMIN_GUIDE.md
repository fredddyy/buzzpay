# BuzzPay Admin Guide

**URL:** `https://admin.buzzpay.ng` (or `localhost:3001/admin`)  
**Login:** Email + password (ADMIN role)

---

## Dashboard Overview

The admin dashboard at `/admin` shows:
- Total deals, active vendors, registered students
- Today's revenue and transactions
- Quick links to all management pages

---

## Managing Vendors

**Page:** `/admin/vendors`

### Add a Vendor
1. Click **"+ Add Vendor"**
2. Fill: business name, address, phone, email, password
3. Set commission rate (default 10%)
4. Set opening/closing hours (WAT timezone)
5. Save — vendor can now login at `/admin/login` with VENDOR role

### Vendor Settings
- **Toggle Active** — deactivates vendor and hides all their deals
- **Toggle Trending** — shows vendor in "Trending at UNILAG" section on Explore screen
- **QR Export** — generate printable QR sticker for the vendor's location

---

## Creating Deals

**Page:** `/admin/deals`

### Deal Types

#### 1. Regular Deal (always available)
Best for: all-day discounts, weekly specials

| Field | Value |
|-------|-------|
| Title | "Shawarma Special" |
| Vendor | Select vendor |
| Category | FOOD, DRINKS, SUBSCRIPTIONS, TRANSPORT, SHOPPING, LIFESTYLE |
| Original Price | Full price in Naira (e.g. 2000) |
| Student Price | Discounted price (e.g. 1500) |
| Total Quantity | How many available |
| Max Per User | Daily limit per student (e.g. 2) |
| Starts At | When deal becomes available |
| Expires At | When deal ends |
| dailyStart | **Leave empty** |
| dailyEnd | **Leave empty** |
| featuredSection | **Leave empty** |

**Result:** Shows in "All Deals" feed on home screen. Purchasable anytime.

---

#### 2. Happy Hour / Rush Deal (time-limited, live)
Best for: lunch rush, breakfast specials, evening deals

| Field | Value |
|-------|-------|
| All regular fields | Same as above |
| dailyStart | Start time in WAT (e.g. `12:00`) |
| dailyEnd | End time in WAT (e.g. `14:00`) |
| featuredSection | Group name (e.g. `Lunch Rush`) |

**Result:**
- **During 12:00-14:00 WAT** → Shows in "Lunch Rush" section with countdown timer. Purchasable.
- **Before 12:00** → Shows in "Dropping Soon" section. NOT purchasable (preview only).
- **After 14:00** → Hidden until next day (if recurring).
- **Never appears in "All Deals"** — time-window deals are separated.

---

#### 3. Grouped Dropping Soon Campaign (multi-vendor)
Best for: "Amala Rush" — same deal type from multiple vendors

**How to create:**
1. Create Deal A: Mama Nkechi → "Amala + Ewedu" → `featuredSection: "Amala Rush"`, `dailyStart: 18:00`, `dailyEnd: 20:00`
2. Create Deal B: ChillZone → "Amala Special" → `featuredSection: "Amala Rush"`, `dailyStart: 18:00`, `dailyEnd: 20:00`
3. Create Deal C: FreshEats → "Amala Platter" → `featuredSection: "Amala Rush"`, `dailyStart: 18:00`, `dailyEnd: 20:00`

**Key:** Same `featuredSection` name + same `dailyStart`/`dailyEnd` across all deals.

**Result:** Shows as a single grouped card in "Dropping Soon" with:
- Overlapping vendor avatars
- "3 stores · from ₦1,200"
- "Drops at 18:00" badge
- Tapping opens a bottom sheet listing all 3 deals

When 18:00 arrives → all 3 deals move to the "Amala Rush" Happy Hour section.

---

#### 4. Featured Deal (⭐)
Best for: highlighting the best deals

| Field | Value |
|-------|-------|
| All regular fields | Same as regular deal |
| isFeatured | ✅ Check the star |

**Result:** Shows in "Hot in Akoka" section on the Explore screen.

Can be combined with Happy Hour — a featured rush deal gets the star AND appears in the time-window section.

---

## Creating Campaigns

**Page:** `/admin/campaigns`

Campaigns are batch deal creators — create multiple deals across multiple vendors at once.

### How to Create a Campaign
1. Click **"+ New Campaign"**
2. Name it (e.g. "Monday Breakfast Rush")
3. Set `featuredSection` (e.g. "Breakfast Rush")
4. Set shared schedule: `dailyStart`, `dailyEnd`
5. Select vendors and create deals for each
6. **Publish** — all deals go live simultaneously

### Campaign vs. Individual Deals
- **Campaign:** Same schedule, same section name, multiple vendors. Created in batch.
- **Individual:** One deal, one vendor. Created on the Deals page.

Both produce the same result on the student app — the `featuredSection` name is what groups them.

---

## Managing Students

**Page:** `/admin/students`

### Verification Flow
1. Student signs up → status is `PENDING`
2. Student appears in the Students list
3. Admin reviews → clicks **Approve** or **Reject**
4. Student's app updates on next refresh

### Status Meanings
- **PENDING** — awaiting review
- **APPROVED** — can purchase deals
- **REJECTED** — cannot purchase, can resubmit

---

## Viewing Transactions

**Page:** `/admin/transactions`

Shows all payments:
- Student name, deal title (or "X items" for cart orders)
- Amount paid, commission earned, vendor payout
- Status: PENDING → SUCCESS or FAILED
- Paystack reference for disputes

---

## Viewing Vouchers

**Page:** `/admin/vouchers`

Shows all vouchers across all students:
- Status: ACTIVE, REDEEMED, EXPIRED
- Code, deal, student, vendor
- Redemption timestamp

---

## Vendor Dashboard

**URL:** `/dashboard` (login with vendor credentials)

Vendors see:
- Today's redemption count
- Today's revenue
- Today's payout (after commission)
- Recent redemptions list (live)

### Vendor Scanner

**URL:** `/scanner` (login with vendor credentials)

- **Camera scan:** Point at student's QR code
- **Manual entry:** Click "Enter Code" → type the 8-character voucher code
- Shows deal name, student name, amount → "Confirm Redemption"
- Rejects: wrong vendor, expired, already redeemed

---

## Section Visibility Rules

| Section | Where | Shows When |
|---------|-------|------------|
| All Deals | Home screen | Deal has NO `dailyStart` |
| Happy Hour | Home screen (top) | Deal has `dailyStart`/`dailyEnd` AND currently in time window |
| Dropping Soon | Home screen | Deal has `dailyStart`/`dailyEnd` AND time window hasn't started |
| Hot in Akoka | Explore screen | Deal has `isFeatured: true` |
| Trending Vendors | Explore screen | Vendor has `isTrending: true` |
| Collections | Explore screen | Deals grouped by tags |

### Important Rules
1. **Time-window deals NEVER appear in "All Deals"** — prevents duplicates
2. **Dropping Soon deals are NOT purchasable** — preview only
3. **Happy Hour deals ARE purchasable** — they're live
4. **Same `featuredSection` name = grouped together** — both in Happy Hour and Dropping Soon
5. **Expired deals auto-hide** — API filters `expiresAt > now`
6. **Sold out deals auto-hide** — API filters `remainingQty > 0`

---

## Quick Reference: Creating Common Campaigns

### "Lunch Rush" (12-2PM daily)
```
For each vendor:
  Title: [their lunch special]
  dailyStart: 12:00
  dailyEnd: 14:00
  featuredSection: Lunch Rush
  expiresAt: [end of week]
```

### "Friday Night Vibes" (7-10PM Fridays)
```
For each vendor:
  Title: [their evening deal]
  dailyStart: 19:00
  dailyEnd: 22:00
  featuredSection: Friday Night Vibes
  activeDays: [5]  (Friday only)
  expiresAt: [end of month]
```

### "Data Day" (all day, no time window)
```
  Title: MTN 1GB Data Bundle
  No dailyStart/dailyEnd
  isFeatured: true
  expiresAt: [end of month]
```
Shows in All Deals + Hot in Akoka (featured).
