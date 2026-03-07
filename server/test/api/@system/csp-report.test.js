const request = require('supertest')
const app = require('../../../src/app')

describe('CSP Report Endpoint', () => {
  it('should accept CSP violation reports', async () => {
    const violation = {
      'csp-report': {
        'document-uri': 'https://example.com/page',
        'violated-directive': 'script-src-elem',
        'effective-directive': 'script-src',
        'original-policy': "default-src 'self'; script-src 'self'",
        'blocked-uri': 'https://evil.com/malicious.js',
        'source-file': 'https://example.com/page',
        'line-number': 42,
        'column-number': 10,
        'status-code': 200,
      },
    }

    const res = await request(app)
      .post('/api/csp-report')
      .type('application/csp-report')
      .send(JSON.stringify(violation))

    expect(res.status).toBe(204)
  })

  it('should handle CSP reports without nested csp-report key', async () => {
    const violation = {
      'document-uri': 'https://example.com/page',
      'violated-directive': 'script-src-elem',
      'blocked-uri': 'https://evil.com/malicious.js',
    }

    const res = await request(app)
      .post('/api/csp-report')
      .type('application/csp-report')
      .send(JSON.stringify(violation))

    expect(res.status).toBe(204)
  })

  it('should accept JSON content-type as well', async () => {
    const violation = {
      'csp-report': {
        'document-uri': 'https://example.com/page',
        'violated-directive': 'img-src',
        'blocked-uri': 'https://malicious.com/image.jpg',
      },
    }

    const res = await request(app)
      .post('/api/csp-report')
      .send(violation)

    expect(res.status).toBe(204)
  })
})
