-- Compliance checklist per drop/product
CREATE TABLE IF NOT EXISTS compliance (
  id SERIAL PRIMARY KEY,
  drop_id INTEGER NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  privacy_policy BOOLEAN DEFAULT FALSE,
  terms_of_service BOOLEAN DEFAULT FALSE,
  cookie_consent BOOLEAN DEFAULT FALSE,
  gdpr_compliant BOOLEAN DEFAULT FALSE,
  privacy_policy_url TEXT,
  terms_url TEXT,
  cookie_policy_url TEXT,
  data_processing_agreement TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drop_id)
);

CREATE INDEX IF NOT EXISTS idx_compliance_drop_id ON compliance(drop_id);
