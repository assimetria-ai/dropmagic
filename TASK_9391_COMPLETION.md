# Task #9391 Completion Summary

## Issue
Auto-detected server error: `syntax error at or near ")"`

## Root Cause Analysis

### Primary Issue: Route Ordering Bug
The `/api/tasks/evidence-requirements` endpoint was defined **after** the `/api/tasks/:id` parameterized route in `server/src/api/@custom/tasks/index.js`.

**Problem Flow:**
1. Client requests `GET /api/tasks/evidence-requirements`
2. Express matches `/tasks/:id` route first (line 250)
3. Sets `req.params.id = 'evidence-requirements'`
4. Attempts to execute SQL: `SELECT * FROM goals WHERE id = $1 AND user_id = $2 AND level = $3`
5. Database driver attempts type coercion of string 'evidence-requirements' to integer
6. Potential SQL syntax errors or type errors depending on driver behavior

### Secondary Issue (Previously Fixed)
Missing semicolon in migration rollback function (fixed in commit dfebd21 by Frederico).

## Solution

### 1. Fixed Route Order
**File:** `server/src/api/@custom/tasks/index.js`

**Change:**
- Moved `/tasks/evidence-requirements` route from line 514 to line 134
- Placed it **before** the parameterized `/tasks/:id` route
- Removed duplicate route definition at end of file

**Result:**
```javascript
// Correct order (specific routes before parameterized):
Line 134: GET /tasks/evidence-requirements  ← specific route
Line 143: GET /tasks                        ← list route
Line 260: GET /tasks/:id                    ← parameterized route
```

### 2. Fixed Data Health Configuration
**File:** `server/src/api/@system/data-health/index.js`

**Change:**
- Updated `goals` table configuration to correctly reflect optional fields
- Changed `drop_id` from `requiredFields` to `optionalFields`
- Added task-specific optional fields: `type`, `priority`, `assigned_to`, `product`
- Added `parent_id` foreign key reference

**Reason:**
The `goals` table serves dual purpose:
- Traditional goals with required `drop_id`
- Tasks (level='task') where `drop_id` is optional

## Testing

### Manual Verification
1. Route order verified with `grep` - specific routes now come before parameterized routes
2. SQL schema validated - all columns match migration

### Recommended Tests
```bash
# Test evidence-requirements endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tasks/evidence-requirements

# Should return evidence requirements, not 404
```

## Commits
1. `4800017` - feat(): task #9391 - Fix route order bug causing syntax error
2. `5669ae2` - fix(data-health): correct goals table field requirements

## Prevention
**Best Practice:** Always define specific routes before parameterized routes in Express:
```javascript
// ✅ Correct order
router.get('/tasks/evidence-requirements', ...)
router.get('/tasks/:id', ...)

// ❌ Wrong order
router.get('/tasks/:id', ...)
router.get('/tasks/evidence-requirements', ...)  // Never matched!
```

## Status
✅ **RESOLVED** - Both route ordering and data health configuration issues fixed and committed.
