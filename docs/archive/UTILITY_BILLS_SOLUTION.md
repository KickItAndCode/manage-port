# Utility Bills - Historical Settlement Solution

## Problem Summary

User imported historical utility bills that should be marked as already settled, but the system was showing them as outstanding tenant charges based on current lease utility responsibility settings (78% and 22%).

## Root Cause Analysis

1. **System Always Calculates Tenant Charges**: The utility bills system calculates tenant charges on-demand based on:
   - Active leases for the property
   - Lease utility responsibility settings (percentage allocations)
   - Bill amounts

2. **No Settlement Mechanism**: The existing `landlordPaidUtilityCompany` field only tracks whether the landlord paid the utility company, NOT whether tenant charges should be generated.

3. **Historical vs Current Bills**: No distinction between:
   - Current bills that should generate tenant charges
   - Historical bills that are already settled

## Solution Implemented

### 1. Database Schema Enhancement

**Added new field to `utilityBills` table:**
```typescript
noTenantCharges: v.optional(v.boolean()), // If true, don't generate tenant charges
```

### 2. Backend Logic Updates

**Modified charge calculation functions:**
- `calculateTenantCharges()`: Returns empty array if `noTenantCharges` is true
- `calculateChargesForBill()`: Same logic for optimization functions
- All mutation functions updated to support the new field

**New bulk operation:**
- `bulkMarkNoTenantCharges()`: Bulk update bills to set/unset the flag

### 3. User Interface Enhancements

**UtilityBillForm:**
- Added checkbox: "Historical Bill - No Tenant Charges"
- Clear explanation text for the option

**Utility Bills Page:**
- New bulk actions:
  - "Mark as Historical" - Sets `noTenantCharges: true`
  - "Enable Tenant Charges" - Sets `noTenantCharges: false`

### 4. Analysis Tool

**New query function:**
- `getBillsTenantChargeStatus()`: Analyzes all bills to show:
  - Which bills have the flag set
  - Which bills are generating charges
  - Which historical bills might need the flag

## How to Use

### For Historical Bills (Already Settled)

1. **Individual Bills:**
   - Edit the bill
   - Check "Historical Bill - No Tenant Charges" 
   - Save

2. **Bulk Historical Bills:**
   - Select multiple bills in the utility bills page
   - Choose "Mark as Historical" from bulk actions
   - Confirm the action

### For Current Bills (Should Generate Charges)

1. **New Bills:**
   - Leave "Historical Bill - No Tenant Charges" unchecked (default)
   - System will generate tenant charges based on lease settings

2. **Convert Historical to Current:**
   - Select bills 
   - Choose "Enable Tenant Charges" from bulk actions
   - System will start generating tenant charges

## Technical Implementation Details

### Backend Changes

1. **Schema (convex/schema.ts):**
   ```typescript
   noTenantCharges: v.optional(v.boolean())
   ```

2. **Mutations Updated:**
   - `addUtilityBill`
   - `updateUtilityBill` 
   - `bulkAddUtilityBills`
   - New: `bulkMarkNoTenantCharges`

3. **Charge Calculation:**
   ```typescript
   if (bill.noTenantCharges) {
     return []; // No tenant charges
   }
   ```

### Frontend Changes

1. **Form Enhancement (UtilityBillForm.tsx):**
   - Added checkbox input
   - Updated form submission
   - Added to TypeScript interfaces

2. **Bulk Operations (utility-bills/page.tsx):**
   - New bulk action handlers
   - Updated table configuration
   - Added confirmation dialogs

## Migration Strategy for Existing Bills

### Identify Historical Bills
Use the analysis query to find bills that might need the flag:
```typescript
const status = await getBillsTenantChargeStatus({ userId, propertyId });
```

### Recommended Approach
1. **Review bills older than 60 days** that are generating tenant charges
2. **Bulk mark as historical** for truly settled bills
3. **Keep recent bills** generating charges for current tenant billing

## Benefits

1. **Accurate Financial Tracking**: Separates historical/settled bills from current tenant obligations
2. **Flexible Management**: Easy to convert between historical and current billing
3. **Bulk Operations**: Efficient handling of multiple bills
4. **Clear UI**: Obvious distinction between bill types
5. **Non-Breaking**: Existing bills continue to work normally (default behavior unchanged)

## Database Migration Notes

- **No migration required**: New field is optional, defaults to `undefined`
- **Backward compatible**: Existing bills continue normal behavior
- **Performance impact**: Minimal - just an additional boolean check
- **Rollback safe**: Can remove the feature without data loss

## Usage Examples

### Scenario 1: Import Historical Bills
```
1. Bulk import bills from previous year
2. Select all imported bills
3. Bulk action: "Mark as Historical"
4. Result: No tenant charges generated
```

### Scenario 2: Monthly Current Bills
```
1. Add new monthly bills (normal process)
2. Leave "Historical Bill" unchecked
3. Result: Tenant charges calculated based on lease settings
```

### Scenario 3: Convert Historical to Current
```
1. Need to reopen old bill for tenant billing
2. Select the bill
3. Bulk action: "Enable Tenant Charges"  
4. Result: Tenant charges now appear for that bill
```

This solution provides complete control over when utility bills generate tenant charges while maintaining backward compatibility and providing clear migration paths for existing data.