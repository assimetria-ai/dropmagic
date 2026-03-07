// @system — data integrity health check endpoint
// Returns completeness scores, null counts, and orphan checks per table.
// Requires authentication to prevent exposing database topology.
const express = require('express')
const router = express.Router()
const db = require('../../../lib/@system/PostgreSQL')
const { authenticate } = require('../../../lib/@system/Helpers/auth')

/**
 * GET /api/data-health
 * 
 * Performs comprehensive data integrity checks across all tables:
 * - Completeness scores (percentage of non-null important fields)
 * - Null counts per column
 * - Orphan record detection (broken foreign key references)
 * 
 * Requires authentication (admin only recommended in production).
 */
router.get('/data-health', authenticate, async (_req, res) => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tables: {},
      summary: {
        totalTables: 0,
        avgCompleteness: 0,
        orphansFound: 0,
      },
    }

    // Define tables and their important fields for completeness checks
    const tableConfigs = [
      {
        name: 'users',
        requiredFields: ['email', 'password_hash', 'role'],
        optionalFields: ['name', 'stripe_customer_id'],
      },
      {
        name: 'drops',
        requiredFields: ['user_id', 'name', 'slug'],
        optionalFields: ['description', 'product_url', 'image_url', 'launch_at'],
        foreignKeys: [{ column: 'user_id', refTable: 'users', refColumn: 'id' }],
      },
      {
        name: 'drop_signups',
        requiredFields: ['drop_id', 'email', 'referral_code'],
        optionalFields: ['referred_by'],
        foreignKeys: [
          { column: 'drop_id', refTable: 'drops', refColumn: 'id' },
          { column: 'referred_by', refTable: 'drop_signups', refColumn: 'id' },
        ],
      },
      {
        name: 'sessions',
        requiredFields: ['user_id', 'token'],
        foreignKeys: [{ column: 'user_id', refTable: 'users', refColumn: 'id' }],
      },
      {
        name: 'refresh_tokens',
        requiredFields: ['user_id', 'token'],
        foreignKeys: [{ column: 'user_id', refTable: 'users', refColumn: 'id' }],
      },
      {
        name: 'brands',
        requiredFields: ['user_id', 'name'],
        foreignKeys: [{ column: 'user_id', refTable: 'users', refColumn: 'id' }],
      },
      {
        name: 'collaborators',
        requiredFields: ['user_id', 'drop_id'],
        foreignKeys: [
          { column: 'user_id', refTable: 'users', refColumn: 'id' },
          { column: 'drop_id', refTable: 'drops', refColumn: 'id' },
        ],
      },
      {
        name: 'goals',
        requiredFields: ['user_id', 'drop_id'],
        foreignKeys: [
          { column: 'user_id', refTable: 'users', refColumn: 'id' },
          { column: 'drop_id', refTable: 'drops', refColumn: 'id' },
        ],
      },
      {
        name: 'research_findings',
        requiredFields: ['user_id'],
        foreignKeys: [{ column: 'user_id', refTable: 'users', refColumn: 'id' }],
      },
    ]

    for (const config of tableConfigs) {
      const tableHealth = {
        rowCount: 0,
        completeness: 0,
        nullCounts: {},
        orphans: [],
      }

      // Check if table exists
      const tableExists = await db.oneOrNone(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [config.name]
      )

      if (!tableExists?.exists) {
        results.tables[config.name] = { status: 'missing' }
        continue
      }

      // Get row count
      const countResult = await db.one(`SELECT COUNT(*) as count FROM ${config.name}`)
      tableHealth.rowCount = parseInt(countResult.count, 10)

      // If table is empty, skip detailed checks
      if (tableHealth.rowCount === 0) {
        results.tables[config.name] = {
          ...tableHealth,
          status: 'empty',
        }
        continue
      }

      // Calculate null counts for optional fields
      const allFields = [...(config.optionalFields || [])]
      for (const field of allFields) {
        const nullCount = await db.one(
          `SELECT COUNT(*) as count FROM ${config.name} WHERE ${field} IS NULL`
        )
        tableHealth.nullCounts[field] = parseInt(nullCount.count, 10)
      }

      // Calculate completeness score (percentage of non-null optional fields)
      if (allFields.length > 0) {
        let totalNonNull = 0
        let totalChecks = allFields.length * tableHealth.rowCount

        for (const field of allFields) {
          const nonNullCount = tableHealth.rowCount - (tableHealth.nullCounts[field] || 0)
          totalNonNull += nonNullCount
        }

        tableHealth.completeness = totalChecks > 0 
          ? Math.round((totalNonNull / totalChecks) * 100) 
          : 100
      } else {
        tableHealth.completeness = 100
      }

      // Check for orphaned records (broken foreign keys)
      if (config.foreignKeys) {
        for (const fk of config.foreignKeys) {
          // Allow null values in foreign keys (they may be optional)
          const orphanQuery = `
            SELECT COUNT(*) as count 
            FROM ${config.name} t
            WHERE t.${fk.column} IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM ${fk.refTable} r 
                WHERE r.${fk.refColumn} = t.${fk.column}
              )
          `
          const orphanResult = await db.one(orphanQuery)
          const orphanCount = parseInt(orphanResult.count, 10)

          if (orphanCount > 0) {
            tableHealth.orphans.push({
              column: fk.column,
              references: `${fk.refTable}.${fk.refColumn}`,
              count: orphanCount,
            })
            results.summary.orphansFound += orphanCount
          }
        }
      }

      results.tables[config.name] = tableHealth
      results.summary.totalTables++
      results.summary.avgCompleteness += tableHealth.completeness
    }

    // Calculate average completeness
    if (results.summary.totalTables > 0) {
      results.summary.avgCompleteness = Math.round(
        results.summary.avgCompleteness / results.summary.totalTables
      )
    }

    // Overall status
    results.status = results.summary.orphansFound > 0 ? 'degraded' : 'healthy'

    res.json(results)
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform data health check',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }
})

module.exports = router
