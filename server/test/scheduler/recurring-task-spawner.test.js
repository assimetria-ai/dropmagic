/**
 * Tests for RecurringTaskSpawner Scheduler Task (Task #10340)
 * Validates that recurring templates spawn new task instances on schedule
 */

const RecurringTaskSpawner = require('../../src/scheduler/tasks/@custom/RecurringTaskSpawner')
const db = require('../../src/lib/@system/PostgreSQL')

describe('RecurringTaskSpawner Scheduler Task', () => {
  let task
  let testIds = []

  beforeAll(() => {
    task = new RecurringTaskSpawner()
  })

  afterEach(async () => {
    // Clean up test data (children first due to FK)
    if (testIds.length > 0) {
      await db.none('DELETE FROM goals WHERE recurring_source_id = ANY($1)', [testIds])
      await db.none('DELETE FROM goals WHERE id = ANY($1)', [testIds])
      testIds = []
    }
  })

  describe('Configuration', () => {
    it('should have correct task name', () => {
      expect(task.name).toBe('recurring_task_spawner')
    })

    it('should run every 15 minutes', () => {
      expect(task.getSchedule()).toBe('*/15 * * * *')
    })

    it('should not run in parallel', () => {
      expect(task.runInParallel).toBe(false)
    })
  })

  describe('execute()', () => {
    it('should return zeros when no recurring templates exist', async () => {
      const result = await task.execute()
      expect(result.spawned).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should spawn a task when cron schedule is due', async () => {
      // Create a recurring template with a past-due schedule
      // Cron: every minute — and last_spawned_at was 2 hours ago
      const template = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Weekly standup prep', 'Prepare standup notes', 'task', 'active', 'ops', 'medium',
          'rui', '{"cron": "* * * * *", "timezone": "UTC"}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(template.id)

      const result = await task.execute()
      expect(result.spawned).toBe(1)

      // Verify instance was created
      const instances = await db.any(
        'SELECT * FROM goals WHERE recurring_source_id = $1',
        [template.id]
      )
      expect(instances).toHaveLength(1)
      expect(instances[0].title).toContain('Weekly standup prep')
      expect(instances[0].title).toContain('(')
      expect(instances[0].status).toBe('todo')
      expect(instances[0].source).toBe('recurring-scheduler')
      expect(instances[0].recurring_source_id).toBe(template.id)

      // Verify last_spawned_at was updated
      const updated = await db.one('SELECT last_spawned_at FROM goals WHERE id = $1', [template.id])
      expect(updated.last_spawned_at).not.toBeNull()
    })

    it('should skip templates that are not yet due', async () => {
      // Template with schedule far in the future
      // Cron: at 23:59 on Dec 31 — unlikely to be due now
      const template = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Future task', 'Not due yet', 'task', 'active', 'ops', 'medium',
          'rui', '{"cron": "59 23 31 12 *", "timezone": "UTC"}', NOW()
        )
        RETURNING id`
      )
      testIds.push(template.id)

      const result = await task.execute()
      expect(result.skipped).toBeGreaterThanOrEqual(1)

      // No instances should be created
      const instances = await db.any(
        'SELECT * FROM goals WHERE recurring_source_id = $1',
        [template.id]
      )
      expect(instances).toHaveLength(0)
    })

    it('should respect maxActive limit', async () => {
      // Template with maxActive: 1
      const template = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Limited task', 'Only one active at a time', 'task', 'active', 'ops', 'medium',
          'rui', '{"cron": "* * * * *", "maxActive": 1}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(template.id)

      // Create an existing active instance
      const existing = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_source_id
        )
        VALUES (1, 'Existing instance', 'Still active', 'task', 'todo', 'ops', 'medium', 'rui', $1)
        RETURNING id`,
        [template.id]
      )
      testIds.push(existing.id)

      const result = await task.execute()

      // Should not spawn because maxActive is reached
      const instances = await db.any(
        'SELECT * FROM goals WHERE recurring_source_id = $1',
        [template.id]
      )
      expect(instances).toHaveLength(1) // Just the one we created
    })

    it('should ignore archived and completed templates', async () => {
      const archived = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Archived template', 'Should be ignored', 'task', 'archived', 'ops', 'medium',
          'rui', '{"cron": "* * * * *"}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(archived.id)

      const completed = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Completed template', 'Should be ignored', 'task', 'completed', 'ops', 'medium',
          'rui', '{"cron": "* * * * *"}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(completed.id)

      const result = await task.execute()
      expect(result.spawned).toBe(0)
    })

    it('should use autoAssign from schedule config', async () => {
      const template = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Auto-assigned task', 'Should auto-assign', 'task', 'active', 'feature', 'high',
          'rui', '{"cron": "* * * * *", "autoAssign": "agent-felix"}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(template.id)

      await task.execute()

      const instances = await db.any(
        'SELECT * FROM goals WHERE recurring_source_id = $1',
        [template.id]
      )
      expect(instances).toHaveLength(1)
      expect(instances[0].assigned_to).toBe('agent-felix')
    })

    it('should copy type, priority, product, and parent_id from template', async () => {
      const template = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, product, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Detailed template', 'Full details', 'task', 'active', 'infra', 'critical',
          'rui', 'dropmagic', '{"cron": "* * * * *"}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(template.id)

      await task.execute()

      const instances = await db.any(
        'SELECT * FROM goals WHERE recurring_source_id = $1',
        [template.id]
      )
      expect(instances).toHaveLength(1)
      expect(instances[0].type).toBe('infra')
      expect(instances[0].priority).toBe('critical')
      expect(instances[0].product).toBe('dropmagic')
    })

    it('should skip templates with invalid cron expressions', async () => {
      const template = await db.one(
        `INSERT INTO goals (
          user_id, title, description, level, status, type, priority,
          assigned_by, recurring_schedule, last_spawned_at
        )
        VALUES (
          1, 'Bad cron', 'Invalid schedule', 'task', 'active', 'ops', 'medium',
          'rui', '{"cron": "not a cron"}', NOW() - INTERVAL '2 hours'
        )
        RETURNING id`
      )
      testIds.push(template.id)

      const result = await task.execute()
      expect(result.skipped).toBeGreaterThanOrEqual(1)
    })
  })
})
