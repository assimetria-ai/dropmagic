-- DropMagic core tables: drops and drop_signups
CREATE TABLE IF NOT EXISTS drops (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  product_url TEXT,
  image_url TEXT,
  launch_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active', -- active, ended, draft
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drop_signups (
  id SERIAL PRIMARY KEY,
  drop_id INTEGER NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by INTEGER REFERENCES drop_signups(id),
  referral_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, notified
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drop_id, email)
);

CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_drops_slug ON drops(slug);
CREATE INDEX IF NOT EXISTS idx_drop_signups_drop_id ON drop_signups(drop_id);
CREATE INDEX IF NOT EXISTS idx_drop_signups_referral_code ON drop_signups(referral_code);
