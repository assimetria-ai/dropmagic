-- @custom cost_events table for token/cost tracking per agent
CREATE TABLE IF NOT EXISTS cost_events (
  id             SERIAL PRIMARY KEY,
  agent_name     TEXT NOT NULL,
  task_id        INTEGER,                        -- nullable, not all events may be task-related
  provider       TEXT NOT NULL,                  -- 'anthropic' | 'openai' | 'google' etc.
  model          TEXT NOT NULL,                  -- 'claude-sonnet-4-5' | 'gpt-4' etc.
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  cost           NUMERIC(10, 6) NOT NULL DEFAULT 0.0, -- precise monetary value
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_events_agent_name ON cost_events(agent_name);
CREATE INDEX IF NOT EXISTS idx_cost_events_task_id ON cost_events(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_events_provider ON cost_events(provider);
CREATE INDEX IF NOT EXISTS idx_cost_events_model ON cost_events(model);
CREATE INDEX IF NOT EXISTS idx_cost_events_created_at ON cost_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_events_agent_task ON cost_events(agent_name, task_id) WHERE task_id IS NOT NULL;
