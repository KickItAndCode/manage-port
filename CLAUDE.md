# Claude Project Guidelines

## Recent Major Accomplishments (December 2024)

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

### 🏗️ **Utility Responsibility System**
1. **Core Functionality**
   - ✅ Fixed utility bill calculation to allow 50% tenant + 50% owner splits
   - ✅ Updated validation logic to prevent over-allocation (>100%) while allowing owner coverage
   - ✅ Resolved unit identifier display issues (no more raw Convex IDs)
   - ✅ Enhanced UtilityResponsibilityOverview component for mobile responsiveness

2. **User Experience Improvements**
   - ✅ Created comprehensive UniversalUtilityAllocation component with:
     - Real-time progress feedback with color-coded status
     - Enhanced editing experience with visual state changes
     - Smart quick actions with percentage buttons (25%, 50%, 75%, 100%)
     - Smooth animations and micro-interactions
     - Improved information architecture
   - ✅ Shortened and clarified utility text descriptions
   - ✅ Added proper overflow handling and layout constraints

3. **Bug Fixes**
   - ✅ Fixed missing `cn` function import causing component crashes
   - ✅ Resolved unit identifier resolution to show proper names instead of IDs
   - ✅ Enhanced mobile layout with proper spacing and touch targets

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

## Testing Best Practices

1. Always take screenshots at key steps for debugging
2. Use proper authentication flows for tests that require login
3. Clean up test artifacts before each test run
4. Use environment variables for test credentials
5. Implement robust wait conditions and error handling

## Current Priorities

### High Priority Remaining Tasks
1. **Complete utility bill auto-charge generation** - Implement automatic tenant charge creation when bills are saved
2. **Update lease creation for unit assignment** - Enforce unit selection for multi-unit properties
3. **Standardize form design system** - Create consistent form styling with design tokens
4. **Create mobile-responsive table system** - Implement card view for mobile devices

### Medium Priority Tasks
5. **Implement bulk charge management interface** - Build comprehensive bulk operations for utility charges
6. **Build utility split testing suite** - Create comprehensive test coverage for utility functionality
7. **Update project documentation** - Maintain current documentation with recent changes