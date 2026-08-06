# Bun Commands Reference

Quick reference for common Bun commands used in this project.
# Bun Commands Reference

Quick reference for common Bun commands used in this project.

---

## 📦 Package Management

```bash
# Install all dependencies
bun install

# Add a production dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>

# Remove a dependency
bun remove <package-name>

# Update all dependencies
bun update

# Update a specific package
bun update <package-name>

# View installed packages
bun pm ls
```

---

## 🚀 Development

```bash
# Start development server (Next.js with Turbopack)
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run linting
bun run lint

# Run pre-commit checks
bun run precommit

# Clean test data
bun run clean
```

---

## 🧪 Testing

```bash
# Run all Playwright tests
bun run test

# Run tests with UI (visual test runner)
bun run test:ui

# Run tests in headed mode (see browser)
bun run test:headed

# Debug tests (step through)
bun run test:debug

# Run smoke tests (core functionality)
bun run test:smoke

# Run basic UI tests (no auth)
bun run test:basic

# Run tests without authentication
bun run test:no-auth

# Run auth setup test only
bun run test:auth-setup

# Show test report
bun run test:report

# Run specific test project
bun run test -- --project=chromium
bun run test -- --project="chromium|firefox"
bun run test -- --project="Mobile Chrome|Mobile Safari"
```

---

## 🔧 Direct Tool Execution

```bash
# Run Playwright directly
bunx playwright test
bunx playwright test --ui
bunx playwright show-report

# Run any npx-compatible tool
bunx <command>

# Examples:
bunx convex dev
bunx next build
bunx typescript --version
```

---

## 📊 Project-Specific Scripts

All scripts from `package.json` can be run with:

```bash
bun run <script-name>
```

Available scripts:
- `dev` - Development server
- `build` - Production build
- `start` - Production server
- `lint` - ESLint
- `test` - Playwright tests
- `test:ui` - Tests with UI
- `test:debug` - Debug tests
- `test:headed` - Headed tests
- `test:report` - Show test report
- `test:smoke` - Smoke tests
- `test:no-auth` - Tests without auth
- `test:basic` - Basic UI tests
- `test:auth-setup` - Auth setup test
- `clean` - Clean test data
- `precommit` - Pre-commit checks

---

## 💡 Tips

1. **Faster installs**: Bun installs packages much faster than npm/pnpm
2. **TypeScript**: Bun can run `.ts` files directly without compilation
3. **Compatibility**: Bun is compatible with npm packages
4. **Lockfile**: `bun.lockb` is binary and should be committed to git
5. **Aliases**: You can create shell aliases:
   ```bash
   alias br="bun run"
   alias bi="bun install"
   ```

---

## 🔄 Migration from npm/pnpm

If you see old commands in documentation or scripts:

| Old Command | New Command |
|------------|-------------|
| `npm install` | `bun install` |
| `npm run dev` | `bun run dev` |
| `npm run test` | `bun run test` |
| `npx playwright` | `bunx playwright` |
| `pnpm install` | `bun install` |
| `pnpm dev` | `bun run dev` |

---

## 📚 More Information

- See `docs/BUN_MIGRATION.md` for full migration details
- [Bun Documentation](https://bun.sh/docs)
- [Bun CLI Reference](https://bun.sh/docs/cli/install)

---

## 📦 Package Management

```bash
# Install all dependencies
bun install

# Add a production dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>

# Remove a dependency
bun remove <package-name>

# Update all dependencies
bun update

# Update a specific package
bun update <package-name>

# View installed packages
bun pm ls
```

---

## 🚀 Development

```bash
# Start development server (Next.js with Turbopack)
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run linting
bun run lint

# Run pre-commit checks
bun run precommit

# Clean test data
bun run clean
```

---

## 🧪 Testing

```bash
# Run all Playwright tests
bun run test

# Run tests with UI (visual test runner)
bun run test:ui

# Run tests in headed mode (see browser)
bun run test:headed

# Debug tests (step through)
bun run test:debug

# Run smoke tests (core functionality)
bun run test:smoke

# Run basic UI tests (no auth)
bun run test:basic

# Run tests without authentication
bun run test:no-auth

# Run auth setup test only
bun run test:auth-setup

# Show test report
bun run test:report

# Run specific test project
bun run test -- --project=chromium
bun run test -- --project="chromium|firefox"
bun run test -- --project="Mobile Chrome|Mobile Safari"
```

---

## 🔧 Direct Tool Execution

```bash
# Run Playwright directly
bunx playwright test
bunx playwright test --ui
bunx playwright show-report

# Run any npx-compatible tool
bunx <command>

# Examples:
bunx convex dev
bunx next build
bunx typescript --version
```

---

## 📊 Project-Specific Scripts

All scripts from `package.json` can be run with:

```bash
bun run <script-name>
```

Available scripts:
- `dev` - Development server
- `build` - Production build
- `start` - Production server
- `lint` - ESLint
- `test` - Playwright tests
- `test:ui` - Tests with UI
- `test:debug` - Debug tests
- `test:headed` - Headed tests
- `test:report` - Show test report
- `test:smoke` - Smoke tests
- `test:no-auth` - Tests without auth
- `test:basic` - Basic UI tests
- `test:auth-setup` - Auth setup test
- `clean` - Clean test data
- `precommit` - Pre-commit checks

---

## 💡 Tips

1. **Faster installs**: Bun installs packages much faster than npm/pnpm
2. **TypeScript**: Bun can run `.ts` files directly without compilation
3. **Compatibility**: Bun is compatible with npm packages
4. **Lockfile**: `bun.lockb` is binary and should be committed to git
5. **Aliases**: You can create shell aliases:
   ```bash
   alias br="bun run"
   alias bi="bun install"
   ```

---

## 🔄 Migration from npm/pnpm

If you see old commands in documentation or scripts:

| Old Command | New Command |
|------------|-------------|
| `npm install` | `bun install` |
| `npm run dev` | `bun run dev` |
| `npm run test` | `bun run test` |
| `npx playwright` | `bunx playwright` |
| `pnpm install` | `bun install` |
| `pnpm dev` | `bun run dev` |

---

## 📚 More Information

- See `docs/BUN_MIGRATION.md` for full migration details
- [Bun Documentation](https://bun.sh/docs)
- [Bun CLI Reference](https://bun.sh/docs/cli/install)
