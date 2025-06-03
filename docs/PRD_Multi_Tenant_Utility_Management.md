# Product Requirements Document (PRD)
# Multi-Tenant Property & Utility Management System

## 1. Executive Summary

### 1.1 Purpose
This document outlines the requirements for upgrading the Manage Port property management system to support multi-tenant properties (duplex, triplex, quadplex) with sophisticated utility bill splitting capabilities.

### 1.2 Background
Currently, the system supports single-family properties with one lease per property. Landlords managing multi-unit properties need to:
- Track multiple tenants per property
- Split utility bills based on configurable percentages
- Handle percentage changes between leases
- Maintain accurate financial records for each unit

### 1.3 Goals
- Enable management of multi-unit properties
- Automate utility bill splitting based on lease agreements
- Provide clear financial tracking per tenant
- Maintain simplicity and ease of use
- Ensure backward compatibility with existing single-family properties

## 2. User Stories

### 2.1 Landlord Stories
1. **As a landlord**, I want to designate my property as multi-unit so I can manage multiple tenants.
2. **As a landlord**, I want to create separate leases for each unit with custom utility percentages.
3. **As a landlord**, I want to enter monthly utility bills once and have them automatically split between tenants.
4. **As a landlord**, I want to track which tenants have paid their utility portions.
5. **As a landlord**, I want to adjust utility percentages when creating new leases.

### 2.2 Tenant Stories
1. **As a tenant**, I want to see my utility charges clearly broken down by type and percentage.
2. **As a tenant**, I want to understand how my charges were calculated.
3. **As a tenant**, I want to track my utility payment history.

## 3. Functional Requirements

### 3.1 Property Management
- **FR-1.1**: System shall allow properties to be designated as single-family or multi-family
- **FR-1.2**: Multi-family properties shall support 2-10 units
- **FR-1.3**: Each unit shall have a unique identifier within the property
- **FR-1.4**: Units can be marked as available, occupied, or under maintenance

### 3.2 Lease Management
- **FR-2.1**: Leases shall be associated with specific units (not just properties)
- **FR-2.2**: Each lease shall define utility responsibility percentages by utility type
- **FR-2.3**: System shall validate that percentages sum to 100% across all active leases
- **FR-2.4**: One active lease per unit shall be enforced
- **FR-2.5**: Utility percentages shall be configurable per lease and utility type

### 3.3 Utility Bill Management
- **FR-3.1**: Landlords shall enter utility bills on a monthly basis
- **FR-3.2**: Bills shall be automatically split based on active lease percentages
- **FR-3.3**: System shall calculate and display each tenant's share before saving
- **FR-3.4**: Historical bills and splits shall be maintained for reporting
- **FR-3.5**: Support for common utility types: Electric, Water, Gas, Sewer, Trash, Internet

### 3.4 Payment Tracking
- **FR-4.1**: Track tenant payments against utility charges
- **FR-4.2**: Display outstanding utility balances per tenant
- **FR-4.3**: Generate monthly utility statements for tenants
- **FR-4.4**: Support partial payments and payment methods

### 3.5 Reporting
- **FR-5.1**: Utility cost breakdown by unit and time period
- **FR-5.2**: Payment history and outstanding balance reports
- **FR-5.3**: Annual utility expense reports for tax purposes
- **FR-5.4**: Utility trends and comparisons

## 4. Non-Functional Requirements

### 4.1 Usability
- **NFR-1.1**: Unit setup should take less than 2 minutes per property
- **NFR-1.2**: Monthly bill entry should take less than 30 seconds per utility
- **NFR-1.3**: Mobile-responsive design for on-the-go management

### 4.2 Performance
- **NFR-2.1**: Bill splitting calculations should complete in under 1 second
- **NFR-2.2**: Support up to 1000 properties per user without degradation

### 4.3 Compatibility
- **NFR-3.1**: Existing single-family properties continue to work unchanged
- **NFR-3.2**: No data migration required for current users

### 4.4 Security
- **NFR-4.1**: Tenant data isolation - tenants can only see their own charges
- **NFR-4.2**: Audit trail for all financial entries and modifications

## 5. User Interface Requirements

### 5.1 Property Configuration
- Clear toggle/selection for property type (single vs multi-family)
- Intuitive unit management interface with bulk operations
- Visual indicators for unit occupancy status

### 5.2 Lease Creation
- Utility percentage configuration with visual feedback
- Validation warnings for percentages not summing to 100%
- Option to copy settings from previous leases

### 5.3 Bill Entry
- Single screen for entering all monthly utilities
- Real-time calculation preview
- Bulk upload support for bill documents

### 5.4 Tenant Portal
- Clear breakdown of charges with explanations
- Payment history and receipts
- Mobile-optimized views

## 6. Technical Architecture

### 6.1 Data Model Changes
- New tables: units, utilityBills, leaseUtilitySettings, tenantUtilityCharges
- Updated tables: leases (add unitId), properties (add propertyType)
- Maintain referential integrity with proper indexes

### 6.2 API Endpoints
- CRUD operations for units
- Utility bill entry and calculation
- Payment recording and tracking
- Reporting and analytics queries

### 6.3 Calculation Engine
- Percentage-based split calculator
- Proration support for mid-month changes
- Validation for percentage totals

## 7. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Database schema updates
- Unit management backend
- Basic UI for unit configuration

### Phase 2: Lease Integration (Week 3-4)
- Update lease system for units
- Utility percentage configuration
- Validation and business rules

### Phase 3: Bill Management (Week 5-6)
- Bill entry interface
- Automatic calculation engine
- Charge generation

### Phase 4: Financial Features (Week 7-8)
- Payment tracking
- Reporting dashboards
- Tenant statements

### Phase 5: Polish & Launch (Week 9-10)
- Testing and bug fixes
- Documentation
- User onboarding flow

## 8. Success Metrics

### 8.1 Adoption Metrics
- 50% of multi-property landlords adopt within 3 months
- 90% user satisfaction rating

### 8.2 Efficiency Metrics
- 75% reduction in time spent on utility management
- 90% reduction in calculation errors

### 8.3 Financial Metrics
- 95% on-time utility payment rate
- 80% reduction in payment disputes

## 9. Risks and Mitigation

### 9.1 Complexity Risk
- **Risk**: System becomes too complex for users
- **Mitigation**: Progressive disclosure, wizards, smart defaults

### 9.2 Data Integrity Risk
- **Risk**: Incorrect calculations lead to financial disputes
- **Mitigation**: Comprehensive testing, audit trails, preview before save

### 9.3 Adoption Risk
- **Risk**: Users resist change from current workflow
- **Mitigation**: Maintain backward compatibility, provide training

## 10. Future Enhancements

- OCR bill scanning
- Utility company API integrations
- Automated payment collection
- Predictive analytics for utility costs
- Smart meter integration
- Multi-language support

## 11. Appendices

### Appendix A: Mockups
[Reference to UI mockups and wireframes]

### Appendix B: Technical Specifications
[Detailed API documentation and data schemas]

### Appendix C: User Research
[Summary of user interviews and feedback]