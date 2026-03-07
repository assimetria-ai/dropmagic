/**
 * Tests for ArchiveOldDoneTasks Scheduler Task (Task #9310)
 * Validates that completed tasks older than 7 days are auto-archived
 */

const ArchiveOldDoneTasks = require('../../src/scheduler/tasks/@custom/ArchiveOldDoneTasks')
const db = require('../../src/lib/@system/PostgreSQL')

describe('ArchiveOldDoneTasks Scheduler Task', () => {
  let task
  let testTaskIds = []

  beforeAll(() => {
    task = new ArchiveOldDoneTasks()
  })

  afterEach(async () => {
    // Clean up test tasks
    if (testTaskIds.length > 0) {
      await db.none('DELETE FROM goals WHERE id = ANY($1)', [testTaskIds])
      testTaskIds = []
    }
  })

  describe('Configuration', () => {
    it('should have correct task name', () => {
      expect(task.name).toBe('archive_old_done_tasks')
    })

    it('should run daily at 2:00 AM', () => {
      const schedule = task.getSchedule()
      expect(schedule).toBe('0 2 * * *')
    })

    it('should not run in parallel', () => {
      expect(task.runInParallel).toBe(false)
    })
  })

  describe('execute()', () => {
    it('should archive completed tasks older than 7 days', async () => {
      // Create test tasks with different states
      const oldCompletedTask = await db.one(
        `INSERT INTO goals (user_id, title, description, level, status, updated_at, created_at)
         VALUES (1, 'Old completed task', 'Test task', 'task', 'completed', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days')
         RETURNING id`,
        []
      )
      testTaskIds.push(oldCompletedTask.id)

      const recentCompletedTask = await db.one(
        `INSERT INTO goals (user_id, title, description, level, status, updated_at, created_at)
         VALUES (1, 'Recent completed task', 'Test task', 'task', 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days')
         RETURNING id`,
        []
      )
      testTaskIds.push(recentCompletedTask.id)

      const oldTodoTask = await db.one(
        `INSERT INTO goals (user_id, title, description, level, status, updated_at, created_at)
         VALUES (1, 'Old todo task', 'Test task', 'task', 'todo', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days')
         RETURNING id`,
        []
      )
      testTaskIds.push(oldTodoTask.id)

      // Execute the task
      const result = await task.execute()

      // Verify results
      expect(result.archivedCount).toBe(1)
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].id).toBe(oldCompletedTask.id)

      // Verify database state
      const archivedTask = await db.one(
        'SELECT status FROM goals WHERE id = $1',
        [oldCompletedTask.id]
      )
      expect(archivedTask.status).toBe('archived')

      const stillCompleted = await db.one(
        'SELECT status FROM goals WHERE id = $1',
        [recentCompletedTask.id]
      )
      expect(stillCompleted.status).toBe('completed')

      const stillTodo = await db.one(
        'SELECT status FROM goals WHERE id = $1',
        [oldTodoTask.id]
      )
      expect(stillTodo.status).toBe('todo')
    })

    it('should return zero count when no tasks need archiving', async () => {
      // Create only recent or non-completed tasks
      const recentTask = await db.one(
        `INSERT INTO goals (user_id, title, description, level, status, updated_at, created_at)
         VALUES (1, 'Recent task', 'Test task', 'task', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days')
         RETURNING id`,
        []
      )
      testTaskIds.push(recentTask.id)

      const result = await task.execute()

      expect(result.archivedCount).toBe(0)
      expect(result.tasks).toHaveLength(0)
    })

    it('should only affect tasks at task level, not other goal levels', async () => {
      // Create completed mission/strategy/objective with old dates
      const oldCompletedMission = await db.one(
        `INSERT INTO goals (user_id, title, description, level, status, updated_at, created_at)
         VALUES (1, 'Old completed mission', 'Test mission', 'mission', 'completed', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days')
         RETURNING id`,
        []
      )
      testTaskIds.push(oldCompletedMission.id)

      // Execute the task
      const result = await task.execute()

      // Verify mission was not archived
      const mission = await db.one(
        'SELECT status FROM goals WHERE id = $1',
        [oldCompletedMission.id]
      )
      expect(mission.status).toBe('completed')
    })
  })
})
