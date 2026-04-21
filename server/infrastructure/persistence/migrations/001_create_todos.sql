-- Migration 001: Create todos table and supporting indexes
-- Tracked by schema_migrations table (version = 1)
--
-- Spec-Ref: specs/persistence.spec.md
-- Context: Infrastructure / Persistence

-- Create the todos table
-- - id: TodoId (UUID v4), TEXT for portability (no SQLite type affinity dependency)
-- - title: TodoTitle (max 500 chars, validated by domain before write)
-- - status: TodoStatus ('active' | 'completed'), CHECK constraint as safety net
-- - created_at / updated_at: ISO 8601 UTC timestamps, TEXT for portability
-- - No soft-delete column; TodoDeleted = hard delete from this table
CREATE TABLE IF NOT EXISTS todos (
  id          TEXT        NOT NULL PRIMARY KEY,  -- TodoId (UUID v4)
  title       TEXT        NOT NULL,              -- TodoTitle (max 500 chars, validated by domain before write)
  status      TEXT        NOT NULL               -- TodoStatus: 'active' | 'completed'
                CHECK (status IN ('active', 'completed')),
  created_at  TEXT        NOT NULL,              -- Timestamp (ISO 8601 UTC)
  updated_at  TEXT        NOT NULL               -- Timestamp (ISO 8601 UTC)
);

-- idx_todos_status supports filtered queries (WHERE status = ?)
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos (status);

-- idx_todos_created_at supports list ordering (newest first)
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos (created_at DESC);
