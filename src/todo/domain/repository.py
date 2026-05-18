"""TodoRepository interface — owned by the Domain, implemented by Infrastructure.

The Domain defines this contract. No Domain or Application Layer code knows
about any concrete storage technology.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from todo.domain.value_objects import FilterCriteria, TodoId
from todo.domain.todo import Todo


class TodoRepository(ABC):
    """
    Contract for Todo persistence.

    Implementations live in the Infrastructure layer (e.g. SqliteTodoRepository).
    This class has no knowledge of SQL, files, or network — only Domain objects.
    """

    @abstractmethod
    def find_by_id(self, id: TodoId) -> Optional[Todo]:
        """
        Return the Todo with the given id, or None if not found.

        The Application Layer converts None -> TodoNotFoundError.
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
        Return aggregate counts without a second query.

        Returns:
            A dict with keys 'all', 'active', 'completed'.
        """
