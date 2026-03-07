'use strict'

/**
 * Migration 018 – Task Evidence & Extended Task Fields
 * Adds completion evidence tracking and task-specific fields to goals table
 * Supports type-based evidence requirements (screenshots for UI, API responses for backend, etc.)
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'task_evidence.sql'), 'utf8')
  await db.none(sql)
  console.log('[018_task_evidence] applied schema: task evidence & extended task fields')
}

exports.down = async (db) => {
  // Remove new columns from goals table
  await db.none(`
    ALTER TABLE goals 
    DROP COLUMN IF EXISTS type,
    DROP COLUMN IF EXISTS priority,
    DROP COLUMN IF EXISTS assigned_to,
    DROP COLUMN IF EXISTS assigned_by,
    DROP COLUMN IF EXISTS product,
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS blocked_reason,
    DROP COLUMN IF EXISTS completion_evidence,
    DROP COLUMN IF EXISTS evidence_type,
    DROP COLUMN IF EXISTS evidence_url,
    DROP COLUMN IF EXISTS completed_at;
  `)
  console.log('[018_task_evidence] rolled back: task evidence & extended task fields')
}
