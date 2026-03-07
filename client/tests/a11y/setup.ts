/**
 * Accessibility Testing Setup
 * ─────────────────────────────────────────────────────────────────────────────
 * Configures axe-core for automated WCAG compliance checking in CI/CD pipeline
 */

import { configureAxe } from 'jest-axe';

/**
 * Axe configuration for WCAG 2.1 Level AA compliance
 * 
 * Standards checked:
 * - WCAG 2.1 Level A & AA
 * - Section 508
 * - Best practices
 */
export const axeConfig = configureAxe({
  rules: {
    // Customize rules if needed
    // Example: Disable specific rules for known issues
    // 'color-contrast': { enabled: false },
  },
});

/**
 * Custom matcher for Vitest to check accessibility
 * Usage: expect(container).toHaveNoViolations()
 */
export async function toHaveNoViolations(container: Element) {
  const { axe } = await import('axe-core');
  
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    },
  });

  const violations = results.violations;
  
  if (violations.length === 0) {
    return {
      pass: true,
      message: () => 'No accessibility violations found',
    };
  }

  const violationMessages = violations.map((violation) => {
    const nodes = violation.nodes
      .map((node) => ` - ${node.html}`)
      .join('\n');
    
    return `
[${violation.impact}] ${violation.id}: ${violation.description}
${violation.helpUrl}
Affected nodes:
${nodes}
    `.trim();
  });

  return {
    pass: false,
    message: () => `
Found ${violations.length} accessibility violation(s):

${violationMessages.join('\n\n')}
    `.trim(),
  };
}

/**
 * Helper to generate accessibility report
 */
export async function generateA11yReport(
  container: Element,
  testName: string
): Promise<{ violations: number; passes: number }> {
  const { axe } = await import('axe-core');
  
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
  });

  console.log(`
┌─────────────────────────────────────────────────────────────────┐
│ Accessibility Report: ${testName.padEnd(43)} │
├─────────────────────────────────────────────────────────────────┤
│ Violations: ${String(results.violations.length).padEnd(51)} │
│ Passes:     ${String(results.passes.length).padEnd(51)} │
│ Incomplete: ${String(results.incomplete.length).padEnd(51)} │
└─────────────────────────────────────────────────────────────────┘
  `);

  if (results.violations.length > 0) {
    console.log('\n❌ Violations:');
    results.violations.forEach((violation) => {
      console.log(`\n  [${violation.impact}] ${violation.id}`);
      console.log(`  ${violation.description}`);
      console.log(`  Help: ${violation.helpUrl}`);
      console.log(`  Affected: ${violation.nodes.length} element(s)`);
    });
  }

  return {
    violations: results.violations.length,
    passes: results.passes.length,
  };
}
