# Security Middleware

## Overview

This template includes comprehensive security middleware to protect against common web vulnerabilities and attacks. All security features are enabled by default and follow OWASP security best practices.

## Table of Contents

1. [Security Headers (Helmet)](#security-headers-helmet)
2. [CSRF Protection](#csrf-protection)
3. [Rate Limiting](#rate-limiting)
4. [Input Validation](#input-validation)
5. [CORS Configuration](#cors-configuration)
6. [Production Checklist](#production-checklist)

---

## Security Headers (Helmet)

**Location**: `src/lib/@system/Middleware/security.js`

Helmet sets comprehensive security headers to protect against:
- XSS attacks (Content-Security-Policy)
- Clickjacking (X-Frame-Options, frame-ancestors)
- MIME sniffing attacks (X-Content-Type-Options)
- Referrer leakage (Referrer-Policy)
- Cross-origin attacks (CORS policies)

### Key Features

- **Content-Security-Policy (CSP)**: Prevents XSS and injection attacks by controlling resource loading
- **HSTS**: Enforces HTTPS in production (1-year max age, includes subdomains)
- **Frame Protection**: Blocks iframe embedding to prevent clickjacking
- **CSP Reporting**: Violations reported to `/api/csp-report`

### Configuration

The CSP is configured to allow:
- Same-origin resources by default
- Inline styles (required for React/Tailwind)
- HTTPS images (for CDN/user uploads)
- Chatbase integration (if used)

To modify CSP directives, edit `src/lib/@system/Middleware/security.js`:

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://trusted-domain.com"],
    // ... add more directives
  }
}
```

### Applied Globally

```javascript
// src/app.js
const { securityHeaders } = require('./lib/@system/Middleware')
app.use(securityHeaders)
```

---

## CSRF Protection

**Location**: `src/app.js`  
**Documentation**: See [CSRF_PROTECTION.md](./CSRF_PROTECTION.md) for detailed guide

### Implementation

Uses **double-submit cookie pattern** via the `csrf-csrf` package:

1. Client requests CSRF token: `GET /api/csrf-token`
2. Server sets secure HTTP-only cookie and returns token
3. Client includes token in `X-CSRF-Token` header for state-changing requests
4. Server validates header matches cookie

### Protected Methods

- POST, PUT, DELETE, PATCH

### Excluded Routes

- `GET`, `HEAD`, `OPTIONS` (safe methods)
- `/api/webhook/*` (use signature verification instead)

### Client Example

```javascript
// Fetch CSRF token
const { csrfToken } = await fetch('/api/csrf-token', {
  credentials: 'include'
}).then(r => r.json())

// Use in requests
await fetch('/api/resource', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(data)
})
```

### Environment Variables

```bash
# Required in production - generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
CSRF_SECRET=<strong-random-secret>
```

---

## Rate Limiting

**Location**: `src/lib/@system/RateLimit/index.js`

Protects against brute-force attacks and API abuse using `express-rate-limit` with Redis backing (falls back to in-memory for development).

### Named Limiters

| Limiter | Endpoints | Limit | Window | Purpose |
|---------|-----------|-------|--------|---------|
| `loginLimiter` | `POST /api/sessions` | 10 requests | 15 min | Prevent credential stuffing |
| `registerLimiter` | `POST /api/users` | 5 requests | 60 min | Prevent spam registrations |
| `passwordResetLimiter` | `POST /api/users/password/*` | 5 requests | 60 min | Prevent password reset abuse |
| `emailVerificationLimiter` | `POST /api/users/email/verify` | 10 requests | 60 min | Prevent verification spam |
| `apiLimiter` (general) | All `/api/*` routes | 100 requests | 15 min | General API protection |

### Adding Custom Rate Limiters

Edit `src/lib/@system/RateLimit/index.js`:

```javascript
const customLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,                    // 20 requests
  prefix: 'rl:custom:',       // unique Redis key prefix
  message: 'Custom rate limit exceeded'
})

module.exports = { loginLimiter, registerLimiter, customLimiter }
```

Apply to routes:

```javascript
const { customLimiter } = require('../../../lib/@system/RateLimit')
router.post('/api/custom', customLimiter, handler)
```

### Response Headers

Rate limit info is exposed via standard headers:

```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1709876543
```

### Redis Integration

When Redis is available (production), rate limits are shared across all server instances. Development falls back to in-memory store (per-process).

```bash
# Optional - enables distributed rate limiting
REDIS_URL=redis://localhost:6379
```

---

## Input Validation

**Location**: `src/lib/@system/Validation/index.js`

Uses **Zod** schemas for type-safe request validation.

### Features

- Validates `req.body`, `req.query`, `req.params`
- Type coercion (string → number, etc.)
- Detailed error messages
- Auto-parsed values replace raw input

### Usage Example

Define a Zod schema:

```javascript
// src/api/@custom/products/schemas.js
const { z } = require('zod')

const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'food'])
})

module.exports = { CreateProductSchema }
```

Apply to route:

```javascript
const { validate } = require('../../../lib/@system/Middleware')
const { CreateProductSchema } = require('./schemas')

router.post(
  '/products',
  validate({ body: CreateProductSchema }),
  async (req, res) => {
    // req.body is now validated and typed
    const { name, price, category } = req.body
    // ... handle request
  }
)
```

### Validation Errors

Returns `400 Bad Request` with structured errors:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "body.name",
      "message": "String must contain at least 1 character(s)"
    },
    {
      "field": "body.price",
      "message": "Number must be greater than 0"
    }
  ]
}
```

### Best Practices

1. **Validate all user input** - body, query, params
2. **Use strict schemas** - don't allow unknown fields
3. **Sanitize after validation** - use `sanitize-html` for rich text
4. **Coerce types** - Zod handles string → number, boolean, etc.

---

## CORS Configuration

**Location**: `src/lib/@system/Middleware/cors.js`

### Allowed Origins

- `APP_URL` (main application domain)
- `DEV_ORIGINS` (comma-separated list for development)
- Subdomains of `APP_URL` (automatic in production)

### Configuration

```bash
# Required
APP_URL=https://app.example.com

# Optional - for local development
DEV_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Security Rules

1. **Origin header required** - requests without `Origin` are blocked
2. **No wildcards** - `Access-Control-Allow-Origin: *` is never used
3. **Credentials enabled** - cookies/auth headers are allowed
4. **Subdomain support** - `*.example.com` automatically allowed in production

### Error Handling

Blocked origins receive:

```
Error: CORS: origin 'https://malicious-site.com' not allowed
```

---

## Production Checklist

### Environment Variables

Ensure these are set in production:

```bash
# Security
NODE_ENV=production
CSRF_SECRET=<strong-random-value>

# CORS
APP_URL=https://yourdomain.com

# Rate Limiting (optional, recommended)
REDIS_URL=redis://your-redis-host:6379

# SMTP/Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@yourdomain.com
```

### Verify Security Headers

Use online tools to validate:
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

Should achieve **A+** rating with:
- Strict-Transport-Security
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

### HTTPS Required

All security features assume HTTPS in production:
- HSTS headers require HTTPS
- Secure cookies require HTTPS
- CSP upgrade-insecure-requests requires HTTPS

### Test Security

```bash
# Run security tests
npm test -- --grep="security"

# Manual CSRF test
curl -X POST http://localhost:4000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
# Should return 403 Forbidden (missing CSRF token)

# Manual rate limit test
for i in {1..15}; do
  curl http://localhost:4000/api/sessions -X POST
done
# Should start returning 429 after 10 requests
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Security Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Helmet Documentation](https://helmetjs.github.io/)
- [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- [Zod Documentation](https://zod.dev/)
- [csrf-csrf Package](https://github.com/Psifi-Solutions/csrf-csrf)

---

## Support

For security issues or questions:
- Open an issue on GitHub
- Email: security@example.com (update in production)
- Review: `docs/CSRF_PROTECTION.md` for detailed CSRF guide
