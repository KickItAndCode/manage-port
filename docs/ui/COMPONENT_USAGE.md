# Component Usage Guidelines

## Overview

This document provides guidelines for using the ManagePort UI component library consistently across the application.

## Component Library Location

All UI components are located in `src/components/ui/`. These are the building blocks for all forms, tables, and interactive elements.

## Core Form Components

### FormField

**Purpose**: Wrapper component for form inputs with label, error handling, and consistent spacing.

**Usage:**
```tsx
import { FormField } from '@/components/ui/form-field';

<FormField
  label="Property Name"
  required
  error={errors.name?.message}
>
  <Input {...register("name")} />
</FormField>
```

**Props:**
- `label` (string): Field label text
- `required` (boolean): Show required indicator
- `error` (string | undefined): Error message to display
- `children` (ReactNode): The input element

**Best Practices:**
- Always use FormField for form inputs
- Include error prop for validation feedback
- Use `required` prop instead of HTML `required` attribute

### SelectNative

**Purpose**: Styled native select element with consistent theming.

**Usage:**
```tsx
import { SelectNative } from '@/components/ui/select-native';

<FormField label="Property Type" required error={errors.type?.message}>
  <SelectNative {...register("type")}>
    <option value="">Select property type</option>
    <option value="single-family">Single Family</option>
    <option value="duplex">Duplex</option>
  </SelectNative>
</FormField>
```

**When to Use:**
- Simple dropdowns with <10 options
- When you need native mobile select behavior
- For form selects that don't need search

**When NOT to Use:**
- For selects with many options (use Radix Select with search)
- When you need custom option rendering

### Input

**Purpose**: Text input with consistent styling and dark mode support.

**Usage:**
```tsx
import { Input } from '@/components/ui/input';

<FormField label="Property Name" required error={errors.name?.message}>
  <Input
    type="text"
    {...register("name")}
    placeholder="Enter property name"
  />
</FormField>
```

**Supported Types:**
- `text`, `email`, `password`, `number`, `date`, `tel`, `url`

### Textarea

**Purpose**: Multi-line text input with consistent styling.

**Usage:**
```tsx
import { Textarea } from '@/components/ui/textarea';

<FormField label="Notes" error={errors.notes?.message}>
  <Textarea
    {...register("notes")}
    placeholder="Enter notes"
    rows={4}
  />
</FormField>
```

### FormContainer

**Purpose**: Container component for form sections with consistent padding and styling.

**Usage:**
```tsx
import { FormContainer } from '@/components/ui/form-container';

<FormContainer>
  <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
  {/* Form fields */}
</FormContainer>
```

## Layout Components

### FormGrid (To Be Created)

**Purpose**: Grid layout helper for multi-column forms.

**Planned Usage:**
```tsx
import { FormGrid } from '@/components/ui/form-grid';

<FormGrid cols={2}>
  <FormField label="Bedrooms">
    <Input type="number" />
  </FormField>
  <FormField label="Bathrooms">
    <Input type="number" />
  </FormField>
</FormGrid>
```

### FormActions (To Be Created)

**Purpose**: Standardized form action buttons container.

**Planned Usage:**
```tsx
import { FormActions } from '@/components/ui/form-actions';

<FormActions>
  <Button type="button" variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button type="submit" disabled={loading}>
    {loading ? 'Saving...' : 'Save'}
  </Button>
</FormActions>
```

## Data Display Components

### ResponsiveTable

**Purpose**: Table component that switches to card view on mobile.

**Usage:**
```tsx
import { ResponsiveTable } from '@/components/ui/responsive-table';

<ResponsiveTable
  data={properties}
  columns={[
    { key: 'name', label: 'Property Name' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' },
  ]}
  mobileCard={(item) => (
    <div>
      <h3>{item.name}</h3>
      <p>{item.type}</p>
    </div>
  )}
/>
```

**When to Use:**
- For all table views (properties, leases, utilities, payments)
- When you need mobile-responsive data display

### StatusBadge

**Purpose**: Consistent status indicators with semantic colors.

**Usage:**
```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="active" />
<StatusBadge status="expiring" />
<StatusBadge status="expired" />
```

**Status Values:**
- `active`, `expiring`, `expired`, `available`, `occupied`, `maintenance`

## Feedback Components

### Skeleton

**Purpose**: Loading state placeholder.

**Usage:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

{loading ? (
  <>
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </>
) : (
  <DataTable data={data} />
)}
```

### Toast (Sonner)

**Purpose**: Non-intrusive notifications.

**Usage:**
```tsx
import { toast } from 'sonner';

toast.success('Property created successfully');
toast.error('Failed to save property');
toast.info('Processing...');
```

## Common Patterns

### Complete Form Example

```tsx
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormContainer } from '@/components/ui/form-container';
import { useForm } from 'react-hook-form';

export function PropertyForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer>
        <FormField
          label="Property Name"
          required
          error={errors.name?.message}
        >
          <Input {...register("name")} placeholder="Enter property name" />
        </FormField>

        <FormField
          label="Property Type"
          required
          error={errors.type?.message}
        >
          <SelectNative {...register("type")}>
            <option value="">Select type</option>
            <option value="single-family">Single Family</option>
          </SelectNative>
        </FormField>

        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea {...register("notes")} rows={4} />
        </FormField>

        <div className="flex gap-2 justify-end mt-6">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </FormContainer>
    </form>
  );
}
```

## Migration Checklist

When migrating existing forms:

- [ ] Replace custom `<select>` with `<SelectNative>`
- [ ] Replace custom `<label>` with `<FormField label="...">`
- [ ] Replace custom error styling with `FormField` error prop
- [ ] Wrap form sections in `<FormContainer>`
- [ ] Use `<Input>` and `<Textarea>` components
- [ ] Remove hardcoded spacing/colors, use tokens
- [ ] Test dark mode support
- [ ] Verify accessibility (labels, ARIA attributes)

## Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| FormField | ✅ Ready | Use for all form inputs |
| SelectNative | ✅ Ready | Use for simple selects |
| Input | ✅ Ready | Use for text inputs |
| Textarea | ✅ Ready | Use for multi-line text |
| FormContainer | ✅ Ready | Use for form sections |
| FormGrid | ⏳ Planned | Phase 1 |
| FormActions | ⏳ Planned | Phase 1 |
| ResponsiveTable | ✅ Ready | Use for all tables |
| StatusBadge | ✅ Ready | Use for status indicators |
| Skeleton | ✅ Ready | Use for loading states |

## Related Documentation

- [Design Tokens](./DESIGN_TOKENS.md)
- [Form Patterns](./FORM_PATTERNS.md)
- [Component Inventory](../../COMPONENT_INVENTORY.md)

