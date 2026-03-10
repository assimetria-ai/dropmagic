'use strict'

// @custom — RecurringTaskSpawner
// Reads goals with recurring_schedule set (level='task') and spawns
// new task instances when their cron schedule is due.
//
// Schedule config (recurring_schedule JSONB):
//   {
//     "cron":       "0 9 * * 1",       // required — node-cron expression
//     "timezone":   "Europe/Lisbon",    // optional — IANA tz (default UTC)
//     "autoAssign": "agent-felix",      // optional — auto-set assigned_to on spawned task
//     "maxActive":  1                   // optional — don't spawn if N active instances exist (default 1)
//   }
//
// Related: task #10340

const cronParser = require('cron-parser')
const { BaseTask } = require('../@system')
const logger = require('../../../lib/@system/Logger')
const db = require('../../../lib/@system/PostgreSQL')

class RecurringTaskSpawner extends BaseTask {
  constructor() {
    super('recurring_task_spawner')
  }

  getSchedule() {
    // Check every 15 minutes for due recurring tasks
    return '*/15 * * * *'
  }

  async execute() {
    logger.info('[RecurringTaskSpawner] checking for due recurring tasks')

    let spawned = 0
    let skipped = 0
    let errors = 0

    try {
      // Find all recurring task templates that aren't archived/completed
      const templates = await db.any(
        `SELECT * FROM goals
         WHERE level = 'task'
           AND recurring_schedule IS NOT NULL
           AND status NOT IN ('archived', 'completed')
         ORDER BY id`
      )

      if (templates.length === 0) {
        logger.info('[RecurringTaskSpawner] no recurring templates found')
        return { spawned: 0, skipped: 0, errors: 0 }
      }

      logger.info({ count: templates.length }, '[RecurringTaskSpawner] found recurring templates')

      for (const template of templates) {
        try {
          const result = await this._processTemplate(template)
          if (result === 'spawned') spawned++
          else skipped++
        } catch (err) {
          errors++
          logger.error(
            { templateId: template.id, err: err.message },
            '[RecurringTaskSpawner] failed to process template'
          )
        }
      }
    } catch (err) {
      logger.error({ err }, '[RecurringTaskSpawner] failed to query templates')
      throw err
    }

    logger.info({ spawned, skipped, errors }, '[RecurringTaskSpawner] run complete')
    return { spawned, skipped, errors }
  }

  /**
   * Process a single recurring template.
   * Returns 'spawned' if a new instance was created, 'skipped' otherwise.
   */
  async _processTemplate(template) {
    const schedule = template.recurring_schedule
    if (!schedule || !schedule.cron) {
      logger.warn({ templateId: template.id }, '[RecurringTaskSpawner] template missing cron expression')
      return 'skipped'
    }

    // Validate cron expression
    let interval
    try {
      interval = cronParser.parseExpression(schedule.cron, {
        tz: schedule.timezone || 'UTC',
        currentDate: template.last_spawned_at || template.created_at
      })
    } catch (err) {
      logger.error(
        { templateId: template.id, cron: schedule.cron, err: err.message },
        '[RecurringTaskSpawner] invalid cron expression'
      )
      return 'skipped'
    }

    // Determine if the schedule is due
    const nextRun = interval.next().toDate()
    const now = new Date()

    if (nextRun > now) {
      return 'skipped' // Not due yet
    }

    // Check maxActive limit (default 1)
    const maxActive = schedule.maxActive || 1
    const activeCount = await db.one(
      `SELECT COUNT(*)::int AS count FROM goals
       WHERE recurring_source_id = $1
         AND status NOT IN ('completed', 'archived')`,
      [template.id]
    )

    if (activeCount.count >= maxActive) {
      logger.info(
        { templateId: template.id, activeCount: activeCount.count, maxActive },
        '[RecurringTaskSpawner] max active instances reached — skipping'
      )
      return 'skipped'
    }

    // Spawn new task instance
    const dateTag = now.toISOString().slice(0, 10) // YYYY-MM-DD
    const spawnedTask = await db.one(
      `INSERT INTO goals (
        user_id, title, description, level, status,
        type, priority, assigned_to, assigned_by, product, source,
        parent_id, sort_order, recurring_source_id
      )
      VALUES (
        $1, $2, $3, 'task', 'todo',
        $4, $5, $6, $7, $8, $9,
        $10, $11, $12
      )
      RETURNING id, title`,
      [
        template.user_id,
        `${template.title} (${dateTag})`,
        template.description,
        template.type || 'other',
        template.priority || 'medium',
        schedule.autoAssign || template.assigned_to || null,
        template.assigned_by || 'recurring-scheduler',
        template.product || null,
        'recurring-scheduler',
        template.parent_id || null,
        template.sort_order || 0,
        template.id
      ]
    )

    // Update last_spawned_at on the template
    await db.none(
      'UPDATE goals SET last_spawned_at = NOW() WHERE id = $1',
      [template.id]
    )

    logger.info(
      { templateId: template.id, spawnedId: spawnedTask.id, title: spawnedTask.title },
      '[RecurringTaskSpawner] spawned new task instance'
    )

    return 'spawned'
  }
}

module.exports = RecurringTaskSpawner
