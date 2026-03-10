const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

/**
 * Tasks API - Works with goals table where level='task'
 * Implements task creation guidelines from SOUL.md with completion evidence requirements
 */

// Evidence requirements by task type
const EVIDENCE_REQUIREMENTS = {
  'feature': {
    required: true,
    types: ['screenshot', 'test-output', 'api-response'],
    description: 'UI features require screenshots or test output; backend features require API responses'
  },
  'bug': {
    required: true,
    types: ['screenshot', 'test-output', 'log'],
    description: 'Bug fixes require before/after screenshots or test output showing the fix'
  },
  'infra': {
    required: true,
    types: ['log', 'api-response', 'screenshot'],
    description: 'Infrastructure tasks require deployment logs or system status evidence'
  },
  'ops': {
    required: false,
    types: ['log', 'screenshot', 'other'],
    description: 'Operational tasks may require evidence depending on the task'
  },
  'research': {
    required: false,
    types: ['other'],
    description: 'Research tasks typically documented in description, evidence optional'
  },
  'content': {
    required: false,
    types: ['other'],
    description: 'Content tasks typically self-evident, evidence optional'
  },
  'other': {
    required: false,
    types: ['other'],
    description: 'Evidence requirements vary by task'
  }
}

// Validation helper
function validateTaskFields(body, isUpdate = false) {
  const errors = []
  
  // Title validation
  if (!isUpdate && !body.title) {
    errors.push('Title is required')
  }
  
  // Description validation (required for new tasks)
  if (!isUpdate && !body.description) {
    errors.push('Description is required — full context: what, why, how to approach, acceptance criteria, edge cases')
  }
  
  // Type validation
  if (body.type) {
    const validTypes = ['feature', 'bug', 'research', 'ops', 'infra', 'content', 'other']
    if (!validTypes.includes(body.type)) {
      errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`)
    }
  }
  
  // Priority validation
  if (body.priority) {
    const validPriorities = ['low', 'medium', 'high', 'critical']
    if (!validPriorities.includes(body.priority)) {
      errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`)
    }
  }
  
  // Status validation
  if (body.status) {
    const validStatuses = ['todo', 'backlog', 'in_progress', 'blocked', 'completed', 'paused', 'archived']
    // Map legacy 'active' to 'todo'
    if (body.status === 'active') {
      body.status = 'todo'
    }
    if (!validStatuses.includes(body.status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }
  }
  
  // Blocked reason required if status is blocked
  if (body.status === 'blocked' && !body.blocked_reason) {
    errors.push('blocked_reason is required when status is "blocked"')
  }
  
  // assigned_by required for new tasks
  if (!isUpdate && !body.assigned_by) {
    errors.push('assigned_by is required — who directed this task: "rui" or agent name')
  }
  
  // Evidence type validation
  if (body.evidence_type) {
    const validEvidenceTypes = ['screenshot', 'test-output', 'api-response', 'log', 'other']
    if (!validEvidenceTypes.includes(body.evidence_type)) {
      errors.push(`Invalid evidence_type. Must be one of: ${validEvidenceTypes.join(', ')}`)
    }
  }
  
  return errors
}

// Helper to check evidence requirements
function validateEvidence(type, evidenceType, completionEvidence) {
  const req = EVIDENCE_REQUIREMENTS[type] || EVIDENCE_REQUIREMENTS['other']
  
  if (!req.required) {
    return null // Evidence optional for this task type
  }
  
  if (!evidenceType && !completionEvidence) {
    return `Evidence required for ${type} tasks. Expected: ${req.description}`
  }
  
  if (evidenceType && !req.types.includes(evidenceType)) {
    return `Invalid evidence type for ${type} tasks. Expected one of: ${req.types.join(', ')}`
  }
  
  return null
}

// GET /api/tasks/evidence-requirements — get evidence requirements by task type
// MUST come before /tasks/:id to avoid route collision
router.get('/tasks/evidence-requirements', authenticate, async (req, res, next) => {
  try {
    res.json({ evidence_requirements: EVIDENCE_REQUIREMENTS })
  } catch (err) {
    next(err)
  }
})

// GET /api/tasks — list all tasks with filters
router.get('/tasks', authenticate, async (req, res, next) => {
  try {
    const { 
      status, 
      type, 
      priority, 
      assigned_to, 
      assigned_by,
      product,
      parent_id,
      limit = 50, 
      offset = 0 
    } = req.query
    
    let query = 'SELECT * FROM goals WHERE user_id = $1 AND level = $2'
    const params = [req.user.id, 'task']
    let paramCount = 3
    
    if (status) {
      params.push(status)
      query += ` AND status = $${paramCount++}`
    }
    
    if (type) {
      params.push(type)
      query += ` AND type = $${paramCount++}`
    }
    
    if (priority) {
      params.push(priority)
      query += ` AND priority = $${paramCount++}`
    }
    
    if (assigned_to) {
      params.push(assigned_to)
      query += ` AND assigned_to = $${paramCount++}`
    }
    
    if (assigned_by) {
      params.push(assigned_by)
      query += ` AND assigned_by = $${paramCount++}`
    }
    
    if (product) {
      params.push(product)
      query += ` AND product = $${paramCount++}`
    }
    
    if (parent_id !== undefined) {
      if (parent_id === 'null') {
        query += ' AND parent_id IS NULL'
      } else {
        params.push(parent_id)
        query += ` AND parent_id = $${paramCount++}`
      }
    }
    
    query += ' ORDER BY priority DESC, created_at DESC'
    params.push(parseInt(limit))
    query += ` LIMIT $${paramCount++}`
    params.push(parseInt(offset))
    query += ` OFFSET $${paramCount++}`
    
    const tasks = await db.any(query, params)
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM goals WHERE user_id = $1 AND level = $2'
    const countParams = [req.user.id, 'task']
    let countIdx = 3
    
    if (status) {
      countParams.push(status)
      countQuery += ` AND status = $${countIdx++}`
    }
    if (type) {
      countParams.push(type)
      countQuery += ` AND type = $${countIdx++}`
    }
    if (priority) {
      countParams.push(priority)
      countQuery += ` AND priority = $${countIdx++}`
    }
    if (assigned_to) {
      countParams.push(assigned_to)
      countQuery += ` AND assigned_to = $${countIdx++}`
    }
    if (assigned_by) {
      countParams.push(assigned_by)
      countQuery += ` AND assigned_by = $${countIdx++}`
    }
    if (product) {
      countParams.push(product)
      countQuery += ` AND product = $${countIdx++}`
    }
    if (parent_id !== undefined && parent_id !== 'null') {
      countParams.push(parent_id)
      countQuery += ` AND parent_id = $${countIdx++}`
    } else if (parent_id === 'null') {
      countQuery += ' AND parent_id IS NULL'
    }
    
    const totalCount = await db.one(countQuery, countParams)
    
    res.json({ 
      tasks,
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

// GET /api/tasks/:id — get single task
router.get('/tasks/:id', authenticate, async (req, res, next) => {
  try {
    const task = await db.oneOrNone(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2 AND level = $3',
      [req.params.id, req.user.id, 'task']
    )
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    // Include evidence requirements for this task type
    const evidenceReq = EVIDENCE_REQUIREMENTS[task.type] || EVIDENCE_REQUIREMENTS['other']
    
    res.json({ 
      task,
      evidence_requirements: evidenceReq
    })
  } catch (err) {
    next(err)
  }
})

// POST /api/tasks — create new task
router.post('/tasks', authenticate, async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      type,
      status,
      priority,
      assigned_to,
      assigned_by,
      product,
      source,
      parent_id,
      sort_order,
      blocked_reason,
      recurring_schedule
    } = req.body
    
    // Validate required fields
    const errors = validateTaskFields(req.body, false)
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') })
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
    
    // Validate recurring_schedule if provided
    if (recurring_schedule) {
      if (typeof recurring_schedule !== 'object') {
        return res.status(400).json({ error: 'recurring_schedule must be a JSON object' })
      }
      if (!recurring_schedule.cron) {
        return res.status(400).json({ error: 'recurring_schedule.cron is required (node-cron expression)' })
      }
      // Validate cron expression
      const cronParser = require('cron-parser')
      try {
        cronParser.parseExpression(recurring_schedule.cron)
      } catch (e) {
        return res.status(400).json({ error: `Invalid cron expression: ${e.message}` })
      }
    }

    const task = await db.one(
      `INSERT INTO goals (
        user_id, title, description, level, status, 
        type, priority, assigned_to, assigned_by, product, source,
        parent_id, sort_order, blocked_reason, recurring_schedule
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        req.user.id,
        title,
        description,
        'task', // Always 'task' level for this endpoint
        status || 'todo',
        type || 'other',
        priority || 'medium',
        assigned_to || null,
        assigned_by,
        product || null,
        source || null,
        parent_id || null,
        sort_order || 0,
        blocked_reason || null,
        recurring_schedule ? JSON.stringify(recurring_schedule) : null
      ]
    )
    
    // Include evidence requirements in response
    const evidenceReq = EVIDENCE_REQUIREMENTS[task.type] || EVIDENCE_REQUIREMENTS['other']
    
    res.status(201).json({ 
      task,
      evidence_requirements: evidenceReq
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/tasks/:id — update task
router.patch('/tasks/:id', authenticate, async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      type,
      status,
      priority,
      assigned_to,
      assigned_by,
      product,
      source,
      parent_id,
      sort_order,
      blocked_reason,
      completion_evidence,
      evidence_type,
      evidence_url,
      recurring_schedule
    } = req.body
    
    // Check task exists and belongs to user
    const existing = await db.oneOrNone(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2 AND level = $3',
      [req.params.id, req.user.id, 'task']
    )
    
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    // Validate fields
    const errors = validateTaskFields(req.body, true)
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') })
    }
    
    // If marking as completed, validate evidence requirements
    if (status === 'completed') {
      const taskType = type || existing.type
      const evidenceError = validateEvidence(
        taskType,
        evidence_type || existing.evidence_type,
        completion_evidence || existing.completion_evidence
      )
      
      if (evidenceError) {
        return res.status(400).json({ 
          error: evidenceError,
          evidence_requirements: EVIDENCE_REQUIREMENTS[taskType]
        })
      }
    }
    
    // Prevent circular references
    if (parent_id && parent_id == req.params.id) {
      return res.status(400).json({ error: 'A task cannot be its own parent' })
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
    if (type !== undefined) {
      params.push(type)
      updates.push(`type = $${paramCount++}`)
    }
    if (status !== undefined) {
      params.push(status)
      updates.push(`status = $${paramCount++}`)
      
      // Set completed_at when marking as completed
      if (status === 'completed' && !existing.completed_at) {
        updates.push(`completed_at = NOW()`)
      }
    }
    if (priority !== undefined) {
      params.push(priority)
      updates.push(`priority = $${paramCount++}`)
    }
    if (assigned_to !== undefined) {
      params.push(assigned_to)
      updates.push(`assigned_to = $${paramCount++}`)
    }
    if (assigned_by !== undefined) {
      params.push(assigned_by)
      updates.push(`assigned_by = $${paramCount++}`)
    }
    if (product !== undefined) {
      params.push(product)
      updates.push(`product = $${paramCount++}`)
    }
    if (source !== undefined) {
      params.push(source)
      updates.push(`source = $${paramCount++}`)
    }
    if (parent_id !== undefined) {
      params.push(parent_id)
      updates.push(`parent_id = $${paramCount++}`)
    }
    if (sort_order !== undefined) {
      params.push(sort_order)
      updates.push(`sort_order = $${paramCount++}`)
    }
    if (blocked_reason !== undefined) {
      params.push(blocked_reason)
      updates.push(`blocked_reason = $${paramCount++}`)
    }
    if (completion_evidence !== undefined) {
      params.push(completion_evidence)
      updates.push(`completion_evidence = $${paramCount++}`)
    }
    if (evidence_type !== undefined) {
      params.push(evidence_type)
      updates.push(`evidence_type = $${paramCount++}`)
    }
    if (evidence_url !== undefined) {
      params.push(evidence_url)
      updates.push(`evidence_url = $${paramCount++}`)
    }
    if (recurring_schedule !== undefined) {
      // Allow null to clear the schedule
      if (recurring_schedule !== null) {
        if (typeof recurring_schedule !== 'object') {
          return res.status(400).json({ error: 'recurring_schedule must be a JSON object or null' })
        }
        if (!recurring_schedule.cron) {
          return res.status(400).json({ error: 'recurring_schedule.cron is required (node-cron expression)' })
        }
        const cronParser = require('cron-parser')
        try {
          cronParser.parseExpression(recurring_schedule.cron)
        } catch (e) {
          return res.status(400).json({ error: `Invalid cron expression: ${e.message}` })
        }
        params.push(JSON.stringify(recurring_schedule))
      } else {
        params.push(null)
      }
      updates.push(`recurring_schedule = $${paramCount++}`)
    }
    
    if (updates.length === 0) {
      return res.json({ task: existing })
    }
    
    params.push(req.params.id, req.user.id)
    const task = await db.one(
      `UPDATE goals SET ${updates.join(', ')} 
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1} AND level = 'task'
       RETURNING *`,
      params
    )
    
    res.json({ task })
  } catch (err) {
    next(err)
  }
})

// GET /api/tasks/:id/recurring-instances — list spawned instances of a recurring template
router.get('/tasks/:id/recurring-instances', authenticate, async (req, res, next) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query

    // Verify template belongs to user
    const template = await db.oneOrNone(
      'SELECT id, recurring_schedule FROM goals WHERE id = $1 AND user_id = $2 AND level = $3',
      [req.params.id, req.user.id, 'task']
    )
    if (!template) {
      return res.status(404).json({ error: 'Task not found' })
    }
    if (!template.recurring_schedule) {
      return res.status(400).json({ error: 'Task is not a recurring template' })
    }

    let query = 'SELECT * FROM goals WHERE recurring_source_id = $1 AND user_id = $2'
    const params = [req.params.id, req.user.id]
    let paramCount = 3

    if (status) {
      params.push(status)
      query += ` AND status = $${paramCount++}`
    }

    query += ' ORDER BY created_at DESC'
    params.push(parseInt(limit))
    query += ` LIMIT $${paramCount++}`
    params.push(parseInt(offset))
    query += ` OFFSET $${paramCount++}`

    const instances = await db.any(query, params)
    const total = await db.one(
      'SELECT COUNT(*)::int AS count FROM goals WHERE recurring_source_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    res.json({
      template_id: template.id,
      instances,
      pagination: { total: total.count, limit: parseInt(limit), offset: parseInt(offset) }
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/tasks/:id — delete task
router.delete('/tasks/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.result(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 AND level = $3',
      [req.params.id, req.user.id, 'task']
    )
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }
    
    res.json({ success: true, message: 'Task deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
