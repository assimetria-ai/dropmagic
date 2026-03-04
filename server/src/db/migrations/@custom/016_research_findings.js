'use strict'

/**
 * Migration 016 – Research Findings table for Jeremias research pipeline
 * Creates the research_findings table to track discoveries from Twitter, GitHub, and web
 */

const fs = require('fs')
const path = require('path')

const SCHEMAS_DIR = path.join(__dirname, '../../schemas/@custom')

exports.up = async (db) => {
  const sql = fs.readFileSync(path.join(SCHEMAS_DIR, 'research_findings.sql'), 'utf8')
  await db.none(sql)
  console.log('[016_research_findings] applied schema: research_findings')
}

exports.down = async (db) => {
  await db.none('DROP TABLE IF EXISTS research_findings CASCADE')
  console.log('[016_research_findings] rolled back: research_findings')
}
