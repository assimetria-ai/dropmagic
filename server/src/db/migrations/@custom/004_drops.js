'use strict'

const fs = require('fs')
const path = require('path')

async function up(db) {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../schemas/@custom/drops.sql'),
    'utf8',
  )
  await db.none(sql)
  console.log('[migrate] applied schema: drops and drop_signups')
}

async function down(db) {
  await db.none('DROP TABLE IF EXISTS drops CASCADE')
  console.log('[migrate] rolled back schema: drops and drop_signups')
}

module.exports = { up, down }
