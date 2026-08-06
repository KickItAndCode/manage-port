# Component Inventory - ManagePort

**Last Updated**: 2025-01-27  
**Phase**: 0 - Enablement  
**Status**: In Progress

## Overview

This document catalogs all form inputs, selects, tables, and UI components across the application to identify duplicates, inconsistencies, and migration targets for Phase 1.

---

## Form Components Inventory

### Primary Forms (High Traffic)

| Component | Location | Styling Approach | Status | Migration Priority |
|-----------|----------|------------------|--------|-------------------|
| `LeaseForm` | `src/components/LeaseForm.tsx` | ⚠️ Mixed (Custom + UI) | Needs Migration | **HIGH** |
| `PropertyForm` | `src/components/PropertyForm.tsx` | ✅ UI Components | Good | Medium |
| `UtilityBillForm` | `src/components/UtilityBillForm.tsx` | ✅ UI Components | Good | Medium |
| `UnitForm` | `src/components/UnitForm.tsx` | ✅ UI Components | Good | Low |
| `DocumentForm` | `src/components/DocumentForm.tsx` | ✅ UI Components | Good | Low |
| `PaymentRecordForm` | `src/components/PaymentRecordForm.tsx` | ✅ UI Components | Good | Low |
| `LeaseUtilitySettingsForm` | `src/components/LeaseUtilitySettingsForm.tsx` | ✅ UI Components | Good | Low |
| `LeaseUtilityResponsibilityForm` | `src/components/LeaseUtilityResponsibilityForm.tsx` | ⚠️ Mixed | Needs Migration | Medium |
| `DocumentUploadForm` | `src/components/DocumentUploadForm.tsx` | ✅ UI Components | Good | Low |
| `PropertyCreationWizard` | `src/components/PropertyCreationWizard.tsx` | ⚠️ Custom Selects | Needs Migration | **HIGH** |

### Form Issues Identified

#### 1. Select Element Inconsistencies

**Pattern A: Custom Dark Mode Styling** (LeaseForm.tsx, PropertyCreationWizard.tsx)
```tsx
<select className="w-full h-10 px-3 rounded-md border transition-all outline-none bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary">
```
- **Files**: `LeaseForm.tsx` (lines 163-175, 183-184, 286-287), `PropertyCreationWizard.tsx` (line 568)
- **Issue**: Inline custom styling, not using shared component

**Pattern B: Simple Border** (UtilityBillForm.tsx - legacy)
```tsx
<select className="w-full h-10 px-3 rounded-md border bg-background">
```
- **Files**: UtilityBillForm.tsx (lines 321, 352, 437) - **NOTE**: Already migrated to SelectNative
- **Status**: ✅ Fixed

**Pattern C: UI Select Component** (Most forms)
```tsx
<SelectNative {...register("propertyId")}>
  <option value="">Select property</option>
</SelectNative>
```
- **Files**: PropertyForm.tsx, UtilityBillForm.tsx, DocumentForm.tsx, etc.
- **Status**: ✅ Correct pattern

#### 2. Label Inconsistencies

**Pattern A: Manual Label Styling** (LeaseForm.tsx, PropertyCreationWizard.tsx)
```tsx
<label className="block text-sm font-medium text-foreground dark:text-gray-200">Property *</label>
```
- **Files**: `LeaseForm.tsx` (lines 162, 205, 216, 225, 237, 246, 257, 270, 284, 314), `PropertyCreationWizard.tsx` (lines 558, 567)
- **Issue**: Not using `<Label>` component

**Pattern B: UI Label Component** (Most forms)
```tsx
<FormField label="Property" required error={errors.propertyId?.message}>
```
- **Files**: PropertyForm.tsx, UtilityBillForm.tsx, UnitForm.tsx, etc.
- **Status**: ✅ Correct pattern

#### 3. Form Container Variations

**Pattern A: Custom Dark Gradient** (LeaseForm.tsx, PropertyForm.tsx)
```tsx
<div className="dark:bg-gradient-to-br dark:from-gray-900/50 dark:to-gray-800/30 dark:border dark:border-gray-700/50 dark:rounded-lg dark:p-6">
```
- **Files**: LeaseForm.tsx (line 137), PropertyForm.tsx (line 118)
- **Issue**: Should use `<FormContainer>` component

**Pattern B: Simple Container** (Most forms)
```tsx
<form className="space-y-4">
```
- **Status**: ✅ Acceptable, but should standardize

#### 4. Textarea Inconsistencies

**Pattern A: Custom Textarea** (LeaseForm.tsx)
```tsx
<textarea className="w-full px-3 py-2 rounded-md border transition-all outline-none min-h-[80px] bg-background dark:bg-gray-900/50 border-input dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30 focus:border-primary dark:focus:border-primary resize-y">
```
- **Files**: LeaseForm.tsx (lines 315-317)
- **Issue**: Not using `<Textarea>` component

**Pattern B: UI Textarea Component**
```tsx
<Textarea id="notes" />
```
- **Status**: ✅ Correct pattern

---

## UI Component Library Status

### Existing Components (`src/components/ui/`)

| Component | Status | Notes |
|-----------|--------|-------|
| `input.tsx` | ✅ Complete | Well-designed, consistent |
| `label.tsx` | ✅ Complete | Radix UI based |
| `select.tsx` | ✅ Complete | Radix UI Select |
| `select-native.tsx` | ✅ Complete | Native select wrapper |
| `textarea.tsx` | ✅ Complete | Standard textarea |
| `form-field.tsx` | ✅ Complete | FormField wrapper |
| `form-container.tsx` | ✅ Complete | FormContainer wrapper |
| `button.tsx` | ✅ Complete | Variants supported |
| `badge.tsx` | ✅ Complete | Status badges |
| `status-badge.tsx` | ✅ Complete | Enhanced status badges |
| `skeleton.tsx` | ✅ Complete | Loading states |
| `table.tsx` | ✅ Complete | Base table |
| `responsive-table.tsx` | ✅ Complete | Mobile-responsive table |
| `card.tsx` | ✅ Complete | Card component |
| `dialog.tsx` | ✅ Complete | Modal dialogs |
| `alert.tsx` | ✅ Complete | Alert messages |
| `sonner.tsx` | ✅ Complete | Toast notifications |

### Missing Components (To Be Created)

| Component | Priority | Notes |
|-----------|----------|-------|
| `FormGrid` | High | Grid layout helper for forms |
| `FormActions` | High | Standardized form action buttons |
| `FormSection` | Medium | Section divider for multi-step forms |

---

## Table Components Inventory

### Current Table Usage

| Page | Component | Status | Notes |
|------|-----------|--------|-------|
| Properties | Custom table | ⚠️ Needs Migration | Should use ResponsiveTable |
| Leases | Custom table/cards | ⚠️ Needs Migration | Should use ResponsiveTable |
| Utility Bills | Custom table | ⚠️ Needs Migration | Should use ResponsiveTable |
| Payments | Custom table | ⚠️ Needs Migration | Should use ResponsiveTable |
| Documents | Custom table | ⚠️ Needs Migration | Should use ResponsiveTable |

### Table Component Status

- ✅ `responsive-table.tsx` exists and is well-designed
- ⚠️ Not consistently used across pages
- **Action**: Migrate all table views to use ResponsiveTable component

---

## Component Usage by Page

### Properties Page (`src/app/properties/page.tsx`)
- **Forms**: PropertyForm, PropertyCreationWizard
- **Tables**: Custom table implementation
- **Issues**: PropertyCreationWizard uses custom selects
- **Migration**: High priority

### Leases Page (`src/app/leases/page.tsx`)
- **Forms**: LeaseForm, LeaseUtilitySettingsForm, LeaseUtilityResponsibilityForm
- **Tables**: Custom card/table implementation
- **Issues**: LeaseForm uses custom selects and labels
- **Migration**: High priority

### Utility Bills Page (`src/app/utility-bills/page.tsx`)
- **Forms**: UtilityBillForm
- **Tables**: Custom table implementation
- **Status**: ✅ Forms use UI components
- **Migration**: Medium priority (table only)

### Payments Page (`src/app/payments/page.tsx`)
- **Forms**: PaymentRecordForm
- **Tables**: Custom table implementation
- **Status**: ✅ Forms use UI components
- **Migration**: Medium priority (table only)

### Documents Page (`src/app/documents/page.tsx`)
- **Forms**: DocumentForm, DocumentUploadForm
- **Tables**: Custom table implementation
- **Status**: ✅ Forms use UI components
- **Migration**: Low priority (table only)

---

## Migration Priority Matrix

### Phase 1 - Critical (Week 1-2)
1. ✅ **LeaseForm** - Migrate custom selects/labels to SelectNative + FormField
2. ✅ **PropertyCreationWizard** - Migrate custom selects to SelectNative + FormField
3. ✅ **LeaseUtilityResponsibilityForm** - Standardize mixed patterns

### Phase 1 - High (Week 2-3)
4. ✅ **All table views** - Migrate to ResponsiveTable component
5. ✅ **Form containers** - Standardize to FormContainer component

### Phase 1 - Medium (Week 3-4)
6. ✅ **FormGrid** - Create and apply to multi-column forms
7. ✅ **FormActions** - Create and standardize form buttons

---

## Component Owners & Dependencies

| Component | Owner/File | Dependencies | Notes |
|-----------|-----------|--------------|-------|
| LeaseForm | `src/components/LeaseForm.tsx` | SelectNative, FormField, Input, Textarea | Needs migration |
| PropertyForm | `src/components/PropertyForm.tsx` | SelectNative, FormField, Input | ✅ Good |
| UtilityBillForm | `src/components/UtilityBillForm.tsx` | SelectNative, FormField, Input | ✅ Good |
| PropertyCreationWizard | `src/components/PropertyCreationWizard.tsx` | Input, custom selects | Needs migration |

---

## Next Steps

1. ✅ Complete component inventory (this document)
2. ⏳ Create design tokens system (`src/styles/tokens.ts`)
3. ⏳ Document UI system guidelines (`docs/ui/`)
4. ⏳ Set up Storybook for component documentation
5. ⏳ Begin Phase 1 migrations (LeaseForm, PropertyCreationWizard)

---

## Notes

- Most forms already use UI components correctly
- Main issues are in LeaseForm and PropertyCreationWizard
- Table components need standardization across all pages
- Form container patterns need unification
- Design tokens will enable easier migrations

