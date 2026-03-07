const express = require('express')
const logger = require('../../../lib/@system/Logger')

const router = express.Router()

/**
 * CSP Violation Reporting Endpoint
 * 
 * Receives Content-Security-Policy violation reports from the browser.
 * These reports help identify:
 *  - Blocked resources that need to be whitelisted
 *  - Potential XSS or injection attempts
 *  - Misconfigured CSP directives
 * 
 * The browser sends reports as JSON to this endpoint when a CSP violation occurs.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_report_syntax
 */
router.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body

  // CSP reports can be nested under 'csp-report' key
  const violation = report['csp-report'] || report

  // Log the violation for monitoring and analysis
  logger.warn({
    type: 'csp_violation',
    documentUri: violation['document-uri'],
    violatedDirective: violation['violated-directive'],
    effectiveDirective: violation['effective-directive'],
    originalPolicy: violation['original-policy'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
    columnNumber: violation['column-number'],
    statusCode: violation['status-code'],
  }, 'Content-Security-Policy violation detected')

  // In production, you might want to:
  // 1. Store violations in database for analysis
  // 2. Alert on repeated violations from same source
  // 3. Aggregate violations for CSP policy tuning
  // 4. Filter out known false positives (browser extensions, etc.)

  // Always return 204 No Content for CSP reports
  res.status(204).end()
})

module.exports = router
