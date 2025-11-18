/**
 * Design Tokens - ManagePort UI System
 * 
 * This file defines the design token system for consistent styling across the application.
 * Tokens are organized by category and can be used in Tailwind config and component styles.
 * 
 * @see docs/ui/DESIGN_TOKENS.md for usage guidelines
 */

/**
 * Typography Scale
 * Based on a 16px base font size
 */
export const typography = {
  fontFamily: {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],      // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

/**
 * Spacing Scale
 * Based on 4px base unit (0.25rem)
 */
export const spacing = {
  // Form-specific spacing
  form: {
    fieldGap: '1rem',        // 16px - gap between form fields
    sectionGap: '1.5rem',     // 24px - gap between form sections
    labelGap: '0.5rem',      // 8px - gap between label and input
    padding: '1.5rem',        // 24px - form container padding
    fieldHeight: '2.5rem',   // 40px - standard input height
    fieldPaddingX: '0.75rem', // 12px - horizontal padding for inputs
    fieldPaddingY: '0.5rem', // 8px - vertical padding for inputs
  },
  // General spacing scale
  scale: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
  },
} as const;

/**
 * Border Radius Scale
 */
export const radius = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',   // ~0.25rem
  md: 'calc(var(--radius) - 2px)',   // ~0.375rem
  base: 'var(--radius)',              // 0.625rem (10px)
  lg: 'var(--radius)',                // 0.625rem (10px)
  xl: 'calc(var(--radius) + 4px)',   // ~1rem
  '2xl': 'calc(var(--radius) + 8px)', // ~1.25rem
  full: '9999px',
} as const;

/**
 * Color Tokens
 * These reference CSS custom properties defined in globals.css
 */
export const colors = {
  // Semantic colors
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  primary: 'var(--primary)',
  'primary-foreground': 'var(--primary-foreground)',
  secondary: 'var(--secondary)',
  'secondary-foreground': 'var(--secondary-foreground)',
  muted: 'var(--muted)',
  'muted-foreground': 'var(--muted-foreground)',
  accent: 'var(--accent)',
  'accent-foreground': 'var(--accent-foreground)',
  destructive: 'var(--destructive)',
  'destructive-foreground': 'var(--destructive)',
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',
  
  // Status colors (for badges, alerts, etc.)
  success: 'var(--success, oklch(0.6 0.2 150))',
  warning: 'var(--warning, oklch(0.7 0.2 60))',
  info: 'var(--accent)',
  
  // Card colors
  card: 'var(--card)',
  'card-foreground': 'var(--card-foreground)',
  popover: 'var(--popover)',
  'popover-foreground': 'var(--popover-foreground)',
} as const;

/**
 * Form State Colors
 */
export const formStates = {
  default: {
    border: 'var(--input)',
    background: 'var(--background)',
    text: 'var(--foreground)',
  },
  hover: {
    border: 'oklch(0.7 0.02 264)', // Slightly lighter border
    background: 'var(--background)',
  },
  focus: {
    border: 'var(--primary)',
    ring: 'var(--ring)',
    ringOpacity: {
      light: '0.2',
      dark: '0.3',
    },
  },
  error: {
    border: 'var(--destructive)',
    ring: 'var(--destructive)',
    ringOpacity: {
      light: '0.2',
      dark: '0.4',
    },
    text: 'var(--destructive)',
  },
  disabled: {
    opacity: '0.5',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
} as const;

/**
 * Shadow Tokens
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

/**
 * Transition Tokens
 */
export const transitions = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  timing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

/**
 * Z-Index Scale
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

/**
 * Breakpoints (for responsive design)
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Component-Specific Tokens
 */

// Badge tokens
export const badge = {
  padding: {
    sm: '0.25rem 0.5rem',
    md: '0.375rem 0.75rem',
    lg: '0.5rem 1rem',
  },
  fontSize: {
    sm: typography.fontSize.xs[0],
    md: typography.fontSize.sm[0],
    lg: typography.fontSize.base[0],
  },
  borderRadius: radius.md,
} as const;

// Skeleton tokens
export const skeleton = {
  base: 'animate-pulse bg-muted',
  shimmer: 'animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted',
  borderRadius: radius.md,
} as const;

// Toast tokens
export const toast = {
  duration: {
    short: 3000,
    medium: 5000,
    long: 7000,
  },
  maxWidth: '420px',
  gap: spacing.scale[2],
  padding: spacing.scale[4],
  borderRadius: radius.lg,
} as const;

// Status badge colors
export const statusColors = {
  success: {
    bg: 'oklch(0.9 0.05 150)',
    text: 'oklch(0.4 0.15 150)',
    border: 'oklch(0.7 0.1 150)',
  },
  warning: {
    bg: 'oklch(0.95 0.05 60)',
    text: 'oklch(0.5 0.15 60)',
    border: 'oklch(0.7 0.1 60)',
  },
  error: {
    bg: 'oklch(0.95 0.05 27)',
    text: 'oklch(0.5 0.15 27)',
    border: 'oklch(0.7 0.1 27)',
  },
  info: {
    bg: 'oklch(0.95 0.05 264)',
    text: 'oklch(0.5 0.15 264)',
    border: 'oklch(0.7 0.1 264)',
  },
  neutral: {
    bg: 'var(--muted)',
    text: 'var(--muted-foreground)',
    border: 'var(--border)',
  },
} as const;

/**
 * Export all tokens as a single object for easy access
 */
export const tokens = {
  typography,
  spacing,
  radius,
  colors,
  formStates,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  badge,
  skeleton,
  toast,
  statusColors,
} as const;

/**
 * Type exports for TypeScript usage
 */
export type TypographyToken = typeof typography;
export type SpacingToken = typeof spacing;
export type RadiusToken = typeof radius;
export type ColorToken = typeof colors;
export type FormStateToken = typeof formStates;

