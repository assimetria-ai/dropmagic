'use strict'

/**
 * Migration 017 – Compliance checklist per product/drop
 * Creates the compliance table to track privacy, terms, cookie consent, and GDPR status
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'compliance.sql'), 'utf8')
  await db.none(sql)
  console.log('[017_compliance] applied schema: compliance')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS compliance CASCADE')
  console.log('[017_compliance] rolled back: compliance')
}
