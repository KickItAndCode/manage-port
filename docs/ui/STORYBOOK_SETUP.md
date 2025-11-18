# Storybook Setup Guide

## Overview

Storybook will be used to document and test UI components in isolation. This guide outlines the setup process for Phase 0.

## Installation

Run the following command to initialize Storybook for Next.js:

```bash
npx storybook@latest init
```

When prompted:
- **Framework**: Select "Next.js"
- **TypeScript**: Yes
- **ESLint**: Yes (if you want ESLint integration)
- **Install dependencies**: Yes

## Manual Setup (Alternative)

If automatic setup doesn't work, install dependencies manually:

```bash
pnpm add -D @storybook/react @storybook/react-vite @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-links @storybook/blocks @storybook/test storybook
```

## Configuration

### 1. Create `.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-links',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
};

export default config;
```

### 2. Create `.storybook/preview.ts`

```typescript
import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

### 3. Add Scripts to `package.json`

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## Example Story

Create `src/components/ui/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};
```

## Component Stories to Create

Priority order for Phase 0:

1. ✅ **Button** - Core interactive element
2. ✅ **Input** - Form input component
3. ✅ **SelectNative** - Select dropdown
4. ✅ **FormField** - Form wrapper
5. ✅ **StatusBadge** - Status indicators
6. ✅ **Skeleton** - Loading states

## Running Storybook

```bash
pnpm storybook
```

This will start Storybook on `http://localhost:6006`

## Visual Regression Testing

For visual regression testing with Chromatic:

1. Sign up at [chromatic.com](https://www.chromatic.com)
2. Install Chromatic:

```bash
pnpm add -D chromatic
```

3. Add script to `package.json`:

```json
{
  "scripts": {
    "chromatic": "chromatic --project-token=YOUR_TOKEN"
  }
}
```

4. Run Chromatic:

```bash
pnpm chromatic
```

## Integration with CI/CD

Add to your CI pipeline (GitHub Actions example):

```yaml
name: Storybook
on: [push, pull_request]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm chromatic --exit-zero-on-changes
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

## Documentation

Each component story should include:

- **Description**: What the component does
- **Props**: All available props with types
- **Examples**: Common usage patterns
- **Accessibility**: ARIA attributes and keyboard navigation
- **Dark Mode**: How it appears in dark theme

## Next Steps

1. Install Storybook using the commands above
2. Create stories for core components (Button, Input, FormField)
3. Set up Chromatic for visual regression (optional)
4. Document component usage patterns in stories
5. Add Storybook link to project README

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js + Storybook Guide](https://storybook.js.org/docs/get-started/frameworks/nextjs)
- [Chromatic Documentation](https://www.chromatic.com/docs)

## Notes

- Storybook runs independently of the Next.js app
- Components should be isolated and not depend on app-specific context
- Use decorators to provide necessary context (ThemeProvider, etc.)
- Consider creating a `.storybook/theme.ts` for theme switching

