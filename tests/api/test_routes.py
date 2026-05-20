"""API endpoint tests — interface.spec.md TDD Plan (API critical test cases).

All tests use an in-memory SQLite database injected via FastAPI's dependency
override mechanism.  No file-system access occurs; each test class gets a
fresh repository fixture.

Coverage:
  GET  /api/todos           — list, filter, counts
  POST /api/todos           — create, invalid title
  GET  /api/todos/:id       — found, not found
  PATCH /api/todos/:id      — complete, reopen, idempotent, not found, invalid title
  DELETE /api/todos/:id     — found, not found
  DELETE /api/todos?status=completed — bulk delete, empty
"""

from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

from todo.api.app import create_app
from todo.api.dependencies import get_repository
from todo.domain.value_objects import FilterCriteria, TodoId, TodoStatus, TodoTitle
from todo.persistence.connection import open_connection
from todo.persistence.migrations.runner import run_migrations
from todo.persistence.repository import SQLiteTodoRepository
from todo.domain.todo import Todo


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def in_memory_repo() -> SQLiteTodoRepository:
    """Fresh in-memory SQLiteTodoRepository for each test."""
    conn = open_connection(":memory:")
    run_migrations(conn)
    return SQLiteTodoRepository(conn)


@pytest.fixture()
def client(in_memory_repo: SQLiteTodoRepository) -> TestClient:
    """FastAPI TestClient with the in-memory repo injected."""
    app = create_app()
    app.dependency_overrides[get_repository] = lambda: in_memory_repo
    return TestClient(app, raise_server_exceptions=False)


def _make_todo(title: str = "Buy milk") -> Todo:
    return Todo.create(TodoTitle(title))


# ---------------------------------------------------------------------------
# Helpers — seed data
# ---------------------------------------------------------------------------


def _seed(repo: SQLiteTodoRepository, *titles: str) -> list[Todo]:
    """Create and persist todos with the given titles (in order)."""
    created = []
    for title in titles:
        t = _make_todo(title)
        repo.save(t)
        created.append(t)
    return created


# ---------------------------------------------------------------------------
# GET /api/todos
# ---------------------------------------------------------------------------


class TestListTodos:
    def test_empty_store_returns_empty_list_and_zero_counts(
        self, client: TestClient
    ) -> None:
        res = client.get("/api/todos")
        assert res.status_code == 200
        body = res.json()
        assert body["todos"] == []
        assert body["counts"] == {"all": 0, "active": 0, "completed": 0}

    def test_returns_all_todos_by_default(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        _seed(in_memory_repo, "Task A", "Task B")
        res = client.get("/api/todos")
        assert res.status_code == 200
        assert len(res.json()["todos"]) == 2

    def test_filter_active_excludes_completed_from_list(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        active = _make_todo("Active task")
        completed = _make_todo("Done task")
        completed.complete()
        in_memory_repo.save(active)
        in_memory_repo.save(completed)

        res = client.get("/api/todos?filter=active")
        assert res.status_code == 200
        body = res.json()
        titles = [t["title"] for t in body["todos"]]
        assert "Active task" in titles
        assert "Done task" not in titles

    def test_filter_active_counts_reflect_all_todos(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        active = _make_todo("Active task")
        completed = _make_todo("Done task")
        completed.complete()
        in_memory_repo.save(active)
        in_memory_repo.save(completed)

        res = client.get("/api/todos?filter=active")
        counts = res.json()["counts"]
        assert counts["all"] == 2
        assert counts["active"] == 1
        assert counts["completed"] == 1

    def test_filter_completed_excludes_active_from_list(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        active = _make_todo("Active task")
        completed = _make_todo("Done task")
        completed.complete()
        in_memory_repo.save(active)
        in_memory_repo.save(completed)

        res = client.get("/api/todos?filter=completed")
        assert res.status_code == 200
        titles = [t["title"] for t in res.json()["todos"]]
        assert "Done task" in titles
        assert "Active task" not in titles

    def test_invalid_filter_returns_400(self, client: TestClient) -> None:
        res = client.get("/api/todos?filter=unknown")
        assert res.status_code == 400
        body = res.json()
        assert body["error"] == "BAD_REQUEST"

    def test_todo_resource_has_expected_fields(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        _seed(in_memory_repo, "My task")
        res = client.get("/api/todos")
        todo = res.json()["todos"][0]
        assert "id" in todo
        assert "title" in todo
        assert "status" in todo
        assert "createdAt" in todo
        assert "updatedAt" in todo

    def test_todos_ordered_newest_first(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        """Todos returned in createdAt descending order."""
        import time
        t1 = _make_todo("First")
        in_memory_repo.save(t1)
        time.sleep(0.01)  # ensure distinct timestamps
        t2 = _make_todo("Second")
        in_memory_repo.save(t2)

        res = client.get("/api/todos")
        titles = [t["title"] for t in res.json()["todos"]]
        assert titles[0] == "Second"
        assert titles[1] == "First"


# ---------------------------------------------------------------------------
# POST /api/todos
# ---------------------------------------------------------------------------


class TestCreateTodo:
    def test_valid_title_returns_201(self, client: TestClient) -> None:
        res = client.post("/api/todos", json={"title": "Buy groceries"})
        assert res.status_code == 201

    def test_created_todo_has_uuid_id(self, client: TestClient) -> None:
        res = client.post("/api/todos", json={"title": "Test"})
        body = res.json()
        import re
        uuid_pattern = re.compile(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
            re.IGNORECASE,
        )
        assert uuid_pattern.match(body["id"])

    def test_created_todo_has_full_resource_fields(self, client: TestClient) -> None:
        res = client.post("/api/todos", json={"title": "New task"})
        body = res.json()
        assert body["title"] == "New task"
        assert body["status"] == "active"
        assert "createdAt" in body
        assert "updatedAt" in body

    def test_empty_title_returns_422_with_invalid_title_error(
        self, client: TestClient
    ) -> None:
        res = client.post("/api/todos", json={"title": ""})
        assert res.status_code == 422
        body = res.json()
        assert body["error"] == "INVALID_TITLE"

    def test_whitespace_title_returns_422(self, client: TestClient) -> None:
        res = client.post("/api/todos", json={"title": "   "})
        assert res.status_code == 422
        body = res.json()
        assert body["error"] == "INVALID_TITLE"

    def test_missing_title_field_returns_400(self, client: TestClient) -> None:
        res = client.post("/api/todos", json={})
        assert res.status_code == 400
        assert res.json()["error"] == "BAD_REQUEST"

    def test_created_todo_persisted(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        res = client.post("/api/todos", json={"title": "Persist me"})
        todo_id = res.json()["id"]
        found = in_memory_repo.find_by_id(TodoId(todo_id))
        assert found is not None
        assert found.title.value == "Persist me"


# ---------------------------------------------------------------------------
# GET /api/todos/:id
# ---------------------------------------------------------------------------


class TestGetTodo:
    def test_returns_200_with_todo_resource(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Fetch me")
        in_memory_repo.save(todo)

        res = client.get(f"/api/todos/{todo.id.value}")
        assert res.status_code == 200
        body = res.json()
        assert body["id"] == todo.id.value
        assert body["title"] == "Fetch me"

    def test_unknown_id_returns_404(self, client: TestClient) -> None:
        unknown = str(TodoId.generate().value)
        res = client.get(f"/api/todos/{unknown}")
        assert res.status_code == 404
        assert res.json()["error"] == "TODO_NOT_FOUND"


# ---------------------------------------------------------------------------
# PATCH /api/todos/:id
# ---------------------------------------------------------------------------


class TestUpdateTodo:
    def test_status_completed_marks_todo_as_completed(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Complete me")
        in_memory_repo.save(todo)

        res = client.patch(f"/api/todos/{todo.id.value}", json={"status": "completed"})
        assert res.status_code == 200
        assert res.json()["status"] == "completed"

    def test_status_active_reopens_completed_todo(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Reopen me")
        todo.complete()
        in_memory_repo.save(todo)

        res = client.patch(f"/api/todos/{todo.id.value}", json={"status": "active"})
        assert res.status_code == 200
        assert res.json()["status"] == "active"

    def test_completing_already_completed_todo_is_idempotent(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Already done")
        todo.complete()
        in_memory_repo.save(todo)

        res = client.patch(f"/api/todos/{todo.id.value}", json={"status": "completed"})
        assert res.status_code == 200
        assert res.json()["status"] == "completed"

    def test_updating_title(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Old title")
        in_memory_repo.save(todo)

        res = client.patch(
            f"/api/todos/{todo.id.value}", json={"title": "New title"}
        )
        assert res.status_code == 200
        assert res.json()["title"] == "New title"

    def test_unknown_id_returns_404(self, client: TestClient) -> None:
        unknown = str(TodoId.generate().value)
        res = client.patch(f"/api/todos/{unknown}", json={"status": "completed"})
        assert res.status_code == 404
        assert res.json()["error"] == "TODO_NOT_FOUND"

    def test_invalid_title_returns_422(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Valid title")
        in_memory_repo.save(todo)

        res = client.patch(f"/api/todos/{todo.id.value}", json={"title": ""})
        assert res.status_code == 422
        assert res.json()["error"] == "INVALID_TITLE"

    def test_invalid_status_returns_400(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Some task")
        in_memory_repo.save(todo)

        res = client.patch(f"/api/todos/{todo.id.value}", json={"status": "unknown"})
        assert res.status_code == 400
        assert res.json()["error"] == "BAD_REQUEST"

    def test_updating_both_title_and_status(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Old title")
        in_memory_repo.save(todo)

        res = client.patch(
            f"/api/todos/{todo.id.value}",
            json={"title": "New title", "status": "completed"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["title"] == "New title"
        assert body["status"] == "completed"


# ---------------------------------------------------------------------------
# DELETE /api/todos/:id
# ---------------------------------------------------------------------------


class TestDeleteTodo:
    def test_existing_todo_returns_204(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Delete me")
        in_memory_repo.save(todo)

        res = client.delete(f"/api/todos/{todo.id.value}")
        assert res.status_code == 204

    def test_deleted_todo_is_gone(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("Delete me")
        in_memory_repo.save(todo)
        client.delete(f"/api/todos/{todo.id.value}")

        assert in_memory_repo.find_by_id(todo.id) is None

    def test_unknown_id_returns_404(self, client: TestClient) -> None:
        unknown = str(TodoId.generate().value)
        res = client.delete(f"/api/todos/{unknown}")
        assert res.status_code == 404
        assert res.json()["error"] == "TODO_NOT_FOUND"

    def test_delete_returns_no_body(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        todo = _make_todo("No body")
        in_memory_repo.save(todo)
        res = client.delete(f"/api/todos/{todo.id.value}")
        assert res.status_code == 204
        assert res.content == b""


# ---------------------------------------------------------------------------
# DELETE /api/todos?status=completed
# ---------------------------------------------------------------------------


class TestDeleteCompleted:
    def test_deletes_all_completed_and_returns_count(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        active = _make_todo("Active")
        done1 = _make_todo("Done 1")
        done2 = _make_todo("Done 2")
        done1.complete()
        done2.complete()
        in_memory_repo.save(active)
        in_memory_repo.save(done1)
        in_memory_repo.save(done2)

        res = client.delete("/api/todos?status=completed")
        assert res.status_code == 200
        assert res.json()["deletedCount"] == 2

    def test_completed_todos_removed_from_store(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        active = _make_todo("Active")
        done = _make_todo("Done")
        done.complete()
        in_memory_repo.save(active)
        in_memory_repo.save(done)

        client.delete("/api/todos?status=completed")

        remaining = in_memory_repo.find_all()
        assert len(remaining) == 1
        assert remaining[0].id == active.id

    def test_active_todos_not_deleted(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        active = _make_todo("Still here")
        in_memory_repo.save(active)

        res = client.delete("/api/todos?status=completed")
        assert res.status_code == 200
        assert res.json()["deletedCount"] == 0
        assert in_memory_repo.find_by_id(active.id) is not None

    def test_no_completed_todos_returns_zero_count(
        self, client: TestClient, in_memory_repo: SQLiteTodoRepository
    ) -> None:
        res = client.delete("/api/todos?status=completed")
        assert res.status_code == 200
        assert res.json()["deletedCount"] == 0

    def test_missing_status_param_returns_400(self, client: TestClient) -> None:
        res = client.delete("/api/todos")
        assert res.status_code == 400
        assert res.json()["error"] == "BAD_REQUEST"

    def test_invalid_status_param_returns_400(self, client: TestClient) -> None:
        res = client.delete("/api/todos?status=active")
        assert res.status_code == 400
        assert res.json()["error"] == "BAD_REQUEST"


# ---------------------------------------------------------------------------
# Error envelope shape
# ---------------------------------------------------------------------------


class TestErrorEnvelope:
    """All error responses use the {error, message} envelope."""

    def test_404_has_error_and_message_fields(self, client: TestClient) -> None:
        res = client.get(f"/api/todos/{TodoId.generate().value}")
        body = res.json()
        assert "error" in body
        assert "message" in body

    def test_422_has_error_and_message_fields(self, client: TestClient) -> None:
        res = client.post("/api/todos", json={"title": ""})
        body = res.json()
        assert "error" in body
        assert "message" in body

    def test_400_has_error_and_message_fields(self, client: TestClient) -> None:
        res = client.get("/api/todos?filter=bad")
        body = res.json()
        assert "error" in body
        assert "message" in body


# ---------------------------------------------------------------------------
# SPA / static file
# ---------------------------------------------------------------------------


class TestSPA:
    def test_root_returns_html(self, client: TestClient) -> None:
        res = client.get("/")
        assert res.status_code == 200
        assert "text/html" in res.headers["content-type"]
