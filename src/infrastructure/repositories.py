from datetime import datetime
from typing import Iterable

from src.domain.models import Requirement
from src.infrastructure.db import get_connection


class RequirementRepository:
    def list_all(self) -> Iterable[Requirement]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, title, description, priority, status, created_at
                FROM requirements
                ORDER BY id DESC
                """
            ).fetchall()

        return [self._row_to_entity(row) for row in rows]

    def create(self, title: str, description: str, priority: str) -> Requirement:
        created_at = datetime.utcnow().isoformat()
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO requirements (title, description, priority, status, created_at)
                VALUES (?, ?, ?, 'pendiente', ?)
                """,
                (title, description, priority, created_at),
            )
            requirement_id = cursor.lastrowid
            connection.commit()

        return self.get_by_id(requirement_id)

    def update_status(self, requirement_id: int, status: str) -> Requirement | None:
        with get_connection() as connection:
            connection.execute(
                "UPDATE requirements SET status = ? WHERE id = ?",
                (status, requirement_id),
            )
            connection.commit()

        return self.get_by_id(requirement_id)

    def get_by_id(self, requirement_id: int) -> Requirement | None:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, title, description, priority, status, created_at
                FROM requirements
                WHERE id = ?
                """,
                (requirement_id,),
            ).fetchone()

        if row is None:
            return None

        return self._row_to_entity(row)

    @staticmethod
    def _row_to_entity(row) -> Requirement:
        return Requirement(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            priority=row["priority"],
            status=row["status"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )
