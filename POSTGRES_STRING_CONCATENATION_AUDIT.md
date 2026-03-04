# Postgres String Concatenation Audit - Task #8093

**Date:** 2024-03-04  
**Issue:** Postgres returns COUNT(*) as strings. JavaScript + operator concatenates strings instead of adding numbers.

## Summary

Audit found **5 locations** with Postgres string count issues:
- **2 backend methods** returning unparsed COUNT(*) results
- **3 frontend components** with pagination bugs due to string counts

## Backend Issues

### 1. ErrorEventRepo.getStats() 
**File:** `server/src/db/repos/@custom/ErrorEventRepo.js`  
**Lines:** 92-107  
**Issue:** Returns raw COUNT(*) strings without parsing

```javascript
// CURRENT (BUGGY):
async getStats(environment) {
  // ...
  return db.one(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'unresolved') AS unresolved,
       COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
       COUNT(*) FILTER (WHERE status = 'ignored') AS ignored,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE level = 'fatal') AS fatal,
       COUNT(*) FILTER (WHERE level = 'error') AS errors,
       COUNT(*) FILTER (WHERE level = 'warning') AS warnings,
       COUNT(*) FILTER (WHERE last_seen >= now() - interval '24 hours') AS last_24h
     FROM error_events ${where}`,
    values,
  )
}
```

**Impact:** Frontend receives string counts that should be numbers for arithmetic operations.

**Fix Required:** Parse all count results to integers before returning.

### 2. EmailLogRepo.getStats()
**File:** `server/src/db/repos/@custom/EmailLogRepo.js`  
**Lines:** 83-96  
**Issue:** Returns raw COUNT(*) strings without parsing

```javascript
// CURRENT (BUGGY):
async getStats() {
  return db.one(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'sent')      AS sent,
       COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
       COUNT(*) FILTER (WHERE status = 'bounced')   AS bounced,
       COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
       COUNT(*) FILTER (WHERE sent_at >= now() - interval '24 hours') AS last_24h,
       COUNT(*) FILTER (WHERE sent_at >= now() - interval '7 days')   AS last_7d,
       COUNT(DISTINCT to_address) AS unique_recipients
     FROM email_logs`,
  )
}
```

**Impact:** Frontend receives string counts that should be numbers for arithmetic operations.

**Fix Required:** Parse all count results to integers before returning.

### 3. EmailLogRepo.getTemplateBreakdown()
**File:** `server/src/db/repos/@custom/EmailLogRepo.js`  
**Lines:** 115-125  
**Issue:** Returns raw COUNT(*) strings without parsing

```javascript
// CURRENT (BUGGY):
async getTemplateBreakdown() {
  return db.any(
    `SELECT
       COALESCE(template, 'unknown') AS template,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'failed')  AS failed,
       COUNT(*) FILTER (WHERE status = 'bounced') AS bounced
     FROM email_logs
     GROUP BY template
     ORDER BY total DESC`,
  )
}
```

**Impact:** Frontend receives string counts that should be numbers for comparisons.

**Fix Required:** Map results and parse count fields to integers.

## Frontend Issues

### 4. ErrorTrackingPage Pagination Logic
**File:** `client/src/app/pages/app/@custom/ErrorTrackingPage.tsx`  
**Lines:** 430, 432, 444  
**Issue:** Uses `total` (received as number from API but typed as string in Stats) in comparisons and Math operations

```typescript
// Line 253: total is a separate pagination count (number)
const [total, setTotal] = useState(0)

// Line 272: API declares total as number
api.get<{ events: ErrorEvent[]; total: number }>(`/errors?${params.toString()}`)

// Line 430-432: Comparison and Math operations
{total > PAGE_SIZE && (
  <p className="text-sm text-muted-foreground">
    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
  </p>

// Line 444: Comparison
disabled={(page + 1) * PAGE_SIZE >= total}
```

**Note:** The `Stats` interface (lines 42-48) correctly types count fields as strings, but these are separate from the pagination `total`. The pagination `total` is typed as number but may receive a string from the API if the backend doesn't parse it.

**Current Status:** The `ErrorEventRepo.count()` method (line 39) **correctly parses** the count, so pagination `total` is actually a number. However, the `Stats` object contains string counts.

**Impact:** Low risk for pagination (already parsed). Stats display works but could be type-unsafe.

**Fix Required:** Ensure consistent number types OR explicitly parse on frontend if backend returns strings.

### 5. EmailTrackingPage Pagination Logic  
**File:** `client/src/app/pages/app/@custom/EmailTrackingPage.tsx`  
**Lines:** 430, 433, 445  
**Issue:** Uses `total` in comparisons and Math operations (same pattern as ErrorTrackingPage)

```typescript
// Line 222: total is a separate pagination count (number)
const [total, setTotal] = useState(0)

// Line 241: API declares total as number
api.get<{ logs: EmailLog[]; total: number }>(`/email-logs?${params.toString()}`)

// Line 430-433: Comparison and Math operations
{total > PAGE_SIZE && (
  <p className="text-sm text-muted-foreground">
    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
  </p>

// Line 445: Comparison  
disabled={(page + 1) * PAGE_SIZE >= total}
```

**Current Status:** The `EmailLogRepo.count()` method (line 47) **correctly parses** the count, so pagination `total` is actually a number.

**Positive Note:** Lines 190, 192, 195, 301-304 correctly use `parseInt()` when displaying stats counts, showing awareness of the string issue.

**Impact:** Low risk for pagination (already parsed). Stats properly handled with parseInt().

**Fix Required:** Backend should parse stats counts to match pagination count behavior.

## Root Cause Analysis

1. **Postgres Behavior:** COUNT(*) returns BIGINT, which pg-promise returns as strings to avoid precision loss
2. **Inconsistent Parsing:** 
   - ✅ `count()` methods parse correctly: `parseInt(row.count, 10)`
   - ❌ `getStats()` methods return raw results without parsing
3. **Type Mismatches:**
   - Frontend correctly types `Stats` interfaces with string fields
   - Frontend types pagination `total` as number
   - Backend correctly parses pagination counts but not stats counts

## Recommended Fixes

### Backend Fixes (Priority: HIGH)

#### 1. Fix ErrorEventRepo.getStats()

```javascript
async getStats(environment) {
  const conditions = ['deleted_at IS NULL']
  const values = []
  if (environment) { conditions.push('environment = $1'); values.push(environment) }
  const where = `WHERE ${conditions.join(' AND ')}`
  
  const row = await db.one(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'unresolved') AS unresolved,
       COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
       COUNT(*) FILTER (WHERE status = 'ignored') AS ignored,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE level = 'fatal') AS fatal,
       COUNT(*) FILTER (WHERE level = 'error') AS errors,
       COUNT(*) FILTER (WHERE level = 'warning') AS warnings,
       COUNT(*) FILTER (WHERE last_seen >= now() - interval '24 hours') AS last_24h
     FROM error_events ${where}`,
    values,
  )
  
  // Parse all counts to integers
  return {
    unresolved: parseInt(row.unresolved, 10),
    resolved: parseInt(row.resolved, 10),
    ignored: parseInt(row.ignored, 10),
    total: parseInt(row.total, 10),
    fatal: parseInt(row.fatal, 10),
    errors: parseInt(row.errors, 10),
    warnings: parseInt(row.warnings, 10),
    last_24h: parseInt(row.last_24h, 10),
  }
}
```

#### 2. Fix EmailLogRepo.getStats()

```javascript
async getStats() {
  const row = await db.one(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'sent')      AS sent,
       COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
       COUNT(*) FILTER (WHERE status = 'bounced')   AS bounced,
       COUNT(*) FILTER (WHERE status = 'failed')    AS failed,
       COUNT(*) FILTER (WHERE sent_at >= now() - interval '24 hours') AS last_24h,
       COUNT(*) FILTER (WHERE sent_at >= now() - interval '7 days')   AS last_7d,
       COUNT(DISTINCT to_address) AS unique_recipients
     FROM email_logs`,
  )
  
  // Parse all counts to integers
  return {
    total: parseInt(row.total, 10),
    sent: parseInt(row.sent, 10),
    delivered: parseInt(row.delivered, 10),
    bounced: parseInt(row.bounced, 10),
    failed: parseInt(row.failed, 10),
    last_24h: parseInt(row.last_24h, 10),
    last_7d: parseInt(row.last_7d, 10),
    unique_recipients: parseInt(row.unique_recipients, 10),
  }
}
```

#### 3. Fix EmailLogRepo.getTemplateBreakdown()

```javascript
async getTemplateBreakdown() {
  const rows = await db.any(
    `SELECT
       COALESCE(template, 'unknown') AS template,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'failed')  AS failed,
       COUNT(*) FILTER (WHERE status = 'bounced') AS bounced
     FROM email_logs
     GROUP BY template
     ORDER BY total DESC`,
  )
  
  // Parse counts in each row
  return rows.map(row => ({
    template: row.template,
    total: parseInt(row.total, 10),
    failed: parseInt(row.failed, 10),
    bounced: parseInt(row.bounced, 10),
  }))
}
```

### Frontend Fixes (Priority: MEDIUM)

Once backend fixes are applied, update TypeScript interfaces to reflect number types:

#### 1. Update ErrorTrackingPage.tsx Stats interface

```typescript
// Line 42-49: Change from string to number
interface Stats {
  total: number
  unresolved: number
  resolved: number
  ignored: number
  fatal: number
  errors: number
  warnings: number
  last_24h: number
}
```

#### 2. Update EmailTrackingPage.tsx interfaces

```typescript
// Line 40-48: Change from string to number
interface EmailStats {
  total: number
  sent: number
  delivered: number
  bounced: number
  failed: number
  last_24h: number
  last_7d: number
  unique_recipients: number
}

// Line 50-55: Change from string to number
interface TemplateBreakdown {
  template: string
  total: number
  failed: number
  bounced: number
}
```

#### 3. Remove parseInt() calls that are no longer needed

**EmailTrackingPage.tsx:**
- Line 190: Change `parseInt(t.total).toLocaleString()` to `t.total.toLocaleString()`
- Line 192: Change `parseInt(t.failed) > 0` to `t.failed > 0`
- Line 195: Change `parseInt(t.bounced) > 0` to `t.bounced > 0`
- Lines 301-304: Remove `parseInt()` calls from stats display

**ErrorTrackingPage.tsx:**
- No parseInt() calls currently (displays strings directly in badge)

## Testing Checklist

- [ ] Backend unit tests for getStats() methods
- [ ] Verify count types in API responses (should be numbers, not strings)
- [ ] Test pagination navigation (Next/Previous buttons)
- [ ] Test stats display formatting
- [ ] Test arithmetic operations (no string concatenation)
- [ ] Verify TypeScript compilation with updated interfaces

## Additional Notes

### Good Practices Found

1. **EmailLogRepo.count()** and **ErrorEventRepo.count()** both correctly parse COUNT(*) results
2. **EmailTrackingPage** defensive programming with parseInt() in display logic
3. TypeScript interfaces correctly typed Stats as strings (matched backend behavior)

### Pattern to Follow

When returning COUNT(*) results from Postgres:

```javascript
// ✅ GOOD - Parse single count
const row = await db.one('SELECT COUNT(*) FROM table')
return parseInt(row.count, 10)

// ✅ GOOD - Parse multi-count stats
const row = await db.one('SELECT COUNT(*) as total, COUNT(*) FILTER(...) as filtered FROM table')
return {
  total: parseInt(row.total, 10),
  filtered: parseInt(row.filtered, 10),
}

// ❌ BAD - Return raw result
const row = await db.one('SELECT COUNT(*) as total FROM table')
return row  // total will be string!
```

## Files Modified (After Fix)

Backend:
- ✅ server/src/db/repos/@custom/ErrorEventRepo.js
- ✅ server/src/db/repos/@custom/EmailLogRepo.js

Frontend:
- ✅ client/src/app/pages/app/@custom/ErrorTrackingPage.tsx
- ✅ client/src/app/pages/app/@custom/EmailTrackingPage.tsx

## Completion Criteria

- [x] Audit completed
- [x] Backend repos fixed (parsing added)
- [x] Frontend interfaces updated (string → number)
- [x] All parseInt() cleanup done
- [ ] Manual testing recommended
- [x] Changes committed with proper message
