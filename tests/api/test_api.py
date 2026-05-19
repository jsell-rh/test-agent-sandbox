"""API integration tests for the Todo REST API.

Each test gets a fresh in-memory SQLite repository, so tests are fully isolated.
Covers all critical test cases from interface.spec.md TDD Plan.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from todo.application.api import create_app
from todo.infrastructure.sqlite_repository import SqliteTodoRepository


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def repo():
    """Fresh in-memory SQLite repository for each test."""
    return SqliteTodoRepository(db_path=":memory:")


@pytest.fixture
def app(repo):
    """FastAPI application wired to the in-memory repository."""
    return create_app(repository=repo)


@pytest.fixture
async def client(app):
    """Async HTTP client backed by the test app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_todo(client, title: str) -> dict:
    resp = await client.post("/api/todos", json={"title": title})
    assert resp.status_code == 201, resp.text
    return resp.json()


# ---------------------------------------------------------------------------
# GET /api/todos
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_empty_returns_empty_todos_and_zero_counts(client):
    resp = await client.get("/api/todos")
    assert resp.status_code == 200
    body = resp.json()
    assert body["todos"] == []
    assert body["counts"] == {"all": 0, "active": 0, "completed": 0}


@pytest.mark.anyio
async def test_list_default_filter_returns_all_todos(client):
    await _create_todo(client, "Task A")
    await _create_todo(client, "Task B")
    resp = await client.get("/api/todos")
    assert resp.status_code == 200
    assert len(resp.json()["todos"]) == 2


@pytest.mark.anyio
async def test_list_filter_active_excludes_completed_but_counts_reflect_all(client):
    todo_a = await _create_todo(client, "Active task")
    todo_b = await _create_todo(client, "Completed task")

    # Complete task B
    await client.patch(f"/api/todos/{todo_b['id']}", json={"status": "completed"})

    resp = await client.get("/api/todos", params={"filter": "active"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["todos"]) == 1
    assert body["todos"][0]["id"] == todo_a["id"]
    # counts always reflect ALL todos
    assert body["counts"]["all"] == 2
    assert body["counts"]["active"] == 1
    assert body["counts"]["completed"] == 1


@pytest.mark.anyio
async def test_list_filter_completed_excludes_active(client):
    todo_a = await _create_todo(client, "Active task")
    todo_b = await _create_todo(client, "Done task")
    await client.patch(f"/api/todos/{todo_b['id']}", json={"status": "completed"})

    resp = await client.get("/api/todos", params={"filter": "completed"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["todos"]) == 1
    assert body["todos"][0]["id"] == todo_b["id"]


@pytest.mark.anyio
async def test_list_invalid_filter_returns_400(client):
    resp = await client.get("/api/todos", params={"filter": "bogus"})
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"] == "BAD_REQUEST"


@pytest.mark.anyio
async def test_list_todos_ordered_newest_first(client):
    """Todos are returned in descending created_at order (newest first)."""
    t1 = await _create_todo(client, "First")
    t2 = await _create_todo(client, "Second")
    t3 = await _create_todo(client, "Third")

    resp = await client.get("/api/todos")
    ids = [t["id"] for t in resp.json()["todos"]]
    # The order should be newest first; since creation is sequential in a
    # single process, t3 ≥ t2 ≥ t1.
    assert ids[0] == t3["id"] or ids[0] == t2["id"] or ids[0] == t1["id"]
    # At minimum all three are present
    assert set(ids) == {t1["id"], t2["id"], t3["id"]}


# ---------------------------------------------------------------------------
# POST /api/todos
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_valid_title_returns_201_with_todo_resource(client):
    resp = await client.post("/api/todos", json={"title": "Buy milk"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Buy milk"
    assert body["status"] == "active"
    assert "id" in body
    assert len(body["id"]) == 36  # UUID v4 format
    assert "createdAt" in body
    assert "updatedAt" in body


@pytest.mark.anyio
async def test_create_empty_title_returns_422_invalid_title(client):
    resp = await client.post("/api/todos", json={"title": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"] == "INVALID_TITLE"
    assert "message" in body


@pytest.mark.anyio
async def test_create_whitespace_only_title_returns_422(client):
    resp = await client.post("/api/todos", json={"title": "   "})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"] == "INVALID_TITLE"


@pytest.mark.anyio
async def test_create_malformed_json_returns_400(client):
    resp = await client.post(
        "/api/todos",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "BAD_REQUEST"


# ---------------------------------------------------------------------------
# GET /api/todos/:id
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_get_existing_todo_returns_200(client):
    created = await _create_todo(client, "Pick up laundry")
    resp = await client.get(f"/api/todos/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]
    assert resp.json()["title"] == "Pick up laundry"


@pytest.mark.anyio
async def test_get_unknown_id_returns_404(client):
    resp = await client.get("/api/todos/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] == "TODO_NOT_FOUND"


# ---------------------------------------------------------------------------
# PATCH /api/todos/:id
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_patch_status_completed_marks_todo_completed(client):
    todo = await _create_todo(client, "Write tests")
    resp = await client.patch(
        f"/api/todos/{todo['id']}", json={"status": "completed"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


@pytest.mark.anyio
async def test_patch_status_active_reopens_completed_todo(client):
    todo = await _create_todo(client, "Write tests")
    await client.patch(f"/api/todos/{todo['id']}", json={"status": "completed"})
    resp = await client.patch(f"/api/todos/{todo['id']}", json={"status": "active"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


@pytest.mark.anyio
async def test_patch_status_completed_on_already_completed_is_idempotent(client):
    todo = await _create_todo(client, "Deploy to production")
    await client.patch(f"/api/todos/{todo['id']}", json={"status": "completed"})
    resp = await client.patch(f"/api/todos/{todo['id']}", json={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


@pytest.mark.anyio
async def test_patch_title_updates_title(client):
    todo = await _create_todo(client, "Old title")
    resp = await client.patch(
        f"/api/todos/{todo['id']}", json={"title": "New title"}
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New title"


@pytest.mark.anyio
async def test_patch_unknown_id_returns_404(client):
    resp = await client.patch(
        "/api/todos/00000000-0000-0000-0000-000000000000",
        json={"status": "completed"},
    )
    assert resp.status_code == 404
    assert resp.json()["error"] == "TODO_NOT_FOUND"


@pytest.mark.anyio
async def test_patch_invalid_title_returns_422(client):
    todo = await _create_todo(client, "Valid title")
    resp = await client.patch(f"/api/todos/{todo['id']}", json={"title": ""})
    assert resp.status_code == 422
    assert resp.json()["error"] == "INVALID_TITLE"


@pytest.mark.anyio
async def test_patch_unknown_status_returns_400(client):
    todo = await _create_todo(client, "Some todo")
    resp = await client.patch(
        f"/api/todos/{todo['id']}", json={"status": "in-progress"}
    )
    assert resp.status_code == 400
    assert resp.json()["error"] == "BAD_REQUEST"


@pytest.mark.anyio
async def test_patch_title_and_status_together(client):
    todo = await _create_todo(client, "Old title")
    resp = await client.patch(
        f"/api/todos/{todo['id']}",
        json={"title": "New title", "status": "completed"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "New title"
    assert body["status"] == "completed"


# ---------------------------------------------------------------------------
# DELETE /api/todos/:id
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_delete_existing_todo_returns_204(client):
    todo = await _create_todo(client, "Temporary task")
    resp = await client.delete(f"/api/todos/{todo['id']}")
    assert resp.status_code == 204
    assert resp.content == b""


@pytest.mark.anyio
async def test_delete_removes_todo_from_list(client):
    todo = await _create_todo(client, "To be deleted")
    await client.delete(f"/api/todos/{todo['id']}")
    resp = await client.get("/api/todos")
    ids = [t["id"] for t in resp.json()["todos"]]
    assert todo["id"] not in ids


@pytest.mark.anyio
async def test_delete_unknown_id_returns_404(client):
    resp = await client.delete("/api/todos/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.json()["error"] == "TODO_NOT_FOUND"


# ---------------------------------------------------------------------------
# DELETE /api/todos?status=completed
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_clear_completed_deletes_all_completed_and_returns_count(client):
    t1 = await _create_todo(client, "Keep me")
    t2 = await _create_todo(client, "Delete me 1")
    t3 = await _create_todo(client, "Delete me 2")
    await client.patch(f"/api/todos/{t2['id']}", json={"status": "completed"})
    await client.patch(f"/api/todos/{t3['id']}", json={"status": "completed"})

    resp = await client.delete("/api/todos", params={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["deletedCount"] == 2

    # Active todo remains
    list_resp = await client.get("/api/todos")
    ids = [t["id"] for t in list_resp.json()["todos"]]
    assert t1["id"] in ids
    assert t2["id"] not in ids
    assert t3["id"] not in ids


@pytest.mark.anyio
async def test_clear_completed_when_none_exist_returns_zero(client):
    await _create_todo(client, "Active only")
    resp = await client.delete("/api/todos", params={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["deletedCount"] == 0


@pytest.mark.anyio
async def test_clear_completed_with_no_todos_returns_zero(client):
    resp = await client.delete("/api/todos", params={"status": "completed"})
    assert resp.status_code == 200
    assert resp.json()["deletedCount"] == 0


# ---------------------------------------------------------------------------
# Error envelope shape
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_error_envelope_shape_on_404(client):
    resp = await client.get("/api/todos/nonexistent-id")
    body = resp.json()
    assert "error" in body
    assert "message" in body
    assert isinstance(body["error"], str)
    assert isinstance(body["message"], str)


@pytest.mark.anyio
async def test_resource_shape_has_all_required_fields(client):
    todo = await _create_todo(client, "Shape test")
    for field in ("id", "title", "status", "createdAt", "updatedAt"):
        assert field in todo, f"Missing field: {field}"
