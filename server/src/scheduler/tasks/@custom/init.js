'use strict'

// @custom — init
// Register your custom tasks with the scheduler here.
// Called automatically by scheduler.init() on server start.
//
// Usage:
//   const { MyTask } = require('.')
//   scheduler.registerTask(new MyTask())

const { TestTask, ArchiveOldDoneTasks, RecurringTaskSpawner } = require('.')

/**
 * @param {import('../@system/scheduler')} scheduler
 */
function init(scheduler) {
  // Example task — comment out or replace with real tasks
  scheduler.registerTask(new TestTask())
  
  // Auto-archive completed tasks older than 7 days
  scheduler.registerTask(new ArchiveOldDoneTasks())

  // Spawn new task instances from recurring templates (every 15 min)
  scheduler.registerTask(new RecurringTaskSpawner())
}

module.exports = init
