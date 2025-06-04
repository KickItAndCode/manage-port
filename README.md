# ManagePort

A modern property management platform for landlords and property managers to efficiently manage their rental properties, leases, utilities, and documents.

## Features

- **Property Management**: Track multiple properties with detailed information, photos, and financial metrics
- **Multi-Unit Support**: Handle single-family, duplexes, triplexes, and apartment buildings with individual unit management
- **Lease Management**: Manage tenant leases, track payment schedules, and monitor lease expirations
- **Advanced Utility Bill Management**: Automatically split utility bills among tenants based on configurable percentages
- **Payment Tracking**: Record payments, track outstanding balances, and maintain complete payment history
- **Document Storage**: Securely store and organize property-related documents with easy access
- **Dashboard Analytics**: Visualize portfolio performance with charts and key metrics
- **Global Search**: Quickly find properties, leases, and documents across your portfolio
- **Mobile Responsive**: Fully responsive design that works seamlessly on all devices
- **Dark Mode**: Built-in dark mode support for comfortable viewing

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Convex (real-time backend platform)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS, Radix UI components
- **File Storage**: Convex file storage
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file
   - Add your Clerk and Convex API keys

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Testing

This project uses Playwright for end-to-end testing.

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Run basic UI tests (no authentication required)
npm run test:basic

# Run authentication setup test only
npm run test:auth-setup

# Run smoke tests for core functionality
npm run test:smoke
```

### Browser-Specific Testing

```bash
# Test on Chrome only
npm run test -- --project=chromium

# Test on Chrome and Firefox only
npm run test -- --project="chromium|firefox"

# Test on mobile devices only
npm run test -- --project="Mobile Chrome|Mobile Safari"

# Test without authentication (faster)
npm run test:no-auth
```

### Test Reports

```bash
# View last test report
npm run test:report

# Debug failed tests
npm run test:debug
```

## Project Structure

```
src/
├── app/              # Next.js app router pages
│   ├── dashboard/    # Analytics and overview
│   ├── properties/   # Property management
│   ├── leases/       # Lease management
│   ├── utility-bills/# Advanced utility bill management
│   ├── payments/     # Payment tracking and history
│   └── documents/    # Document storage
├── components/       # Reusable React components
├── lib/              # Utility functions and helpers
convex/              # Backend API functions and schema
```

## How to Set Up a Multi-Unit Property (e.g., Duplex with 50/50 Utility Split)

This guide walks through setting up a duplex property where utilities are split equally between two tenants.

### Step 1: Create Property
1. Navigate to **Properties** → **Add Property**
2. Fill in property details:
   - Name: "123 Main Street Duplex"
   - Type: **Multi-family**
   - Address, bedrooms, bathrooms, etc.
3. **Save property**

### Step 2: Create Units
1. On the property detail page, go to **Units section**
2. Click **Add Unit** (or use **Bulk Unit Creator**)
3. Create two units:
   - **Unit A**: "Unit A" or "Left Side"
   - **Unit B**: "Unit B" or "Right Side"
4. Set status to **Available** initially

### Step 3: Create Leases for Each Unit
1. Navigate to **Leases** → **Add Lease**
2. **First Lease**:
   - Property: Select the duplex
   - **Unit**: Select "Unit A"
   - Tenant Name: "John Smith"
   - Rent amount, dates, etc.
3. **Second Lease**:
   - Property: Select the duplex  
   - **Unit**: Select "Unit B"
   - Tenant Name: "Jane Doe"
   - Rent amount, dates, etc.

### Step 4: Configure 50/50 Utility Split
1. On **Leases page**, find the first lease
2. Click **Utility Settings** button
3. **Configure percentages** for each utility:
   - Electric: **50%** (Unit A)
   - Water: **50%** (Unit A)
   - Gas: **50%** (Unit A)
   - Sewer: **50%** (Unit A)
4. **Save** Unit A settings
5. **Repeat for Unit B** with remaining **50%** for each utility

### Step 5: Verify Configuration
1. Go to **Properties** → Select the duplex
2. View **Utility Responsibility Overview**
3. **Verify** each utility shows:
   - Unit A: 50%
   - Unit B: 50%  
   - Owner: 0%
   - Status: ✅ Complete (adds to 100%)

### Step 6: Add Utility Bills
1. Navigate to **Utility Bills** → **Add Bill**
2. Add monthly bills (Electric, Water, Gas, etc.)
3. **Automatic calculation** creates charges:
   - Unit A tenant gets 50% of each bill
   - Unit B tenant gets 50% of each bill

### Step 7: Track Payments
1. **Payments page** → **Outstanding Balances** shows what each tenant owes
2. **Record payments** as they come in
3. **Payment History** tracks all transactions

## Key Features of the Utility Management System

✅ **Automatic Calculations** - Once percentages are set, all future bills automatically split correctly  
✅ **Flexible Splits** - Can adjust percentages anytime (e.g., 60/40 if units are different sizes)  
✅ **Real-time Validation** - System prevents over-allocation (can't exceed 100%)  
✅ **Owner Responsibility** - Can assign portions to owner (e.g., common area utilities)  
✅ **Payment Tracking** - Complete audit trail of who paid what and when  
✅ **Outstanding Balances** - Clear view of what each tenant owes with aging  

The system handles complex scenarios like duplexes, triplexes, or mixed-use properties where different tenants might have different utility responsibilities.

## License

This project is licensed under the MIT License.
