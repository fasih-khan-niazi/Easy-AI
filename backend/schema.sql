CREATE TABLE IF NOT EXISTS creations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  publish BOOLEAN DEFAULT FALSE,
  likes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creations_user_id_idx ON creations (user_id);
CREATE INDEX IF NOT EXISTS creations_publish_idx ON creations (publish);
CREATE INDEX IF NOT EXISTS creations_created_at_idx ON creations (created_at DESC);
