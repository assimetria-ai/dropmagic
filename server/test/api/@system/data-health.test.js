/**
 * API tests for GET /api/data-health
 *
 * Tests run without a real DB — mocked for fast, deterministic, CI-friendly execution.
 */

const request = require('supertest')
const crypto = require('crypto')

// ── Mock PostgreSQL ────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/PostgreSQL', () => {
  const mockDb = {
    one: jest.fn(),
    oneOrNone: jest.fn(),
    none: jest.fn(),
    any: jest.fn(),
  }
  mockDb.connectPool = jest.fn().mockResolvedValue()
  mockDb.disconnectPool = jest.fn().mockResolvedValue()
  mockDb.pgp = {}
  return mockDb
})

// ── Mock Redis ─────────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/Redis', () => ({
  client: {
    on: jest.fn(),
    status: 'ready',
    get: jest.fn(async () => null),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(async () => 0),
    incr: jest.fn(async () => 1),
    expire: jest.fn(),
    ttl: jest.fn(async () => -1),
  },
  connect: jest.fn().mockResolvedValue(),
  isReady: jest.fn().mockReturnValue(true),
}))

// ── Mock auth middleware ───────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/Helpers/auth', () => ({
  authenticate: (req, res, next) => {
    // Mock authenticated user
    req.user = { id: 1, email: 'test@example.com', role: 'admin' }
    next()
  },
  requireAdmin: (req, res, next) => next(),
  extractAccessToken: jest.fn(),
}))

// Set up environment before requiring app
process.env.APP_URL = 'http://localhost:3000'

// Set up JWT keys so the app doesn't crash on startup
const { privateKey, publicKey} = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

const app = require('../../../src/app')
const db = require('../../../src/lib/@system/PostgreSQL')

describe('GET /api/data-health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns comprehensive health data', async () => {
    // Mock table existence check (always return true for all tables in this test)
    db.oneOrNone.mockResolvedValue({ exists: true })

    // Mock responses for multiple tables - just enough to let the endpoint run
    db.one.mockResolvedValue({ count: '0' })

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: expect.stringMatching(/healthy|degraded/),
      timestamp: expect.any(String),
      tables: expect.any(Object),
      summary: {
        totalTables: expect.any(Number),
        avgCompleteness: expect.any(Number),
        orphansFound: expect.any(Number),
      },
    })
  })

  it('detects orphaned records', async () => {
    db.oneOrNone.mockResolvedValue({ exists: true })

    // First table (users) - no issues
    db.one
      .mockResolvedValueOnce({ count: '10' }) // users row count
      .mockResolvedValueOnce({ count: '0' })  // name nulls
      .mockResolvedValueOnce({ count: '5' })  // stripe_customer_id nulls
      // Then drops table with orphans
      .mockResolvedValueOnce({ count: '5' })  // drops row count
      .mockResolvedValueOnce({ count: '0' })  // description nulls
      .mockResolvedValueOnce({ count: '0' })  // product_url nulls
      .mockResolvedValueOnce({ count: '0' })  // image_url nulls
      .mockResolvedValueOnce({ count: '0' })  // launch_at nulls
      .mockResolvedValueOnce({ count: '2' })  // orphaned user_id!
      // Rest of the checks
      .mockResolvedValue({ count: '0' })      // all remaining checks return 0

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('degraded')
    expect(res.body.summary.orphansFound).toBeGreaterThan(0)
  })

  it('handles missing tables gracefully', async () => {
    db.oneOrNone.mockResolvedValue({ exists: false })

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.status).toBe(200)
    expect(res.body.tables.users).toEqual({ status: 'missing' })
  })

  it('handles empty tables', async () => {
    db.oneOrNone.mockResolvedValue({ exists: true })
    db.one.mockResolvedValue({ count: '0' }) // All tables empty

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.status).toBe(200)
    // At least one table should be marked as empty
    const tableValues = Object.values(res.body.tables)
    expect(tableValues.some(t => t.status === 'empty')).toBe(true)
  })

  it('calculates completeness scores', async () => {
    db.oneOrNone.mockResolvedValue({ exists: true })
    db.one.mockResolvedValue({ count: '0' })

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.status).toBe(200)
    expect(res.body.summary.avgCompleteness).toBeGreaterThanOrEqual(0)
    expect(res.body.summary.avgCompleteness).toBeLessThanOrEqual(100)
  })

  it('returns JSON content-type', async () => {
    db.oneOrNone.mockResolvedValue({ exists: true })
    db.one.mockResolvedValue({ count: '0' })

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.headers['content-type']).toMatch(/application\/json/)
  })

  it('handles database errors gracefully', async () => {
    db.oneOrNone.mockRejectedValue(new Error('Database connection failed'))

    const res = await request(app)
      .get('/api/data-health')
      .set('Origin', 'http://localhost:3000')

    expect(res.status).toBe(500)
    expect(res.body.status).toBe('error')
    expect(res.body.message).toBe('Failed to perform data health check')
  })
})
