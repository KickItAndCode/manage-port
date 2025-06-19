# Claude Project Guidelines

## Memory
- Don't take credit for commit descriptions. Just make a detailed summary of the changes

## Recent Major Accomplishments (January 2025)

### 🏠 **Real Estate Listing Integration - IN PROGRESS** *(January 20, 2025)*
1. **Foundation Infrastructure - COMPLETED**
   - ✅ **Database schema extended** with listingPublications table
   - ✅ **Generic API client framework** with retry logic and rate limiting
   - ✅ **Image processing pipeline** with CDN integration and platform-specific optimization
   - ✅ **Background job system** for bulk operations (using Convex crons)
   - ✅ **TypeScript compilation fixed** - Resolved all errors in job processing system

2. **Documentation & Strategy - COMPLETED**
   - ✅ **Platform requirements research** - Comprehensive specifications for 5 major platforms
   - ✅ **Universal image optimization strategy** - Master image storage with platform variants
   - ✅ **Simplified integration plan** - Direct API approach eliminating 75% code complexity
   - ✅ **Multi-agent analysis** - Generated 4 expert perspectives and synthesized final plan

3. **Key Architecture Decisions**
   - ✅ **Direct API integration** for 1-3 properties (5-10 second response times)
   - ✅ **Background jobs only for bulk** operations (>3 platforms, >50 properties)
   - ✅ **Progressive enhancement** - Start with single platform before expanding
   - ✅ **Immediate user feedback** - No complex job queues for normal operations

4. **Platform Image Requirements Documented**
   - ✅ **Zillow**: Most restrictive at 200KB max file size
   - ✅ **Trulia**: JPEG-only format requirement
   - ✅ **Apartments.com**: Most flexible with 75MB limit
   - ✅ **Universal strategy**: JPEG format, 1024x768 min, progressive compression

5. **Next Steps & Timeline**
   - 🔄 **Week 1-2**: OAuth implementation and first platform adapter
   - 🔄 **Week 3**: User interface for direct publishing
   - 🔄 **Week 4**: Testing and production launch
   - ⏳ **Pending**: Platform API applications (2-3 week approval needed)

## Recent Major Accomplishments (June 2025)

### 🎨 **UI/UX Enhancements Completed**
1. **Document Management System Overhaul**
   - ✅ Redesigned document selection UI with modern bulk operations
   - ✅ Added intuitive checkboxes and selection indicators
   - ✅ Fixed download functionality with proper file type handling
   - ✅ Consolidated all actions into dropdown menus for consistency
   - ✅ Removed grid view, streamlined to list view only

2. **Bulk Operations Implementation**
   - ✅ Applied floating bulk actions toolbar to properties and leases pages
   - ✅ Implemented modern selection UI across all list views
   - ✅ Added comprehensive bulk delete functionality
   - ✅ Created consistent action patterns across the application

3. **Visual Design Improvements**
   - ✅ Added default property image that works in both light and dark modes
   - ✅ Fixed Enhanced Setup button styling (changed to outline variant)
   - ✅ Implemented proper responsive design patterns
   - ✅ Enhanced button spacing and touch targets for mobile

### 🔧 **Technical Fixes & Optimizations**
1. **Property Management Enhancements**
   - ✅ Fixed utility split slider appearing after Quick Fill in property wizard
   - ✅ Added toast notifications for property deletion with success messages
   - ✅ Implemented comprehensive cascading deletion for properties with associated data
   - ✅ Enhanced property deletion to handle units, leases, documents, and images safely

2. **Database Schema Improvements**
   - ✅ Removed payment day from lease schema (simplified to 1st of month assumption)
   - ✅ Updated all UI components to reflect schema changes
   - ✅ Fixed data integrity issues with property-lease-unit relationships

3. **Responsive Design Overhaul**
   - ✅ Redesigned properties page with mobile-first approach (cards + desktop table)
   - ✅ Updated leases page responsive design for consistency
   - ✅ Enhanced dashboard mobile responsiveness for iPhone 14 resolution
   - ✅ Fixed JSX syntax errors causing parsing issues

### 🏗️ **Utility Responsibility System - MAJOR OVERHAUL**
1. **Core Functionality - FULLY REBUILT**
   - ✅ **FIXED CRITICAL BUG**: Eliminated utility percentage over-allocation when adding leases sequentially
   - ✅ **Intelligent recalculation system**: All active leases recalculated when any lease becomes active
   - ✅ **Perfect mathematics**: Ensures exactly 100% allocation with smart remainder distribution
   - ✅ **Owner logic fixed**: Owner percentage only applies when units are vacant (as intended)
   - ✅ **Auto-apply utility defaults**: Seamless inheritance from property wizard settings
   - ✅ Updated validation logic to prevent over-allocation (>100%) while allowing owner coverage
   - ✅ Resolved unit identifier display issues (no more raw Convex IDs)

2. **User Experience Improvements - COMPLETELY REDESIGNED**
   - ✅ **Removed hanging button**: Eliminated problematic "Apply Wizard Defaults" button
   - ✅ **Renamed component**: UniversalUtilityAllocation → PropertyUtilityAllocation for clarity
   - ✅ **Smart contextual design**: Preset buttons (25%, 50%, 75%, 100%) only show for single tenants
   - ✅ **Enhanced responsive design**: Proper grid layouts and mobile-friendly interactions
   - ✅ **Improved visual hierarchy**: Gradient backgrounds, better spacing, and clear typography
   - ✅ **Contextual guidance**: Helpful text for multi-tenant vs single-tenant scenarios
   - ✅ Real-time progress feedback with color-coded status
   - ✅ Enhanced editing experience with visual state changes
   - ✅ Smooth animations and micro-interactions

3. **Backend Architecture Improvements**
   - ✅ **Comprehensive auto-apply system**: Modified addLease, updateLease, updateLeaseStatuses mutations
   - ✅ **Migration support**: Added applyDefaultsToExistingLeases function for existing data
   - ✅ **Atomic operations**: All utility settings updated together for consistency
   - ✅ **Error handling**: Robust validation and rollback mechanisms

### 📱 **Mobile Responsiveness Achievements**
1. **Cross-Platform Optimization**
   - ✅ Implemented mobile-first design patterns
   - ✅ Enhanced touch targets and interaction areas
   - ✅ Fixed layout issues on small form factors
   - ✅ Created consistent responsive behavior across all components

2. **Component-Level Improvements**
   - ✅ Updated utility responsibility component for mobile compatibility
   - ✅ Enhanced property and lease list views with card layouts
   - ✅ Optimized dashboard widgets for mobile viewing
   - ✅ Improved form layouts and input sizing for touch devices

### 🎯 **User Experience Enhancements**
1. **Navigation & Interaction**
   - ✅ Moved info actions to dropdown menus for cleaner interfaces
   - ✅ Implemented consistent action patterns across all pages
   - ✅ Enhanced button layouts and spacing for better usability
   - ✅ Added proper loading states and feedback mechanisms

2. **Error Handling & Validation**
   - ✅ Improved utility percentage validation with clear error messages
   - ✅ Enhanced form validation patterns across components
   - ✅ Added proper error boundaries and recovery mechanisms
   - ✅ Implemented graceful handling of edge cases

## Test Results Analysis

When asked to analyze test results or fix test issues, Claude should:

1. **Use Puppeteer MCP to scrape test results** from `http://localhost:9323/` when the Playwright HTML report is running
2. **Create a Puppeteer script** if the MCP is not available to extract test results and save them locally
3. **Analyze the scraped results** to identify specific errors, timeouts, and failed assertions
4. **Fix the underlying issues** in the test files based on the error analysis

## Commands to Run

### Testing
- `npm run lint` - Run linting
- `npm run typecheck` - Run TypeScript type checking
- `npx playwright test` - Run all Playwright tests
- `npx playwright test --project=add-property` - Run specific test project
- `npx playwright show-report` - Show test results at http://localhost:9323/

### Development
- `npm run dev` - Start development server
- `npm run build` - Build the project

## Project Structure

- `/tests/` - Playwright test files
- `/playwright/screenshots/` - Test screenshots for debugging
- `/test-results/` - Playwright test results and videos
- `/src/components/` - React components
- `/convex/` - Convex backend functions

## E2E Testing Guidelines

### Test Architecture & Organization

**Testing Strategy:**
- **70% Component Testing**: Use Playwright component testing for isolated, fast feedback
- **30% Page Testing**: Reserve for critical user journeys and integration scenarios
- **Feature-based Organization**: Group tests by user workflows, not UI structure
- **Test Isolation**: Each test must run independently and in parallel

**File Structure:**
```
/tests/
  helpers/
    auth-helpers.ts        # Authentication utilities
    form-helpers.ts        # Form interaction patterns
    navigation-helpers.ts  # Page navigation utilities
  components/              # Component-specific tests
  workflows/              # End-to-end user journey tests
  setup/
    auth.setup.ts         # Global authentication setup
```

### Selector Strategy (Priority Order)

**Priority 1: Role-based Selectors (Preferred)**
```typescript
// Best: Mirrors user interactions and accessibility
await page.getByRole('button', { name: 'Add Property' }).click();
await page.getByRole('textbox', { name: 'Property Name' }).fill('Test Property');
await page.getByRole('combobox', { name: 'Utility Type' }).selectOption('Electric');
```

**Priority 2: Data-testid Attributes (Required for complex elements)**
```typescript
// Good: Stable and purpose-built for testing
await page.getByTestId('utility-bill-form').isVisible();
await page.getByTestId('property-wizard-step-2').click();
```

**Priority 3: Text-based Selectors (For content verification)**
```typescript
// Good for content verification
await page.getByText('Total Bills: $150.00').isVisible();
await page.getByLabel('Due Date').fill('2024-12-15');
```

**Priority 4: CSS Selectors (Last Resort Only)**
```typescript
// Use only when other options aren't viable
await page.locator('.bill-item:first-child').click();
```

### Mandatory Data-testid Requirements

**UI Component Standards:**
- **ALL interactive elements** must have data-testid attributes
- **Forms**: `[component]-form` (e.g., `property-form`, `utility-bill-form`)
- **Buttons**: `[action]-[component]-button` (e.g., `add-property-button`, `save-bill-button`)
- **Lists**: `[component]-list` and `[component]-item` (e.g., `properties-list`, `property-item`)
- **Modals**: `[component]-modal` (e.g., `property-wizard-modal`)
- **Steps**: `[component]-step-[number]` (e.g., `wizard-step-1`)

**Naming Conventions:**
- Use kebab-case: `add-property-button`
- Be descriptive: `utility-bill-amount-input`
- Include context: `property-wizard-next-button`

**Implementation Example:**
```tsx
// React Component
<Button data-testid="add-property-button" onClick={handleAdd}>
  Add Property
</Button>

// Test Usage  
await page.getByTestId('add-property-button').click();
```

### Authentication Testing Standards

**Global Setup (Required):**
```typescript
// auth.setup.ts
setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: 'auth-state.json' });
});
```

**Test Dependencies:**
```typescript
// Use authenticated state in tests
test.use({ storageState: 'auth-state.json' });
```

### Wait Strategies & Error Handling

**Intelligent Waiting (Required):**
```typescript
// Good: Wait for specific conditions
await page.waitForResponse(response => 
  response.url().includes('/api/properties') && response.status() === 200
);

// Good: Wait for elements with timeout
await expect(page.getByTestId('properties-list')).toBeVisible({ timeout: 10000 });

// Avoid: Hard timeouts
await page.waitForTimeout(2000); // ❌ Never use this
```

**Error Recovery Patterns:**
```typescript
// Implement retry mechanisms
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await page.waitForTimeout(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

### Performance Testing Standards

**Test Execution Budgets:**
- **Component tests**: < 5 seconds each
- **Page tests**: < 30 seconds each  
- **Full test suite**: < 10 minutes total

**Screenshot Guidelines:**
- **Development**: Take screenshots only on failure
- **CI/CD**: Minimal screenshots to reduce execution time
- **Debugging**: Full-page screenshots with descriptive names

**Parallel Execution:**
```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 2 : '50%',
  use: {
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

### Mobile & Responsive Testing

**Required Viewports:**
- **Mobile**: iPhone 14 (390x844)
- **Tablet**: iPad Pro (1024x1366)  
- **Desktop**: 1280x720 minimum

**Testing Patterns:**
```typescript
test.describe('Responsive behavior', () => {
  test('Mobile shows card layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/properties');
    await expect(page.getByTestId('properties-cards')).toBeVisible();
    await expect(page.getByTestId('properties-table')).not.toBeVisible();
  });
});
```

### Test Data Management

**Fixture-based Setup (Required):**
```typescript
// Create deterministic test data
export const testData = {
  property: {
    name: 'Test Property 123',
    address: '123 Test Street',
    type: 'Single Family'
  }
};

// Automatic cleanup
test.afterEach(async ({ page }) => {
  await cleanupTestData(page);
});
```

**Multi-tenant Isolation:**
```typescript
// Ensure tenant data separation
test('Tenant A cannot access Tenant B data', async ({ page }) => {
  await page.goto('/properties?tenant=A');
  const tenantAData = await page.getByTestId('properties-list').textContent();
  
  await page.goto('/properties?tenant=B');  
  const tenantBData = await page.getByTestId('properties-list').textContent();
  
  expect(tenantAData).not.toEqual(tenantBData);
});
```

### Accessibility Testing Integration

**Automated A11y Scans (Required):**
```typescript
import { AxeBuilder } from '@axe-core/playwright';

test('Properties page meets WCAG 2.1 AA standards', async ({ page }) => {
  await page.goto('/properties');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
    
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Legacy Best Practices (Maintained)

1. Use proper authentication flows for tests that require login
2. Clean up test artifacts before each test run  
3. Use environment variables for test credentials
4. Take screenshots only on test failures for debugging

## 🎯 **CRITICAL PRIORITIES (January 2025)**

Based on comprehensive application audit and recent development work:

### **🚨 URGENT - Platform Integration Tasks**
1. **SUBMIT PLATFORM API APPLICATIONS** ⚡ **IMMEDIATE ACTION REQUIRED**
   - **Apartments.com API access** - 2-3 week approval process
   - **Rentspree syndication** - Covers 30+ listing sites
   - **Zillow Rental Network** - Partnership application needed
   - **Impact**: Blocking entire listing integration feature without API access

2. **IMPLEMENT OAUTH & FIRST PLATFORM** ⚠️ **(Timeline: 1-2 weeks)**
   - **OAuth 2.0 flow** with secure token storage in Convex
   - **Apartments.com adapter** with direct API integration
   - **User interface** for publishing with real-time feedback
   - **Impact**: Prove concept with single platform before expansion

3. **FIX REMAINING TECHNICAL DEBT** ⚠️ **(Timeline: 1 week)**
   - **62 TypeScript linting warnings** (down from 103)
   - **E2E testing infrastructure** - Authentication timeouts
   - **Mobile responsiveness gaps** - Utility bills table, modals
   - **Impact**: Blocks safe development and deployment confidence

### **⭐ HIGH-VALUE OPPORTUNITIES**
4. **PROPERTY IMAGE GALLERY SYSTEM** **(Timeline: 3-4 weeks)**
   - **Business Value: VERY HIGH** - Professional photos attract better tenants
   - **Higher rents** - Quality images justify premium pricing
   - **Competitive advantage** - Professional credibility vs larger companies

5. **SMART NOTIFICATION SYSTEM** **(Timeline: 2-3 weeks)**  
   - **Prevent lost income** - Automated lease renewal reminders (90, 60, 30 days)
   - **Avoid late fees** - Utility payment deadline alerts
   - **Peace of mind** - Automated oversight of critical deadlines

6. **ENHANCED SEARCH AND FILTERING** **(Timeline: 2-3 weeks)**
   - **Global search** across properties, tenants, documents
   - **Advanced filtering** by multiple criteria  
   - **Essential** as portfolio grows beyond 10-15 properties

### **🔧 TECHNICAL DEBT**
7. **Mobile responsiveness gaps** - Utility bills table, property wizard modal sizing
8. **Performance optimization** - N+1 queries, image optimization, bundle size
9. **Document management improvements** - Categories, search, expiration tracking

### **📈 FUTURE FEATURES**  
10. **Advanced analytics dashboard** - Financial performance tracking, utility trends
11. **Bulk operations system** - Multiple property updates, batch operations
12. **Integration possibilities** - Accounting software, payment processors

## 🎯 **RECOMMENDED EXECUTION PLAN**

### **Phase 1: Listing Integration Foundation (Weeks 1-2)**
- Submit platform API applications immediately
- Fix remaining technical debt (62 linting warnings)
- Build OAuth 2.0 infrastructure
- Create first platform adapter (Apartments.com)

### **Phase 2: Direct API Integration (Weeks 3-4)**
- Implement listing publishing UI with real-time feedback
- Add property listing tab and preview components
- Test end-to-end publishing workflow
- Launch beta with 5-10 power users

### **Phase 3: Multi-Platform Expansion (Weeks 5-6)**
- Add syndication service (Rentspree) for 30+ platforms
- Implement bulk publishing for multiple properties
- Performance optimization and monitoring
- Full production rollout

### **Phase 4: High-Value Features (Weeks 7-10)**
- Property image gallery system enhancement
- Smart notification system
- Enhanced search and filtering
- Mobile responsiveness improvements