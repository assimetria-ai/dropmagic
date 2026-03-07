/**
 * API tests for /api/user-data/:userId (GDPR Article 15: Right to Access)
 *
 * All external dependencies (DB, Redis) are mocked.
 */

const request = require('supertest')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

// Set up test environment variables BEFORE any imports
process.env.APP_URL = 'http://localhost:5173'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'

// ── Mock PostgreSQL ────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/PostgreSQL', () => {
  const mockDb = {
    _userData: {},
    _reset() {
      mockDb._userData = {}
      jest.clearAllMocks()
    },
    one: jest.fn(),
    oneOrNone: jest.fn(),
    none: jest.fn(),
    any: jest.fn(),
    manyOrNone: jest.fn(),
    tx: jest.fn(async (fn) => fn(mockDb)),
  }
  return mockDb
})

// ── Mock Redis ─────────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/Redis', () => ({
  client: {
    get: jest.fn(async () => null),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(async () => 0),
  },
  isReady: () => false,
  connect: jest.fn(),
}))

// Set up JWT keys
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

const app = require('../../../src/app')
const db = require('../../../src/lib/@system/PostgreSQL')

beforeEach(() => {
  db._reset()
})

// Helper: generate valid JWT for testing
function generateToken(userId, role = 'user') {
  return jwt.sign(
    { id: userId, role },
    privateKey.replace(/\\n/g, '\n'),
    { algorithm: 'RS256', expiresIn: '1h' }
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user-data/:userId — GDPR data export
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/user-data/:userId', () => {
  const mockUser = {
    id: 123,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    stripe_customer_id: 'cus_test123',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-03-01'),
  }

  const mockSessions = [
    { id: 'sess_1', user_id: 123, expires_at: new Date('2024-12-31'), created_at: new Date('2024-01-15') },
    { id: 'sess_2', user_id: 123, expires_at: new Date('2024-12-31'), created_at: new Date('2024-02-01') },
  ]

  const mockRefreshTokens = [
    { id: 'rt_1', user_id: 123, expires_at: new Date('2024-12-31'), created_at: new Date('2024-01-15') },
  ]

  const mockSubscriptions = [
    {
      id: 'sub_1',
      user_id: 123,
      stripe_subscription_id: 'sub_test123',
      stripe_customer_id: 'cus_test123',
      stripe_price_id: 'price_test',
      status: 'active',
      current_period_start: new Date('2024-03-01'),
      current_period_end: new Date('2024-04-01'),
      cancel_at_period_end: false,
      created_at: new Date('2024-03-01'),
      updated_at: new Date('2024-03-01'),
    },
  ]

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', 'Bearer invalid.token.here')
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid user ID format', async () => {
    const token = generateToken(123)
    const res = await request(app)
      .get('/api/user-data/not-a-number')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Invalid user ID')
  })

  it('returns 403 when requesting another user\'s data (non-admin)', async () => {
    const token = generateToken(456) // Different user
    db.oneOrNone.mockResolvedValue(mockUser)

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('You can only export your own data')
  })

  it('returns 404 when user does not exist', async () => {
    const token = generateToken(123)
    db.oneOrNone.mockResolvedValue(null) // User not found

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('User not found')
  })

  it('returns complete user data export for own account', async () => {
    const token = generateToken(123)

    // Mock DB responses
    db.oneOrNone
      .mockResolvedValueOnce(mockUser) // User lookup
    
    db.manyOrNone
      .mockResolvedValueOnce(mockSessions) // Sessions
      .mockResolvedValueOnce(mockRefreshTokens) // Refresh tokens
      .mockResolvedValueOnce(mockSubscriptions) // Subscriptions
      .mockResolvedValueOnce([]) // Audit logs
      .mockResolvedValueOnce([]) // Collaborators
      .mockResolvedValueOnce([]) // File uploads
      .mockResolvedValueOnce([]) // Email logs
      .mockResolvedValueOnce([]) // Drops
      .mockResolvedValueOnce([]) // Blog posts

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="user-data-export-123-/)

    // Verify export structure
    expect(res.body).toHaveProperty('metadata')
    expect(res.body.metadata).toHaveProperty('exportDate')
    expect(res.body.metadata.userId).toBe(123)
    expect(res.body.metadata.dataProtectionNotice).toMatch(/GDPR Article 15/)

    // Verify user data
    expect(res.body.user).toMatchObject({
      id: 123,
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      stripeCustomerId: 'cus_test123',
    })

    // Verify related data
    expect(res.body.sessions).toHaveLength(2)
    expect(res.body.refreshTokens).toHaveLength(1)
    expect(res.body.subscriptions).toHaveLength(1)
    expect(res.body.subscriptions[0].status).toBe('active')
  })

  it('allows admin to export any user\'s data', async () => {
    const adminToken = generateToken(999, 'admin')

    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.manyOrNone
      .mockResolvedValueOnce([]) // Sessions
      .mockResolvedValueOnce([]) // Refresh tokens
      .mockResolvedValueOnce([]) // Subscriptions
      .mockResolvedValueOnce([]) // Audit logs
      .mockResolvedValueOnce([]) // Collaborators
      .mockResolvedValueOnce([]) // File uploads
      .mockResolvedValueOnce([]) // Email logs
      .mockResolvedValueOnce([]) // Drops
      .mockResolvedValueOnce([]) // Blog posts

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(123)
  })

  it('handles missing optional tables gracefully', async () => {
    const token = generateToken(123)

    db.oneOrNone.mockResolvedValueOnce(mockUser)
    
    // Required tables return data
    db.manyOrNone
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValueOnce(mockRefreshTokens)
      .mockResolvedValueOnce(mockSubscriptions)
    
    // Optional tables throw errors (table doesn't exist)
    db.manyOrNone
      .mockRejectedValueOnce(new Error('relation "audit_logs" does not exist'))
      .mockRejectedValueOnce(new Error('relation "collaborators" does not exist'))
      .mockRejectedValueOnce(new Error('relation "file_uploads" does not exist'))
      .mockRejectedValueOnce(new Error('relation "email_logs" does not exist'))
      .mockRejectedValueOnce(new Error('relation "drops" does not exist'))
      .mockRejectedValueOnce(new Error('relation "blog_posts" does not exist'))

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    // Should still have core data
    expect(res.body.user.id).toBe(123)
    expect(res.body.sessions).toHaveLength(2)
    expect(res.body.subscriptions).toHaveLength(1)
    
    // Optional fields should not be present or be empty
    // (implementation may vary - either missing or empty array)
  })

  it('includes all expected data sections in export', async () => {
    const token = generateToken(123)

    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.manyOrNone.mockResolvedValue([]) // All optional sections empty

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    // Verify all expected sections are present
    const expectedSections = [
      'metadata',
      'user',
      'sessions',
      'refreshTokens',
      'subscriptions',
    ]

    expectedSections.forEach(section => {
      expect(res.body).toHaveProperty(section)
    })
  })

  it('sanitizes sensitive data appropriately', async () => {
    const token = generateToken(123)

    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.manyOrNone
      .mockResolvedValueOnce(mockSessions)
      .mockResolvedValue([])

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)

    // Ensure sessions don't include token hashes (only metadata)
    res.body.sessions.forEach(session => {
      expect(session).not.toHaveProperty('token_hash')
      expect(session).not.toHaveProperty('session_token')
    })
  })

  it('formats export filename with userId and timestamp', async () => {
    const token = generateToken(123)

    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.manyOrNone.mockResolvedValue([])

    const res = await request(app)
      .get('/api/user-data/123')
      .set('Origin', 'http://localhost:5173')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/user-data-export-123-\d+\.json/)
  })
})
