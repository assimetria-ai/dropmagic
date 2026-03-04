const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/goals — list all goals with hierarchy
router.get('/goals', authenticate, async (req, res, next) => {
  try {
    const { level, status, parent_id } = req.query
    
    let query = 'SELECT * FROM goals WHERE user_id = $1'
    const params = [req.user.id]
    
    if (level) {
      params.push(level)
      query += ` AND level = $${params.length}`
    }
    
    if (status) {
      params.push(status)
      query += ` AND status = $${params.length}`
    }
    
    if (parent_id !== undefined) {
      if (parent_id === 'null') {
        query += ' AND parent_id IS NULL'
      } else {
        params.push(parent_id)
        query += ` AND parent_id = $${params.length}`
      }
    }
    
    query += ' ORDER BY sort_order ASC, created_at DESC'
    
    const goals = await db.any(query, params)
    res.json({ goals })
  } catch (err) {
    next(err)
  }
})

// GET /api/goals/:id — get single goal
router.get('/goals/:id', authenticate, async (req, res, next) => {
  try {
    const goal = await db.oneOrNone(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' })
    }
    
    res.json({ goal })
  } catch (err) {
    next(err)
  }
})

// GET /api/goals/:id/children — get child goals
router.get('/goals/:id/children', authenticate, async (req, res, next) => {
  try {
    const children = await db.any(
      `SELECT * FROM goals 
       WHERE parent_id = $1 AND user_id = $2 
       ORDER BY sort_order ASC, created_at DESC`,
      [req.params.id, req.user.id]
    )
    
    res.json({ children })
  } catch (err) {
    next(err)
  }
})

// GET /api/goals/tree — get full goal hierarchy
router.get('/goals/tree', authenticate, async (req, res, next) => {
  try {
    // Recursive CTE to build the tree
    const tree = await db.any(
      `WITH RECURSIVE goal_tree AS (
        SELECT id, title, description, level, status, parent_id, sort_order, 
               created_at, updated_at, 0 as depth
        FROM goals
        WHERE user_id = $1 AND parent_id IS NULL
        
        UNION ALL
        
        SELECT g.id, g.title, g.description, g.level, g.status, g.parent_id, 
               g.sort_order, g.created_at, g.updated_at, gt.depth + 1
        FROM goals g
        INNER JOIN goal_tree gt ON g.parent_id = gt.id
        WHERE g.user_id = $1
      )
      SELECT * FROM goal_tree ORDER BY depth, sort_order ASC, created_at DESC`,
      [req.user.id]
    )
    
    res.json({ tree })
  } catch (err) {
    next(err)
  }
})

// POST /api/goals — create new goal
router.post('/goals', authenticate, async (req, res, next) => {
  try {
    const { title, description, level, status, parent_id, sort_order } = req.body
    
    if (!title || !level) {
      return res.status(400).json({ error: 'Title and level are required' })
    }
    
    const validLevels = ['mission', 'strategy', 'objective', 'task']
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: 'Invalid level. Must be one of: mission, strategy, objective, task' })
    }
    
    // Validate parent exists if parent_id is provided
    if (parent_id) {
      const parent = await db.oneOrNone(
        'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
        [parent_id, req.user.id]
      )
      
      if (!parent) {
        return res.status(404).json({ error: 'Parent goal not found' })
      }
    }
    
    const goal = await db.one(
      `INSERT INTO goals (user_id, title, description, level, status, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        title,
        description || null,
        level,
        status || 'active',
        parent_id || null,
        sort_order || 0
      ]
    )
    
    res.status(201).json({ goal })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/goals/:id — update goal
router.patch('/goals/:id', authenticate, async (req, res, next) => {
  try {
    const { title, description, level, status, parent_id, sort_order } = req.body
    
    // Check goal exists and belongs to user
    const existing = await db.oneOrNone(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' })
    }
    
    // Validate level if provided
    if (level) {
      const validLevels = ['mission', 'strategy', 'objective', 'task']
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'Invalid level' })
      }
    }
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'completed', 'paused', 'archived']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' })
      }
    }
    
    // Prevent circular references
    if (parent_id && parent_id == req.params.id) {
      return res.status(400).json({ error: 'A goal cannot be its own parent' })
    }
    
    // Build dynamic update query
    const updates = []
    const params = []
    let paramCount = 1
    
    if (title !== undefined) {
      params.push(title)
      updates.push(`title = $${paramCount++}`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = $${paramCount++}`)
    }
    if (level !== undefined) {
      params.push(level)
      updates.push(`level = $${paramCount++}`)
    }
    if (status !== undefined) {
      params.push(status)
      updates.push(`status = $${paramCount++}`)
    }
    if (parent_id !== undefined) {
      params.push(parent_id)
      updates.push(`parent_id = $${paramCount++}`)
    }
    if (sort_order !== undefined) {
      params.push(sort_order)
      updates.push(`sort_order = $${paramCount++}`)
    }
    
    if (updates.length === 0) {
      return res.json({ goal: existing })
    }
    
    params.push(req.params.id, req.user.id)
    const goal = await db.one(
      `UPDATE goals SET ${updates.join(', ')} 
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      params
    )
    
    res.json({ goal })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/goals/:id — delete goal and its children
router.delete('/goals/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.result(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }
    
    res.json({ success: true, message: 'Goal deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
