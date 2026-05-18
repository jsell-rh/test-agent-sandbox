"""Shared test fixtures for the todo application test suite."""

from __future__ import annotations

import pytest

from todo.infrastructure.sqlite_repository import SqliteTodoRepository


@pytest.fixture
def repo() -> SqliteTodoRepository:
    """
    Fresh in-memory SQLite repository for each test.

    Uses ':memory:' so each test starts with an empty, isolated database.
    Migrations are applied automatically on construction.
    """
    repository = SqliteTodoRepository(database_path=":memory:")
    yield repository
    repository.close()
