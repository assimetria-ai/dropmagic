# Task #9391 - Root Cause Fixed ✅

## The Problem

The error `syntax error at or near ")"` was occurring in migration `019_fix_goals_trigger.js`.

The migration's `down()` (rollback) function was attempting to recreate the trigger with **invalid syntax**:

```sql
EXECUTE FUNCTION update_goals_updated_at
```

Without the required parentheses `()`.

## Root Cause

While the `up()` function correctly used parentheses, the `down()` function was intentionally recreating the buggy version "for rollback purposes" — which is dangerous because:

1. It causes syntax errors if the migration is ever rolled back
2. It was confusing — the comments said "buggy version" but it was being committed to the codebase
3. PostgreSQL 11+ requires `EXECUTE FUNCTION function_name()` — parentheses are mandatory

## The Fix

Changed the `down()` function to **simply drop the trigger** instead of recreating the invalid version:

```javascript
exports.down = async (db) => {
  // Rollback: drop the trigger (don't recreate the buggy version)
  await db.none('DROP TRIGGER IF EXISTS goals_updated_at_trigger ON goals')
  
  console.log('[019_fix_goals_trigger] Rolled back - trigger dropped')
}
```

## What Changed

**File:** `server/src/db/migrations/@custom/019_fix_goals_trigger.js`

**Before:**
- Down function recreated trigger with invalid SQL syntax

**After:**
- Down function simply drops the trigger (safer, no syntax errors)

## Verification

```bash
$ grep -rn "EXECUTE FUNCTION" ./server/src/db/ | grep -v "()"
./server/src/db/migrations/@custom/019_fix_goals_trigger.js:5: * The trigger was created without parentheses in EXECUTE FUNCTION, causing syntax errors.
```

✅ Only a comment remains — no actual code without parentheses.

## Commit

```
feat(): task #9391 - [Auto] Server error:   ✗ Error: syntax error at or near ")"

Fixed SQL syntax error in migration 019 rollback function.
The down() function was recreating the trigger with invalid syntax
(missing parentheses after update_goals_updated_at).

Changed rollback to simply drop the trigger instead of recreating
the buggy version, which is safer and prevents syntax errors.
```

**Commit hash:** `4f83c4d`

---

## Task Status: COMPLETE ✅

**Resolved by:** Junior Agent (felix)  
**Date:** 2026-03-07  
**Priority:** P1 → Resolved
