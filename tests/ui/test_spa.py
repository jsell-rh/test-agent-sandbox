"""SPA browser tests (Playwright) — interface.spec.md UI Application Layer.

Covers the UI Critical Test Cases from the spec TDD Plan:

  - Entering a title + Enter creates a new item at the top of the list.
  - Pressing Escape in the new-todo input clears without creating.
  - Double-clicking a title enters edit mode for that item only.
  - Pressing Escape in edit mode restores the original title.
  - Submitting a blank title in edit mode deletes the item.
  - "Clear completed" button only visible when completedCount > 0.
  - "{N} item(s) left" reflects the current active count after toggling.
  - Filter tabs correctly show/hide items without an additional network request.

Failure modes tested:
  - API returns 500 on create: input not cleared; error message shown.
  - API returns 500 on toggle: checkbox reverts to original state.

Architecture:
  A single FastAPI server backed by an in-memory SQLite database is started
  for the entire module (``live_server`` fixture, module scope).  Each test
  resets state by deleting all todos via the REST API (``clean_todos``
  autouse fixture).
"""

from __future__ import annotations

import re
import socket
import threading
import time
from collections.abc import Generator

import httpx
import pytest
import uvicorn
from playwright.sync_api import Page, expect

from todo.api.app import create_app
from todo.api.dependencies import get_repository
from todo.persistence.connection import open_connection
from todo.persistence.migrations.runner import run_migrations
from todo.persistence.repository import SQLiteTodoRepository

# ---------------------------------------------------------------------------
# Named constants
# ---------------------------------------------------------------------------

# CSS selectors / IDs used throughout the tests — one place to update.
_SEL_NEW_TODO = "#new-todo-input"
_SEL_TODO_LIST = "#todo-list"
_SEL_TODO_ITEM = ".todo-item"
_SEL_TODO_TITLE = ".todo-title"
_SEL_TOGGLE_LABEL = ".toggle-label"
_SEL_TOGGLE_CHECKBOX = ".toggle-checkbox"
_SEL_EDIT_INPUT = ".edit-input"
_SEL_DELETE_BTN = ".delete-btn"
_SEL_FOOTER = "#footer"
_SEL_ITEMS_LEFT = "#items-left"
_SEL_CLEAR_BTN = "#clear-btn"
_SEL_ERROR_BANNER = ".error-banner"

_FILTER_ALL = ".filter-btn[data-filter='all']"
_FILTER_ACTIVE = ".filter-btn[data-filter='active']"
_FILTER_COMPLETED = ".filter-btn[data-filter='completed']"

_CLASS_COMPLETED = "completed"
_CLASS_EDITING = "editing"
_CLASS_FILTER_ACTIVE = "active"

_NETWORK_SETTLE_MS = 200  # ms to wait after UI action for network to settle


# ---------------------------------------------------------------------------
# Server management helpers
# ---------------------------------------------------------------------------


def _free_port() -> int:
    """Return an available TCP port on localhost."""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _ServerHandle:
    """Manages a uvicorn server running in a daemon thread."""

    def __init__(self, app, port: int) -> None:
        self.port = port
        self.base_url = f"http://127.0.0.1:{port}"
        config = uvicorn.Config(
            app, host="127.0.0.1", port=port, log_level="error"
        )
        self._server = uvicorn.Server(config)
        self._thread = threading.Thread(target=self._server.run, daemon=True)

    def start(self) -> None:
        self._thread.start()
        # Poll until the server accepts connections (up to 10 s).
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            try:
                httpx.get(f"{self.base_url}/api/todos", timeout=0.5)
                return
            except Exception:  # noqa: BLE001
                time.sleep(0.05)
        raise RuntimeError(
            f"Server did not become ready on port {self.port} within 10 s"
        )

    def stop(self) -> None:
        self._server.should_exit = True
        self._thread.join(timeout=5)

    def delete_all_todos(self) -> None:
        """Remove every todo via the REST API (for between-test cleanup)."""
        resp = httpx.get(f"{self.base_url}/api/todos", timeout=5)
        for todo in resp.json().get("todos", []):
            httpx.delete(f"{self.base_url}/api/todos/{todo['id']}", timeout=5)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def live_server() -> Generator[_ServerHandle, None, None]:
    """A single live FastAPI server shared across all tests in this module.

    Uses an in-memory SQLite database injected via FastAPI's dependency
    override mechanism.
    """
    conn = open_connection(":memory:")
    run_migrations(conn)
    repo = SQLiteTodoRepository(conn)

    app = create_app()
    app.dependency_overrides[get_repository] = lambda: repo

    port = _free_port()
    handle = _ServerHandle(app, port)
    handle.start()

    yield handle

    handle.stop()


@pytest.fixture(autouse=True)
def clean_todos(live_server: _ServerHandle) -> None:
    """Delete all todos before each test to ensure a clean, isolated state."""
    live_server.delete_all_todos()


@pytest.fixture()
def spa(page: Page, live_server: _ServerHandle) -> Page:
    """Navigate to the SPA root and wait for the initial load to settle."""
    page.goto(live_server.base_url)
    page.wait_for_load_state("networkidle")
    return page


# ---------------------------------------------------------------------------
# Test-local helpers
# ---------------------------------------------------------------------------


def _add_todo(page: Page, title: str) -> None:
    """Type *title* into the new-todo input and press Enter.

    Waits for the resulting ``<li>`` to appear in the DOM before returning.
    """
    inp = page.locator(_SEL_NEW_TODO)
    inp.fill(title)
    inp.press("Enter")
    page.locator(_SEL_TODO_ITEM).filter(has_text=title).wait_for()


def _toggle(item_locator) -> None:  # type: ignore[no-untyped-def]
    """Click the toggle label for a todo item (the visible circle).

    The actual ``<input type="checkbox">`` is hidden; clicking the label is
    the correct user-facing interaction.
    """
    item_locator.locator(_SEL_TOGGLE_LABEL).click()


# ---------------------------------------------------------------------------
# New-todo input behaviour
# ---------------------------------------------------------------------------


class TestNewTodoInput:
    """Spec: new-todo input interactions."""

    def test_enter_creates_todo_at_top_of_list(self, spa: Page) -> None:
        """Submitting adds the todo and newest appears first."""
        _add_todo(spa, "First task")
        _add_todo(spa, "Second task")

        titles = spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").all_text_contents()
        assert titles[0] == "Second task", "Newest todo should be at the top"
        assert titles[1] == "First task"

    def test_input_clears_after_successful_creation(self, spa: Page) -> None:
        """The input field is empty after a successful creation."""
        inp = spa.locator(_SEL_NEW_TODO)
        inp.fill("Temporary task")
        inp.press("Enter")
        spa.locator(_SEL_TODO_ITEM).filter(has_text="Temporary task").wait_for()

        expect(inp).to_have_value("")

    def test_escape_clears_input_without_creating(self, spa: Page) -> None:
        """Pressing Escape clears the new-todo field and creates no item."""
        inp = spa.locator(_SEL_NEW_TODO)
        inp.fill("Unfinished task")
        inp.press("Escape")

        expect(inp).to_have_value("")
        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(0)

    def test_empty_enter_creates_nothing(self, spa: Page) -> None:
        """Pressing Enter on an empty/whitespace input creates no todo."""
        inp = spa.locator(_SEL_NEW_TODO)
        inp.fill("   ")
        inp.press("Enter")
        spa.wait_for_timeout(_NETWORK_SETTLE_MS)

        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(0)


# ---------------------------------------------------------------------------
# Todo item — edit mode
# ---------------------------------------------------------------------------


class TestEditMode:
    """Spec: todo item edit mode behaviour."""

    def test_double_click_title_enters_edit_mode(self, spa: Page) -> None:
        """Double-clicking a title makes only that item enter editing mode."""
        _add_todo(spa, "Task A")
        _add_todo(spa, "Task B")

        item_a = spa.locator(_SEL_TODO_ITEM).filter(has_text="Task A")
        item_a.locator(_SEL_TODO_TITLE).dblclick()

        # The edit input becomes visible for item A; the title span is hidden.
        edit_a = item_a.locator(_SEL_EDIT_INPUT)
        expect(edit_a).to_be_visible()

        # Item B's edit input must remain hidden — only one item edits at a time.
        item_b = spa.locator(_SEL_TODO_ITEM).filter(has_text="Task B")
        expect(item_b.locator(_SEL_EDIT_INPUT)).not_to_be_visible()

    def test_escape_in_edit_mode_restores_original_title(self, spa: Page) -> None:
        """Pressing Escape in the edit field cancels without saving."""
        _add_todo(spa, "Original title")

        item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Original title")
        item.locator(_SEL_TODO_TITLE).dblclick()

        edit = item.locator(_SEL_EDIT_INPUT)
        edit.fill("Changed title")
        edit.press("Escape")

        # Must exit editing mode and preserve the original title.
        expect(item).not_to_have_class(re.compile(_CLASS_EDITING))
        expect(item.locator(_SEL_TODO_TITLE)).to_have_text("Original title")

    def test_enter_in_edit_mode_saves_new_title(self, spa: Page) -> None:
        """Pressing Enter in the edit field updates the todo title."""
        _add_todo(spa, "Old title")

        # Use .first — there is only one todo; the locator is stable even after
        # the title changes (unlike filter(has_text=...) which would stop matching).
        item = spa.locator(_SEL_TODO_ITEM).first
        item.locator(_SEL_TODO_TITLE).dblclick()

        edit = item.locator(_SEL_EDIT_INPUT)
        edit.fill("New title")
        edit.press("Enter")

        # After saving, the edit input is hidden and the new title is shown.
        expect(edit).not_to_be_visible()
        expect(spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").first).to_have_text(
            "New title"
        )

    def test_blur_in_edit_mode_saves_new_title(self, spa: Page) -> None:
        """Blurring the edit field saves the updated title."""
        _add_todo(spa, "Blur title")

        # Use .first — stable reference that survives the title rename.
        item = spa.locator(_SEL_TODO_ITEM).first
        item.locator(_SEL_TODO_TITLE).dblclick()

        edit = item.locator(_SEL_EDIT_INPUT)
        edit.fill("Saved via blur")
        # Blur by clicking away (pressing Tab would also work).
        spa.locator(_SEL_NEW_TODO).click()

        # After blurring, the new title should appear in the item.
        expect(spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").first).to_have_text(
            "Saved via blur"
        )

    def test_submit_blank_title_in_edit_mode_deletes_todo(self, spa: Page) -> None:
        """Submitting an empty title in edit mode deletes the todo."""
        _add_todo(spa, "Delete me")

        item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Delete me")
        item.locator(_SEL_TODO_TITLE).dblclick()

        edit = item.locator(_SEL_EDIT_INPUT)
        edit.fill("")
        edit.press("Enter")

        spa.wait_for_timeout(_NETWORK_SETTLE_MS)
        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(0)


# ---------------------------------------------------------------------------
# Checkbox toggle
# ---------------------------------------------------------------------------


class TestCheckboxToggle:
    """Spec: checkbox toggles status."""

    def test_checking_marks_todo_completed(self, spa: Page) -> None:
        """Clicking the toggle marks a todo as completed."""
        _add_todo(spa, "Complete me")

        item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Complete me")
        _toggle(item)

        expect(item).to_have_class(re.compile(_CLASS_COMPLETED))

    def test_unchecking_reopens_todo(self, spa: Page) -> None:
        """Clicking the toggle on a completed todo reopens it."""
        _add_todo(spa, "Reopen me")

        item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Reopen me")
        _toggle(item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        # Toggle again to reopen
        _toggle(item)
        expect(item).not_to_have_class(re.compile(_CLASS_COMPLETED))


# ---------------------------------------------------------------------------
# Delete button
# ---------------------------------------------------------------------------


class TestDeleteButton:
    """Spec: delete button removes the todo."""

    def test_delete_button_removes_todo(self, spa: Page) -> None:
        """Clicking the delete button permanently removes the todo."""
        _add_todo(spa, "Remove me")

        item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Remove me")
        # Hover to reveal the delete button, then click it.
        item.hover()
        item.locator(_SEL_DELETE_BTN).click()

        spa.wait_for_timeout(_NETWORK_SETTLE_MS)
        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(0)


# ---------------------------------------------------------------------------
# Footer bar
# ---------------------------------------------------------------------------


class TestFooterBar:
    """Spec: footer bar visibility and content."""

    def test_footer_hidden_when_no_todos(self, spa: Page) -> None:
        """Footer is hidden when no todos exist."""
        expect(spa.locator(_SEL_FOOTER)).not_to_be_visible()

    def test_footer_visible_when_todos_exist(self, spa: Page) -> None:
        """Footer appears as soon as a todo is added."""
        _add_todo(spa, "Any task")
        expect(spa.locator(_SEL_FOOTER)).to_be_visible()

    def test_clear_completed_hidden_when_no_completed_todos(
        self, spa: Page
    ) -> None:
        """'Clear completed' is hidden when all todos are active."""
        _add_todo(spa, "Active task")
        expect(spa.locator(_SEL_CLEAR_BTN)).not_to_be_visible()

    def test_clear_completed_visible_when_completed_todo_exists(
        self, spa: Page
    ) -> None:
        """'Clear completed' appears when at least one todo is completed."""
        _add_todo(spa, "Task to complete")
        item = spa.locator(_SEL_TODO_ITEM).first
        _toggle(item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        expect(spa.locator(_SEL_CLEAR_BTN)).to_be_visible()

    def test_items_left_shows_active_count(self, spa: Page) -> None:
        """'{N} item(s) left' shows the correct count of active todos."""
        _add_todo(spa, "Task 1")
        _add_todo(spa, "Task 2")

        expect(spa.locator(_SEL_ITEMS_LEFT)).to_have_text("2 items left")

    def test_items_left_updates_after_toggle(self, spa: Page) -> None:
        """'{N} item(s) left' decreases when a todo is completed."""
        _add_todo(spa, "Task 1")
        _add_todo(spa, "Task 2")
        expect(spa.locator(_SEL_ITEMS_LEFT)).to_have_text("2 items left")

        item = spa.locator(_SEL_TODO_ITEM).first
        _toggle(item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        expect(spa.locator(_SEL_ITEMS_LEFT)).to_have_text("1 item left")

    def test_items_left_singular_vs_plural(self, spa: Page) -> None:
        """'1 item left' (singular) vs '2 items left' (plural)."""
        _add_todo(spa, "Solo task")
        expect(spa.locator(_SEL_ITEMS_LEFT)).to_have_text("1 item left")


# ---------------------------------------------------------------------------
# Filter tabs — client-side (no extra network requests)
# ---------------------------------------------------------------------------


class TestFilterTabs:
    """Spec: filter tabs show/hide items without an additional network request."""

    def test_active_tab_shows_only_active_todos(self, spa: Page) -> None:
        """Active filter hides completed todos."""
        _add_todo(spa, "Active")
        _add_todo(spa, "Done")

        done_item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Done")
        _toggle(done_item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        spa.locator(_FILTER_ACTIVE).click()
        spa.wait_for_timeout(_NETWORK_SETTLE_MS)

        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(1)
        expect(spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").first).to_have_text(
            "Active"
        )

    def test_completed_tab_shows_only_completed_todos(self, spa: Page) -> None:
        """Completed filter hides active todos."""
        _add_todo(spa, "Still active")
        _add_todo(spa, "Done")

        done_item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Done")
        _toggle(done_item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        spa.locator(_FILTER_COMPLETED).click()
        spa.wait_for_timeout(_NETWORK_SETTLE_MS)

        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(1)
        expect(spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").first).to_have_text(
            "Done"
        )

    def test_all_tab_shows_all_todos(self, spa: Page) -> None:
        """All filter shows both active and completed todos."""
        _add_todo(spa, "Active")
        _add_todo(spa, "Done")

        done_item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Done")
        _toggle(done_item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        # Go to Active, then back to All
        spa.locator(_FILTER_ACTIVE).click()
        spa.wait_for_timeout(100)
        spa.locator(_FILTER_ALL).click()
        spa.wait_for_timeout(100)

        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(2)

    def test_filter_tab_highlighted_on_selection(self, spa: Page) -> None:
        """The selected filter tab receives the 'active' CSS class.

        The footer (which contains the filter buttons) is only visible when at
        least one todo exists, so we add a todo before clicking a filter tab.
        """
        _add_todo(spa, "Any task")  # footer must be visible for filter tabs

        spa.locator(_FILTER_ACTIVE).click()
        expect(spa.locator(_FILTER_ACTIVE)).to_have_class(
            re.compile(_CLASS_FILTER_ACTIVE)
        )
        expect(spa.locator(_FILTER_ALL)).not_to_have_class(
            re.compile(_CLASS_FILTER_ACTIVE)
        )

    def test_filter_tabs_do_not_make_extra_network_requests(
        self, spa: Page
    ) -> None:
        """Switching filter tabs does not trigger additional API calls."""
        _add_todo(spa, "Active task")
        _add_todo(spa, "Done task")

        done_item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Done task")
        _toggle(done_item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        # Capture any requests that fire after this point.
        extra_requests: list[str] = []
        spa.on("request", lambda req: extra_requests.append(req.url))

        # Click through all three filter tabs.
        spa.locator(_FILTER_ACTIVE).click()
        spa.wait_for_timeout(100)
        spa.locator(_FILTER_COMPLETED).click()
        spa.wait_for_timeout(100)
        spa.locator(_FILTER_ALL).click()
        spa.wait_for_timeout(100)

        assert extra_requests == [], (
            f"Filter tab clicks made unexpected network requests: {extra_requests}"
        )


# ---------------------------------------------------------------------------
# Clear completed
# ---------------------------------------------------------------------------


class TestClearCompleted:
    """Spec: 'Clear completed' bulk-deletes all completed todos."""

    def test_clear_completed_removes_completed_todos(self, spa: Page) -> None:
        """'Clear completed' deletes completed todos and keeps active ones."""
        _add_todo(spa, "Keep this")
        _add_todo(spa, "Remove this")

        done_item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Remove this")
        _toggle(done_item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        spa.locator(_SEL_CLEAR_BTN).click()
        spa.wait_for_timeout(_NETWORK_SETTLE_MS)

        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(1)
        expect(
            spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").first
        ).to_have_text("Keep this")

    def test_clear_completed_hides_button_afterwards(self, spa: Page) -> None:
        """After clearing, the button hides because no completed todos remain."""
        _add_todo(spa, "Task")
        item = spa.locator(_SEL_TODO_ITEM).first
        _toggle(item)
        spa.locator(f"{_SEL_TODO_ITEM}.{_CLASS_COMPLETED}").wait_for()

        spa.locator(_SEL_CLEAR_BTN).click()
        spa.wait_for_timeout(_NETWORK_SETTLE_MS)

        expect(spa.locator(_SEL_CLEAR_BTN)).not_to_be_visible()


# ---------------------------------------------------------------------------
# Failure modes — API error handling
# ---------------------------------------------------------------------------


class TestFailureModes:
    """Spec: optimistic updates with rollback on API error."""

    def test_api_500_on_create_shows_error_and_preserves_input(
        self, spa: Page, live_server: _ServerHandle
    ) -> None:
        """When POST /api/todos returns 500: error shown, input not cleared."""
        # Intercept the POST to simulate a server error.
        # Pattern "**/api/todos" matches the list endpoint URL exactly
        # (no trailing path segment), so individual-todo PATCHes are unaffected.
        spa.route(
            "**/api/todos",
            lambda route: (
                route.fulfill(
                    status=500,
                    content_type="application/json",
                    body='{"error":"INTERNAL_ERROR","message":"Database is down"}',
                )
                if route.request.method == "POST"
                else route.continue_()
            ),
        )

        inp = spa.locator(_SEL_NEW_TODO)
        inp.fill("Should not be created")
        inp.press("Enter")

        # Error banner must appear.
        spa.locator(_SEL_ERROR_BANNER).wait_for()

        # Input must retain its value (not cleared on error).
        expect(inp).to_have_value("Should not be created")
        # No todo item created.
        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(0)

    def test_api_500_on_toggle_reverts_checkbox(
        self, spa: Page, live_server: _ServerHandle
    ) -> None:
        """When PATCH returns 500 on toggle, checkbox reverts to prior state."""
        _add_todo(spa, "Toggle me")

        item = spa.locator(_SEL_TODO_ITEM).filter(has_text="Toggle me")

        # Intercept the PATCH to return 500.
        spa.route(
            "**/api/todos/**",
            lambda route: (
                route.fulfill(
                    status=500,
                    content_type="application/json",
                    body='{"error":"INTERNAL_ERROR","message":"Oops"}',
                )
                if route.request.method == "PATCH"
                else route.continue_()
            ),
        )

        _toggle(item)

        # Wait for the error to surface.
        spa.locator(_SEL_ERROR_BANNER).wait_for()

        # The item should have reverted (not completed).
        expect(item).not_to_have_class(re.compile(_CLASS_COMPLETED))

    def test_offline_shows_error_and_preserves_loaded_list(
        self, spa: Page
    ) -> None:
        """Spec: when the network is offline, pending actions surface an error
        and the previously loaded list remains visible.

        Playwright's ``context.set_offline(True)`` simulates a fully offline
        browser; all outbound TCP connections (including to localhost) are
        blocked.  ``apiFetch`` catches the resulting network error and returns
        a synthetic 503 response so the SPA's existing error-display path
        fires without the UI state being cleared.
        """
        # Load a todo while online so the list is populated.
        _add_todo(spa, "Pre-loaded task")
        expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(1)

        # Simulate the browser going offline.
        spa.context.set_offline(True)
        try:
            inp = spa.locator(_SEL_NEW_TODO)
            inp.fill("Offline task")
            inp.press("Enter")

            # An error banner must appear (non-blocking inline message).
            spa.locator(_SEL_ERROR_BANNER).wait_for()

            # The input is NOT cleared — the user can retry.
            expect(inp).to_have_value("Offline task")

            # The previously loaded list is still fully visible.
            expect(spa.locator(_SEL_TODO_ITEM)).to_have_count(1)
            expect(
                spa.locator(f"{_SEL_TODO_ITEM} {_SEL_TODO_TITLE}").first
            ).to_have_text("Pre-loaded task")
        finally:
            # Always restore connectivity so subsequent tests are not affected.
            spa.context.set_offline(False)


# ---------------------------------------------------------------------------
# Empty state
# ---------------------------------------------------------------------------


class TestEmptyState:
    """Spec: empty-state message when the filtered list is empty."""

    def test_no_message_when_empty_and_all_filter(self, spa: Page) -> None:
        """With no todos and the 'all' filter, no empty-state shown (no footer)."""
        # When there are zero todos the footer itself is hidden.
        expect(spa.locator(_SEL_FOOTER)).not_to_be_visible()

    def test_empty_state_shown_when_filter_yields_no_results(
        self, spa: Page
    ) -> None:
        """A contextual empty-state message appears when the filter has no matches."""
        _add_todo(spa, "Active task")

        # Switch to Completed filter — no completed todos.
        spa.locator(_FILTER_COMPLETED).click()
        spa.wait_for_timeout(100)

        expect(spa.locator(".empty-state")).to_be_visible()
