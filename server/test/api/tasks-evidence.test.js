/**
 * Tests for Task Evidence Requirements (Task #9309)
 * Validates that evidence is required based on task type
 */

const request = require('supertest')
const app = require('../../src/index')
const db = require('../../src/lib/@system/PostgreSQL')

describe('Task Evidence Requirements', () => {
  let authToken
  let userId
  let taskId

  beforeAll(async () => {
    // Set up test user and auth token
    // This would normally use your auth system
    authToken = 'test-token'
    userId = 1
  })

  afterAll(async () => {
    // Clean up test data
    if (taskId) {
      await db.none('DELETE FROM goals WHERE id = $1', [taskId])
    }
  })

  describe('POST /api/tasks - Create Task', () => {
    it('should create a feature task with required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Build user profile page',
          description: 'Create user profile UI with edit functionality. Should include avatar upload, bio field, and social links.',
          type: 'feature',
          priority: 'high',
          assigned_by: 'rui',
          assigned_to: 'agent-felix'
        })

      expect(response.status).toBe(201)
      expect(response.body.task).toBeDefined()
      expect(response.body.task.type).toBe('feature')
      expect(response.body.evidence_requirements).toBeDefined()
      expect(response.body.evidence_requirements.required).toBe(true)

      taskId = response.body.task.id
    })

    it('should fail without description', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Build user profile page',
          type: 'feature',
          assigned_by: 'rui'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Description is required')
    })

    it('should fail without assigned_by', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Build user profile page',
          description: 'Full context here',
          type: 'feature'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('assigned_by is required')
    })

    it('should require blocked_reason when status is blocked', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Build user profile page',
          description: 'Full context here',
          type: 'feature',
          status: 'blocked',
          assigned_by: 'rui'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('blocked_reason is required')
    })
  })

  describe('PATCH /api/tasks/:id - Evidence Validation', () => {
    beforeEach(async () => {
      // Create a test task
      const task = await db.one(
        `INSERT INTO goals (user_id, title, description, level, type, status, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, 'Test task', 'Test description', 'task', 'feature', 'todo', 'rui']
      )
      taskId = task.id
    })

    it('should fail to complete feature task without evidence', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Evidence required for feature tasks')
      expect(response.body.evidence_requirements).toBeDefined()
    })

    it('should fail with invalid evidence type for feature task', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
          evidence_type: 'log',  // Not valid for feature tasks
          completion_evidence: 'Some evidence'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Invalid evidence type for feature tasks')
    })

    it('should complete feature task with valid screenshot evidence', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
          evidence_type: 'screenshot',
          completion_evidence: 'User profile page implemented with all required fields',
          evidence_url: 'https://example.com/screenshots/profile-page.png'
        })

      expect(response.status).toBe(200)
      expect(response.body.task.status).toBe('completed')
      expect(response.body.task.evidence_type).toBe('screenshot')
      expect(response.body.task.completed_at).toBeDefined()
    })

    it('should complete feature task with test-output evidence', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'completed',
          evidence_type: 'test-output',
          completion_evidence: JSON.stringify({
            tests: 'all passed',
            coverage: '95%'
          })
        })

      expect(response.status).toBe(200)
      expect(response.body.task.status).toBe('completed')
      expect(response.body.task.evidence_type).toBe('test-output')
    })
  })

  describe('Evidence Requirements by Task Type', () => {
    const testCases = [
      {
        type: 'feature',
        required: true,
        validTypes: ['screenshot', 'test-output', 'api-response'],
        invalidTypes: ['log']
      },
      {
        type: 'bug',
        required: true,
        validTypes: ['screenshot', 'test-output', 'log'],
        invalidTypes: ['api-response']
      },
      {
        type: 'infra',
        required: true,
        validTypes: ['log', 'api-response', 'screenshot'],
        invalidTypes: []
      },
      {
        type: 'research',
        required: false,
        validTypes: ['other'],
        invalidTypes: []
      },
      {
        type: 'content',
        required: false,
        validTypes: ['other'],
        invalidTypes: []
      }
    ]

    testCases.forEach(({ type, required, validTypes }) => {
      it(`should ${required ? 'require' : 'not require'} evidence for ${type} tasks`, async () => {
        // Create task
        const task = await db.one(
          `INSERT INTO goals (user_id, title, description, level, type, status, assigned_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [userId, `Test ${type} task`, 'Description', 'task', type, 'todo', 'rui']
        )

        // Try to complete without evidence
        const response = await request(app)
          .patch(`/api/tasks/${task.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'completed'
          })

        if (required) {
          expect(response.status).toBe(400)
          expect(response.body.error).toContain('Evidence required')
        } else {
          expect(response.status).toBe(200)
        }

        // Clean up
        await db.none('DELETE FROM goals WHERE id = $1', [task.id])
      })
    })
  })

  describe('GET /api/tasks/evidence-requirements', () => {
    it('should return evidence requirements for all task types', async () => {
      const response = await request(app)
        .get('/api/tasks/evidence-requirements')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.evidence_requirements).toBeDefined()
      expect(response.body.evidence_requirements.feature).toBeDefined()
      expect(response.body.evidence_requirements.feature.required).toBe(true)
      expect(response.body.evidence_requirements.feature.types).toContain('screenshot')
    })
  })

  describe('GET /api/tasks/:id', () => {
    it('should include evidence requirements in task details', async () => {
      // Create a test task
      const task = await db.one(
        `INSERT INTO goals (user_id, title, description, level, type, status, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, 'Test task', 'Test description', 'task', 'bug', 'todo', 'rui']
      )

      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.task).toBeDefined()
      expect(response.body.evidence_requirements).toBeDefined()
      expect(response.body.evidence_requirements.required).toBe(true)
      expect(response.body.evidence_requirements.types).toContain('screenshot')

      // Clean up
      await db.none('DELETE FROM goals WHERE id = $1', [task.id])
    })
  })
})
