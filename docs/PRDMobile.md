# ManagePort Mobile - Product Requirements Document

## 1. Overview

### 1.1 What is ManagePort?
ManagePort is a property management platform for landlords and small property managers. The web app is in production. This PRD defines the React Native / Expo mobile companion that gives users full access to their portfolio from a phone or tablet.

### 1.2 Why Mobile?
Property management is inherently mobile work — inspecting units, meeting tenants, checking on maintenance. Landlords need to record a bill at the mailbox, look up a tenant's phone number in the field, or check outstanding balances before a conversation. A responsive web app helps, but a native app with push notifications, camera access, and offline support is the real answer.

### 1.3 Guiding Principles
- **Same backend, new frontend.** The mobile app shares the Convex database, authentication (Clerk), and all backend logic with the web app. No duplicate business logic.
- **Mobile-first, not mobile-shrunk.** Screens are designed for touch and one-handed use, not scaled-down versions of desktop layouts.
- **Offline-aware.** Queued mutations and cached reads for spotty connectivity at rental properties.
- **Feature parity over time.** Launch with core flows (properties, leases, bills, payments). Advanced features (listings, AI enhancement) come later.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | React Native + Expo (SDK 52+) | Managed workflow for fast iteration |
| **Navigation** | Expo Router (file-based) | Mirrors web app's Next.js App Router mental model |
| **Backend** | Convex | Shared with web — same queries, mutations, schema |
| **Auth** | Clerk Expo SDK | `@clerk/clerk-expo` for native auth flows |
| **State** | Convex `useQuery`/`useMutation` hooks | Real-time subscriptions out of the box |
| **Forms** | React Hook Form + Zod | Same validation schemas as web where possible |
| **UI Components** | NativeWind (Tailwind for RN) or Tamagui | Choose one — NativeWind if reusing Tailwind classes from web |
| **Charts** | Victory Native or react-native-chart-kit | For analytics/insights screens |
| **File Handling** | Expo ImagePicker, DocumentPicker | Camera capture + gallery + file selection |
| **Storage** | Expo SecureStore | Encrypted local storage for tokens/prefs |
| **Notifications** | Expo Notifications | Push via Convex actions → Expo Push API |
| **Testing** | Jest + React Native Testing Library + Detox | Unit + integration + E2E |

---

## 3. Navigation Structure

### 3.1 Bottom Tab Bar (5 tabs)

```
[Dashboard]  [Properties]  [Bills]  [Leases]  [More]
```

| Tab | Icon | Stack Screens |
|-----|------|---------------|
| **Dashboard** | Home | Dashboard home |
| **Properties** | Building | Property list → Property detail → Property wizard |
| **Bills** | Receipt | Bills list (tabbed: Bills / Insights) → Bill detail → Quick Add |
| **Leases** | FileText | Lease list → Lease detail → Lease form |
| **More** | Menu | Documents, Settings, Notifications, Listings, Admin |

### 3.2 Stack Navigation (within each tab)

Every tab is a stack navigator. Push/pop for drill-down. Modals for forms (slide up from bottom).

### 3.3 Deep Linking

| URL | Screen |
|-----|--------|
| `manageport://properties/:id` | Property detail |
| `manageport://leases?propertyId=:id` | Leases filtered by property |
| `manageport://bills?month=2025-04` | Bills for specific month |
| `manageport://notifications` | Notification center |

---

## 4. Screens & Features

### 4.1 Dashboard (Home)

**Layout:** Scrollable single column.

**Sections (top to bottom):**

1. **KPI Cards** (2x2 grid)
   - Total Properties (count)
   - Monthly Revenue (sum of active lease rents)
   - Occupancy Rate (occupied units / total units, percentage)
   - Outstanding Balance (sum of unpaid utility charges)
   - Each card tappable — navigates to relevant list

2. **Quick Actions** (horizontal scroll of icon buttons)
   - Add Property
   - Add Bill (Quick Add)
   - Add Lease
   - Upload Document
   - Record Payment

3. **Outstanding Balances** (card list, max 5, "View All" link)
   - Tenant name, property, amount, days overdue
   - Tap → payment recording modal

4. **Lease Alerts** (card list, max 3)
   - Leases expiring within 60 days
   - Tenant name, property, days remaining
   - Color: green (>30d), orange (15-30d), red (<15d)
   - Tap → lease detail

5. **Recent Activity** (timeline, max 5)
   - Property created, lease added, bill recorded, payment made
   - Chronological, newest first

**Pull-to-refresh** on entire screen.

---

### 4.2 Properties

#### 4.2.1 Property List

- **Search bar** at top (name, address)
- **Filter chips** below search: Type, Status
- **Card list** (FlatList, virtualized)
  - Property image (or default placeholder)
  - Name, address
  - Type badge, status badge
  - Unit count, bedrooms/baths
  - Monthly rent (from active leases)
- **FAB** (floating action button): Add Property → Property Wizard
- **Long press** on card: multi-select for bulk delete

#### 4.2.2 Property Detail

**Header:** Property image (or placeholder), name, address, edit button.

**Tabbed content (horizontal swipe or tab bar):**

**Info Tab:**
- Type, status
- Bedrooms, bathrooms, square feet
- Purchase date
- Monthly mortgage, monthly CapEx
- Edit button → edit form modal

**Units Tab:** (only for multi-family)
- Unit cards: identifier, status, display name
- Add unit button
- Tap unit → edit modal

**Leases Tab:**
- Active leases listed first (with expiry countdown)
- Expired leases collapsed by default
- Add lease button → lease form
- Tap lease → lease detail

**Documents Tab:**
- Documents linked to this property
- Upload button → document picker
- Tap document → preview

**Images Tab:**
- Photo gallery grid
- Camera button to take new photo
- Gallery button to pick existing
- Long press to set as cover or delete

**Financials Tab:**
- Monthly rent income
- Utility cost summary
- Outstanding charges
- Recent payments

---

#### 4.2.3 Property Creation Wizard

**Full-screen modal, 3 steps with progress indicator.**

**Step 1: Basics**
- Property name (required)
- Address (required)
- Type picker (Apartment, Condo, Single Family, Townhouse, Multi-Family, Duplex)
- Status (Vacant / Occupied / Under Maintenance)
- Bedrooms, Bathrooms, Square Feet (number inputs)
- Purchase date (date picker)
- Monthly mortgage (currency input, optional)
- CapEx (auto-calculated 10% of mortgage, editable)

**Step 2: Units**
- Single-family / Multi-family toggle
- If multi-family: unit count stepper (1-20)
- Auto-generated unit identifiers (A, B, C... or 1, 2, 3...)
- Optional custom display names per unit

**Step 3: Utility Setup**
- Preset quick-select: "Owner pays all" / "Tenants pay all" / "Custom split"
- If custom: slider per utility type per unit
- Validation: total must equal 100% per utility type
- Visual indicator: green check when valid

**Review & Submit:**
- Summary card showing all entered data
- Create button
- Back button on each step

---

### 4.3 Leases

#### 4.3.1 Lease List

- **Search bar:** tenant name
- **Filter chips:** Property, Status (Active/Pending/Expired)
- **Sections:**
  - Active & Pending (sorted by expiry date, soonest first)
  - Expired (collapsed, expandable)
- **Lease cards:**
  - Tenant name (large)
  - Property name + unit identifier
  - Monthly rent
  - Date range (start → end)
  - Status badge with days remaining (e.g., "Active - 30d left")
  - Quick actions via swipe: Edit, Delete
- **FAB:** Add Lease

#### 4.3.2 Lease Detail

- Tenant info card: name, email (tappable → compose), phone (tappable → call)
- Lease term: start date, end date, status badge, days remaining
- Financial: monthly rent, security deposit
- Unit assignment
- Utility responsibility snapshot (pill badges per utility type showing %)
- Documents section (lease PDF, attachments)
- Activity timeline
- Actions: Edit, Renew, Delete

#### 4.3.3 Lease Form (Modal)

**Fields:**
- Property picker (required)
- Unit picker (required for multi-unit, auto-selected for single-family)
- Tenant name (required)
- Tenant email (optional, keyboard type: email)
- Tenant phone (optional, keyboard type: phone)
- Start date (date picker, required)
- End date (date picker, required)
- Monthly rent (currency input, required)
- Security deposit (currency input, optional)
- Notes (text area)

**Utility Responsibility Section:**
- Expandable accordion per utility type
- Slider: 0% - 100%
- Auto-populated from property utility defaults
- Preset buttons: 25%, 50%, 75%, 100% (single-tenant shortcuts)

**Document Upload:**
- Attach lease PDF via document picker or camera

---

### 4.4 Utility Bills & Payments

#### 4.4.1 Bills List (Tabbed: Bills / Insights)

**Bills Tab:**

**Stats row** (horizontal scroll on phone):
- Total Bills (count)
- Unpaid Bills (count, orange)
- Total Amount ($)
- Outstanding Amount ($, red)

**Quick Add bar** (collapsed by default, expand on tap):
- Property picker
- Utility type picker
- Amount input
- Month picker
- "Add" button
- Stays expanded after first use for rapid entry

**Filter bar** (collapsible):
- Property, Utility Type, Payment Status, Month Range
- Reset button

**Bill list** (FlatList):
- Utility type icon + name
- Property name
- Bill month
- Amount (large)
- Paid/Unpaid badge
- Swipe left: Mark Paid, Delete
- Tap: Bill detail (charges + ledger)

**Insights Tab:**
- Monthly cost trends chart (line)
- Spending by utility type (pie/donut)
- Property comparison (bar)
- Seasonal patterns
- Anomaly alerts

#### 4.4.2 Bill Detail

- Bill info card: utility type, provider, amount, dates
- Charge breakdown (who owes what):
  - Tenant name, unit, percentage, charged amount, paid amount, remaining
  - Status badge per charge
  - Tap charge → record payment
- Attached document (if uploaded)
- Edit / Delete actions

#### 4.4.3 Bill Form (Modal)

- Property picker (required)
- Utility type picker (required) with provider autocomplete
- Bill month (month picker, required)
- Total amount (currency, required)
- Due date (date picker)
- Bill date (date picker)
- Billing period (picker: monthly, quarterly, etc.)
- "No tenant charges" toggle (for historical bills)
- Notes
- Document upload (camera or file picker)
- Live split preview at bottom

#### 4.4.4 Payment Recording (Modal)

Accessed from: Outstanding Balances, Bill Detail, or Charge row.

- Charge info header (tenant, utility type, amount owed)
- Amount to pay (currency input, pre-filled with remaining balance)
- Payment date (date picker, defaults to today)
- Payment method (picker: Cash, Check, Credit Card, Bank Transfer, Digital Wallet)
- Reference number (text, optional)
- Notes (text, optional)
- Submit button

On submit: charge status updates (pending → partial or paid), toast confirmation.

#### 4.4.5 Outstanding Balances (Full Screen)

Accessible from Dashboard KPI card or More menu.

- Grouped by property
- Each charge card: tenant, utility type, amount, days overdue
- Sort: by amount (desc), by date (oldest first)
- Tap → payment recording modal
- Summary at top: total outstanding, number of charges

---

### 4.5 Documents

#### 4.5.1 Document List

- **Search bar:** file name, tags
- **Filter chips:** Type (Lease, Utility Bill, Property, Insurance, Tax, Maintenance, Other), Property
- **Document cards:**
  - File icon (PDF, image, doc)
  - File name
  - Type badge
  - Associated property/lease
  - Upload date
  - Tags (if any)
  - Tap → preview
  - Swipe: Edit metadata, Delete

**FAB:** Upload Document

#### 4.5.2 Document Upload (Modal)

- File picker (documents) or Camera (photos)
- Auto-populated filename (editable)
- Type picker
- Property association (optional)
- Lease association (optional, filtered by property)
- Tags input (autocomplete from existing tags)
- Notes
- Upload progress bar
- Submit

#### 4.5.3 Document Preview

- PDF: in-app viewer (expo-file-system + WebView or react-native-pdf)
- Images: full-screen viewer with pinch-zoom
- Share button (native share sheet)
- Download button
- Edit metadata button
- Delete button

---

### 4.6 Settings

- **Theme:** Light / Dark / System (segmented control)
- **Notifications:**
  - Push notifications master toggle
  - Lease expiration alerts toggle
  - Payment reminders toggle
  - Utility bill reminders toggle
  - Utility anomaly alerts toggle
- **Display:**
  - Date format picker
  - Currency picker
  - Timezone picker
- **Dashboard Components:**
  - Toggle visibility for each dashboard section
  - Reorder (drag handles)
- **Account:**
  - Profile info (from Clerk)
  - Sign out button
  - Delete account (with confirmation)
- **About:**
  - App version
  - Terms of service link
  - Privacy policy link
  - Contact support

---

### 4.7 Notifications

- **Notification Center** (accessible from bell icon in header or More tab)
- List of all notifications, newest first
- Unread badge count on bell icon
- Mark as read on tap
- Swipe to dismiss
- Notification types:
  - Lease expiration (links to lease detail)
  - Payment reminder (links to outstanding balance)
  - Utility bill reminder (links to bill)
  - Utility anomaly (links to insights)
- Pull-to-refresh

---

### 4.8 Listings (Phase 2)

Deferred from initial launch. When implemented:

- Platform connections (OAuth flows via in-app browser)
- Listing dashboard with publish status
- Property selection → customize listing → publish
- Status tracking (active, error, paused, expired)

---

## 5. Data Model

The mobile app shares the Convex database with the web app. No schema changes needed. All 16 tables are accessed via the same queries and mutations.

### 5.1 Tables (Reference)

| Table | Key Fields | Primary Index |
|-------|-----------|---------------|
| **properties** | userId, name, address, type, status, bedrooms, bathrooms, monthlyMortgage, propertyType, utilityPreset | by_user |
| **units** | propertyId, unitIdentifier, status, displayName, isDefault | by_property |
| **leases** | userId, propertyId, unitId, tenantName, tenantEmail, tenantPhone, startDate, endDate, rent, securityDeposit | by_user, by_property |
| **leaseUtilitySettings** | leaseId, utilityType, responsibilityPercentage | by_lease |
| **utilityBills** | userId, propertyId, utilityType, provider, billMonth, totalAmount, dueDate, noTenantCharges | by_user, by_property |
| **utilityCharges** | leaseId, utilityBillId, unitId, tenantName, chargedAmount, responsibilityPercentage, status | by_lease, by_bill |
| **utilityPayments** | leaseId, utilityBillId, chargeId, tenantName, amountPaid, paymentDate, paymentMethod | by_lease, by_charge |
| **documents** | userId, storageId, name, type, propertyId, leaseId, tags, mimeType | by_user |
| **documentFolders** | userId, name, parentId, path | by_user |
| **propertyImages** | userId, propertyId, storageId, isCover, order | by_property |
| **userSettings** | userId, theme, dashboardComponents, notificationPreferences, displayPreferences | by_user |
| **listingPublications** | userId, propertyId, platform, status, externalUrl | by_user |
| **platformTokens** | userId, platform, accessToken, refreshToken, isValid | by_user_platform |
| **activityLog** | userId, entityType, entityId, action, description, timestamp | by_user_timestamp |
| **notifications** | userId, type, title, message, read, severity, createdAt | by_user, by_user_created |
| **utilityInsights** | (analytics data — anomalies, reminders) | by_user |

### 5.2 Key Business Logic (Shared with Web)

All business logic lives in Convex backend functions. The mobile app calls the same mutations/queries:

- **Lease status:** Computed from `startDate`/`endDate` — not stored. `getLeaseStatus(start, end)` returns active/pending/expired.
- **Utility charge generation:** `addUtilityBill` → auto-calls `rebuildChargesForBill()` → creates `utilityCharges` records.
- **Payment recording:** `recordUtilityPayment` → creates payment record → updates charge status (pending/partial/paid).
- **Occupancy rate:** Occupied units (units with active leases) / total units.
- **Notifications:** Generated by backend mutations (lease near expiry, overdue charges, utility anomalies).

---

## 6. Authentication

### 6.1 Clerk Expo Integration

```
@clerk/clerk-expo for native auth
- Sign up: email + password
- Sign in: email + password
- Session persistence via Expo SecureStore
- JWT tokens for Convex API authentication
```

### 6.2 Biometric Unlock (Enhancement)

- Face ID / Touch ID for returning users
- Optional — user enables in Settings
- Falls back to Clerk session if biometric fails

### 6.3 Security

- Tokens stored in Expo SecureStore (encrypted keychain)
- No sensitive data in AsyncStorage
- HTTPS for all API communication
- Session expiry handled by Clerk SDK

---

## 7. Offline Support

### 7.1 Strategy

| Operation | Offline Behavior |
|-----------|-----------------|
| **Read (queries)** | Show cached data with "offline" indicator |
| **Create (mutations)** | Queue locally, sync when online |
| **Update (mutations)** | Queue locally, sync when online |
| **Delete (mutations)** | Queue locally, sync when online |
| **File upload** | Queue file, upload when online |

### 7.2 Implementation

- Convex provides real-time subscriptions; cache last-known state
- Use `@tanstack/react-query` or custom persistence layer for offline cache
- Queue mutations in SQLite or MMKV for reliability
- Show sync status indicator in header
- Conflict resolution: last-write-wins (Convex default)

---

## 8. Push Notifications

### 8.1 Setup

1. Mobile app registers with Expo Push Notification service on login
2. Push token stored in Convex `userSettings` (new field: `expoPushToken`)
3. Convex actions send push notifications via Expo Push API

### 8.2 Notification Types

| Type | Trigger | Priority |
|------|---------|----------|
| Lease expiring | 60, 30, 14, 7 days before end date | High |
| Payment overdue | Charge unpaid > 7 days past due | High |
| Utility bill due | Bill due date approaching (3 days) | Medium |
| Utility anomaly | Bill > 30% above average | Low |
| Bill added | Confirmation after adding a bill | Low |

### 8.3 User Control

All notification types individually toggleable in Settings. Master push toggle to disable all.

---

## 9. Launch Phases

### Phase 1: Core MVP (Weeks 1-6)

**Screens:**
- Auth (sign in, sign up)
- Dashboard (KPIs, quick actions, outstanding balances)
- Properties (list, detail, creation wizard)
- Leases (list, detail, form)
- Utility Bills (list with tabs, Quick Add, bill form, bill detail)
- Payments (recording modal, outstanding balances)
- Settings (theme, notifications, account)

**Features:**
- Full CRUD for properties, units, leases, bills
- Utility charge auto-generation
- Payment recording with charge status updates
- Push notifications (lease expiry, overdue payments)
- Pull-to-refresh on all lists
- Offline read cache

**Not included in Phase 1:**
- Documents (upload, preview, management)
- Listings (platform integration)
- Analytics charts (Insights tab)
- Offline mutation queueing
- Biometric unlock

### Phase 2: Documents & Analytics (Weeks 7-10)

- Document upload (camera + file picker)
- Document preview (PDF, images)
- Document management (tags, metadata, search)
- Utility Insights tab (charts, trends, anomalies)
- Dashboard analytics section
- Biometric unlock option

### Phase 3: Listings & Polish (Weeks 11-14)

- Listing platform connections (OAuth via in-app browser)
- Publish properties to Apartments.com
- Listing status tracking
- AI listing enhancement
- Offline mutation queueing
- Performance optimization
- Accessibility audit

### Phase 4: Advanced (Weeks 15+)

- Rent payment tracking (separate from utility)
- Maintenance request system
- Tenant communication
- Multi-user team accounts
- Widget support (iOS/Android home screen)

---

## 10. Project Structure

```
manage-port-mobile/
  app/                          # Expo Router file-based routes
    (tabs)/                     # Bottom tab navigator group
      dashboard/
        index.tsx               # Dashboard home
      properties/
        index.tsx               # Property list
        [id].tsx                # Property detail
        wizard.tsx              # Property creation wizard
      bills/
        index.tsx               # Bills list (tabbed)
        [id].tsx                # Bill detail
        quick-add.tsx           # Quick add form
      leases/
        index.tsx               # Lease list
        [id].tsx                # Lease detail
      more/
        index.tsx               # More menu
        documents/
          index.tsx             # Document list
        settings.tsx            # Settings
        notifications.tsx       # Notification center
    (auth)/
      sign-in.tsx
      sign-up.tsx
    _layout.tsx                 # Root layout
  components/
    ui/                         # Base UI components (Button, Card, Input, Badge, etc.)
    forms/                      # Form components (PropertyForm, LeaseForm, BillForm)
    charts/                     # Chart components
    shared/                     # Shared components (EmptyState, LoadingState, etc.)
  hooks/
    useLeaseStatus.ts           # Computed lease status hook (port from web)
    useUtilityBillsData.ts      # Bills data + filtering hook (port from web)
    usePushNotifications.ts     # Push notification registration
  utils/
    leaseStatus.ts              # Lease status computation (port from web)
    formatting.ts               # Currency, date formatting
    validation.ts               # Zod schemas (shared with web where possible)
  convex/                       # Symlink or copy of shared Convex functions
  constants/
    colors.ts                   # Theme colors
    layout.ts                   # Spacing, breakpoints
  assets/                       # Images, fonts, icons
```

---

## 11. Shared Code Strategy

### 11.1 What's Shared (via monorepo or package)

- Convex schema, queries, mutations (entire `convex/` directory)
- Zod validation schemas
- Lease status computation utilities
- Utility type constants
- Business logic types/interfaces

### 11.2 What's Mobile-Only

- Navigation structure (Expo Router)
- UI components (NativeWind/Tamagui instead of Radix)
- File handling (Expo ImagePicker/DocumentPicker)
- Push notifications (Expo Notifications)
- Secure storage (Expo SecureStore)
- Biometric auth
- Camera integration

### 11.3 Monorepo Recommendation

```
manage-port/
  apps/
    web/          # Current Next.js app
    mobile/       # New Expo app
  packages/
    shared/       # Shared types, utils, validation
    convex/       # Convex backend (used by both)
```

Use Turborepo or Nx for monorepo orchestration.

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Cold start | < 2s |
| Screen transition | < 300ms |
| List scroll (60fps) | No frame drops with 100+ items |
| Form submission | < 1s perceived |
| Image upload | Background, with progress indicator |
| App size | < 50MB (iOS), < 30MB (Android) |
| Memory usage | < 150MB peak |
| Battery impact | Minimal (no background polling — Convex uses WebSocket subscriptions) |

---

## 13. Testing Strategy

| Level | Tool | Coverage |
|-------|------|----------|
| **Unit** | Jest | Business logic, utils, hooks |
| **Component** | React Native Testing Library | UI components, forms |
| **Integration** | RNTL + Convex test helpers | Full flows (create property → add lease → record bill) |
| **E2E** | Detox (or Maestro) | Critical user journeys on real device/simulator |
| **Visual** | Storybook for React Native | Component catalog + visual regression |

---

## 14. App Store Requirements

### iOS (App Store)
- Minimum iOS 16
- iPhone and iPad support (universal)
- Privacy nutrition labels (data collection disclosure)
- App Review guidelines compliance
- TestFlight for beta

### Android (Google Play)
- Minimum Android 10 (API 29)
- Material Design guidelines
- Privacy policy URL
- Target SDK 34+
- Internal testing track for beta

---

## 15. Success Metrics

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Mobile DAU / Web DAU | > 40% |
| Bills added via mobile | > 30% of total |
| Avg session length | > 3 minutes |
| App Store rating | > 4.5 stars |
| Crash-free rate | > 99.5% |
| Push notification opt-in | > 70% |
| Offline mutation sync success | > 99% |

---

## Appendix A: Utility Types

Electric, Water, Gas, Sewer, Trash, Internet, Cable, HOA, Other

## Appendix B: Property Types

Apartment, Condo, Single Family, Townhouse, Multi-Family, Duplex, Other

## Appendix C: Document Types

Lease, Utility Bill, Property, Insurance, Tax, Maintenance, Other

## Appendix D: Payment Methods

Cash, Check, Credit Card, Bank Transfer, Digital Wallet (Venmo/PayPal), Other

## Appendix E: Notification Types

| Type | Trigger | Default |
|------|---------|---------|
| `lease_expiration` | Lease ends within 60 days | On |
| `payment_reminder` | Charge unpaid > 7 days past due | On |
| `utility_bill_reminder` | Bill due date within 3 days | On |
| `utility_anomaly` | Bill > 30% above trailing average | On |

## Appendix F: Color System

| Semantic | Light | Dark |
|----------|-------|------|
| Active / Paid / Occupied | Green (#16a34a) | Green (#22c55e) |
| Pending / Warning | Orange (#f59e0b) | Amber (#fbbf24) |
| Expired / Error / Overdue | Red (#dc2626) | Red (#ef4444) |
| Info / Default | Blue (#2563eb) | Blue (#3b82f6) |
| Muted / Inactive | Gray (#6b7280) | Gray (#9ca3af) |
