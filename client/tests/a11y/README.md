# Accessibility Testing with axe-core

Automated WCAG 2.1 Level AA compliance checking integrated into the CI/CD pipeline.

## Overview

This directory contains automated accessibility tests that ensure our application meets:

- **WCAG 2.1 Level A & AA** standards
- **Section 508** compliance
- **Best practices** for web accessibility

## Test Types

### 1. Component Tests (`components.a11y.test.tsx`)

Unit-level accessibility tests for React components using:
- `@testing-library/react` for rendering
- `jest-axe` for accessibility assertions
- `axe-core` rules engine

**Run:**
```bash
npm run test:a11y:component
```

**Example:**
```typescript
it('should have accessible button', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 2. E2E Tests (`e2e-a11y.test.ts`)

Full-page accessibility audits using:
- `puppeteer` for browser automation
- `axe-core` injected into live pages
- Real-world user scenarios

**Run:**
```bash
# Build and run E2E tests
npm run a11y:audit

# Or run manually:
npm run build
npm run preview -- --port 4173
TEST_URL=http://localhost:4173 npm run test:a11y:e2e
```

## CI/CD Integration

The accessibility audit runs automatically on every push and PR via GitHub Actions:

```yaml
a11y-audit:
  runs-on: ubuntu-latest
  steps:
    - Run component accessibility tests
    - Build application
    - Start preview server
    - Run E2E accessibility audit
    - Upload report artifacts
```

### Viewing Reports

1. Go to **Actions** tab in GitHub
2. Select your workflow run
3. Download **a11y-report** artifact
4. Open `a11y-report.json` to view detailed violations

## What Gets Tested

### Component Level
- ✅ Proper ARIA labels and roles
- ✅ Form input labeling
- ✅ Keyboard navigation support
- ✅ Semantic HTML structure
- ✅ Alt text for images
- ✅ Heading hierarchy
- ✅ Modal/dialog accessibility
- ✅ Table headers and captions

### Page Level
- ✅ Landmark regions (`header`, `nav`, `main`, `footer`)
- ✅ Color contrast ratios (WCAG AA: 4.5:1 for normal text)
- ✅ Focus management
- ✅ Skip links
- ✅ Page titles
- ✅ Language attributes

## Writing Accessibility Tests

### Component Test Template

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should be accessible', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### E2E Test Template

```typescript
it('should have accessible page', async () => {
  await page.goto('http://localhost:4173/your-page');
  await injectAxe(page);
  const results = await analyzeAccessibility(page);
  expect(results.violations.length).toBe(0);
});
```

## Common Accessibility Issues

### Critical Issues
- ❌ Missing `alt` attributes on images
- ❌ Form inputs without labels
- ❌ Insufficient color contrast
- ❌ Missing ARIA roles on interactive elements
- ❌ Broken heading hierarchy

### Serious Issues
- ⚠️ Missing landmark regions
- ⚠️ Duplicate IDs
- ⚠️ Missing page titles
- ⚠️ Inaccessible focus management
- ⚠️ Missing skip links

### Moderate Issues
- ⚠️ Redundant ARIA attributes
- ⚠️ Missing language attributes
- ⚠️ Empty headings or buttons

## Fixing Violations

When tests fail, you'll see detailed reports:

```
❌ Found 2 accessibility violation(s):

1. [SERIOUS] color-contrast
   Description: Elements must have sufficient color contrast
   Help: https://dequeuniversity.com/rules/axe/4.10/color-contrast
   Affected elements: 3
   - <button class="text-gray-300 bg-gray-200">Submit</button>
```

**Fix:** Increase contrast ratio to at least 4.5:1

## Configuration

Customize axe rules in `setup.ts`:

```typescript
export const axeConfig = configureAxe({
  rules: {
    // Disable specific rules (not recommended)
    'color-contrast': { enabled: false },
    
    // Change severity
    'label': { enabled: true },
  },
});
```

## Best Practices

1. **Test early and often** - Add accessibility tests when creating components
2. **Don't disable rules** - Fix violations instead of disabling checks
3. **Use semantic HTML** - `<button>` over `<div onClick>`
4. **Add ARIA when needed** - But prefer native HTML semantics first
5. **Test with real assistive tech** - Automated tests catch ~30-40% of issues

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Troubleshooting

### Tests timing out
Increase timeout in test:
```typescript
it('should be accessible', async () => {
  // ...
}, 30000); // 30 second timeout
```

### Preview server not starting
Check if port 4173 is available:
```bash
lsof -ti:4173 | xargs kill -9
```

### axe-core not injecting
Ensure CDN is accessible or bundle axe-core locally:
```typescript
await page.addScriptTag({
  path: './node_modules/axe-core/axe.min.js'
});
```

## Support

For questions or issues with accessibility testing:
1. Check axe-core documentation
2. Review existing tests for examples
3. Consult WCAG guidelines
4. Ask in #engineering channel

---

**Remember:** Automated testing is just the start. Manual testing with keyboard navigation and screen readers is essential for true accessibility.
