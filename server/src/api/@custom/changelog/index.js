const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

/**
 * Changelog API — auto-generates changelog entries from completed tasks.
 * Groups completed tasks by completion week, mapping task types to changelog change types.
 */

// Map task type → changelog change type
function mapChangeType(type) {
  switch (type) {
    case 'feature': return 'feature'
    case 'bug': return 'fix'
    case 'infra':
    case 'ops':
    case 'research':
    case 'content':
      return 'improvement'
    default: return 'improvement'
  }
}

// GET /api/changelog — list changelog entries generated from completed tasks
router.get('/changelog', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query

    // Fetch completed tasks ordered by completed_at desc
    const tasks = await db.any(
      `SELECT id, title, description, type, priority, product, completed_at
       FROM goals
       WHERE user_id = $1
         AND level = 'task'
         AND status = 'completed'
         AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    )

    const total = await db.one(
      `SELECT COUNT(*) FROM goals
       WHERE user_id = $1
         AND level = 'task'
         AND status = 'completed'
         AND completed_at IS NOT NULL`,
      [req.user.id]
    )

    // Group tasks by ISO week (Mon-Sun)
    const groups = new Map()
    for (const task of tasks) {
      // Use the Monday of the completion week as the group key
      const d = new Date(task.completed_at)
      const day = d.getUTCDay() // 0=Sun,1=Mon...6=Sat
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday
      const monday = new Date(d)
      monday.setUTCDate(diff)
      const weekKey = monday.toISOString().slice(0, 10) // YYYY-MM-DD

      if (!groups.has(weekKey)) {
        groups.set(weekKey, [])
      }
      groups.get(weekKey).push(task)
    }

    // Build changelog entries from groups
    const entries = []
    for (const [weekStart, weekTasks] of groups) {
      const weekEnd = new Date(weekStart)
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)

      entries.push({
        week_start: weekStart,
        week_end: weekEnd.toISOString().slice(0, 10),
        title: `Week of ${new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        changes: weekTasks.map((t) => ({
          id: t.id,
          type: mapChangeType(t.type),
          task_type: t.type,
          text: t.title,
          description: t.description,
          product: t.product,
          completed_at: t.completed_at,
        })),
      })
    }

    res.json({
      entries,
      pagination: {
        total: parseInt(total.count),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
