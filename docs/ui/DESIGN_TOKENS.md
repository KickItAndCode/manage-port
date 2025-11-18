# Design Tokens - Usage Guidelines

## Overview

The ManagePort design token system provides a single source of truth for spacing, typography, colors, and other design values. All components should reference these tokens rather than hardcoding values.

## Token Source

Design tokens are defined in `src/styles/tokens.ts` and can be imported in TypeScript/TSX files:

```typescript
import { tokens, spacing, colors, typography } from '@/styles/tokens';
```

## Usage Patterns

### In TypeScript/React Components

```tsx
import { spacing, colors, formStates } from '@/styles/tokens';

// Use tokens in style objects
const styles = {
  padding: spacing.form.padding,
  color: colors.primary,
  borderColor: formStates.focus.border,
};
```

### In Tailwind Classes

Tokens are primarily used through Tailwind's utility classes, which reference CSS custom properties defined in `globals.css`. For example:

```tsx
// Use Tailwind utilities that map to tokens
<div className="p-6 text-primary border-primary">
  {/* p-6 uses spacing.scale[6], text-primary uses colors.primary */}
</div>
```

### Form-Specific Tokens

For form components, use the form-specific spacing tokens:

```tsx
import { spacing } from '@/styles/tokens';

// Form field gap
<div className="space-y-4"> {/* spacing.form.fieldGap */}

// Form section gap  
<section className="space-y-6"> {/* spacing.form.sectionGap */}

// Input height
<input className="h-10" /> {/* spacing.form.fieldHeight */}
```

## Token Categories

### Typography

```typescript
import { typography } from '@/styles/tokens';

// Font sizes
typography.fontSize.xs    // 12px
typography.fontSize.sm    // 14px
typography.fontSize.base  // 16px
typography.fontSize.lg    // 18px

// Font weights
typography.fontWeight.normal   // 400
typography.fontWeight.medium   // 500
typography.fontWeight.semibold // 600
```

### Spacing

```typescript
import { spacing } from '@/styles/tokens';

// Form spacing
spacing.form.fieldGap      // 1rem (16px)
spacing.form.sectionGap    // 1.5rem (24px)
spacing.form.padding       // 1.5rem (24px)
spacing.form.fieldHeight   // 2.5rem (40px)

// General spacing scale
spacing.scale[0]  // 0
spacing.scale[1]  // 0.25rem (4px)
spacing.scale[4]  // 1rem (16px)
spacing.scale[6]  // 1.5rem (24px)
```

### Colors

```typescript
import { colors } from '@/styles/tokens';

// Semantic colors
colors.background
colors.foreground
colors.primary
colors.secondary
colors.muted
colors.destructive
colors.border
colors.input
colors.ring

// Status colors
colors.success
colors.warning
colors.info
```

### Form States

```typescript
import { formStates } from '@/styles/tokens';

// Default state
formStates.default.border
formStates.default.background

// Focus state
formStates.focus.border
formStates.focus.ring
formStates.focus.ringOpacity.light
formStates.focus.ringOpacity.dark

// Error state
formStates.error.border
formStates.error.ring
formStates.error.text

// Disabled state
formStates.disabled.opacity
formStates.disabled.cursor
```

### Radius

```typescript
import { radius } from '@/styles/tokens';

radius.sm    // calc(var(--radius) - 4px)
radius.md    // calc(var(--radius) - 2px)
radius.base  // var(--radius) - 0.625rem
radius.lg    // var(--radius) - 0.625rem
radius.xl    // calc(var(--radius) + 4px)
```

## Best Practices

### ✅ DO

- Use tokens for all spacing, colors, and typography values
- Reference form-specific tokens for form components
- Use semantic color names (primary, destructive) rather than raw colors
- Import only what you need: `import { spacing } from '@/styles/tokens'`

### ❌ DON'T

- Hardcode pixel values: `padding: '16px'` ❌
- Use arbitrary Tailwind values when tokens exist: `p-[16px]` ❌
- Mix token usage with hardcoded values in the same component
- Create new tokens without updating the token system first

## Migration Guide

When migrating existing components:

1. **Identify hardcoded values**: Look for pixel values, color hex codes, etc.
2. **Map to tokens**: Find the equivalent token in `tokens.ts`
3. **Replace**: Update component to use tokens
4. **Test**: Verify visual consistency and dark mode support

### Example Migration

**Before:**
```tsx
<div className="p-6 text-gray-900 dark:text-gray-100">
  <input className="h-10 px-3 rounded-md border border-gray-300" />
</div>
```

**After:**
```tsx
<div className="p-6 text-foreground">
  <input className="h-10 px-3 rounded-md border border-input" />
</div>
```

## Dark Mode Support

All color tokens automatically support dark mode through CSS custom properties. Components using tokens will automatically adapt to dark mode without additional code.

## Extending Tokens

If you need a new token:

1. Add it to the appropriate category in `src/styles/tokens.ts`
2. Document it in this file
3. Update any relevant components
4. Consider if it should be added to Tailwind config for utility class access

## Related Documentation

- [Component Usage Guidelines](./COMPONENT_USAGE.md)
- [Form Patterns](./FORM_PATTERNS.md)
- [Component Inventory](../../COMPONENT_INVENTORY.md)

