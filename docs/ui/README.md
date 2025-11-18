# UI System Documentation

Welcome to the ManagePort UI System documentation. This directory contains all documentation for the design system, component library, and usage guidelines.

## Quick Start

1. **New to the system?** Start with [Component Usage Guidelines](./COMPONENT_USAGE.md)
2. **Building forms?** Read [Form Patterns](./FORM_PATTERNS.md)
3. **Styling components?** Check [Design Tokens](./DESIGN_TOKENS.md)
4. **Migrating existing code?** Review [Component Inventory](../../COMPONENT_INVENTORY.md)

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
- **Layout Components**: `FormGrid` (planned), `FormActions` (planned)
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
- See [Component Inventory](../../COMPONENT_INVENTORY.md) for migration examples

## Contributing

When adding new components or patterns:

1. Use design tokens from `src/styles/tokens.ts`
2. Follow existing component patterns
3. Update this documentation
4. Add examples to component files
5. Test in both light and dark modes

## Phase Status

- ✅ **Phase 0**: Component inventory, design tokens, documentation (Complete)
- ⏳ **Phase 1**: Unified interaction layer (In Progress)
- ⏳ **Phase 2**: Utility simplicity & trust (Planned)
- ⏳ **Phase 3**: Experience deepening (Planned)

See [NEXT_PHASE_PLAN.md](../../NEXT_PHASE_PLAN.md) for the full roadmap.

