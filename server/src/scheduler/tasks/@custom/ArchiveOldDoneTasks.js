'use strict'

// @custom — ArchiveOldDoneTasks
// Auto-archives tasks that have been completed for more than 7 days
// Keeps active queue clean

const { BaseTask } = require('../@system')
const logger = require('../../../lib/@system/Logger')
const db = require('../../../lib/@system/PostgreSQL')

class ArchiveOldDoneTasks extends BaseTask {
  constructor() {
    super('archive_old_done_tasks')
  }

  getSchedule() {
    // Run daily at 2:00 AM
    return '0 2 * * *'
  }

  async execute() {
    logger.info('[ArchiveOldDoneTasks] starting task archival process')
    
    try {
      // Find completed tasks older than 7 days
      const result = await db.result(
        `UPDATE goals
         SET status = 'archived', updated_at = NOW()
         WHERE level = 'task'
           AND status = 'completed'
           AND updated_at < NOW() - INTERVAL '7 days'
         RETURNING id, title, updated_at AS completed_at`,
        []
      )

      const archivedCount = result.rowCount
      
      if (archivedCount > 0) {
        logger.info(
          { count: archivedCount, tasks: result.rows },
          '[ArchiveOldDoneTasks] archived completed tasks older than 7 days'
        )
      } else {
        logger.info('[ArchiveOldDoneTasks] no tasks to archive')
      }

      return { archivedCount, tasks: result.rows }
    } catch (err) {
      logger.error({ err }, '[ArchiveOldDoneTasks] failed to archive tasks')
      throw err
    }
  }
}

module.exports = ArchiveOldDoneTasks
