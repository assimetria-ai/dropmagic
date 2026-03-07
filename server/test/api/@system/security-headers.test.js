const request = require('supertest')
const app = require('../../../src/app')

describe('Security Headers', () => {
  describe('Content-Security-Policy', () => {
    it('should set CSP headers on all responses', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['content-security-policy']).toBeDefined()
    })

    it('should include default-src self directive', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain("default-src 'self'")
    })

    it('should allow Chatbase in script-src', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain('script-src')
      expect(csp).toContain('https://www.chatbase.co')
    })

    it('should allow unsafe-inline styles for React/Tailwind', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain('style-src')
      expect(csp).toContain("'unsafe-inline'")
    })

    it('should block object-src', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain("object-src 'none'")
    })

    it('should allow Chatbase in frame-src', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain('frame-src')
      expect(csp).toContain('https://www.chatbase.co')
    })

    it('should prevent framing with frame-ancestors none', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('should include CSP report-uri', async () => {
      const res = await request(app).get('/api/ping')
      const csp = res.headers['content-security-policy']

      expect(csp).toContain('report-uri /api/csp-report')
    })
  })

  describe('Other Security Headers', () => {
    it('should set X-Content-Type-Options', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should set X-Frame-Options', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['x-frame-options']).toBe('DENY')
    })

    it('should set Referrer-Policy', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['referrer-policy']).toBeDefined()
    })

    it('should hide X-Powered-By', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['x-powered-by']).toBeUndefined()
    })

    it('should set Cross-Origin-Opener-Policy', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['cross-origin-opener-policy']).toBe('same-origin')
    })

    it('should set Cross-Origin-Resource-Policy', async () => {
      const res = await request(app).get('/api/ping')

      expect(res.headers['cross-origin-resource-policy']).toBe('same-site')
    })
  })

  describe('HSTS (Production only)', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should not set HSTS in test environment', async () => {
      process.env.NODE_ENV = 'test'
      const res = await request(app).get('/api/ping')

      expect(res.headers['strict-transport-security']).toBeUndefined()
    })

    // Note: HSTS test for production would require mocking NODE_ENV
    // and reloading the app module, which is complex in this test suite.
    // Manual testing in production environment recommended.
  })
})
