-- @custom activity_log table — full audit trail for agent/system/user actions
CREATE TABLE IF NOT EXISTS activity_log (
  id            SERIAL PRIMARY KEY,
  actor_type    TEXT NOT NULL CHECK (actor_type IN ('agent', 'system', 'user')),
  actor_id      TEXT NOT NULL,                               -- agent name, system identifier, or user id
  action        TEXT NOT NULL,                               -- e.g. 'create', 'update', 'delete', 'read', 'execute'
  entity_type   TEXT NOT NULL,                               -- e.g. 'task', 'goal', 'user', 'file', 'api_call'
  entity        TEXT,                                        -- stringified identifier or description of the entity
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor_type   ON activity_log(actor_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id     ON activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action       ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type  ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at   ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_entity ON activity_log(actor_type, actor_id, entity_type);
