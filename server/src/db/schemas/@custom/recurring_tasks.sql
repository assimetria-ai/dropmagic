-- Add recurring task scheduling to goals table
-- Supports cron-like schedules that auto-spawn new task instances

-- recurring_schedule: JSONB config for the schedule
-- Example: { "cron": "0 9 * * 1", "timezone": "Europe/Lisbon", "autoAssign": "agent-felix" }
-- When set on a task, the RecurringTaskSpawner will create new instances on schedule.
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS recurring_schedule JSONB;

-- Track when the last instance was spawned from this template
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS last_spawned_at TIMESTAMPTZ;

-- Link spawned instances back to their recurring template
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS recurring_source_id INTEGER REFERENCES goals(id) ON DELETE SET NULL;

-- Index for efficient lookup of recurring templates
CREATE INDEX IF NOT EXISTS idx_goals_recurring_schedule
  ON goals USING GIN (recurring_schedule)
  WHERE recurring_schedule IS NOT NULL;

-- Index for finding spawned instances of a recurring template
CREATE INDEX IF NOT EXISTS idx_goals_recurring_source_id
  ON goals(recurring_source_id)
  WHERE recurring_source_id IS NOT NULL;

COMMENT ON COLUMN goals.recurring_schedule IS 'JSONB schedule config: { "cron": "0 9 * * 1", "timezone": "UTC", "autoAssign": "agent-name", "maxActive": 1 }. Only for level=task templates.';
COMMENT ON COLUMN goals.last_spawned_at IS 'When the last recurring instance was spawned from this template.';
COMMENT ON COLUMN goals.recurring_source_id IS 'Points to the recurring template task that spawned this instance.';
