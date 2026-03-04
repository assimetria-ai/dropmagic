'use strict'

/**
 * Migration 015 – Goals table with hierarchy
 * Creates the goals table inspired by Paperclip with mission/strategy/objective/task levels
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'goals.sql'), 'utf8')
  await db.none(sql)
  console.log('[015_goals] applied schema: goals')
}

exports.down = async (db) => {
  await db.none('DROP TRIGGER IF EXISTS goals_updated_at_trigger ON goals CASCADE')
  await db.none('DROP FUNCTION IF EXISTS update_goals_updated_at CASCADE')
  await db.none('DROP TABLE IF EXISTS goals CASCADE')
  console.log('[015_goals] rolled back: goals')
}
