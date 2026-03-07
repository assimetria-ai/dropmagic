# Auto-Archive Completed Tasks

**Task #9310** - Automatically archive completed tasks older than 7 days

## Overview

This feature keeps the active task queue clean by automatically archiving tasks that have been in "completed" status for more than 7 days.

## Implementation

### Scheduler Task

- **File**: `server/src/scheduler/tasks/@custom/ArchiveOldDoneTasks.js`
- **Schedule**: Daily at 2:00 AM (cron: `0 2 * * *`)
- **Database**: Updates `goals` table where `level='task'`

### Logic

The task finds all records matching:
- `level = 'task'`
- `status = 'completed'`
- `updated_at < NOW() - INTERVAL '7 days'`

And updates them to:
- `status = 'archived'`
- `updated_at = NOW()`

### Safeguards

1. Only affects tasks (level='task'), not missions/strategies/objectives
2. Only archives completed tasks, preserving active/blocked/paused states
3. Runs sequentially (not parallel) to avoid race conditions
4. Logs all archived tasks for audit trail

## Testing

Run the scheduler test suite:

```bash
cd server
npm test -- test/scheduler/archive-old-done-tasks.test.js
```

The test validates:
- Only old completed tasks are archived
- Recent completed tasks remain unchanged
- Non-completed tasks are not affected
- Other goal levels (mission/strategy/objective) are not touched

## Monitoring

Check scheduler logs for:
- `[ArchiveOldDoneTasks] starting task archival process`
- `[ArchiveOldDoneTasks] archived completed tasks older than 7 days`
- `[ArchiveOldDoneTasks] no tasks to archive`

View execution history in `scheduled_task_runs` table:

```sql
SELECT * FROM scheduled_task_runs 
WHERE task_name = 'archive_old_done_tasks' 
ORDER BY started_at DESC 
LIMIT 10;
```

## Manual Execution

Trigger the task immediately via scheduler API:

```javascript
const scheduler = require('./src/scheduler/tasks/@system/scheduler')
scheduler.executeTaskNow('archive_old_done_tasks')
```

## Configuration

To change the archival threshold, edit the SQL interval in `ArchiveOldDoneTasks.js`:

```javascript
// Change from 7 days to different duration
AND updated_at < NOW() - INTERVAL '14 days'  // 14 days
AND updated_at < NOW() - INTERVAL '30 days'  // 30 days
```

To change the schedule, edit the cron expression:

```javascript
getSchedule() {
  return '0 2 * * *'  // Daily at 2:00 AM
  // return '0 0 * * 0'  // Weekly on Sunday
  // return '0 3 * * 1,4'  // Monday and Thursday at 3:00 AM
}
```
