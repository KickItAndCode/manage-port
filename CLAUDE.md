# Claude Project Guidelines

## Test Results Analysis

When asked to analyze test results or fix test issues, Claude should:

1. **Use Puppeteer MCP to scrape test results** from `http://localhost:9323/` when the Playwright HTML report is running
2. **Create a Puppeteer script** if the MCP is not available to extract test results and save them locally
3. **Analyze the scraped results** to identify specific errors, timeouts, and failed assertions
4. **Fix the underlying issues** in the test files based on the error analysis

## Commands to Run

### Testing
- `npm run lint` - Run linting
- `npm run typecheck` - Run TypeScript type checking
- `npx playwright test` - Run all Playwright tests
- `npx playwright test --project=add-property` - Run specific test project
- `npx playwright show-report` - Show test results at http://localhost:9323/

### Development
- `npm run dev` - Start development server
- `npm run build` - Build the project

## Project Structure

- `/tests/` - Playwright test files
- `/playwright/screenshots/` - Test screenshots for debugging
- `/test-results/` - Playwright test results and videos
- `/src/components/` - React components
- `/convex/` - Convex backend functions

## Testing Best Practices

1. Always take screenshots at key steps for debugging
2. Use proper authentication flows for tests that require login
3. Clean up test artifacts before each test run
4. Use environment variables for test credentials
5. Implement robust wait conditions and error handling