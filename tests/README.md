# Playwright Testing Setup

This directory contains end-to-end tests for the Property Management application using Playwright.

## Quick Start

### Run All Tests
```bash
npm test
```

### Run Tests with UI Mode (Visual Test Runner)
```bash
npm run test:ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npm run test:headed
```

### Debug Tests
```bash
npm run test:debug
```

### View Test Report
```bash
npm run test:report
```

## Test Structure

```
tests/
├── auth.setup.ts           # Authentication setup for all tests
├── dashboard.spec.ts       # Dashboard functionality tests
├── navigation.spec.ts      # Navigation and routing tests
├── property-management.spec.ts  # Property CRUD operations
└── helpers/
    └── test-data.ts        # Test data factories and helpers
```

## Test Categories

### 🔐 Authentication Tests
- User login flow
- Session management
- Protected route access

### 🏠 Property Management Tests
- Create, read, update, delete properties
- Property form validation
- Property details navigation

### 📊 Dashboard Tests
- Dashboard statistics display
- Quick actions functionality
- Analytics visualization

### 🧭 Navigation Tests
- Page navigation
- Mobile responsiveness
- Loading states

### 💰 Utility Management Tests
- Utility bill creation
- Payment recording
- Statement generation

## Configuration

### Environment Variables
Create a `.env.local` file for test configuration:

```env
# Test user credentials (for Clerk authentication)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your-test-password

# Test database configuration
TEST_DATABASE_URL=your-test-db-url
```

### Browser Configuration
Tests run on:
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit/Safari (Desktop)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

## Best Practices

### Writing Tests
1. **Use descriptive test names**: `should display property form when Add Property is clicked`
2. **Test user flows, not implementation**: Focus on what users do, not how it's coded
3. **Use test data factories**: Import from `helpers/test-data.ts`
4. **Wait for elements properly**: Use `expect().toBeVisible()` instead of manual waits
5. **Clean up test data**: Remove created test data after tests

### Test Data
```typescript
import { TestData, TestHelpers } from './helpers/test-data';

// Use consistent test data
await TestHelpers.fillPropertyForm(page, TestData.property.basic);
```

### Debugging Failed Tests
1. **Screenshot on failure**: Automatically captured in `test-results/`
2. **Video recording**: Available for failed tests
3. **Trace viewer**: Run `npx playwright show-trace trace.zip`
4. **Debug mode**: Run `npm run test:debug` for step-by-step debugging

## CI/CD Integration

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main`

### GitHub Actions Setup
The workflow file is located at `.github/workflows/playwright.yml`

### Required Secrets
Add these secrets to your GitHub repository:
- `TEST_USER_EMAIL`: Test account email
- `TEST_USER_PASSWORD`: Test account password

## Common Commands

```bash
# Install Playwright browsers
npx playwright install

# Run specific test file
npx playwright test dashboard.spec.ts

# Run tests matching pattern
npx playwright test --grep "property"

# Run tests in specific browser
npx playwright test --project=chromium

# Generate test code by recording actions
npx playwright codegen localhost:3000
```

## Troubleshooting

### Authentication Issues
- Ensure test credentials are valid
- Check Clerk configuration for test environment
- Verify auth setup in `auth.setup.ts`

### Test Timeouts
- Increase timeout in `playwright.config.ts`
- Add explicit waits for slow-loading content
- Check network conditions in CI

### Flaky Tests
- Use Playwright's auto-wait features
- Avoid hard-coded sleep() calls
- Test in multiple browsers to identify browser-specific issues

### Development Server Issues
- Ensure dev server starts successfully
- Check port 3000 is available
- Verify `webServer` configuration in `playwright.config.ts`

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Add tests for new features
3. Update test data factories as needed
4. Ensure tests pass in all browsers
5. Add documentation for complex test scenarios