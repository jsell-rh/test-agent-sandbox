-- Migration 001: create todos table and indexes
CREATE TABLE todos (
  id          TEXT        NOT NULL PRIMARY KEY,
  title       TEXT        NOT NULL,
  status      TEXT        NOT NULL
                CHECK (status IN ('active', 'completed')),
  created_at  TEXT        NOT NULL,
  updated_at  TEXT        NOT NULL
);

CREATE INDEX idx_todos_status ON todos (status);
CREATE INDEX idx_todos_created_at ON todos (created_at DESC);
