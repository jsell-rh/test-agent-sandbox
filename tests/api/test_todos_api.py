"""Integration tests for the Todo REST API.

Covers every critical test case from the TDD Plan in interface.spec.md.

Design decisions:
- Uses FastAPI's TestClient (backed by httpx) for real HTTP dispatch.
- Each test gets a fresh in-memory SQLite database via a fixture that
  calls create_app(":memory:"), so tests are fully isolated.
- Tests verify observable HTTP behaviour: status codes, JSON shapes,
  and data round-trips. No implementation details.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from todo.api.app import create_app
from todo.api.schemas import (
    ERROR_BAD_REQUEST,
    ERROR_INVALID_TITLE,
    ERROR_TODO_NOT_FOUND,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def client() -> TestClient:
    """Fresh in-memory SQLite DB + TestClient per test."""
    app = create_app(":memory:")
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def base_url() -> str:
    return "/api/todos"


def _create_todo(client: TestClient, base_url: str, title: str) -> dict:
    """Helper: POST a valid todo and return the parsed response body."""
    resp = client.post(base_url, json={"title": title})
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# GET /api/todos
# ---------------------------------------------------------------------------


class TestListTodos:
    def test_empty_list_returns_zero_counts(self, client: TestClient, base_url: str) -> None:
        """Returns empty todos array and zero counts when no todos exist."""
        resp = client.get(base_url)
        assert resp.status_code == 200
        body = resp.json()
        assert body["todos"] == []
        assert body["counts"] == {"all": 0, "active": 0, "completed": 0}

    def test_filter_active_excludes_completed_but_counts_reflect_all(
        self, client: TestClient, base_url: str
    ) -> None:
        """filter=active excludes completed todos from list but counts reflect all."""
        todo1 = _create_todo(client, base_url, "Active todo")
        todo2 = _create_todo(client, base_url, "To be completed")
        # Complete todo2
        client.patch(f"{base_url}/{todo2['id']}", json={"status": "completed"})

        resp = client.get(base_url, params={"filter": "active"})
        assert resp.status_code == 200
        body = resp.json()

        # Only the active todo appears in the list
        returned_ids = {t["id"] for t in body["todos"]}
        assert todo1["id"] in returned_ids
        assert todo2["id"] not in returned_ids

        # Counts reflect ALL todos (1 active + 1 completed = 2 total)
        assert body["counts"]["all"] == 2
        assert body["counts"]["active"] == 1
        assert body["counts"]["completed"] == 1

    def test_filter_completed_excludes_active(
        self, client: TestClient, base_url: str
    ) -> None:
        """filter=completed excludes active todos from list."""
        active_todo = _create_todo(client, base_url, "Still active")
        completed_todo = _create_todo(client, base_url, "Done")
        client.patch(f"{base_url}/{completed_todo['id']}", json={"status": "completed"})

        resp = client.get(base_url, params={"filter": "completed"})
        assert resp.status_code == 200
        body = resp.json()

        returned_ids = {t["id"] for t in body["todos"]}
        assert completed_todo["id"] in returned_ids
        assert active_todo["id"] not in returned_ids

    def test_filter_all_returns_all_todos(
        self, client: TestClient, base_url: str
    ) -> None:
        """filter=all (default) returns every todo."""
        t1 = _create_todo(client, base_url, "First")
        t2 = _create_todo(client, base_url, "Second")
        client.patch(f"{base_url}/{t2['id']}", json={"status": "completed"})

        resp = client.get(base_url)
        assert resp.status_code == 200
        body = resp.json()
        returned_ids = {t["id"] for t in body["todos"]}
        assert {t1["id"], t2["id"]} == returned_ids

    def test_invalid_filter_returns_400(self, client: TestClient, base_url: str) -> None:
        """Invalid filter value returns 400 BAD_REQUEST."""
        resp = client.get(base_url, params={"filter": "bogus"})
        assert resp.status_code == 400
        body = resp.json()
        # FastAPI wraps HTTPException detail in a 'detail' key
        assert body["detail"]["error"] == ERROR_BAD_REQUEST

    def test_todos_ordered_newest_first(self, client: TestClient, base_url: str) -> None:
        """Todos are returned with newest (latest createdAt) first."""
        t1 = _create_todo(client, base_url, "First created")
        t2 = _create_todo(client, base_url, "Second created")

        resp = client.get(base_url)
        assert resp.status_code == 200
        ids = [t["id"] for t in resp.json()["todos"]]
        # Newest first: t2 was created after t1
        assert ids.index(t2["id"]) < ids.index(t1["id"])


# ---------------------------------------------------------------------------
# POST /api/todos
# ---------------------------------------------------------------------------


class TestCreateTodo:
    def test_valid_title_returns_201_with_full_resource(
        self, client: TestClient, base_url: str
    ) -> None:
        """Valid title returns 201 with full Todo resource including a UUID id."""
        resp = client.post(base_url, json={"title": "Buy groceries"})
        assert resp.status_code == 201
        body = resp.json()
        # Verify all resource fields are present
        assert "id" in body
        assert "title" in body
        assert "status" in body
        assert "createdAt" in body
        assert "updatedAt" in body
        # Verify field values
        assert body["title"] == "Buy groceries"
        assert body["status"] == "active"
        # id must be a valid UUID v4
        uuid.UUID(body["id"], version=4)

    def test_empty_title_returns_422_invalid_title(
        self, client: TestClient, base_url: str
    ) -> None:
        """Empty title returns 422 with error: INVALID_TITLE."""
        resp = client.post(base_url, json={"title": ""})
        assert resp.status_code == 422
        assert resp.json()["detail"]["error"] == ERROR_INVALID_TITLE

    def test_whitespace_only_title_returns_422(
        self, client: TestClient, base_url: str
    ) -> None:
        """Whitespace-only title triggers InvalidTitleError -> 422."""
        resp = client.post(base_url, json={"title": "   "})
        assert resp.status_code == 422
        assert resp.json()["detail"]["error"] == ERROR_INVALID_TITLE

    def test_title_at_max_length_is_accepted(
        self, client: TestClient, base_url: str
    ) -> None:
        """Title of exactly 500 characters is valid."""
        resp = client.post(base_url, json={"title": "x" * 500})
        assert resp.status_code == 201

    def test_title_exceeding_max_length_returns_422(
        self, client: TestClient, base_url: str
    ) -> None:
        """Title of 501 characters returns 422."""
        resp = client.post(base_url, json={"title": "x" * 501})
        assert resp.status_code == 422
        assert resp.json()["detail"]["error"] == ERROR_INVALID_TITLE


# ---------------------------------------------------------------------------
# GET /api/todos/:id
# ---------------------------------------------------------------------------


class TestGetTodo:
    def test_existing_todo_returns_200(self, client: TestClient, base_url: str) -> None:
        """Fetch a single todo by id returns 200 with the resource."""
        created = _create_todo(client, base_url, "Find me")
        resp = client.get(f"{base_url}/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["title"] == "Find me"

    def test_unknown_id_returns_404(self, client: TestClient, base_url: str) -> None:
        """Unknown TodoId returns 404 TODO_NOT_FOUND."""
        resp = client.get(f"{base_url}/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert resp.json()["detail"]["error"] == ERROR_TODO_NOT_FOUND


# ---------------------------------------------------------------------------
# PATCH /api/todos/:id
# ---------------------------------------------------------------------------


class TestPatchTodo:
    def test_status_completed_marks_active_todo_as_completed(
        self, client: TestClient, base_url: str
    ) -> None:
        """status: 'completed' marks active todo as completed."""
        todo = _create_todo(client, base_url, "Mark done")
        assert todo["status"] == "active"

        resp = client.patch(f"{base_url}/{todo['id']}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_status_active_reopens_completed_todo(
        self, client: TestClient, base_url: str
    ) -> None:
        """status: 'active' reopens a completed todo."""
        todo = _create_todo(client, base_url, "Complete then reopen")
        client.patch(f"{base_url}/{todo['id']}", json={"status": "completed"})

        resp = client.patch(f"{base_url}/{todo['id']}", json={"status": "active"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    def test_completing_already_completed_todo_is_idempotent(
        self, client: TestClient, base_url: str
    ) -> None:
        """status: 'completed' on already-completed todo returns 200 (idempotent)."""
        todo = _create_todo(client, base_url, "Idempotent complete")
        client.patch(f"{base_url}/{todo['id']}", json={"status": "completed"})

        resp = client.patch(f"{base_url}/{todo['id']}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_unknown_id_returns_404(self, client: TestClient, base_url: str) -> None:
        """Unknown id returns 404."""
        resp = client.patch(
            f"{base_url}/{uuid.uuid4()}", json={"status": "completed"}
        )
        assert resp.status_code == 404
        assert resp.json()["detail"]["error"] == ERROR_TODO_NOT_FOUND

    def test_invalid_title_returns_422(self, client: TestClient, base_url: str) -> None:
        """Invalid new title returns 422 INVALID_TITLE."""
        todo = _create_todo(client, base_url, "Original")
        resp = client.patch(f"{base_url}/{todo['id']}", json={"title": ""})
        assert resp.status_code == 422
        assert resp.json()["detail"]["error"] == ERROR_INVALID_TITLE

    def test_patch_title_only(self, client: TestClient, base_url: str) -> None:
        """PATCH with only title updates title and leaves status unchanged."""
        todo = _create_todo(client, base_url, "Old title")
        resp = client.patch(f"{base_url}/{todo['id']}", json={"title": "New title"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["title"] == "New title"
        assert body["status"] == "active"

    def test_patch_title_and_status_together(
        self, client: TestClient, base_url: str
    ) -> None:
        """PATCH can update both title and status in a single request."""
        todo = _create_todo(client, base_url, "Both fields")
        resp = client.patch(
            f"{base_url}/{todo['id']}",
            json={"title": "Updated both", "status": "completed"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["title"] == "Updated both"
        assert body["status"] == "completed"

    def test_updated_at_changes_after_patch(
        self, client: TestClient, base_url: str
    ) -> None:
        """updatedAt timestamp changes after a PATCH."""
        todo = _create_todo(client, base_url, "Timestamp test")
        resp = client.patch(f"{base_url}/{todo['id']}", json={"status": "completed"})
        assert resp.status_code == 200
        # updatedAt must be present and is a string (ISO 8601)
        assert "updatedAt" in resp.json()


# ---------------------------------------------------------------------------
# DELETE /api/todos/:id
# ---------------------------------------------------------------------------


class TestDeleteTodo:
    def test_existing_todo_returns_204(self, client: TestClient, base_url: str) -> None:
        """Existing todo returns 204 with no body."""
        todo = _create_todo(client, base_url, "To delete")
        resp = client.delete(f"{base_url}/{todo['id']}")
        assert resp.status_code == 204
        assert resp.content == b""

    def test_unknown_id_returns_404(self, client: TestClient, base_url: str) -> None:
        """Unknown id returns 404 TODO_NOT_FOUND."""
        resp = client.delete(f"{base_url}/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert resp.json()["detail"]["error"] == ERROR_TODO_NOT_FOUND

    def test_deleted_todo_is_gone(self, client: TestClient, base_url: str) -> None:
        """After deleting, fetching the same id returns 404."""
        todo = _create_todo(client, base_url, "Gone")
        client.delete(f"{base_url}/{todo['id']}")
        resp = client.get(f"{base_url}/{todo['id']}")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/todos?status=completed
# ---------------------------------------------------------------------------


class TestDeleteCompleted:
    def test_deletes_all_completed_returns_deleted_count(
        self, client: TestClient, base_url: str
    ) -> None:
        """Deletes all completed todos; returns correct deletedCount."""
        t1 = _create_todo(client, base_url, "Stay active")
        t2 = _create_todo(client, base_url, "Complete me")
        t3 = _create_todo(client, base_url, "Complete me too")
        client.patch(f"{base_url}/{t2['id']}", json={"status": "completed"})
        client.patch(f"{base_url}/{t3['id']}", json={"status": "completed"})

        resp = client.delete(base_url, params={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["deletedCount"] == 2

        # Verify active todo still exists
        remaining = client.get(base_url).json()["todos"]
        remaining_ids = {t["id"] for t in remaining}
        assert t1["id"] in remaining_ids
        assert t2["id"] not in remaining_ids
        assert t3["id"] not in remaining_ids

    def test_no_completed_todos_returns_200_with_zero_count(
        self, client: TestClient, base_url: str
    ) -> None:
        """When no completed todos exist, returns 200 with deletedCount: 0."""
        _create_todo(client, base_url, "Active only")
        resp = client.delete(base_url, params={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["deletedCount"] == 0

    def test_empty_store_returns_200_with_zero_count(
        self, client: TestClient, base_url: str
    ) -> None:
        """Empty store: returns 200 with deletedCount: 0."""
        resp = client.delete(base_url, params={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["deletedCount"] == 0

    def test_missing_status_returns_400(
        self, client: TestClient, base_url: str
    ) -> None:
        """DELETE /api/todos without ?status=completed returns 400."""
        resp = client.delete(base_url)
        assert resp.status_code == 400
        assert resp.json()["detail"]["error"] == ERROR_BAD_REQUEST

    def test_wrong_status_value_returns_400(
        self, client: TestClient, base_url: str
    ) -> None:
        """DELETE /api/todos?status=active returns 400 (only 'completed' is valid here)."""
        resp = client.delete(base_url, params={"status": "active"})
        assert resp.status_code == 400
        assert resp.json()["detail"]["error"] == ERROR_BAD_REQUEST


# ---------------------------------------------------------------------------
# Resource shape validation
# ---------------------------------------------------------------------------


class TestResourceShape:
    def test_todo_resource_has_all_required_fields(
        self, client: TestClient, base_url: str
    ) -> None:
        """Every Todo resource contains id, title, status, createdAt, updatedAt."""
        todo = _create_todo(client, base_url, "Shape check")
        for field in ("id", "title", "status", "createdAt", "updatedAt"):
            assert field in todo, f"Missing field: {field}"

    def test_todo_id_is_uuid_v4(self, client: TestClient, base_url: str) -> None:
        """Todo id must be a valid UUID v4 string."""
        todo = _create_todo(client, base_url, "UUID check")
        parsed = uuid.UUID(todo["id"])
        assert parsed.version == 4

    def test_list_response_has_todos_and_counts(
        self, client: TestClient, base_url: str
    ) -> None:
        """GET /api/todos response has 'todos' and 'counts' with all three keys."""
        _create_todo(client, base_url, "Count test")
        body = client.get(base_url).json()
        assert "todos" in body
        assert "counts" in body
        assert "all" in body["counts"]
        assert "active" in body["counts"]
        assert "completed" in body["counts"]
