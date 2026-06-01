# BuzzPay — UI/UX User Flows

> For designers building screens and prototypes. Each flow describes the exact screens, states, actions, and transitions.

---

## Flow 1: Student Onboarding (First Launch)

```
Splash Screen (BuzzPay logo, 1.5s)
    │
    ▼
Onboarding (2-3 swipeable intro pages)
    │ [Skip] or [Get Started]
    ▼
Login Screen
    │ Enter phone number
    │ "We'll send a one-time code via SMS"
    ▼
OTP Screen
    │ 6-digit input, auto-verify on 6th digit
    │ Dev code shown in purple text
    │ Resend timer (30s countdown)
    ▼
┌─ Existing user? ──► Home Feed (skip signup)
│
└─ New user? ──► Signup Screen
                    │ Name + Campus dropdown (UNILAG, YABATECH, LASU, FUTA)
                    │ [Continue]
                    ▼
                Home Feed
```

**States to design:**
- Loading state (spinner on Continue button)
- Error state (red pill: "Failed to send code")
- OTP expired state
- Invalid code state

---


## Flow 2: Student Home Feed (Main Screen)

```
┌─────────────────────────────────────┐
│ Header: "BuzzPay" + Search icon     │
│ Subtitle: "Pay less because..."     │
│ Verify banner (if unverified)       │
├─────────────────────────────────────┤
│ Category Pills: All|Food|Drinks|... │
├─────────────────────────────────────┤
│ 🔥 Breakfast Rush [Live now]        │ ← Happy hour cards (PageView swipe)
│ ┌─────────────────────────┐         │    Countdown timer, stock, vendor logo
│ │ [Deal Card with image]  │         │    Grouped by featuredSection name
│ └─────────────────────────┘         │
├─────────────────────────────────────┤
│ ⏰ Dropping Soon [See all >]        │ ← Blurred image mini-cards
│ ┌──────┐ ┌──────┐ ┌──────┐         │    "Drops at 16:00" amber pill
│ │ blur │ │ blur │ │ blur │         │    Bell icon (🔔 → ✓ yellow)
│ └──────┘ └──────┘ └──────┘         │
├─────────────────────────────────────┤
│ Trending at UNILAG [See all >]      │ ← Vendor circles (68px, fire badge)
│ (M) (C) (T)                         │    Logo or 3D icon fallback
├─────────────────────────────────────┤
│ Hot in Akoka [See all >]            │ ← Featured deal cards (horizontal)
│ ┌────────┐ ┌────────┐              │    55% screen width, badges
│ └────────┘ └────────┘              │
├─────────────────────────────────────┤
│ 🏷️ Best Wraps [See all >]          │ ← Collection rows (tag-based)
│ ┌──────┐ ┌──────┐                  │
│ └──────┘ └──────┘                  │
├─────────────────────────────────────┤
│ All Deals [See all >]               │ ← 2-column grid, max 6 items
│ ┌────┐ ┌────┐                      │
│ └────┘ └────┘                      │
│ ┌────┐ ┌────┐                      │
│ └────┘ └────┘                      │
├─────────────────────────────────────┤
│ [🎁 Explore All 10+ Deals →]       │ ← Soft purple button, haptic
│                or                    │
│ ✓ You're all caught up!            │ ← When ≤6 deals total
│ New deals drop every morning at 8AM │
├─────────────────────────────────────┤
│ 120px bottom padding               │
└─────────────────────────────────────┘
│ Glass nav bar: Deals | Vouchers | Profile │
```

**States to design:**
- Shimmer skeleton (full page shimmer during initial load)
- Empty feed ("No deals yet!" with 3D gift icon + notify toggle)
- Pull-to-refresh
- Category selected (title changes to "Results")
- Verification dialog (pop-up when admin approves)
- Voucher redeemed snackbar (green, auto-closes voucher sheet)

---

## Flow 3: See All Destinations (3 modes)

### Trending See All → "Campus Plugs"
```
← Campus Plugs                    X vendors
[Search vendors...]
┌─────────────────────────────────┐
│ (M) Mama Nkechi Kitchen    →    │ ← Vendor list
│     ● Open now · 5 deals        │    Logo, open/closed dot, deal count
├─────────────────────────────────┤
│ (C) ChillZone Cafe         →   │
│     Opens at 10:00 · 3 deals    │
└─────────────────────────────────┘
```

### Hot in Akoka See All → "Flash Deals"
```
← Flash Deals                   X deals
[Search...] [Filter icon]
[All] [Food] [Drinks] ...
Sort: Ending Soonest (default)
┌────┐ ┌────┐
│    │ │    │  ← 2-column grid
└────┘ └────┘
```

### All Deals See All → "Explore"
```
← Explore                      X deals
[Search...] [Filter icon]
[All] [Food] [Drinks] ...
[Sort pills: Newest|Price↑|Price↓|Best Deal|Ending Soon]
  (hidden by default, shown on filter tap)
┌────┐ ┌────┐
│    │ │    │  ← 2-column grid
└────┘ └────┘  Frosted glass on closed deals
               Progress bar for stock
               🔥 + count when ≤5 left
```

**Empty state:** "No deals match" + "Show me what's trending" CTA

---

## Flow 4: Deal Detail → Checkout → Payment

```
Deal Detail Screen
┌─────────────────────────┐
│ [Hero image - full width]│
│ ← (back)      ♡ (save)  │
├─────────────────────────┤
│ Deal Title               │
│ ₦1,200 ₦1,800 Save ₦600│
│                          │
│ Quantity  [- 3 +]        │ ← Stepper, max 10 or stock
│ 3x ₦1,200  You save ₦1,800│
│                          │
│ 🏪 Mama Nkechi Kitchen ✓│ ← Verified badge + chevron
│ 🕒 07-21 · Open now     │
│ 🔥 Best seller · 200+   │
│                          │
│ About this deal          │
│ [description text]       │
│                          │
│ 🛡️ Report an issue      │
├─────────────────────────┤
│ [Pay ₦3,600]  ← sticky  │ ← Updates with quantity
└─────────────────────────┘
    │ Tap Pay
    ▼
Checkout Screen
┌─────────────────────────┐
│ ← Checkout               │
│ [Deal image] Deal Title  │
│              Vendor Name  │
│                          │
│ Price Breakdown          │
│ 3x Student Price  ₦3,600│
│ Unit Price        ₦1,200│
│ ┌─ You save ₦1,800 ──┐  │
│ Total         ₦3,600    │
│                          │
│ 💳 Card, Bank, USSD     │
│    VISA MC 🟢           │
│                          │
│ [Confirm & Pay ₦3,600]  │
│ 🔒 Secured by Paystack  │
└─────────────────────────┘
    │ Tap Confirm
    ▼
Paystack WebView
┌─────────────────────────┐
│ ✕ Complete Payment       │
│                          │
│ [Paystack checkout form] │
│ Card number, expiry, CVV │
│                          │
│ → Payment Successful     │ ← Auto-detected, closes after 3s
└─────────────────────────┘
    │ Auto-close or tap ✕
    ▼
Vouchers Tab (navigated automatically)
```

**States to design:**
- Verify gate (unverified tap → bottom sheet with price comparison)
- Guest access deal (no gate, even if unverified)
- Payment error pill (red: "You can only purchase 1 time per day")
- Loading spinner on Pay button
- Sold out state (button disabled: "Sold Out")
- Vendor closed state (greyed deal image)

---

## Flow 5: Voucher Display & Redemption

```
Vouchers Tab
┌─────────────────────────┐
│ My Vouchers              │
│ [Active 3] [History]     │
│ ┌─ You saved ₦560 ──┐   │
│                          │
│ ┌─────────────────────┐  │
│ │ M  FISH             📱│ ← Tap to open voucher sheet
│ │    🎫 23h 1m left    │  │
│ ├─────────────────────┤  │
│ │ T  Smoothie Bowl    📱│  │
│ │    🎫 21h 20m left   │  │
│ └─────────────────────┘  │
└─────────────────────────┘
    │ Tap voucher
    ▼
Voucher Bottom Sheet
┌─────────────────────────┐
│ FISH                     │
│ ₦400                     │
│ ● Active · 23:01:22      │
│                          │
│ [QR CODE - large]        │
│ Show this to the vendor  │
│                          │
│ REDEMPTION CODE          │
│ BK7H3NXP 📋             │ ← Copy button
│                          │
│ M Mama Nkechi Kitchen ✓  │
│                          │
│ 1 → 2 → 3               │
│ Scan  Vendor  Enjoy!     │
│                          │
│ [Done]                   │
└─────────────────────────┘
```

**States to design:**
- Active voucher (green dot, countdown)
- Redeemed voucher (grey, checkmark, timestamp)
- Expired voucher (red, "Expired")
- History tab (list of redeemed + expired)
- Voucher auto-close (when vendor redeems, sheet closes + snackbar)

---

## Flow 6: Vendor Scanner & Redemption

```
Scanner Tab (default on vendor app)
┌─────────────────────────┐
│ BuzzScanner        🔦   │
│                          │
│ ┌───────────────────┐    │
│ │                   │    │ ← Camera viewfinder
│ │   [QR scan area]  │    │    Purple border, 260x260
│ │                   │    │
│ └───────────────────┘    │
│                          │
│ Point camera at QR code  │
│                          │
│ [⌨️ Type Code]          │ ← Opens manual entry sheet
│                          │
│ [3 pending] ← yellow    │ ← Offline queue badge (if any)
└─────────────────────────┘
    │ Scan or type code
    ▼
┌─ Success ──────────────┐  ┌─ Failed ──────────────┐
│ ✅                      │  │ ❌                     │
│ Jollof Rice + Chicken   │  │ Redemption Failed      │
│ Fred Boakye             │  │ This voucher expired   │
│ Voucher redeemed!       │  │                        │
│ Tap to scan next        │  │ Tap to scan next       │
└─────────────────────────┘  └────────────────────────┘
    │ Queued (offline)
    ▼
┌─ Queued ───────────────┐
│ ☁️                      │
│ Queued for Sync         │
│ No network — will sync  │
│ automatically            │
│ Tap to scan next        │
└─────────────────────────┘
```

**Manual entry sheet:**
```
┌─────────────────────────┐
│ Manual Entry             │
│ Type the student's code  │
│                          │
│ [  BK7H3NXP  ]          │ ← Uppercase, monospace, large
│                          │
│ [Verify Code]            │
└─────────────────────────┘
```

---

## Flow 7: Vendor Deals & Payouts

```
Deals Tab
┌─────────────────────────┐
│ My Deals          3 active│
│                          │
│ ┌─────────────────────┐  │
│ │ Jollof Rice  Lunch  │  │
│ │ ₦1,800  8/50 ████   │  │ ← Stock bar, section badge
│ │              [Active]│  │
│ ├─────────────────────┤  │
│ │ Shawarma    All Day │  │
│ │ ₦1,500  5/40 ██     │  │
│ │              [Active]│  │
│ └─────────────────────┘  │
└─────────────────────────┘

Payouts Tab
┌─────────────────────────┐
│ Payouts                  │
│ Track earnings           │
│                          │
│ ┌──────────┐┌──────────┐│
│ │₦12,400   ││₦45,200   ││ ← Today's earnings, pending
│ │Today     ││Pending   ││
│ ├──────────┤├──────────┤│
│ │₦248,500  ││18        ││ ← Month total, scans today
│ │This Month││Scans     ││
│ └──────────┘└──────────┘│
│                          │
│ RECENT SCANS   See all   │
│ ┌─────────────────────┐  │
│ │ ✓ Tunde B.    ₦1,800│  │ ← Green check, name, amount
│ │   Jollof Rice  2m   │  │    Deal title, time ago
│ ├─────────────────────┤  │
│ │ ✓ Ada Obi     ₦1,500│  │
│ │   Shawarma    15m   │  │
│ └─────────────────────┘  │
└─────────────────────────┘
```

---

## Flow 8: Vendor Profile (from Student App)

```
Vendor Profile Screen
┌─────────────────────────┐
│ [Cover image - full]     │
│ ←                        │
├─────────────────────────┤
│ (Logo)                   │
│ Mama Nkechi Kitchen      │
│ 347 students · Address   │
│                          │
│ [Open] [⭐4.7] [🕒7-21]│ ← Pills row
│ [Campus Favorite]        │
│                          │
│ 🔔 Follow for deals     │ ← Toggle follow
│                          │
│ Happy Hour               │
│ ┌────────┐ ┌────────┐   │ ← Active deals from this vendor
│ └────────┘ └────────┘   │
│                          │
│ Loyalty Card             │
│ ⭐⭐⭐☆☆ 3/5            │ ← Stamp card
│ [Claim reward]           │
│                          │
│ Menu + Location          │
│ 📞 Call · 📍 Address    │
└─────────────────────────┘
```

---

## Flow 9: Admin — Deal Management

```
Deals Page
┌────────────────────────────────────────┐
│ Deals              [+ Create Deal]     │
│ [Search...] [Food][Drinks]... [Active] │
│                                        │
│ ☐ Deal    Cat   Price  Schedule Stock  │
│ ☐ Jollof  FOOD  ₦1,800 12:00-15:30 ██│ ← Schedule column with day dots
│   Mama N. [Lunch Special] #food        │ ← Section badge + tag pills
│ ☐ Coffee  DRINK ₦1,000 All day    ███ │
│                                        │
│ [3 selected] [Delete Selected]         │ ← Batch action bar (red)
└────────────────────────────────────────┘
    │ Click deal row
    ▼
Deal Modal (Create/Edit)
┌────────────────────────────────────┐
│ Create Deal                    ✕   │
│                                    │
│ Vendor: [Mama Nkechi Kitchen ▾]    │
│ Title: [Jollof Rice + Chicken]     │
│ Description: [...]                 │
│ Tags: [food, jollof, lunch]        │ ← Comma separated
│                                    │
│ Category: [FOOD ▾]  [Upload image] │
│ Original: [₦2,500]  Student: [₦1,800]│
│ ┌─ Students save ₦700 · 28% off ┐ │
│ Quantity: [50]  Max/Day: [2]       │
│ Starts: [date]  Expires: [date]    │
│                                    │
│ 🔵 Featured deal                   │
│ Section: [Lunch Special]           │
│ [Breakfast Rush] [Hot in Akoka]... │ ← From existing deals + campaigns
│                                    │
│ 🔵 Limit to daily hours           │
│ Preview: [10:00] Active: [12:00]   │
│ To: [15:30]                        │
│ [S] [M●] [T●] [W●] [T●] [F●] [S] │
│                                    │
│ 🟢 Open to unverified students    │
│                                    │
│ [Cancel] [Create Deal]            │
└────────────────────────────────────┘
    │ Clone icon on deal row
    ▼
Clone Modal
┌────────────────────────────────────┐
│ Clone Deal                     ✕   │
│ Clone "Jollof Rice" to vendors     │
│ ┌──────────────────────────────┐   │
│ │ 📋 Jollof Rice · ₦1,800     │   │
│ │    Mama Nkechi · Lunch Special│   │
│ └──────────────────────────────┘   │
│ Select Vendors (2/3)   Select All  │
│ ┌ ✓ ChillZone Cafe ─────────┐     │
│ ┌ ✓ Test Vendor ─────────────┐    │
│ ┌   Other Vendor ────────────┐     │
│ ████████░░ 1/2 Cloning...         │ ← Progress bar
│ [Cancel] [Clone to 2 Vendors]     │
└────────────────────────────────────┘
```

---

## Flow 10: Admin — Campaigns

```
Campaigns Page
┌────────────────────────────────────┐
│ Campaigns          [+ New Campaign]│
│ Batch-create deals, publish at once│
│                                    │
│ ┌──────────────────────────────┐   │
│ │ Breakfast Rush Monday  DRAFT │   │
│ │ 07:00-10:30 · 3 deals       │   │
│ │              [Publish All] 🗑│   │
│ └──────────────────────────────┘   │
│                                    │
│ Breakfast Rush Monday — Deals      │
│ ┌ Deal         Cat   Price  Status┐│
│ │ Egg Wrap     FOOD  ₦700   Draft ││
│ │ Akara & Pap  FOOD  ₦300   Draft ││
│ │ Coffee       DRINK ₦400   Draft ││
│ └─────────────────────────────────┘│
│                                    │
│ Quick Add Deal to "Breakfast Rush" │
│ [Vendor▾][Title][Cat▾][₦][₦][Qty] │
│                           [Add]    │
└────────────────────────────────────┘
    │ Click "Publish All"
    ▼
All deals go ACTIVE simultaneously
Student feed shows all 3 in "Breakfast Rush" section
```

---

## Flow 11: Admin — Student Verification

```
Students Page
┌────────────────────────────────────┐
│ Students                           │
│ [Pending] [Approved] [Rejected]    │
│ [Search name, email, phone...]     │
│                                    │
│ Student  Campus  Verify  Time  Act │
│ Ada O.   UNILAG  PENDING  1m  [✓][✕]│
│ Chidi N. YABATECH PENDING 15m [✓][✕]│
└────────────────────────────────────┘
    │ Click student row → Side panel opens
    ▼
┌────────────────────┐
│ Student Details     │
│ Ada Obi · UNILAG   │
│ ada@gmail.com       │
│ +234801...          │
│ Status: PENDING     │
│ School: ada@unilag  │ ← ✓ Verified
│                     │
│ UPLOADED DOCUMENT   │
│ [Student ID image]  │
│ [Open] [Download]   │
│                     │
│ ADMIN NOTES         │
│ [textarea]          │
│                     │
│ [Approve] [Reject]  │ ← Pending only
│ [Revoke Verification]│ ← Approved only
└─────────────────────┘
```

**On Approve:** Student app shows verification dialog with green checkmark
**On Reject:** Student app shows rejection dialog with reason

---

## Flow 12: QR Sticker Management (Vendor Modal)

```
Vendor Modal → QR Code Management section
┌────────────────────────────────────┐
│ QR CODE MANAGEMENT                 │
│                                    │
│ ✓ Sticker Linked                   │ ← Green card when linked
│   BZ-9942XP                        │
│   Linked 12/05/2026    [Unlink]    │
│                                    │
│ LINK A STICKER                     │
│ [📷 Scan Pre-printed Sticker]     │ ← Opens camera
│ [BZ-____  ] [Link]                │ ← Manual serial entry
│                                    │
│ PRINT KIT                          │
│ [⬇️ Download QR Poster]           │ ← A5 branded poster with QR
│                                    │
│ HISTORY (3 stickers)               │
│ BZ-9942XP  Active                  │
│ BZ-1234AB  Unlinked                │
└────────────────────────────────────┘
```

---

## Flow 13: Real-Time Notifications (Cross-App)

| Action | Admin Sees | Student Sees | Vendor Sees |
|--------|-----------|-------------|-------------|
| Admin creates deal | Deals page refreshes | Home feed refreshes | Deals tab refreshes |
| Admin approves student | Students page refreshes | Verification dialog pops up | — |
| Student buys deal | Transactions update | Voucher appears in list | Stock decrements, payouts update |
| Vendor redeems voucher | Vouchers update | Sheet closes + green snackbar | Success card on scanner |
| Admin toggles trending | — | Trending circles update | — |
| Admin deletes deal | Deals list updates | Home feed refreshes | Deals list updates |

---

## Component Library Reference

### Cards
- **Deal Card:** 18px radius, soft shadow, image + discount badge + vendor avatar + price + CTA
- **Happy Hour Card:** PageView swipe, countdown timer, stock count, vendor logo (cached bytes)
- **Dropping Soon Card:** 160px wide, blurred image, dark gradient, amber "Drops at" pill, bell icon
- **Collection Card:** 180px wide, image top + info bottom, price + vendor
- **Explore Grid Card:** 2-column, discount badge, frosted glass closed, progress bar stock

### Buttons
- **Primary CTA:** Purple (#6C4FFF), 24px radius, 54px height, white text w700
- **Secondary:** Light purple bg, purple text
- **Destructive:** Red bg or red text
- **Filter Icon:** 44x44, rounded 14px, toggle tint on active

### Badges
- **Discount:** Purple rounded pill "-33%"
- **Section:** Light purple bg, purple text "Lunch Special"
- **Tag:** Light blue bg, blue text "#shawarma"
- **Status:** Green/yellow/red surface + text
- **Fire:** 20px white circle with 🔥 emoji
- **Verified:** Green checkmark icon (14px)

### Navigation
- **Student:** Glass nav bar (blur 16, 85% opacity), 3 tabs: Deals/Vouchers/Profile
- **Vendor:** Material NavigationBar, 4 tabs: Scanner/Deals/Payouts/Profile
- **Admin:** Collapsible sidebar with icon + label, mobile slide-in
