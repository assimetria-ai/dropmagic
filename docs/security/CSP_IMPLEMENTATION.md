# Content-Security-Policy (CSP) Implementation

## Overview

This document describes the Content-Security-Policy headers implemented in DropMagic to prevent cross-site scripting (XSS) and code injection attacks.

## What is CSP?

Content-Security-Policy (CSP) is a security standard that helps detect and mitigate certain types of attacks, including:

- **Cross-Site Scripting (XSS)** — prevents execution of malicious scripts
- **Data injection attacks** — prevents unauthorized data exfiltration
- **Clickjacking** — prevents embedding the site in malicious iframes
- **Mixed content** — prevents loading insecure resources over HTTPS

CSP works by defining a whitelist of trusted sources for various resource types (scripts, styles, images, etc.). The browser blocks any resources that don't match the policy.

## Implementation

### Location

The CSP headers are configured in:

```
server/src/lib/@system/Middleware/security.js
```

This middleware is applied globally in `server/src/app.js` before any routes.

### CSP Directives

The following directives are configured:

#### `default-src`
**Value:** `'self'`  
**Purpose:** Default fallback for all resource types. Only allows same-origin resources.

#### `script-src`
**Value:** `'self'`, `https://www.chatbase.co`  
**Purpose:** Controls which scripts can execute.
- `'self'` — allows scripts from the same origin
- `https://www.chatbase.co` — allows Chatbase chatbot widget script

#### `style-src`
**Value:** `'self'`, `'unsafe-inline'`  
**Purpose:** Controls which stylesheets can be applied.
- `'self'` — allows same-origin stylesheets
- `'unsafe-inline'` — allows inline styles (required for React/Tailwind CSS)

**Note:** `'unsafe-inline'` reduces security but is necessary for CSS-in-JS and Tailwind. Consider migrating to nonces or hashes for production hardening.

#### `img-src`
**Value:** `'self'`, `data:`, `https:`  
**Purpose:** Controls which images can be loaded.
- `'self'` — same-origin images
- `data:` — inline images via data URIs
- `https:` — any HTTPS image (for user uploads, CDNs, social previews)

#### `connect-src`
**Value:** `'self'`, `https://www.chatbase.co`  
**Purpose:** Controls which URLs can be loaded via AJAX, WebSocket, or EventSource.
- `'self'` — API calls to same origin
- `https://www.chatbase.co` — Chatbase API calls from the widget

#### `font-src`
**Value:** `'self'`, `https:`, `data:`  
**Purpose:** Controls which fonts can be loaded.
- `'self'` — same-origin fonts
- `https:` — web fonts from CDNs
- `data:` — inline fonts via data URIs

#### `object-src`
**Value:** `'none'`  
**Purpose:** Blocks all plugins (Flash, Java, etc.). Should always be `'none'` in modern applications.

#### `media-src`
**Value:** `'self'`  
**Purpose:** Controls which audio/video sources can be loaded. Only same-origin allowed.

#### `frame-src`
**Value:** `'self'`, `https://www.chatbase.co`  
**Purpose:** Controls which URLs can be embedded in iframes.
- `'self'` — same-origin iframes (used for email preview)
- `https://www.chatbase.co` — Chatbase chatbot iframe preview

#### `base-uri`
**Value:** `'self'`  
**Purpose:** Restricts `<base>` tag URLs to prevent base tag injection attacks.

#### `form-action`
**Value:** `'self'`  
**Purpose:** Restricts form submission URLs to prevent form hijacking.

#### `frame-ancestors`
**Value:** `'none'`  
**Purpose:** Prevents the site from being embedded in iframes on other sites (clickjacking protection).

#### `upgrade-insecure-requests`
**Enabled in:** Production only  
**Purpose:** Automatically upgrades HTTP requests to HTTPS in production.

#### `report-uri`
**Value:** `/api/csp-report`  
**Purpose:** Endpoint to receive CSP violation reports from the browser.

### CSP Violation Reporting

CSP violations are reported to `/api/csp-report` and logged via the application logger.

**Implementation:**
```
server/src/api/@system/security/csp-report.js
```

**Log Format:**
```javascript
{
  type: 'csp_violation',
  documentUri: 'https://dropmagic.ai/app',
  violatedDirective: 'script-src-elem',
  effectiveDirective: 'script-src',
  blockedUri: 'https://malicious.com/xss.js',
  sourceFile: 'https://dropmagic.ai/app',
  lineNumber: 42,
  columnNumber: 10,
}
```

**Monitoring Recommendations:**
1. Review CSP violation logs regularly
2. Alert on repeated violations from the same source
3. Aggregate violations to identify misconfigured directives
4. Filter out false positives (browser extensions, etc.)

### Additional Security Headers

In addition to CSP, the following headers are configured:

- **Strict-Transport-Security (HSTS)** — enforces HTTPS (production only)
- **X-Frame-Options** — backup clickjacking protection
- **X-Content-Type-Options** — prevents MIME sniffing
- **Referrer-Policy** — controls referrer information leakage
- **X-Permitted-Cross-Domain-Policies** — blocks Adobe Flash/PDF cross-domain requests
- **Cross-Origin-Opener-Policy** — isolates browsing context
- **Cross-Origin-Resource-Policy** — prevents cross-origin resource loading

## Testing CSP

### Manual Testing

1. **Open browser DevTools → Console**
2. Look for CSP violation warnings (they appear in red)
3. Check Network tab → filter by "Blocked" to see blocked resources

### Automated Testing

Add CSP tests to the test suite:

```javascript
it('should set Content-Security-Policy headers', async () => {
  const res = await request(app).get('/')
  expect(res.headers['content-security-policy']).toBeDefined()
  expect(res.headers['content-security-policy']).toContain("default-src 'self'")
})
```

### Report-Only Mode

For testing in production without blocking resources:

1. Uncomment `reportOnly: true` in `security.js`
2. Deploy and monitor CSP reports
3. Fix violations
4. Disable report-only mode

## Common Issues & Fixes

### Issue: Inline scripts blocked

**Symptom:** Console error: "Refused to execute inline script"

**Fix:**
- Use external script files instead of inline `<script>` tags
- OR add a nonce/hash to the CSP policy (more complex)

### Issue: External resource blocked

**Symptom:** Console error: "Refused to load the script/style/image..."

**Fix:**
- Add the domain to the appropriate CSP directive in `security.js`
- Example: Adding `https://example.com` to `scriptSrc`

### Issue: Browser extension blocked

**Symptom:** CSP violations from browser extensions (e.g., Grammarly, password managers)

**Fix:**
- Filter these out in the CSP report handler
- Extensions inject scripts that trigger CSP violations but are not security threats

## Whitelisted External Resources

The following external resources are whitelisted:

### Chatbase (https://www.chatbase.co)

**Purpose:** AI chatbot widget  
**Directives:** `script-src`, `connect-src`, `frame-src`  
**Files:**
- `/embed.min.js` — widget script
- `/chatbot-iframe/{id}` — chatbot preview iframe

**Security Consideration:**
Chatbase is a third-party service. The widget runs on their CDN. While trusted, this introduces a dependency on their security practices. Monitor for:
- Changes to their script (use Subresource Integrity if possible)
- Unexpected API calls
- CSP violations related to Chatbase

## Future Improvements

1. **Script Nonces**
   - Generate random nonces for inline scripts
   - Include nonce in CSP policy
   - Add nonce to `<script>` tags
   - Eliminates need for `'unsafe-inline'` in `style-src`

2. **Subresource Integrity (SRI)**
   - Add integrity hashes for external scripts
   - Example: `<script src="..." integrity="sha384-..." crossorigin="anonymous">`
   - Prevents tampering with external resources

3. **CSP Level 3 Features**
   - `strict-dynamic` — allows scripts to load other scripts
   - `'unsafe-hashes'` — allows hashed inline event handlers
   - `'wasm-unsafe-eval'` — allows WebAssembly

4. **Per-Route CSP**
   - Different CSP policies for different routes
   - Example: Stricter policy for `/app/*`, looser for `/public/*`

5. **CSP Dashboard**
   - Build an admin UI to view CSP violations
   - Aggregate violations by type, source, date
   - Alert on unusual patterns

## Resources

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) — analyze your CSP
- [Report URI](https://report-uri.com/) — CSP reporting service
- [Helmet.js Documentation](https://helmetjs.github.io/)

## Summary

✅ **Implemented:**
- Comprehensive CSP headers with strict defaults
- Whitelisting for required external resources (Chatbase)
- CSP violation reporting endpoint
- Additional security headers (HSTS, X-Frame-Options, etc.)
- Documentation and testing guidelines

✅ **Security Benefits:**
- Prevents XSS attacks
- Blocks code injection
- Prevents clickjacking
- Enforces HTTPS in production
- Monitors policy violations

⚠️ **Trade-offs:**
- `'unsafe-inline'` in `style-src` (required for React/Tailwind)
- External Chatbase dependency
- Potential false positives from browser extensions

## Task Completion

**Task:** #9355 - Implement CSP headers on frontend  
**Status:** ✅ Complete  
**Priority:** P3  

**Changes:**
1. Enhanced CSP headers in `server/src/lib/@system/Middleware/security.js`
2. Added Chatbase to CSP whitelist
3. Created CSP violation reporting endpoint
4. Registered CSP report route in system routes
5. Documented implementation

**Next Steps:**
- Monitor CSP violation logs
- Consider implementing script nonces for production hardening
- Add CSP tests to the test suite
