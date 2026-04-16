-- Migration 001: Create todos table and indexes
-- Applied once at application startup via the schema_migrations tracker.

CREATE TABLE todos (
  id          TEXT        NOT NULL PRIMARY KEY,  -- TodoId (UUID v4)
  title       TEXT        NOT NULL,              -- TodoTitle (max 500 chars)
  status      TEXT        NOT NULL               -- TodoStatus: 'active' | 'completed'
                CHECK (status IN ('active', 'completed')),
  created_at  TEXT        NOT NULL,              -- Timestamp (ISO 8601 UTC)
  updated_at  TEXT        NOT NULL               -- Timestamp (ISO 8601 UTC)
);

CREATE INDEX idx_todos_status ON todos (status);
CREATE INDEX idx_todos_created_at ON todos (created_at DESC);
