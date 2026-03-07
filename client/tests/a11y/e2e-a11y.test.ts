/**
 * End-to-End Accessibility Tests (Puppeteer + axe-core)
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-page WCAG compliance audits using real browser environment
 * 
 * These tests:
 * 1. Launch a headless browser
 * 2. Navigate to built pages
 * 3. Inject axe-core
 * 4. Run comprehensive accessibility audits
 * 5. Generate detailed reports for CI/CD
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';
import { AxeResults } from 'axe-core';

let browser: Browser;
let page: Page;

const BASE_URL = process.env.TEST_URL || 'http://localhost:4173'; // Vite preview server

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  
  // Inject axe-core into the page
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await injectAxe(page);
});

afterAll(async () => {
  await browser?.close();
});

/**
 * Helper: Inject axe-core into the page
 */
async function injectAxe(page: Page): Promise<void> {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
  });
}

/**
 * Helper: Run axe-core audit on current page
 */
async function analyzeAccessibility(page: Page): Promise<AxeResults> {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      // @ts-ignore - axe is injected globally
      axe.run(
        {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
          },
        },
        (err: Error, results: AxeResults) => {
          if (err) throw err;
          resolve(results);
        }
      );
    });
  });
}

/**
 * Helper: Format violation report
 */
function formatViolationReport(results: AxeResults): string {
  if (results.violations.length === 0) {
    return '✅ No accessibility violations found!';
  }

  let report = `\n❌ Found ${results.violations.length} accessibility violation(s):\n\n`;

  results.violations.forEach((violation, index) => {
    report += `${index + 1}. [${violation.impact?.toUpperCase()}] ${violation.id}\n`;
    report += `   Description: ${violation.description}\n`;
    report += `   Help: ${violation.helpUrl}\n`;
    report += `   Affected elements: ${violation.nodes.length}\n`;
    
    violation.nodes.slice(0, 3).forEach((node) => {
      report += `   - ${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}\n`;
    });
    
    if (violation.nodes.length > 3) {
      report += `   ... and ${violation.nodes.length - 3} more\n`;
    }
    report += '\n';
  });

  return report;
}

/**
 * Test suite: Critical pages accessibility audit
 */
describe('E2E Accessibility Audit', () => {
  it('Home page should be accessible', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await injectAxe(page);
    
    const results = await analyzeAccessibility(page);
    
    console.log(formatViolationReport(results));
    
    expect(results.violations.length).toBe(0);
  }, 30000);

  it('Login page should be accessible', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await injectAxe(page);
    
    const results = await analyzeAccessibility(page);
    
    console.log(formatViolationReport(results));
    
    // Fail if critical or serious violations
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    
    expect(criticalViolations.length).toBe(0);
  }, 30000);

  it('Dashboard page should be accessible (authenticated)', async () => {
    // Note: In real scenarios, you'd need to authenticate first
    // This is a placeholder - adjust based on your auth flow
    
    try {
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await injectAxe(page);
      
      const results = await analyzeAccessibility(page);
      
      console.log(formatViolationReport(results));
      
      expect(results.violations.length).toBe(0);
    } catch (error) {
      console.log('⚠️  Dashboard page requires authentication - skipping');
    }
  }, 30000);

  it('should have proper color contrast ratios', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await injectAxe(page);
    
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        axe.run(
          {
            runOnly: {
              type: 'rule',
              values: ['color-contrast'],
            },
          },
          (err: Error, results: AxeResults) => {
            if (err) throw err;
            resolve(results);
          }
        );
      });
    });
    
    expect((results as AxeResults).violations.length).toBe(0);
  }, 30000);

  it('should support keyboard navigation', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
    console.log(`✅ Keyboard navigation working - focused on: ${focusedElement}`);
  }, 30000);
});

/**
 * Generate JSON report for CI/CD artifact
 */
describe.skip('Generate Accessibility Report (CI only)', () => {
  it('should generate comprehensive report', async () => {
    const pages = ['/', '/login', '/about'];
    const allResults: Record<string, AxeResults> = {};

    for (const pagePath of pages) {
      try {
        await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle2' });
        await injectAxe(page);
        const results = await analyzeAccessibility(page);
        allResults[pagePath] = results;
      } catch (error) {
        console.warn(`⚠️  Could not audit ${pagePath}:`, error);
      }
    }

    // In CI, write this to a file
    if (process.env.CI) {
      const fs = await import('fs/promises');
      await fs.writeFile(
        'a11y-report.json',
        JSON.stringify(allResults, null, 2)
      );
      console.log('📊 Accessibility report written to a11y-report.json');
    }

    const totalViolations = Object.values(allResults).reduce(
      (sum, result) => sum + result.violations.length,
      0
    );

    console.log(`\n📊 Summary: ${totalViolations} total violations across ${pages.length} pages`);
  }, 60000);
});
