-- @custom research_findings table for Jeremias research pipeline
CREATE TABLE IF NOT EXISTS research_findings (
  id            SERIAL PRIMARY KEY,
  source        TEXT NOT NULL CHECK (source IN ('twitter', 'github', 'web')),
  url           TEXT NOT NULL,
  title         TEXT NOT NULL,
  summary       TEXT,
  category      TEXT NOT NULL DEFAULT 'product',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_findings_source    ON research_findings(source);
CREATE INDEX IF NOT EXISTS idx_research_findings_category  ON research_findings(category);
CREATE INDEX IF NOT EXISTS idx_research_findings_created   ON research_findings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_findings_url       ON research_findings(url);
