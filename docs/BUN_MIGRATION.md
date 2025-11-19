# Bun Migration Guide

**Date**: January 27, 2025  
**Status**: ✅ Complete

This project has been migrated from npm/pnpm to [Bun](https://bun.sh), a fast all-in-one JavaScript runtime, bundler, test runner, and package manager.

---

## Why Bun?

- **Faster**: Up to 4x faster package installation than npm/pnpm
- **All-in-one**: Package manager, bundler, test runner, and runtime in one tool
- **Native TypeScript**: No need for ts-node or additional transpilation
- **Better performance**: Faster dev server startup and hot reload
- **Compatible**: Works with existing npm packages and Next.js projects

---

## Migration Steps Completed

### 1. ✅ Updated Package Manager References
- Updated `package.json` scripts to use `bun run` instead of `npm run`
- Updated `playwright.config.ts` to use `bun run dev`
- Updated all documentation files

### 2. ✅ Updated .gitignore
- Added `bun.lockb` to gitignore (Bun's lockfile)
- Kept existing lockfile patterns for reference

### 3. ✅ Updated Documentation
- Updated `README.md` with Bun commands
- Updated `CLAUDE.md` with Bun commands
- Updated `docs/QUICK_START.md` (if applicable)

---

## Installation

### Install Bun

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (WSL):**
```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Or using npm (if you have it):**
```bash
npm install -g bun
```

### Verify Installation
```bash
bun --version
```

---

## First-Time Setup

After cloning the repository:

```bash
# Install all dependencies
bun install

# This will create bun.lockb automatically
```

---

## Common Commands

### Package Management
```bash
# Install dependencies
bun install

# Add a new dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>

# Remove a dependency
bun remove <package-name>

# Update dependencies
bun update
```

### Development
```bash
# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run linting
bun run lint
```

### Testing
```bash
# Run all Playwright tests
bun run test

# Run tests with UI
bun run test:ui

# Run tests in headed mode
bun run test:headed

# Run specific test project
bun run test -- --project=chromium

# Show test report
bun run test:report
```

### Running Scripts Directly
```bash
# Run Playwright directly (without npm/pnpm)
bunx playwright test

# Run any npx command
bunx <command>
```

---

## Migration Checklist

If you're migrating an existing local setup:

- [ ] Install Bun: `curl -fsSL https://bun.sh/install | bash`
- [ ] Remove old lockfiles: `rm -f package-lock.json pnpm-lock.yaml`
- [ ] Remove node_modules: `rm -rf node_modules`
- [ ] Install with Bun: `bun install`
- [ ] Verify dev server: `bun run dev`
- [ ] Verify tests: `bun run test:smoke`

---

## Troubleshooting

### Issue: Bun not found
**Solution**: Make sure Bun is installed and in your PATH. Restart your terminal after installation.

### Issue: Lockfile conflicts
**Solution**: Remove old lockfiles (`package-lock.json`, `pnpm-lock.yaml`) and run `bun install` to generate `bun.lockb`.

### Issue: Scripts not working
**Solution**: Make sure you're using `bun run <script>` instead of `npm run <script>` or `pnpm run <script>`.

### Issue: Playwright not found
**Solution**: Use `bunx playwright` instead of `npx playwright`, or ensure Playwright is installed: `bun add -d @playwright/test`.

---

## Performance Benefits

After migration, you should notice:
- **Faster installs**: `bun install` is typically 2-4x faster than npm/pnpm
- **Faster dev server**: Next.js dev server starts faster with Bun
- **Faster builds**: Production builds are typically faster

---

## Notes

- Bun is fully compatible with npm packages
- The `bun.lockb` file is binary and should be committed to git
- All existing npm scripts work the same way, just use `bun run` instead
- Bun can run TypeScript files directly without compilation

---

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Bun vs npm/pnpm Comparison](https://bun.sh/docs/install)

