# CSRF Protection

## Overview

This application uses **double-submit cookie CSRF protection** to prevent Cross-Site Request Forgery attacks on state-changing operations (POST, PUT, DELETE, PATCH).

## How It Works

1. **Token Generation**: The server generates a CSRF token and stores it in a secure, HTTP-only cookie (`__Host-csrf.token`)
2. **Token Submission**: Clients must include the token in the `X-CSRF-Token` header for state-changing requests
3. **Token Validation**: The server compares the header token with the cookie token to verify the request is legitimate

## Implementation Details

### Server Configuration

- **Protected Methods**: POST, PUT, DELETE, PATCH
- **Unprotected Methods**: GET, HEAD, OPTIONS
- **Excluded Routes**: Webhook endpoints (`/api/webhook/*`) - these use signature verification instead
- **Cookie Settings**:
  - Name: `__Host-csrf.token`
  - SameSite: `strict`
  - Secure: `true` (production only)
  - HttpOnly: `true`
  - Size: 64 bytes

### Client Usage

#### 1. Obtain a CSRF Token

Before making any state-changing request, fetch a CSRF token:

```javascript
const response = await fetch('/api/csrf-token', {
  credentials: 'include' // Important: include cookies
})
const { csrfToken } = await response.json()
```

The server will set the `__Host-csrf.token` cookie automatically.

#### 2. Include Token in State-Changing Requests

Add the token to the `X-CSRF-Token` header:

```javascript
const response = await fetch('/api/resource', {
  method: 'POST',
  credentials: 'include', // Important: include cookies
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ data: 'value' })
})
```

### Frontend Integration Example

```javascript
// Store CSRF token in memory (refresh on page load)
let csrfToken = null

async function getCsrfToken() {
  if (!csrfToken) {
    const response = await fetch('/api/csrf-token', {
      credentials: 'include'
    })
    const data = await response.json()
    csrfToken = data.csrfToken
  }
  return csrfToken
}

async function apiPost(url, data) {
  const token = await getCsrfToken()
  
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token
    },
    body: JSON.stringify(data)
  })
  
  // Handle 403 CSRF errors - token might be expired
  if (response.status === 403) {
    csrfToken = null // Clear cached token
    return apiPost(url, data) // Retry once
  }
  
  return response
}
```

### Error Handling

If CSRF validation fails, the server returns:
- **Status**: 403 Forbidden
- **Body**: `{ message: 'Invalid CSRF token' }`

Common causes:
- Missing `X-CSRF-Token` header
- Token mismatch between header and cookie
- Cookie not sent (check `credentials: 'include'`)
- Token expired (fetch a new one)

## Security Considerations

### Production Checklist

1. **Set CSRF_SECRET environment variable** to a strong random value:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Verify cookies are secure**:
   - `NODE_ENV=production` enables secure cookies
   - HTTPS must be enabled in production
   - SameSite policy helps prevent token leakage

3. **CORS Configuration**:
   - Only allow trusted origins in CORS settings
   - Do not use `Access-Control-Allow-Origin: *` with credentials

### Webhook Exception

Webhook endpoints (e.g., `/api/webhook/stripe`) are **excluded** from CSRF protection because:
- They use signature verification (e.g., Stripe webhook signatures)
- Third-party services cannot send CSRF tokens
- Signature verification provides equivalent security

### Testing

To disable CSRF in tests, you can:
1. Set `NODE_ENV=test` (tokens are still generated but easier to mock)
2. Mock the CSRF token generation endpoint
3. Use supertest with proper cookie/header setup

Example test:
```javascript
const request = require('supertest')
const app = require('./app')

describe('CSRF Protection', () => {
  it('should reject POST without CSRF token', async () => {
    await request(app)
      .post('/api/resource')
      .send({ data: 'value' })
      .expect(403)
  })

  it('should accept POST with valid CSRF token', async () => {
    // Get CSRF token
    const tokenRes = await request(app)
      .get('/api/csrf-token')
    
    const csrfToken = tokenRes.body.csrfToken
    const cookies = tokenRes.headers['set-cookie']
    
    // Make protected request
    await request(app)
      .post('/api/resource')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ data: 'value' })
      .expect(200)
  })
})
```

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [csrf-csrf Package Documentation](https://github.com/Psifi-Solutions/csrf-csrf)
- [Double-Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
