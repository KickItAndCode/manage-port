# UI System Documentation

Welcome to the ManagePort UI System documentation. This directory contains all documentation for the design system, component library, and usage guidelines.

## Quick Start

1. **New to the system?** Start with [Component Usage Guidelines](./COMPONENT_USAGE.md)
2. **Building forms?** Read [Form Patterns](./FORM_PATTERNS.md)
3. **Styling components?** Check [Design Tokens](./DESIGN_TOKENS.md)
4. **Wondering what the app currently does?** See [Current Status](../CURRENT_STATUS.md)

## Documentation Index

### [Design Tokens](./DESIGN_TOKENS.md)
Complete reference for spacing, typography, colors, and other design values. Learn how to use tokens consistently across the application.

### [Component Usage Guidelines](./COMPONENT_USAGE.md)
How to use each UI component correctly, including props, examples, and best practices.

### [Form Patterns](./FORM_PATTERNS.md)
Common form patterns and best practices for building consistent, accessible forms.

## Component Library

All UI components are located in `src/components/ui/`. Key components:

- **Form Components**: `FormField`, `Input`, `SelectNative`, `Textarea`, `FormContainer`
- **Layout Components**: `FormGrid`, `FormActions`
- **Data Display**: `ResponsiveTable`, `StatusBadge`
- **Feedback**: `Skeleton`, `Toast` (Sonner)

## Design Principles

1. **Consistency**: All components use the same design tokens
2. **Accessibility**: WCAG 2.1 AA compliant by default
3. **Dark Mode**: Full support through CSS custom properties
4. **Mobile First**: Responsive by default
5. **Progressive Enhancement**: Works without JavaScript where possible

## Getting Help

- Check the component documentation in `src/components/ui/`
- Review existing implementations in `src/components/`

## Contributing

When adding new components or patterns:

1. Use design tokens from `src/styles/tokens.ts`
2. Follow existing component patterns
3. Update this documentation
4. Add examples to component files
5. Test in both light and dark modes

## Status

Every component listed above exists in `src/components/ui/` and this document
was verified against them in August 2026.

Two known gaps, tracked in [Current Status](../CURRENT_STATUS.md):

- `src/styles/tokens.ts` is imported by nothing. Point 1 under Contributing
  describes an intent, not current practice — either adopt the file or delete it
- Form controls are split between raw `<select>` (11 files) and `SelectNative`
  (9 files)

The phase roadmap this document used to track ended; its plans are in
[`docs/archive/`](../archive/README.md).

