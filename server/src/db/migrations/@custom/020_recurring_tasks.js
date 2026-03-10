'use strict'

/**
 * Migration 020 – Recurring Task Scheduling
 * Adds recurring_schedule (JSONB), last_spawned_at, and recurring_source_id
 * to the goals table to support cron-like task recurrence.
 *
 * Related: task #10340
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'recurring_tasks.sql'), 'utf8')
  await db.none(sql)
  console.log('[020_recurring_tasks] applied schema: recurring task scheduling')
}

exports.down = async (db) => {
  await db.none(`
    DROP INDEX IF EXISTS idx_goals_recurring_source_id;
    DROP INDEX IF EXISTS idx_goals_recurring_schedule;
    ALTER TABLE goals
      DROP COLUMN IF EXISTS recurring_source_id,
      DROP COLUMN IF EXISTS last_spawned_at,
      DROP COLUMN IF EXISTS recurring_schedule;
  `)
  console.log('[020_recurring_tasks] rolled back: recurring task scheduling')
}
