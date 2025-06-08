# Project Scripts

## cleanup-test-data.sh

A utility script to clean up test artifacts and prepare the codebase for check-in.

### Usage

```bash
# Run from project root
./scripts/cleanup-test-data.sh
```

### What it cleans

**Screenshots and Images:**
- All PNG/JPG files from root directory
- Screenshot directories (property-flow-screenshots/, playwright/screenshots/)
- Test screenshots (preserves directory structure for future tests)

**Test Data Files:**
- Test result scripts (scrape-test-results.js, screenshot-property-flow.js)
- Backup task files (*_backup_*.json)
- Temporary migration files (*migration*.png, *verification*.png)

**Playwright Artifacts:**
- test-results/ directory
- playwright-report/ directory
- Generated test screenshots

**Temporary Files:**
- .tmp and .temp files
- Test log files
- Test database files

### What it preserves

- Essential test files in `/tests/` directory
- Legitimate script files
- Source code and configuration files
- Directory structure needed for testing

### When to use

- Before committing code to version control
- After running extensive test suites
- When cleaning up after debugging sessions
- Before creating production builds

### Integration with Git

Consider adding this to your pre-commit hooks or CI/CD pipeline:

```bash
# Add to package.json scripts
"scripts": {
  "clean": "./scripts/cleanup-test-data.sh",
  "pre-commit": "./scripts/cleanup-test-data.sh && npm run lint"
}
```

### Customization

Edit the script to add or remove cleanup patterns based on your testing workflow. The script is designed to be safe - it won't remove essential project files.