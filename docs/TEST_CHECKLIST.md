# BuzzPay — Feature & Flow Test Checklist

## Pre-requisites
- API running on Railway: `https://buzzpay-production.up.railway.app`
- `useMockData = false` in `lib/core/mock_data.dart`
- Fresh install on device (or clear app data)

---

## 1. ONBOARDING & AUTH

### 1.1 First Launch
- [ ] App opens to onboarding/welcome screen
- [ ] Can swipe through intro pages
- [ ] "Get Started" navigates to phone login

### 1.2 Phone Login (New User)
- [ ] Enter phone number (e.g., 09045701943)
- [ ] Tap "Let's Go" → OTP is sent via Termii SMS
- [ ] OTP screen shows with 6-digit input
- [ ] Enter correct OTP → navigates to signup (new user)
- [ ] Enter wrong OTP → shows error "Invalid or expired code"

### 1.3 Signup (Profile Completion)
- [ ] Enter full name
- [ ] Select campus from dropdown (UNILAG, YABATECH, LASU, FUTA)
- [ ] Tap "Continue" → navigates to verification screen
- [ ] Name is saved and shows on profile screen

### 1.4 Phone Login (Returning User)
- [ ] Enter previously registered phone number
- [ ] Verify OTP → goes directly to home feed (skips signup)
- [ ] User data (name, verification status) loads correctly

---

## 2. STUDENT VERIFICATION

### 2.1 Verification Methods Screen
- [ ] Shows 3 options: University Email, Student ID, Admission Letter
- [ ] Each has a 3D icon
- [ ] "Fastest" badge on University Email
- [ ] "Skip for now" link at bottom works → goes to home

### 2.2 University Email (OTP)
- [ ] Tap University Email → email input screen
- [ ] Enter .edu.ng email → tap "Send Verification Code"
- [ ] OTP screen shows → enter code → "Verification Successful!" screen
- [ ] "Start Saving" button → home feed
- [ ] Profile now shows verified checkmark

### 2.3 Student ID Upload
- [ ] Tap Student ID → upload screen with dashed box
- [ ] Tap upload box → shows "Take Photo" / "Choose from Gallery" picker
- [ ] Pick/take photo → preview shows in the box
- [ ] "Tap to change" overlay on preview
- [ ] "Submit for Review" button appears ONLY after picking a file
- [ ] Tap submit → "Under Review" screen (NOT instant verification)
- [ ] "Browse Deals While You Wait" → home feed

### 2.4 Admission Letter Upload
- [ ] Same flow as Student ID but for freshers
- [ ] Goes to "Under Review" after upload

### 2.5 Verification Gate
- [ ] Unverified user sees "Verify to unlock student prices" pill on home
- [ ] Tapping pill → verification screen
- [ ] Tapping "Pay" on any deal card → instant bottom sheet "Unlock Your ₦X Discount"
- [ ] Sheet shows 3D checkmark, price comparison (Regular vs Student), "Verify & Unlock" CTA
- [ ] "Maybe later" dismisses sheet
- [ ] 3D lock icon shows on deal card images for unverified users

---

## 3. HOME FEED

### 3.1 Layout & Sections
- [ ] Header shows "BuzzPay" + search icon
- [ ] Verify banner shows for unverified users
- [ ] Category pills scroll horizontally (All, Food, Drinks, Subs, Transport, Shopping, Lifestyle)
- [ ] Tapping a category filters the feed
- [ ] "All" resets the filter

### 3.2 Happy Hour Section
- [ ] Shows only when deals expire within 60 minutes
- [ ] Page-by-page swipe (not free scroll)
- [ ] Each card has: image, vendor avatar + verified badge, title, price, live countdown timer
- [ ] Progress bar at top of image shrinks as time runs out
- [ ] Timer pulse animation on "Active" indicator
- [ ] Expired deals show grayscale image

### 3.3 Active Vouchers Row
- [ ] Shows ONLY when user has active vouchers
- [ ] Horizontal scroll of ticket cards
- [ ] Each card: vendor name, deal title, time remaining, QR icon
- [ ] Tapping card → redemption bottom sheet (SVG ticket with QR)

### 3.4 Trending at UNILAG
- [ ] Circular vendor avatars with purple gradient ring (new) / gray ring (seen)
- [ ] Vendor name below (short name for long names)
- [ ] 🔥 social proof number
- [ ] Tapping circle → vendor profile page

### 3.5 Main Feed (Hot in Akoka)
- [ ] 2-column grid of deal cards
- [ ] Each card: image, type badge (color-coded), deal title, vendor avatar + name, price (PriceDisplay widget), smart CTA
- [ ] Heart icon on image → follow vendor toast
- [ ] Vendor name tappable → vendor profile
- [ ] Vendor closed → grayscale image, "Opens at X AM" CTA, disabled button

### 3.6 Deal Type Badges
- [ ] ⏰ Time-Window → orange badge with time remaining
- [ ] 🔥 Quantity-Limited → red badge with "X left"
- [ ] 🎁 Bundle → purple "Bundle" badge
- [ ] 🆕 First-Timer → green "First order" badge
- [ ] 📅 Anytime → black discount % badge

### 3.7 Smart CTAs
- [ ] Default → "Pay ₦X" purple button with glow
- [ ] Time-window → "Pay ₦X (45m)" orange button with countdown
- [ ] Scheduled → "Remind Me" ghost outline button
- [ ] Closed → "Opens at X AM" gray disabled button
- [ ] Unverified → triggers verify gate sheet immediately

### 3.8 Empty State
- [ ] When no deals: 3D gift icon, "No deals yet!", "Notify me when deals drop" button
- [ ] Tapping notify → changes to green "You're on the list!" with bell icon

### 3.9 Search
- [ ] Tap search icon → full-screen search overlay slides up
- [ ] Auto-focuses text field
- [ ] Popular searches shown as pill chips
- [ ] Tapping a chip → searches that term
- [ ] Live search after 2+ characters
- [ ] Results show deal tiles with image, title, vendor, price
- [ ] Tap result → deal detail screen
- [ ] No results → 3D gift icon + "Nothing here yet"
- [ ] X button clears search

---

## 4. DEAL DETAIL

- [ ] Immersive hero image (top 40%)
- [ ] Glass back button + heart icon with scrim
- [ ] Curved white sheet overlaps image (32px radius)
- [ ] Deal title (hero, large)
- [ ] Price: PriceDisplay with small ₦ symbol, large student price, light crossed-out original
- [ ] "Save ₦X" green pill
- [ ] Icon-led attributes: vendor (tappable), hours, "Best seller" (if featured)
- [ ] Stock progress bar (purple, rounded caps) for low stock
- [ ] Description with 1.6 line height
- [ ] Floating "Pay ₦X" button with purple glow at bottom
- [ ] Verified user → tap Pay → checkout screen
- [ ] Unverified user → tap Pay → verify gate bottom sheet

---

## 5. VENDOR PROFILE

- [ ] Immersive cover photo with top + bottom scrim
- [ ] Glass back button + heart (follow) icon
- [ ] Curved white sheet overlapping image
- [ ] Vendor logo circle at boundary
- [ ] Vendor name + student count + address
- [ ] Single row of pills: Open/Closed, rating, hours, buzz tags
- [ ] "Follow for deal alerts" link (if not followed)
- [ ] Happy Hour section (if active deals)
- [ ] Menu grouped by category (UPPERCASE labels, letter-spaced)
- [ ] Each menu item: thumbnail, title, PriceDisplay, tappable → checkout
- [ ] "Get Directions" text link at bottom
- [ ] Follow/heart toggles with toast feedback

---

## 6. CHECKOUT

- [ ] Product card with real food thumbnail + vendor link
- [ ] Receipt card: Original price (strikethrough), Student price, "You save ₦X" (vibrant green highlight)
- [ ] Total with large PriceDisplay (26pt)
- [ ] Payment method row: card icon, "Card, Bank Transfer, or USSD", VISA/MC logos, shield icon
- [ ] Error state: contained red pill with info icon (not floating text)
- [ ] "Confirm & Pay ₦X" floating button with purple glow
- [ ] "Secured by Paystack" lock icon

### 6.1 Payment Flow (Mock Mode)
- [ ] Tap "Confirm & Pay" → 1s delay → navigates to My Vouchers

### 6.2 Payment Flow (Real / Paystack)
- [ ] Tap "Confirm & Pay" → API creates transaction → Paystack WebView opens
- [ ] Complete payment with test card (4084 0840 8408 4081, any future expiry, CVV 408, OTP 123456)
- [ ] WebView detects callback → verifies payment → navigates to vouchers
- [ ] Cancel/close WebView → returns to checkout

---

## 7. MY VOUCHERS

### 7.1 Segmented Toggle
- [ ] Active tab (with count badge) / History tab
- [ ] Floating white pill indicator with shadow on selected tab
- [ ] Switching tabs loads correct vouchers

### 7.2 Active Tab
- [ ] Savings banner: "You've saved ₦X this week!" with 3D confetti icon
- [ ] Voucher cards: vendor avatar (first letter), deal title, time remaining pill, QR icon
- [ ] Purple shadow on cards (no borders)
- [ ] Tapping card → redemption bottom sheet

### 7.3 History Tab
- [ ] History banner: "You've redeemed X vouchers this month!" with 3D food icon
- [ ] Redeemed cards: green "Redeemed" pill with checkmark
- [ ] Expired cards: gray "Expired" pill + flag report icon
- [ ] Date shown on right (Today, Yesterday, 3d ago, etc.)

### 7.4 Empty States
- [ ] Active empty: 3D ticket icon (80px), "Your voucher pocket is empty", "Explore Deals" purple button
- [ ] History empty: 3D hourglass icon, "No savings history yet", encouraging copy

---

## 8. VOUCHER REDEMPTION (Bottom Sheet)

- [ ] Dark scrim (65%) covers entire screen including nav bar
- [ ] SVG ticket shape as background
- [ ] Deal title + price
- [ ] Pulsing green "Active" dot with live countdown timer (monospace font)
- [ ] Large QR code on white background
- [ ] "Show this to the vendor" text
- [ ] "REDEMPTION CODE" label (uppercase, letter-spaced)
- [ ] Bold purple code (28pt monospace, e.g., BZ5533QR)
- [ ] Tap code → "Code copied!" toast
- [ ] Vendor avatar + name + 3D checkmark
- [ ] "Done" button with purple glow dismisses sheet

---

## 9. PROFILE

- [ ] Purple gradient header
- [ ] 3D user avatar with purple glow shadow
- [ ] 3D checkmark badge on avatar (if verified)
- [ ] User's real name from auth state
- [ ] "University of Lagos" subtitle
- [ ] "Verify now" pill (if unverified) → verification screen
- [ ] Stats cards: Total Saved (3D coins icon), Deals Claimed (3D flame icon)
- [ ] Stats show real data from vouchers provider
- [ ] "Invite a friend" card with 3D gift icon + gradient background
- [ ] Menu items: Purchase History, Notifications, Help & Support, About BuzzPay, Privacy & Terms
- [ ] Duotone purple icons in soft bg squares
- [ ] "Log Out" text at bottom → logs out, returns to onboarding
- [ ] "BuzzPay v1.0.0" version text

---

## 10. BOTTOM NAVIGATION

- [ ] Floating pill shape with glass blur effect
- [ ] 16px margin from sides, clears safe area
- [ ] 3 tabs: Deals, Vouchers, Profile
- [ ] Custom icons (deals outline/filled, ticket outline/filled, person)
- [ ] Active tab: filled icon + tiny purple dot indicator
- [ ] Inactive tab: outline icon + label text
- [ ] Content scrolls behind the nav bar (extendBody)

---

## 11. BACKEND API (Railway)

### Health
- [ ] `GET /api/health` → `{"status":"ok"}`

### Auth
- [ ] `POST /api/auth/phone/send-otp` → sends SMS OTP via Termii
- [ ] `POST /api/auth/phone/verify-otp` → returns tokens (existing user) or `isNewUser: true`
- [ ] `POST /api/auth/signup` → creates account, returns tokens
- [ ] `POST /api/auth/login` → email/password login, returns tokens
- [ ] `POST /api/auth/refresh` → refreshes access token

### Deals
- [ ] `GET /api/deals` → paginated list with category filter
- [ ] `GET /api/deals/featured` → featured deals
- [ ] `GET /api/deals/happy-hour` → deals expiring within 60 min
- [ ] `GET /api/deals/:id` → deal detail with vendor info + open/closed status

### Payments
- [ ] `POST /api/payments/initialize` → creates Paystack transaction, returns authorization URL
- [ ] `GET /api/payments/verify/:reference` → verifies payment status
- [ ] `POST /api/payments/webhook` → Paystack webhook handler (signature verified)

### Vouchers
- [ ] `GET /api/vouchers` → list user's vouchers (filterable by status)
- [ ] `GET /api/vouchers/:id` → voucher detail with QR data
- [ ] `POST /api/vouchers/:id/redeem` → vendor redeems voucher (QR or daily code)

### Vendor
- [ ] `GET /api/vendor/daily-code` → today's daily rotating code
- [ ] `POST /api/vendor/redeem-by-code` → redeem via voucher code + daily code

---

## 12. CROSS-CUTTING CONCERNS

### Vendor Open/Closed
- [ ] Closed vendor deals: grayscale image, disabled "Opens at X AM" CTA
- [ ] Open/closed status computed server-side in WAT timezone

### Anti-Fraud
- [ ] One-time voucher usage (can't redeem twice)
- [ ] 24-48hr voucher expiry
- [ ] Per-user per-deal daily purchase limits
- [ ] Rate limiting on auth (20/15min) and payment (10/15min) endpoints
- [ ] Paystack webhook signature verification

### Voucher Expiry
- [ ] Cron job runs every 15 minutes
- [ ] Expired vouchers auto-marked as EXPIRED

### 3D Icon Theme
- [ ] All icons consistent: flame, ticket, shield, checkmark, lock, gradcap, handcard, letter, email, coins, gift, confetti, hourglass, food, user, party, QR code
- [ ] 22 custom PNG assets in `assets/icons/`

---

## Test Accounts (Production)
| Role | Phone / Email | Password |
|------|--------------|----------|
| Student | 09045701943 (or new number) | OTP via SMS |
| Student (email) | student@unilag.edu.ng | student123456 |
| Vendor | mama@buzzpay.ng | vendor123456 |
| Admin | admin@buzzpay.ng | admin123456 |

## Paystack Test Card
- Card: `4084 0840 8408 4081`
- Expiry: Any future date
- CVV: `408`
- OTP: `123456`
