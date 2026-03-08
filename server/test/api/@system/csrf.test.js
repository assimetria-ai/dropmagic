const request = require('supertest')

// Set up test environment variables BEFORE app import
process.env.APP_URL = 'http://localhost:5173'
process.env.DEV_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
process.env.CSRF_SECRET = 'test-csrf-secret-for-testing-only'

const app = require('../../../src/app')

describe('CSRF Protection', () => {
  describe('Token Generation', () => {
    it('should provide CSRF token endpoint', async () => {
      const res = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('csrfToken')
      expect(typeof res.body.csrfToken).toBe('string')
      expect(res.body.csrfToken.length).toBeGreaterThan(0)
    })

    it('should set CSRF cookie when generating token', async () => {
      const res = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')

      expect(res.headers['set-cookie']).toBeDefined()
      const csrfCookie = res.headers['set-cookie'].find((cookie) =>
        cookie.startsWith('__Host-csrf.token=')
      )
      expect(csrfCookie).toBeDefined()
    })
  })

  describe('GET Requests', () => {
    it('should allow GET requests without CSRF token', async () => {
      const res = await request(app)
        .get('/api/ping')
        .set('Origin', 'http://localhost:5173')

      expect(res.status).toBe(200)
    })

    it('should allow HEAD requests without CSRF token', async () => {
      const res = await request(app)
        .head('/api/ping')
        .set('Origin', 'http://localhost:5173')

      expect(res.status).toBe(200)
    })

    it('should allow OPTIONS requests without CSRF token', async () => {
      const res = await request(app)
        .options('/api/ping')
        .set('Origin', 'http://localhost:5173')

      expect(res.status).not.toBe(403)
    })
  })

  describe('Localhost Same-Origin Requests', () => {
    let csrfToken
    let cookies

    beforeEach(async () => {
      // Obtain CSRF token for subsequent requests
      const tokenRes = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')
      csrfToken = tokenRes.body.csrfToken
      cookies = tokenRes.headers['set-cookie']
    })

    it('should allow POST requests with valid CSRF token from same origin', async () => {
      // Create a test endpoint that accepts POST
      // Using /api/login as it should exist and accept POST
      const res = await request(app)
        .post('/api/tasks')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken)
        .send({
          title: 'CSRF Test Task',
          description: 'Testing CSRF protection',
        })

      // Should not be a CSRF error (403)
      // May be 400/401 for auth reasons, but not 403 for CSRF
      expect(res.status).not.toBe(403)
    })

    it('should allow PUT requests with valid CSRF token from same origin', async () => {
      const res = await request(app)
        .put('/api/tasks/1')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken)
        .send({ title: 'Updated Title' })

      // Should not be a CSRF error (403)
      expect(res.status).not.toBe(403)
    })

    it('should allow DELETE requests with valid CSRF token from same origin', async () => {
      const res = await request(app)
        .delete('/api/tasks/1')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken)

      // Should not be a CSRF error (403)
      expect(res.status).not.toBe(403)
    })

    it('should allow PATCH requests with valid CSRF token from same origin', async () => {
      const res = await request(app)
        .patch('/api/tasks/1')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken)
        .send({ status: 'in_progress' })

      // Should not be a CSRF error (403)
      expect(res.status).not.toBe(403)
    })
  })

  describe('CSRF Protection Enforcement', () => {
    it('should reject POST requests without CSRF token', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Origin', 'http://localhost:5173')
        .send({
          title: 'Test Task',
          description: 'This should be blocked',
        })

      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('message')
      expect(res.body.message.toLowerCase()).toContain('csrf')
    })

    it('should reject PUT requests without CSRF token', async () => {
      const res = await request(app)
        .put('/api/tasks/1')
        .set('Origin', 'http://localhost:5173')
        .send({ title: 'Updated' })

      expect(res.status).toBe(403)
    })

    it('should reject DELETE requests without CSRF token', async () => {
      const res = await request(app)
        .delete('/api/tasks/1')
        .set('Origin', 'http://localhost:5173')

      expect(res.status).toBe(403)
    })

    it('should reject PATCH requests without CSRF token', async () => {
      const res = await request(app)
        .patch('/api/tasks/1')
        .set('Origin', 'http://localhost:5173')
        .send({ status: 'done' })

      expect(res.status).toBe(403)
    })

    it('should reject requests with invalid CSRF token', async () => {
      // Get valid cookie but use wrong token
      const tokenRes = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')
      const cookies = tokenRes.headers['set-cookie']

      const res = await request(app)
        .post('/api/tasks')
        .set('Origin', 'http://localhost:5173')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', 'invalid-token-123')
        .send({ title: 'Test' })

      expect(res.status).toBe(403)
    })
  })

  describe('Webhook Endpoints', () => {
    it('should skip CSRF protection for webhook endpoints', async () => {
      // Webhooks use their own verification (e.g., signature validation)
      // and should not require CSRF tokens
      // Webhooks typically don't send Origin header (server-to-server)
      const res = await request(app)
        .post('/api/webhook/stripe')
        .send({
          type: 'test.event',
          data: { test: true },
        })

      // Should not fail with 403 CSRF error
      // May fail with 400/401 for signature reasons, but not CSRF
      expect(res.status).not.toBe(403)
    })
  })

  describe('CSRF Cookie Configuration', () => {
    it('should set httpOnly flag on CSRF cookie', async () => {
      const res = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')

      const csrfCookie = res.headers['set-cookie'].find((cookie) =>
        cookie.startsWith('__Host-csrf.token=')
      )
      expect(csrfCookie).toContain('HttpOnly')
    })

    it('should set SameSite=Strict on CSRF cookie', async () => {
      const res = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')

      const csrfCookie = res.headers['set-cookie'].find((cookie) =>
        cookie.startsWith('__Host-csrf.token=')
      )
      expect(csrfCookie).toContain('SameSite=Strict')
    })

    it('should not set Secure flag in test environment', async () => {
      const res = await request(app)
        .get('/api/csrf-token')
        .set('Origin', 'http://localhost:5173')

      const csrfCookie = res.headers['set-cookie'].find((cookie) =>
        cookie.startsWith('__Host-csrf.token=')
      )
      // In production, Secure should be set; in test, it should not
      expect(process.env.NODE_ENV).toBe('test')
      expect(csrfCookie).not.toContain('Secure')
    })
  })
})
