# Multi-Tenant Utility Management - Implementation Tasks

## Phase 1: Database Schema & Foundation (Week 1-2)

### Task 1: Create Database Schema Updates
**Priority: High | Estimated: 8 hours**

#### Subtasks:
1. **Create units table schema** (2 hours)
   - Define table structure in convex/schema.ts
   - Add fields: propertyId, unitIdentifier, status, notes, createdAt
   - Add indexes: by_property, by_status
   - Create TypeScript types for Unit

2. **Create utilityBills table schema** (2 hours)
   - Define table structure for monthly bill entries
   - Add fields: userId, propertyId, utilityType, provider, billMonth, totalAmount, dueDate, etc.
   - Add indexes: by_property, by_user, by_month, by_type
   - Create TypeScript types

3. **Create leaseUtilitySettings table schema** (1 hour)
   - Define structure for lease-specific utility percentages
   - Add fields: leaseId, utilityType, responsibilityPercentage, notes
   - Add indexes: by_lease, by_utility_type
   - Create TypeScript types

4. **Create tenantUtilityCharges table schema** (1 hour)
   - Define structure for calculated tenant charges
   - Add fields: leaseId, unitId, utilityBillId, chargedAmount, isPaid, etc.
   - Add indexes: by_lease, by_bill, by_payment_status
   - Create TypeScript types

5. **Update existing schemas** (2 hours)
   - Add unitId field to leases table (optional)
   - Add propertyType field to properties table
   - Update TypeScript interfaces
   - Ensure backward compatibility

### Task 2: Implement Unit Management Backend
**Priority: High | Estimated: 12 hours**

#### Subtasks:
1. **Create units.ts Convex module** (3 hours)
   - Implement addUnit mutation
   - Implement updateUnit mutation  
   - Implement deleteUnit mutation with cascade protection
   - Add validation for unique unit identifiers per property

2. **Create unit query functions** (2 hours)
   - getUnit: Single unit by ID
   - getUnitsByProperty: All units for a property
   - getUnitWithLease: Unit with current lease info
   - getAvailableUnits: Units without active leases

3. **Update properties module** (3 hours)
   - Add getPropertyWithUnits query
   - Add convertToMultiUnit mutation
   - Update property deletion to check for units
   - Add property type validation

4. **Create unit validation helpers** (2 hours)
   - Validate unit identifier uniqueness
   - Prevent deletion of occupied units
   - Validate property ownership
   - Check unit status transitions

5. **Add unit-related statistics** (2 hours)
   - Occupancy rate calculations
   - Unit-based revenue tracking
   - Vacancy duration tracking
   - Unit comparison analytics

### Task 3: Update Lease System for Units
**Priority: High | Estimated: 10 hours**

#### Subtasks:
1. **Update lease mutations** (3 hours)
   - Modify addLease to accept unitId
   - Update lease validation for unit-based leases
   - Ensure one active lease per unit rule
   - Maintain backward compatibility for propertyId-only leases

2. **Create lease utility settings functions** (3 hours)
   - Add setLeaseUtilities mutation
   - Validate percentage totals across units
   - Copy utilities from previous lease function
   - Update utilities when lease changes

3. **Update lease queries** (2 hours)
   - Modify getLeases to include unit information
   - Add getLeasesByUnit query
   - Update lease statistics to handle units
   - Add utility percentage summary query

4. **Migration utilities** (2 hours)
   - Create helper to migrate existing leases
   - Add default unit for single-family properties
   - Ensure data integrity during transition
   - Create rollback mechanism

## Phase 2: Utility Bill Management System (Week 3-4)

### Task 4: Implement Utility Bill Entry Backend
**Priority: High | Estimated: 14 hours**

#### Subtasks:
1. **Create utilityBills.ts module** (4 hours)
   - Implement addUtilityBill mutation
   - Implement updateUtilityBill mutation
   - Implement deleteUtilityBill mutation
   - Add bulk bill entry mutation

2. **Build calculation engine** (4 hours)
   - Create calculateTenantCharges function
   - Handle percentage-based splitting
   - Support proration for partial months
   - Validate percentage totals

3. **Create charge generation system** (3 hours)
   - Auto-generate tenantUtilityCharges on bill entry
   - Handle updates when bill is modified
   - Support manual adjustments
   - Create charge reversal function

4. **Implement bill queries** (3 hours)
   - getUtilityBills with filtering
   - getUtilityBillWithCharges
   - getUnpaidBills summary
   - getBillsByMonth for comparison

### Task 5: Payment Tracking System
**Priority: High | Estimated: 8 hours**

#### Subtasks:
1. **Create payment mutations** (3 hours)
   - recordUtilityPayment mutation
   - Support partial payments
   - Handle overpayments/credits
   - Create payment reversal function

2. **Payment queries** (2 hours)
   - getOutstandingCharges by tenant
   - getPaymentHistory
   - getUtilityBalance summary
   - Payment analytics queries

3. **Automated reminders** (3 hours)
   - Create reminder generation logic
   - Track reminder history
   - Support custom reminder schedules
   - Email/SMS integration prep

## Phase 3: User Interface Implementation (Week 5-6)

### Task 6: Property & Unit Management UI
**Priority: High | Estimated: 16 hours**

#### Subtasks:
1. **Create Unit Management Component** (4 hours)
   - Build UnitList component
   - Create AddUnitDialog
   - Implement EditUnitForm
   - Add unit status badges

2. **Update Property Pages** (4 hours)
   - Add property type selector
   - Show unit grid for multi-family
   - Create unit quick-add interface
   - Add occupancy visualization

3. **Build Unit Detail View** (4 hours)
   - Display unit information
   - Show current/past leases
   - Display utility history
   - Add maintenance notes section

4. **Create conversion wizard** (4 hours)
   - Build ConvertToMultiUnitWizard
   - Add unit template selector
   - Implement bulk unit creation
   - Add confirmation and preview

### Task 7: Lease UI Updates
**Priority: High | Estimated: 12 hours**

#### Subtasks:
1. **Update Lease Forms** (4 hours)
   - Add unit selector dropdown
   - Build UtilityPercentageForm component
   - Create percentage validation UI
   - Add copy-from-previous feature

2. **Create Utility Settings Component** (4 hours)
   - Build interactive percentage sliders
   - Show real-time validation
   - Display current split preview
   - Add utility type management

3. **Update Lease List Views** (4 hours)
   - Show unit information in tables
   - Add unit-based filtering
   - Update lease cards for mobile
   - Show utility percentage summary

### Task 8: Utility Bill Entry Interface
**Priority: High | Estimated: 16 hours**

#### Subtasks:
1. **Create Bill Entry Form** (5 hours)
   - Build UtilityBillForm component
   - Add month/year selector
   - Create provider autocomplete
   - Add bill document upload

2. **Build Split Preview Component** (4 hours)
   - Create BillSplitPreview
   - Show tenant breakdown
   - Display percentage validation
   - Add adjustment interface

3. **Implement Bulk Entry Screen** (4 hours)
   - Create MultiUtilityEntry page
   - Support entering multiple bills
   - Add quick navigation
   - Implement save all function

4. **Create Bill Management Views** (3 hours)
   - Build utility bill list/table
   - Add filtering and search
   - Create bill detail modal
   - Add edit capabilities

## Phase 4: Financial Features & Reporting (Week 7-8)

### Task 9: Payment Management UI
**Priority: Medium | Estimated: 10 hours**

#### Subtasks:
1. **Create Payment Recording Interface** (3 hours)
   - Build PaymentRecordForm
   - Support multiple payment methods
   - Add payment confirmation
   - Create receipt generation

2. **Build Outstanding Balance Views** (3 hours)
   - Create BalanceSummary component
   - Add tenant balance cards
   - Show aging information
   - Add payment history

3. **Tenant Statement Generator** (4 hours)
   - Create statement template
   - Add PDF generation
   - Build email integration
   - Add custom messaging

### Task 10: Reporting Dashboard
**Priority: Medium | Estimated: 12 hours**

#### Subtasks:
1. **Create Utility Analytics Dashboard** (4 hours)
   - Build cost trend charts
   - Add utility type breakdown
   - Create YoY comparison
   - Add seasonal analysis

2. **Build Financial Reports** (4 hours)
   - Create expense summary report
   - Add tax report generator
   - Build payment reconciliation
   - Add custom date ranges

3. **Implement Tenant Portal Views** (4 hours)
   - Create tenant dashboard
   - Add charge history view
   - Build payment interface
   - Add dispute mechanism

## Phase 5: Testing & Polish (Week 9-10)

### Task 11: Comprehensive Testing
**Priority: High | Estimated: 16 hours**

#### Subtasks:
1. **Unit Testing** (4 hours)
   - Test calculation engine
   - Validate business rules
   - Test edge cases
   - Add integration tests

2. **UI Testing** (4 hours)
   - Test all user flows
   - Validate mobile responsiveness
   - Check accessibility
   - Performance testing

3. **Data Migration Testing** (4 hours)
   - Test single to multi conversion
   - Validate data integrity
   - Test rollback procedures
   - Load testing

4. **User Acceptance Testing** (4 hours)
   - Create test scenarios
   - Document findings
   - Fix critical issues
   - Gather feedback

### Task 12: Documentation & Launch
**Priority: Medium | Estimated: 8 hours**

#### Subtasks:
1. **Create User Documentation** (3 hours)
   - Write setup guide
   - Create video tutorials
   - Build FAQ section
   - Add tooltips/help text

2. **Developer Documentation** (2 hours)
   - Document API changes
   - Update schema docs
   - Create migration guide
   - Add code examples

3. **Launch Preparation** (3 hours)
   - Create feature announcement
   - Build onboarding flow
   - Set up analytics
   - Plan rollout strategy

## Additional Enhancements (Future)

### Task 13: Advanced Features
**Priority: Low | Estimated: 20+ hours**

#### Subtasks:
1. **OCR Bill Scanning** (8 hours)
   - Research OCR services
   - Implement bill parsing
   - Create correction UI
   - Add learning system

2. **Automated Integrations** (8 hours)
   - Research utility APIs
   - Build integration framework
   - Create sync mechanisms
   - Add error handling

3. **Smart Notifications** (4 hours)
   - Build notification preferences
   - Create smart triggers
   - Add delivery channels
   - Track engagement

## Total Estimated Hours: ~170 hours

## Critical Path:
1. Database Schema (Task 1) → 
2. Unit Management Backend (Task 2) → 
3. Lease System Updates (Task 3) → 
4. Utility Bill Backend (Task 4) → 
5. Core UI Components (Tasks 6, 7, 8)

## Risk Mitigation:
- Start with backend implementation to ensure data integrity
- Build UI components in parallel where possible  
- Maintain backward compatibility throughout
- Test thoroughly at each phase before proceeding