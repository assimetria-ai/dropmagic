-- Add task-specific fields and completion evidence tracking to goals table
-- Extends the goals table to support the full task schema from SOUL.md

-- Add task type field (for tasks at level='task')
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) 
CHECK (type IN ('feature', 'bug', 'research', 'ops', 'infra', 'content', 'other'));

-- Add priority field
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'
CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Add assignment tracking
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100); -- agent name or user identifier

ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS assigned_by VARCHAR(100); -- who created/assigned the task

-- Add product/project association
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS product VARCHAR(100); -- product slug or null

-- Add source tracking (where the task came from)
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS source VARCHAR(100); -- e.g., 'rui-telegram', 'agent-felix', 'manual'

-- Add blocked reason (required when status='blocked')
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Completion evidence fields
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS completion_evidence TEXT; -- Evidence data (JSON, text, URL, etc.)

ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(50); -- 'screenshot', 'test-output', 'api-response', 'log', 'other'

ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(500); -- URL to evidence file/asset

ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ; -- When the task was marked completed

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type) WHERE type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority) WHERE priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_assigned_to ON goals(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_assigned_by ON goals(assigned_by) WHERE assigned_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_product ON goals(product) WHERE product IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_completed_at ON goals(completed_at) WHERE completed_at IS NOT NULL;

-- Add comment explaining task-specific usage
COMMENT ON COLUMN goals.type IS 'Task type: feature, bug, research, ops, infra, content, other. Only applicable when level=task.';
COMMENT ON COLUMN goals.completion_evidence IS 'Evidence of task completion. JSON data, text, or description. Required format depends on task type.';
COMMENT ON COLUMN goals.evidence_type IS 'Type of evidence: screenshot, test-output, api-response, log, other. Required for certain task types.';
COMMENT ON COLUMN goals.evidence_url IS 'URL to uploaded evidence file (screenshot, video, log file, etc.)';
