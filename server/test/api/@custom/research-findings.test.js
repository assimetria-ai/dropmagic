/**
 * API tests for /api/research-findings
 *
 * All external dependencies (DB) are mocked.
 */

const request = require('supertest')
const crypto = require('crypto')

// ── Mock PostgreSQL ────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/PostgreSQL', () => {
  const mockDb = {
    _findings: [],
    _goals: [],
    _reset() {
      mockDb._findings = []
      mockDb._goals = []
    },
    one: jest.fn(),
    oneOrNone: jest.fn(),
    none: jest.fn(),
    any: jest.fn(),
    result: jest.fn(),
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
    incr: jest.fn(async () => 1),
    expire: jest.fn(),
    ttl: jest.fn(async () => -1),
  },
  isReady: () => false,
}))

// ── Mock Email ─────────────────────────────────────────────────────────────
jest.mock('../../../src/lib/@system/Email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}))

// Set up JWT keys so the app doesn't crash on startup
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')

// Require app after all mocks are loaded
const app = require('../../../src/app')
const db = require('../../../src/lib/@system/PostgreSQL')

describe('POST /api/register (setup auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    db._reset()
  })

  test('should return 201 when registering a new user', async () => {
    // Mock the database responses
    db.oneOrNone.mockResolvedValueOnce(null) // email not found
    db.one.mockResolvedValueOnce({ id: 1, email: 'test@example.com' }) // user created

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'securePassword123!' })

    expect(res.statusCode).toBe(201)
    expect(res.body).toHaveProperty('user')
    expect(res.body).toHaveProperty('token')
  })
})

describe('GET /api/research-findings', () => {
  let authToken
  const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', email_verified_at: new Date() }

  beforeAll(async () => {
    // Mock user for auth
    db.oneOrNone.mockResolvedValueOnce(null) // email not found
    db.one.mockResolvedValueOnce(mockUser) // user created

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'securePassword123!' })

    authToken = res.body.token
  })

  beforeEach(() => {
    jest.clearAllMocks()
    db._reset()
  })

  test('should list research findings with pagination', async () => {
    const mockFindings = [
      {
        id: 1,
        source: 'twitter',
        url: 'https://twitter.com/test',
        title: 'Test Finding',
        summary: 'Test summary',
        category: 'product',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]

    // First call: authenticate middleware looks up user
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.any.mockResolvedValueOnce(mockFindings)
    db.one.mockResolvedValueOnce({ count: '1' })

    const res = await request(app)
      .get('/api/research-findings')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('findings')
    expect(res.body).toHaveProperty('pagination')
    expect(res.body.findings).toBeInstanceOf(Array)
  })

  test('should filter by source', async () => {
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.any.mockResolvedValueOnce([])
    db.one.mockResolvedValueOnce({ count: '0' })

    const res = await request(app)
      .get('/api/research-findings?source=github')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.statusCode).toBe(200)
    expect(db.any).toHaveBeenCalled()
  })

  test('should filter by date range', async () => {
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.any.mockResolvedValueOnce([])
    db.one.mockResolvedValueOnce({ count: '0' })

    const res = await request(app)
      .get('/api/research-findings?from_date=2024-01-01&to_date=2024-12-31')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.statusCode).toBe(200)
  })
})

describe('POST /api/research-findings', () => {
  let authToken
  const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', email_verified_at: new Date() }

  beforeAll(async () => {
    db.oneOrNone.mockResolvedValueOnce(null)
    db.one.mockResolvedValueOnce(mockUser)

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'securePassword123!' })

    authToken = res.body.token
  })

  beforeEach(() => {
    jest.clearAllMocks()
    db._reset()
  })

  test('should create a new research finding', async () => {
    const newFinding = {
      id: 1,
      source: 'twitter',
      url: 'https://twitter.com/test/123',
      title: 'New Finding',
      summary: 'This is a test finding',
      category: 'product',
      created_at: new Date(),
      updated_at: new Date()
    }

    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.one.mockResolvedValueOnce(newFinding)

    const res = await request(app)
      .post('/api/research-findings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        source: 'twitter',
        url: 'https://twitter.com/test/123',
        title: 'New Finding',
        summary: 'This is a test finding'
      })

    expect(res.statusCode).toBe(201)
    expect(res.body).toHaveProperty('finding')
    expect(res.body.finding.source).toBe('twitter')
  })

  test('should return 400 when required fields are missing', async () => {
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    
    const res = await request(app)
      .post('/api/research-findings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ source: 'twitter' })

    expect(res.statusCode).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  test('should return 400 when source is invalid', async () => {
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    
    const res = await request(app)
      .post('/api/research-findings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        source: 'invalid',
        url: 'https://example.com',
        title: 'Test'
      })

    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('Invalid source')
  })
})

describe('PATCH /api/research-findings/:id', () => {
  let authToken
  const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', email_verified_at: new Date() }

  beforeAll(async () => {
    db.oneOrNone.mockResolvedValueOnce(null)
    db.one.mockResolvedValueOnce(mockUser)

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'securePassword123!' })

    authToken = res.body.token
  })

  beforeEach(() => {
    jest.clearAllMocks()
    db._reset()
  })

  test('should update a research finding', async () => {
    const existingFinding = {
      id: 1,
      source: 'twitter',
      url: 'https://twitter.com/test',
      title: 'Old Title',
      summary: 'Old summary',
      category: 'product'
    }

    const updatedFinding = {
      ...existingFinding,
      title: 'New Title'
    }

    // First call: authenticate middleware looks up user
    // Second call: PATCH handler looks up existing finding
    db.oneOrNone
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(existingFinding)
    db.one.mockResolvedValueOnce(updatedFinding)

    const res = await request(app)
      .patch('/api/research-findings/1')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'New Title' })

    expect(res.statusCode).toBe(200)
    expect(res.body.finding.title).toBe('New Title')
  })

  test('should return 404 when finding not found', async () => {
    // First call: authenticate middleware looks up user
    // Second call: PATCH handler looks up finding (returns null)
    db.oneOrNone
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null)

    const res = await request(app)
      .patch('/api/research-findings/999')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'New Title' })

    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/research-findings/:id', () => {
  let authToken
  const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', email_verified_at: new Date() }

  beforeAll(async () => {
    db.oneOrNone.mockResolvedValueOnce(null)
    db.one.mockResolvedValueOnce(mockUser)

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'securePassword123!' })

    authToken = res.body.token
  })

  beforeEach(() => {
    jest.clearAllMocks()
    db._reset()
  })

  test('should delete a research finding', async () => {
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.result.mockResolvedValueOnce({ rowCount: 1 })

    const res = await request(app)
      .delete('/api/research-findings/1')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('should return 404 when finding not found', async () => {
    db.oneOrNone.mockResolvedValueOnce(mockUser)
    db.result.mockResolvedValueOnce({ rowCount: 0 })

    const res = await request(app)
      .delete('/api/research-findings/999')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/research-findings/:id/create-task', () => {
  let authToken
  const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', email_verified_at: new Date() }

  beforeAll(async () => {
    db.oneOrNone.mockResolvedValueOnce(null)
    db.one.mockResolvedValueOnce(mockUser)

    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com', password: 'securePassword123!' })

    authToken = res.body.token
  })

  beforeEach(() => {
    jest.clearAllMocks()
    db._reset()
  })

  test('should create a task from a research finding', async () => {
    const finding = {
      id: 1,
      source: 'twitter',
      url: 'https://twitter.com/test',
      title: 'Research Finding Title',
      summary: 'This is interesting research',
      category: 'product'
    }

    const newTask = {
      id: 1,
      user_id: 1,
      title: 'Research Finding Title',
      description: 'This is interesting research',
      level: 'task',
      status: 'active',
      parent_id: null,
      sort_order: 0
    }

    // First: auth lookup, Second: finding lookup
    db.oneOrNone
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(finding)
    db.one.mockResolvedValueOnce(newTask)

    const res = await request(app)
      .post('/api/research-findings/1/create-task')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})

    expect(res.statusCode).toBe(201)
    expect(res.body).toHaveProperty('task')
    expect(res.body).toHaveProperty('finding')
    expect(res.body.task.level).toBe('task')
  })

  test('should create a task with custom title and parent', async () => {
    const finding = {
      id: 1,
      source: 'github',
      url: 'https://github.com/test/repo',
      title: 'Research Finding',
      summary: 'Summary',
      category: 'tech'
    }

    const parentGoal = {
      id: 5,
      user_id: 1,
      title: 'Parent Strategy',
      level: 'strategy'
    }

    const newTask = {
      id: 2,
      user_id: 1,
      title: 'Custom Task Title',
      description: 'Custom description',
      level: 'task',
      status: 'active',
      parent_id: 5,
      sort_order: 0
    }

    // First: auth lookup, Second: finding lookup, Third: parent goal lookup
    db.oneOrNone
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(finding)
      .mockResolvedValueOnce(parentGoal)
    db.one.mockResolvedValueOnce(newTask)

    const res = await request(app)
      .post('/api/research-findings/1/create-task')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Custom Task Title',
        description: 'Custom description',
        parent_id: 5
      })

    expect(res.statusCode).toBe(201)
    expect(res.body.task.title).toBe('Custom Task Title')
    expect(res.body.task.parent_id).toBe(5)
  })

  test('should return 404 when finding not found', async () => {
    // First: auth lookup, Second: finding lookup (returns null)
    db.oneOrNone
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/api/research-findings/999/create-task')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})

    expect(res.statusCode).toBe(404)
  })

  test('should return 404 when parent goal not found', async () => {
    const finding = {
      id: 1,
      source: 'twitter',
      url: 'https://twitter.com/test',
      title: 'Finding',
      summary: 'Summary'
    }

    // First: auth lookup, Second: finding lookup, Third: parent goal lookup (returns null)
    db.oneOrNone
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(finding)
      .mockResolvedValueOnce(null) // parent not found

    const res = await request(app)
      .post('/api/research-findings/1/create-task')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ parent_id: 999 })

    expect(res.statusCode).toBe(404)
    expect(res.body.error).toContain('Parent goal not found')
  })
})
