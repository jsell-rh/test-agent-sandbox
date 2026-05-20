"""Repository interface for the Todo bounded context.

The domain *owns* this contract.  Infrastructure implements it.
No concrete storage logic lives here — only the abstract interface that the
Application Layer depends on.

Method names follow the Ubiquitous Language (snake_case Python rendering):
  find_by_id  → findById
  find_all    → findAll
  save        → save
  delete      → delete
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from todo.domain.todo import Todo
from todo.domain.value_objects import TodoId


class TodoRepository(ABC):
    """Abstract contract for Todo persistence.

    Implementations decide how Todos are stored (in-memory, SQLite, etc.).
    The domain never imports from infrastructure; only from this interface.
    """

    @abstractmethod
    def find_by_id(self, id: TodoId) -> Optional[Todo]:
        """Return the ``Todo`` with the given ``id``, or ``None`` if absent."""

    @abstractmethod
    def find_all(self) -> list[Todo]:
        """Return all persisted Todos (order unspecified)."""

    @abstractmethod
    def save(self, todo: Todo) -> None:
        """Persist ``todo`` (insert if new, update if existing)."""

    @abstractmethod
    def delete(self, id: TodoId) -> None:
        """Permanently remove the Todo identified by ``id``.

        Raises:
            TodoNotFoundError: if no Todo with ``id`` exists.
        """
