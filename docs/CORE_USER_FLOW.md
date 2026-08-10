# BuzzPay — Core User Flow
## The Single Most Important Flow: Student Pays → Gets Voucher → Vendor Redeems

This is the flow that makes BuzzPay real. Every other feature exists to support this one transaction.

---

# FLOW OVERVIEW

```
Phone Entry → OTP → Home → Deal Detail → Checkout → Payment → Voucher → Vendor Scan → Done
```

---

# SCREEN 1: Phone Entry (Login)

**Purpose:** Get the user's phone number. No password. No friction.

## Layout
- Background: Light gray `#F4F4F8`
- Left edge: Thin blue accent bar (decorative)

## Elements (top to bottom)

### Top Bar
- **BuzzPay** — purple, bold, left-aligned
- **? icon** — circle button, right-aligned (links to help/FAQ)

### Heading Block
- **"Welcome back"** — 28px, ExtraBold, `#111111`
- **Subtitle** — "Log in to your account and keep the buzz going." — 15px, Regular, `#555555`

### Input Section
- **Label:** "Phone number" — 14px, SemiBold, `#222222`
- **Input field:**
  - Background: `#ECEBF3`, radius 14px
  - Left: 🇳🇬 flag emoji + "+234" text
  - Vertical divider line between prefix and input
  - Right: text input, digits only, max 10 chars
  - Placeholder: "800 000 0000", letter-spacing 1
  - On error: red border `#DC2626`
- **Helper text:** "We'll send a one-time code via SMS." — 12px, `#9CA3AF`
- **Error text** (conditional): red, 12px, info icon + message

### CTA
- **"Continue →"** button
  - Full width, height 54px, radius 14px
  - Background: `#6C4FFF` (primary purple)
  - Text: "Continue" + arrow icon, white, 16px Bold
  - Loading state: white circular progress indicator (22px)
  - Disabled state: light purple `#B8A9FF`

### Security Card
- Background: `#EAE8F5`, radius 20px, padding 24px
- Purple shield icon in circle background
- **"Secure by Design"** — 16px, Bold, `#111111`
- Description: "Your transactions are protected by bank-grade encryption and real-time monitoring." — 13px, centered, `#555555`

### Footer
- "Privacy Policy · Terms of Service" — 12px, `#9CA3AF`, centered
- Tappable links (no destination yet in MVP)
- **"Dev Login"** — tiny, faded, bottom center (test only)

## Interactions
| Action | Result |
|--------|--------|
| Tap input | Keyboard opens, numeric pad |
| Type < 7 digits and tap Continue | Error: "Enter a valid phone number" |
| Type 10 digits and tap Continue | Loading spinner → API call → navigate to OTP screen |
| API fails | Error text appears below input |
| Tap ? | Help sheet (future) |

## API Call
```
POST /auth/phone/send-otp
Body: { phone: "+234XXXXXXXXXX" }
Success → navigate to OTP screen passing phone + dev OTP (dev mode only)
```

---

# SCREEN 2: OTP Verification

**Purpose:** Confirm the user owns the phone number.

## Layout
- Same background as login
- Back arrow top-left

## Elements (top to bottom)

### Heading Block
- **"Enter the code"** — 26px, ExtraBold
- **Subtitle** — "We sent a 6-digit code to +234 XXX XXX XXXX" — phone number shown, 14px
- Small "Wrong number? Go back" link below subtitle

### OTP Input
- 6 individual boxes in a row
  - Each box: 52×56px, radius 12px, background `#ECEBF3`
  - Active box: purple border `#6C4FFF`, white background
  - Filled box: dark text, no border
  - Auto-advance to next box on input
  - Auto-submit when 6th digit entered
  - Numeric keyboard only
  - Paste support (pastes all 6 digits at once)

### Resend Section
- **Countdown timer:** "Resend code in 0:45" — 13px, gray
- After countdown → **"Resend code"** — purple, tappable
- On resend: API call, timer resets to 60s, brief "Code sent!" confirmation

### CTA
- **"Verify"** button — same style as Continue on login screen
- Auto-triggers when 6th digit entered (no manual tap needed)
- Loading state while verifying

### Error State
- Wrong code: boxes turn red border, shake animation
- Text: "Incorrect code. X attempts remaining."
- After 5 wrong attempts: locked for 10 minutes

## Interactions
| Action | Result |
|--------|--------|
| Enter 6 digits | Auto-submits |
| Wrong code | Red boxes + error message + shake |
| Correct code, new user | Navigate to Home (account created) |
| Correct code, existing user | Navigate to Home |
| Tap resend (timer done) | Re-sends OTP, resets timer |

## API Call
```
POST /auth/phone/verify-otp
Body: { phone: "+234XXXXXXXXXX", code: "123456" }
Success → save access token + refresh token → navigate to Home
```

---

# SCREEN 3: Home Screen

**Purpose:** Show the student what deals are available near their campus right now.

## Layout
- Background: `#F8F9FF`
- ScrollView (pull to refresh)

## Elements (top to bottom)

### Header
- **Row 1:**
  - 📍 pin icon (purple) + "UNILAG, Akoka" — 14px, SemiBold, gray
  - Avatar circle (right) — initials of user's name, purple background
- **Row 2:**
  - "What's the deal today, [FirstName]? 👀" — 28px, ExtraBold, `#111111`
- **Row 3:**
  - Search bar — pill shape (radius 30), white background, "Search here..." placeholder, purple search icon right

### Verification Banner (unverified users only)
- Yellow/amber strip
- "Verify your student ID to unlock all deals"
- Tap → opens verification flow
- Dismissed once verified (never shows again)

### Category Pills (horizontal scroll)
- Pills: All · Food · Drinks · Subs · Transport · Shopping · Lifestyle
- Selected: purple background, white text
- Unselected: white background, dark text, gray border
- Tapping a pill filters the deal feed below

### Active Vouchers (only if student has unredeemed vouchers)
- Section header: 🎟 "My Active Vouchers" + count ("2 tickets")
- Horizontal scroll of voucher cards
- Each card: deal name, vendor, expiry countdown, tap to open redemption sheet
- Not shown if no active vouchers

### Happy Hour / Live Now Section (time-based)
- Section header: 🔥 "[Section Name]" + "Live now" purple badge
- Full-width PageView cards (swipeable)
- Each card: deal image, name, price, vendor, time remaining badge

### Trending Vendors
- Section header: "Trending at UNILAG" + "See all"
- Horizontal scroll of vendor avatar circles
- Each: logo/initial circle + vendor name below
- "NEW" badge on recently added vendors

### Featured Deals ("Hot in Akoka")
- Section header + "See all"
- Horizontal scroll of tall deal cards (55% screen width each)
- Each card: image, discount badge, name, student price, original price strikethrough, vendor name

### All Deals Grid
- Section header: "All Deals" + "See all"
- 2-column grid
- Each DealCard: image, name, vendor, student price, original price, quantity remaining
- Limited to 6 on home — "Explore All X Deals" button at bottom

### Empty State (no deals)
- 3D gift icon
- "No deals yet!" heading
- "New deals drop every day. Turn on notifications so you don't miss out."
- "Notify me when deals drop" toggle button

## Interactions
| Action | Result |
|--------|--------|
| Tap search bar | Search overlay slides up |
| Tap category pill | Filters deal grid |
| Pull down | Refresh all sections |
| Tap deal card | Navigate to Deal Detail |
| Tap voucher card | Opens redemption sheet with QR |
| Tap vendor circle | Navigate to Vendor Profile |
| Tap avatar | Navigate to Profile screen |
| Tap "Explore All" | Navigate to full Explore screen |

---

# SCREEN 4: Deal Detail

**Purpose:** Give the student full context on the deal before committing to pay.

## Layout
- White background
- Back arrow top-left
- Share icon top-right

## Elements (top to bottom)

### Hero Image
- Full-width, height ~240px
- Rounded bottom corners
- Gradient overlay (bottom) for text legibility
- Discount badge top-right: "Save X%" — purple pill

### Deal Info Block
- **Deal title** — 22px, ExtraBold
- **Vendor name** — 14px, with verified checkmark icon
- **Category badge** — pill (e.g. "🍔 Food")
- **Star rating** (if available) + redemption count ("124 students bought this")

### Pricing Block
- **Student price** — 28px, ExtraBold, purple — "₦1,500"
- **Original price** — strikethrough, gray — "₦2,500"
- **Savings** — green badge — "You save ₦1,000"

### Urgency Signals
- **Stock:** "Only 12 vouchers left" — amber, with warning icon
- **Expiry:** "Expires today at 9 PM" — red if < 3hrs, amber if < 12hrs
- **Time window:** "Available 12 PM – 6 PM daily" (recurring deals)

### Description
- Full deal description text
- "What's included:" bullet points (if provided by vendor)

### Vendor Info Card
- Vendor logo / initial circle
- Business name + address
- Opening hours: "Open now · Closes 9 PM" or "Opens at 11 AM"
- Map thumbnail (tappable → opens maps)

### Loyalty Info (if vendor has loyalty program)
- "🎯 5 stamps → 1 free meal"
- Student's current stamps: "You have 3/5 stamps at [Vendor]"

### Sticky Bottom Bar
- Fixed at bottom, white background with top shadow
- **"Pay ₦1,500 →"** — full-width purple button, height 56px
- If unverified: button text "Verify to Unlock" → tapping opens verify flow
- If sold out: button text "Sold Out" — disabled, gray

## Interactions
| Action | Result |
|--------|--------|
| Tap "Pay ₦X" (verified) | Navigate to Checkout |
| Tap "Pay ₦X" (unverified) | Open verify gate sheet |
| Tap vendor card | Navigate to Vendor Profile |
| Tap map thumbnail | Open device maps app |
| Tap back | Return to Home |
| Tap share | Native share sheet |

---

# SCREEN 5: Checkout

**Purpose:** Final confirmation before payment. One decision: confirm or cancel.

## Layout
- Bottom sheet (slides up from bottom)
- Height: ~70% of screen
- Drag handle at top

## Elements (top to bottom)

### Header
- "Confirm Purchase" — 18px, Bold
- X close button top-right

### Order Summary Card
- Deal image (thumbnail, left)
- Deal title
- Vendor name
- Student price (large, purple)
- Original price (small, strikethrough, gray)
- Savings badge: "You save ₦X"

### What You Get
- ✅ "1 × [Deal Name] voucher"
- ✅ "Valid for 24 hours after purchase"
- ✅ "Redeem at [Vendor Name] — show QR code"

### Payment Method
- "Paying with Paystack"
- Paystack logo
- Supported: Visa / Mastercard / Bank Transfer / USSD icons

### Quantity Selector (if maxPerUser > 1)
- "−" button · quantity number · "+" button
- Max capped at deal's maxPerUser
- Price updates live as quantity changes

### Terms line
- "By continuing you agree to our Terms of Service"

### CTA
- **"Pay ₦1,500 now"** — full-width, purple, height 54px
- Loading state on tap

## Interactions
| Action | Result |
|--------|--------|
| Tap Pay | API call → open Paystack WebView |
| Tap X or drag down | Dismiss sheet, return to deal detail |
| Tap − / + | Update quantity + total price |

## API Call
```
POST /payments/initialize
Body: { dealId, quantity }
Success → returns { accessCode, reference } → open Paystack WebView
```

---

# SCREEN 6: Paystack Payment (WebView)

**Purpose:** Collect card/bank details securely. Fully handled by Paystack.

## Layout
- Full screen WebView
- Loading indicator while page loads
- Back button top-left (cancels payment)

## Elements (Paystack's UI — not customizable)
- Email pre-filled (from student account)
- Amount shown: ₦1,500
- Payment methods tabs:
  - **Card** — card number, expiry, CVV
  - **Bank Transfer** — account number shown, student transfers exact amount
  - **USSD** — dial code shown for each bank
- "Pay ₦1,500" button

## States
| State | What Happens |
|-------|-------------|
| Payment success | Paystack closes WebView → app calls verify endpoint |
| Payment failed | Paystack shows error → student can retry |
| Student cancels | WebView closes → returns to Deal Detail |
| Network drops mid-payment | Paystack handles retry internally |

## After Payment
```
GET /payments/verify/:reference
→ Backend confirms with Paystack
→ Voucher created in DB
→ Navigate to Voucher screen
```

**Also:** Paystack fires webhook simultaneously:
```
POST /payments/webhook (charge.success)
→ Backend creates voucher (idempotent — safe if called twice)
```

---

# SCREEN 7: Voucher (Payment Success)

**Purpose:** Show the student their proof of purchase. This is what they show the vendor.

## Layout
- Full screen or tall bottom sheet
- Background: `#F8F9FF`
- Ticket-shaped SVG card in center

### Success Header
- ✅ Green checkmark animation (lottie or scale-in)
- **"You're in!"** — 22px, ExtraBold
- "Your voucher is ready to use" — 14px, gray

### Voucher Ticket Card (SVG ticket shape)
- **Deal name** — 18px, Bold, centered
- **Price paid** — 16px, purple
- **Status badge:** pulsing green dot + "Active · HH:MM:SS countdown"
- **QR Code** — 170×170px, white background, rounded container
  - Contains: voucherId + TOTP rotating code (refreshes every 60s)
  - "Show this to the vendor" — 12px, gray below QR
- **Divider line** (dashed, ticket-style)
- **Redemption Code** label — 10px, uppercase, letter-spaced
- **8-character code** — 28px, ExtraBold, monospace, purple, letter-spacing 4
  - Copy icon next to it (tap to copy to clipboard)
- **Vendor name** — with initial avatar + verified checkmark

### Instructions
- "Step 1: Go to [Vendor Name]"
- "Step 2: Show this QR code or tell them your code"
- "Step 3: Vendor scans — you're done!"

### Done Button
- "Done" — full width, purple, returns to Home

## Interactions
| Action | Result |
|--------|--------|
| Tap copy icon | Code copied to clipboard + "Code copied!" snackbar |
| QR auto-refreshes | Every 60 seconds (TOTP rotation, silent) |
| Tap Done | Navigate to Home |
| Pull up from home later | Voucher visible in "My Active Vouchers" on Home |

---

# SCREEN 8: Vendor Scanner (Vendor's Device)

**Purpose:** Vendor confirms the student's voucher is real and marks it redeemed.

**Device:** Vendor's phone or laptop browser at `/scanner`

## Layout
- Dark overlay with camera viewfinder (mobile)
- Or: white page with html5-qrcode component (web/laptop)

## Elements

### Scanner View
- Live camera feed
- Purple scanning frame/border (animated corners)
- "Point at student's QR code" — white text below frame
- Manual entry fallback: "Enter code manually" link at bottom

### Manual Code Entry (fallback)
- 8-character input field
- "Verify Code" button
- Used when QR won't scan (bad lighting, screen glare)

### Scan Result — Success
- ✅ Green full-screen flash (brief)
- Haptic: heavy vibration
- Card slides up showing:
  - Student name
  - Deal name
  - Amount: ₦1,500
  - "REDEEMED" green stamp badge
  - Timestamp
- "Scan Next" button to return to scanner

### Scan Result — Already Redeemed
- ❌ Red flash
- Haptic: double vibration
- "This voucher has already been redeemed" — with timestamp of when
- "Try Again" button

### Scan Result — Expired
- ⚠️ Orange flash
- "This voucher expired on [date/time]"
- "Try Again" button

### Scan Result — Invalid
- ❌ Red flash
- "Invalid QR code. Make sure the student is showing a BuzzPay voucher."

### Offline Mode
- Banner: "You're offline — scans are queued"
- Scans saved locally (SQLite)
- Auto-syncs when connection restored
- Queue count shown: "3 scans pending sync"

## API Call
```
POST /vouchers/redeem
Body: { code } or { qrData } or { rotatingPayload }
Success → { studentName, dealName, amount, redeemedAt }
Error → { message: "already_redeemed" | "expired" | "invalid" }
```

---

# SCREEN 9: Redemption Confirmation (Student's Device)

**Purpose:** Student sees confirmation that their voucher was used.

## Trigger
Supabase realtime event pushed to student's phone the moment vendor scans.

## Elements

### Snackbar (auto-appears on Home screen)
- ✅ Green background
- "Voucher redeemed by vendor!" — white text
- Checkmark icon
- Duration: 3 seconds, floating

### Voucher Status Update
- Voucher card in "My Active Vouchers" disappears (or moves to History tab)
- In Voucher History screen: status changes to "Redeemed" with timestamp

### Push Notification (if app is in background)
- Title: "Voucher Redeemed ✅"
- Body: "Your [Deal Name] voucher was redeemed at [Vendor]. Enjoy!"

---

# COMPLETE FLOW — TIMING BREAKDOWN

| Step | Screen | Time Target |
|------|--------|-------------|
| Enter phone | Login | < 10 seconds |
| Enter OTP | OTP | < 30 seconds |
| Find a deal | Home | < 60 seconds |
| Review deal | Deal Detail | < 30 seconds |
| Confirm purchase | Checkout | < 15 seconds |
| Complete payment | Paystack | 30–60 seconds |
| Get voucher | Voucher screen | Instant (< 2s after payment) |
| Show QR to vendor | Voucher screen | 5 seconds |
| Vendor scans | Scanner | < 5 seconds |
| Confirmation | Snackbar | Instant |
| **Total** | | **~3–4 minutes end-to-end** |

---

# CRITICAL RULES FOR THIS FLOW

1. **Voucher must appear within 2 seconds of payment** — student is standing at the counter
2. **QR must work offline** — static code always available as fallback
3. **Vendor scan must work in < 3 seconds** — queue behind student is watching
4. **Never lose a payment** — webhook + verify endpoint both create the voucher (idempotent)
5. **Never let an expired QR through** — TOTP window validated server-side, ±2 windows tolerance
6. **Always show remaining quantity** — "Only 3 left" prevents disappointment at counter

---

# ERROR SCENARIOS & RECOVERY

| Error | When | Recovery |
|-------|------|----------|
| OTP not received | Screen 2 | Resend button after 60s countdown |
| Payment declined | Screen 6 | Paystack shows retry — no voucher created |
| Payment succeeded but app crashed | After Screen 6 | Verify endpoint called on next app open |
| Webhook missed | After Screen 6 | Verify endpoint is fallback — creates voucher |
| QR won't scan | Screen 8 | Manual 8-char code entry |
| Vendor offline | Screen 8 | Scan queued locally, syncs automatically |
| Voucher already redeemed | Screen 8 | Clear error message + timestamp shown |
| Realtime push fails | Screen 9 | Student checks Voucher tab manually |

---

*Document: CORE_USER_FLOW.md*
*Owner: Godfred Boakye*
*Last updated: Aug 1, 2026*
