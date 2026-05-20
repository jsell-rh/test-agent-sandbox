"""Repository interface (contract) for the Todo domain.

The Domain owns this interface.  Infrastructure implements it.  The
Application Layer depends only on this contract, never on a concrete class.
"""

from __future__ import annotations

from typing import Protocol, TypedDict, runtime_checkable

from todo.domain.value_objects import FilterCriteria, TodoId

# Imported here to avoid circular-import issues; ``Todo`` is a forward ref.
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from todo.domain.todo import Todo


class TodoCounts(TypedDict):
    """Count of todos broken down by status."""

    all: int
    active: int
    completed: int


@runtime_checkable
class TodoRepository(Protocol):
    """Contract that all Todo repository implementations must satisfy.

    The Application Layer uses this protocol; the Infrastructure provides a
    concrete implementation (e.g. ``SQLiteTodoRepository``).
    """

    def find_by_id(self, id: TodoId) -> "Todo | None":
        """Return the Todo with the given id, or ``None`` if not found."""
        ...

    def find_all(self, filter: FilterCriteria = FilterCriteria.ALL) -> "list[Todo]":
        """Return todos matching *filter*, ordered by ``createdAt`` descending."""
        ...

    def save(self, todo: "Todo") -> None:
        """Persist *todo* (insert or update)."""
        ...

    def delete(self, id: TodoId) -> None:
        """Permanently remove the Todo identified by *id*.

        Raises:
            TodoNotFoundError: If no Todo with the given *id* exists.
        """
        ...

    def counts(self) -> TodoCounts:
        """Return aggregate counts: total, active, and completed todos."""
        ...
