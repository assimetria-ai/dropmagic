'use strict'

// Migration: extends drops table with builder-specific columns
// Adds cta_text, hero_subtitle, theme_color, features (JSONB bullet list),
// settings (JSONB overflow bucket), and announced_at (launch campaign tracking).

async function up(db) {
  await db.none(`
    ALTER TABLE drops
      ADD COLUMN IF NOT EXISTS cta_text        VARCHAR(255) DEFAULT 'Join the Waitlist',
      ADD COLUMN IF NOT EXISTS hero_subtitle   TEXT,
      ADD COLUMN IF NOT EXISTS theme_color     VARCHAR(20)  DEFAULT '#6d28d9',
      ADD COLUMN IF NOT EXISTS features        JSONB        DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS announced_at    TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS settings        JSONB        DEFAULT '{}'
  `)
  console.log('[migrate] applied: drops builder columns')
}

async function down(db) {
  await db.none(`
    ALTER TABLE drops
      DROP COLUMN IF EXISTS cta_text,
      DROP COLUMN IF EXISTS hero_subtitle,
      DROP COLUMN IF EXISTS theme_color,
      DROP COLUMN IF EXISTS features,
      DROP COLUMN IF EXISTS announced_at,
      DROP COLUMN IF EXISTS settings
  `)
  console.log('[migrate] rolled back: drops builder columns')
}

module.exports = { up, down }
