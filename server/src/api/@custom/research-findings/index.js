const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/research-findings — list all findings with filters
router.get('/research-findings', authenticate, async (req, res, next) => {
  try {
    const { source, category, status, from_date, to_date, limit = 50, offset = 0 } = req.query
    
    let query = 'SELECT * FROM research_findings WHERE 1=1'
    const params = []
    let paramCount = 1
    
    // Filter by source (twitter, github, web)
    if (source) {
      params.push(source)
      query += ` AND source = $${paramCount++}`
    }
    
    // Filter by category
    if (category) {
      params.push(category)
      query += ` AND category = $${paramCount++}`
    }
    
    // Note: status field doesn't exist in schema, but leaving as comment for future extension
    // if (status) {
    //   params.push(status)
    //   query += ` AND status = $${paramCount++}`
    // }
    
    // Filter by date range
    if (from_date) {
      params.push(from_date)
      query += ` AND created_at >= $${paramCount++}`
    }
    
    if (to_date) {
      params.push(to_date)
      query += ` AND created_at <= $${paramCount++}`
    }
    
    // Pagination
    params.push(parseInt(limit))
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++}`
    
    params.push(parseInt(offset))
    query += ` OFFSET $${paramCount++}`
    
    const findings = await db.any(query, params)
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM research_findings WHERE 1=1'
    const countParams = []
    let countParamIdx = 1
    
    if (source) {
      countParams.push(source)
      countQuery += ` AND source = $${countParamIdx++}`
    }
    if (category) {
      countParams.push(category)
      countQuery += ` AND category = $${countParamIdx++}`
    }
    if (from_date) {
      countParams.push(from_date)
      countQuery += ` AND created_at >= $${countParamIdx++}`
    }
    if (to_date) {
      countParams.push(to_date)
      countQuery += ` AND created_at <= $${countParamIdx++}`
    }
    
    const totalCount = await db.one(countQuery, countParams)
    
    res.json({ 
      findings,
      pagination: {
        total: parseInt(totalCount.count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/research-findings/:id — get single finding
router.get('/research-findings/:id', authenticate, async (req, res, next) => {
  try {
    const finding = await db.oneOrNone(
      'SELECT * FROM research_findings WHERE id = $1',
      [req.params.id]
    )
    
    if (!finding) {
      return res.status(404).json({ error: 'Research finding not found' })
    }
    
    res.json({ finding })
  } catch (err) {
    next(err)
  }
})

// POST /api/research-findings — create new finding
router.post('/research-findings', authenticate, async (req, res, next) => {
  try {
    const { source, url, title, summary, category } = req.body
    
    // Validation
    if (!source || !url || !title) {
      return res.status(400).json({ 
        error: 'source, url, and title are required' 
      })
    }
    
    // Validate source enum
    const validSources = ['twitter', 'github', 'web']
    if (!validSources.includes(source)) {
      return res.status(400).json({ 
        error: 'Invalid source. Must be one of: twitter, github, web' 
      })
    }
    
    const finding = await db.one(
      `INSERT INTO research_findings (source, url, title, summary, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        source,
        url,
        title,
        summary || null,
        category || 'product'
      ]
    )
    
    res.status(201).json({ finding })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/research-findings/:id — update finding
router.patch('/research-findings/:id', authenticate, async (req, res, next) => {
  try {
    const { source, url, title, summary, category } = req.body
    
    // Check finding exists
    const existing = await db.oneOrNone(
      'SELECT * FROM research_findings WHERE id = $1',
      [req.params.id]
    )
    
    if (!existing) {
      return res.status(404).json({ error: 'Research finding not found' })
    }
    
    // Validate source if provided
    if (source) {
      const validSources = ['twitter', 'github', 'web']
      if (!validSources.includes(source)) {
        return res.status(400).json({ 
          error: 'Invalid source. Must be one of: twitter, github, web' 
        })
      }
    }
    
    // Build dynamic update query
    const updates = []
    const params = []
    let paramCount = 1
    
    if (source !== undefined) {
      params.push(source)
      updates.push(`source = $${paramCount++}`)
    }
    if (url !== undefined) {
      params.push(url)
      updates.push(`url = $${paramCount++}`)
    }
    if (title !== undefined) {
      params.push(title)
      updates.push(`title = $${paramCount++}`)
    }
    if (summary !== undefined) {
      params.push(summary)
      updates.push(`summary = $${paramCount++}`)
    }
    if (category !== undefined) {
      params.push(category)
      updates.push(`category = $${paramCount++}`)
    }
    
    // Always update updated_at
    updates.push(`updated_at = NOW()`)
    
    if (updates.length === 1) { // Only updated_at
      return res.json({ finding: existing })
    }
    
    params.push(req.params.id)
    const finding = await db.one(
      `UPDATE research_findings SET ${updates.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    )
    
    res.json({ finding })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/research-findings/:id — delete finding
router.delete('/research-findings/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.result(
      'DELETE FROM research_findings WHERE id = $1',
      [req.params.id]
    )
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Research finding not found' })
    }
    
    res.json({ success: true, message: 'Research finding deleted' })
  } catch (err) {
    next(err)
  }
})

// POST /api/research-findings/:id/create-task — create a goal/task from a finding
router.post('/research-findings/:id/create-task', authenticate, async (req, res, next) => {
  try {
    const { title, description, level, status, parent_id, sort_order } = req.body
    
    // Get the research finding
    const finding = await db.oneOrNone(
      'SELECT * FROM research_findings WHERE id = $1',
      [req.params.id]
    )
    
    if (!finding) {
      return res.status(404).json({ error: 'Research finding not found' })
    }
    
    // Use finding data as defaults if not provided
    const taskTitle = title || finding.title
    const taskDescription = description || finding.summary || `Task created from research finding: ${finding.url}`
    const taskLevel = level || 'task' // Default to 'task' level
    
    // Validate level
    const validLevels = ['mission', 'strategy', 'objective', 'task']
    if (!validLevels.includes(taskLevel)) {
      return res.status(400).json({ 
        error: 'Invalid level. Must be one of: mission, strategy, objective, task' 
      })
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
    
    // Create the goal/task
    const task = await db.one(
      `INSERT INTO goals (user_id, title, description, level, status, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        taskTitle,
        taskDescription,
        taskLevel,
        status || 'active',
        parent_id || null,
        sort_order || 0
      ]
    )
    
    res.status(201).json({ 
      task,
      finding,
      message: 'Task created successfully from research finding'
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
