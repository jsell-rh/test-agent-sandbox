"""TodoRepository interface — owned by the Domain, implemented by Infrastructure."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from todo.domain.value_objects import FilterCriteria, TodoId
from todo.domain.todo import Todo


class TodoRepository(ABC):
    """
    Contract for Todo persistence.

    The Domain owns this interface. Infrastructure implements it.
    No Domain or Application Layer code knows about SQLite, file paths, or
    any persistence mechanism.
    """

    @abstractmethod
    def find_by_id(self, id: TodoId) -> Optional[Todo]:
        """
        Return the Todo with the given id, or None if not found.

        The Application Layer is responsible for converting None -> TodoNotFoundError.
        """

    @abstractmethod
    def find_all(self, criteria: FilterCriteria = FilterCriteria.ALL) -> list[Todo]:
        """
        Return todos ordered by created_at descending.

        Args:
            criteria: Restrict results to 'active', 'completed', or 'all' (default).
        """

    @abstractmethod
    def save(self, todo: Todo) -> None:
        """
        Persist a Todo (insert or update).

        created_at is never overwritten on update.
        """

    @abstractmethod
    def delete(self, id: TodoId) -> None:
        """
        Permanently remove a Todo.

        Silently succeeds when the id does not exist.
        """

    @abstractmethod
    def counts(self) -> dict[str, int]:
        """
        Return aggregate counts in a single query.

        Returns:
            A dict with keys 'all', 'active', 'completed'.
        """
