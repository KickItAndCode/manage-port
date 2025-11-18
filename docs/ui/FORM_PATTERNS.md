# Form Patterns - Best Practices

## Overview

This document outlines common form patterns and best practices for the ManagePort application.

## Standard Form Structure

```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  <FormContainer>
    {/* Section Header */}
    <h3 className="text-lg font-semibold mb-4">Section Title</h3>
    
    {/* Form Fields */}
    <FormField label="Field Name" required error={errors.field?.message}>
      <Input {...register("field")} />
    </FormField>
    
    {/* Form Actions */}
    <div className="flex gap-2 justify-end mt-6">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </Button>
    </div>
  </FormContainer>
</form>
```

## Pattern 1: Single Column Form

**Use Case**: Simple forms with few fields

```tsx
<FormContainer>
  <FormField label="Property Name" required error={errors.name?.message}>
    <Input {...register("name")} placeholder="Enter property name" />
  </FormField>
  
  <FormField label="Address" required error={errors.address?.message}>
    <Input {...register("address")} placeholder="Enter address" />
  </FormField>
  
  <FormField label="Notes" error={errors.notes?.message}>
    <Textarea {...register("notes")} rows={4} />
  </FormField>
</FormContainer>
```

## Pattern 2: Two Column Grid

**Use Case**: Forms with related fields that fit side-by-side

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField label="Bedrooms" required error={errors.bedrooms?.message}>
    <Input type="number" {...register("bedrooms", { valueAsNumber: true })} />
  </FormField>
  
  <FormField label="Bathrooms" required error={errors.bathrooms?.message}>
    <Input type="number" {...register("bathrooms", { valueAsNumber: true })} />
  </FormField>
</div>
```

## Pattern 3: Multi-Section Form

**Use Case**: Complex forms with logical groupings

```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
  {/* Basic Information Section */}
  <FormContainer>
    <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
    <FormField label="Property Name" required>
      <Input {...register("name")} />
    </FormField>
    <FormField label="Property Type" required>
      <SelectNative {...register("type")}>
        <option value="">Select type</option>
        {/* options */}
      </SelectNative>
    </FormField>
  </FormContainer>
  
  {/* Financial Information Section */}
  <FormContainer>
    <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
    <FormField label="Purchase Price" required>
      <Input type="number" {...register("price", { valueAsNumber: true })} />
    </FormField>
    <FormField label="Monthly Rent" required>
      <Input type="number" {...register("rent", { valueAsNumber: true })} />
    </FormField>
  </FormContainer>
  
  {/* Form Actions */}
  <div className="flex gap-2 justify-end">
    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

## Pattern 4: Conditional Fields

**Use Case**: Fields that appear based on other field values

```tsx
const propertyType = watch("type");

<FormField label="Property Type" required>
  <SelectNative {...register("type")}>
    <option value="">Select type</option>
    <option value="multi-family">Multi-Family</option>
    <option value="single-family">Single Family</option>
  </SelectNative>
</FormField>

{propertyType === "multi-family" && (
  <FormField label="Number of Units" required>
    <Input type="number" {...register("units", { valueAsNumber: true })} />
  </FormField>
)}
```

## Pattern 5: Form with Validation

**Use Case**: Forms requiring client-side validation

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, "Property name is required"),
  type: z.string().min(1, "Property type is required"),
  bedrooms: z.number().min(0, "Bedrooms must be 0 or greater"),
});

export function PropertyForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Property Name" required error={errors.name?.message}>
        <Input {...register("name")} />
      </FormField>
      
      {/* More fields */}
    </form>
  );
}
```

## Pattern 6: Loading States

**Use Case**: Forms that show loading state during submission

```tsx
export function PropertyForm({ onSubmit, loading }) {
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Property Name" required>
        <Input {...register("name")} disabled={loading} />
      </FormField>
      
      <div className="flex gap-2 justify-end mt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </form>
  );
}
```

## Pattern 7: Error Handling

**Use Case**: Forms that need to display server-side errors

```tsx
export function PropertyForm({ onSubmit, serverError }) {
  const { register, handleSubmit, formState: { errors }, setError } = useForm();

  useEffect(() => {
    if (serverError) {
      setError("root", { message: serverError });
    }
  }, [serverError, setError]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      
      <FormField label="Property Name" required error={errors.name?.message}>
        <Input {...register("name")} />
      </FormField>
      
      {/* More fields */}
    </form>
  );
}
```

## Accessibility Best Practices

### ✅ DO

- Always use `<FormField>` with proper labels
- Include `required` prop for required fields
- Display error messages using the `error` prop
- Use semantic HTML (`<form>`, `<button type="submit">`)
- Provide loading states for async operations
- Use ARIA attributes when needed (aria-invalid, aria-describedby)

### ❌ DON'T

- Don't use placeholder text as labels
- Don't hide error messages
- Don't disable form validation
- Don't use `<div>` for buttons
- Don't skip focus management

## Common Mistakes to Avoid

1. **Mixing styling approaches**: Don't combine custom CSS with component classes
2. **Hardcoded values**: Use design tokens instead of pixel values
3. **Missing error states**: Always handle and display validation errors
4. **Inconsistent spacing**: Use FormField and FormContainer for consistent spacing
5. **Missing loading states**: Always show feedback during async operations

## Migration Examples

### Before (Inconsistent)

```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-foreground dark:text-gray-200">
    Property Name *
  </label>
  <input
    className="w-full h-10 px-3 rounded-md border bg-background"
    {...register("name")}
  />
  {errors.name && (
    <span className="text-sm text-red-500 mt-1">{errors.name.message}</span>
  )}
</div>
```

### After (Consistent)

```tsx
<FormField label="Property Name" required error={errors.name?.message}>
  <Input {...register("name")} placeholder="Enter property name" />
</FormField>
```

## Related Documentation

- [Component Usage Guidelines](./COMPONENT_USAGE.md)
- [Design Tokens](./DESIGN_TOKENS.md)
- [Component Inventory](../../COMPONENT_INVENTORY.md)

