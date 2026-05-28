from datetime import UTC, datetime
from typing import Iterable

from src.domain.models import Requirement, RequirementUseCaseTrace, UseCase
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
        created_at = datetime.now(UTC).isoformat()
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


class UseCaseRepository:
    def list_all(self) -> Iterable[UseCase]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, code, name, description, created_at
                FROM use_cases
                ORDER BY id DESC
                """
            ).fetchall()

        return [self._row_to_entity(row) for row in rows]

    def create(self, code: str, name: str, description: str) -> UseCase:
        created_at = datetime.now(UTC).isoformat()
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO use_cases (code, name, description, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (code, name, description, created_at),
            )
            use_case_id = cursor.lastrowid
            connection.commit()

        return self.get_by_id(use_case_id)

    def get_by_id(self, use_case_id: int) -> UseCase | None:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, code, name, description, created_at
                FROM use_cases
                WHERE id = ?
                """,
                (use_case_id,),
            ).fetchone()

        if row is None:
            return None

        return self._row_to_entity(row)

    @staticmethod
    def _row_to_entity(row) -> UseCase:
        return UseCase(
            id=row["id"],
            code=row["code"],
            name=row["name"],
            description=row["description"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )


class TraceabilityRepository:
    def __init__(self, requirement_repository: RequirementRepository, use_case_repository: UseCaseRepository):
        self.requirement_repository = requirement_repository
        self.use_case_repository = use_case_repository

    def list_all(self) -> Iterable[RequirementUseCaseTrace]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT requirement_id, use_case_id, created_at
                FROM requirement_use_case_traces
                ORDER BY created_at DESC
                """
            ).fetchall()

        return [self._row_to_entity(row) for row in rows]

    def list_use_cases_by_requirement(self, requirement_id: int) -> Iterable[UseCase]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT uc.id, uc.code, uc.name, uc.description, uc.created_at
                FROM use_cases uc
                JOIN requirement_use_case_traces t ON t.use_case_id = uc.id
                WHERE t.requirement_id = ?
                ORDER BY uc.id DESC
                """,
                (requirement_id,),
            ).fetchall()

        return [UseCaseRepository._row_to_entity(row) for row in rows]

    def link(self, requirement_id: int, use_case_id: int) -> RequirementUseCaseTrace | None:
        if self.requirement_repository.get_by_id(requirement_id) is None:
            return None

        if self.use_case_repository.get_by_id(use_case_id) is None:
            return None

        if self.get_by_ids(requirement_id=requirement_id, use_case_id=use_case_id) is not None:
            raise ValueError("Link already exists")

        created_at = datetime.now(UTC).isoformat()
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO requirement_use_case_traces (requirement_id, use_case_id, created_at)
                VALUES (?, ?, ?)
                """,
                (requirement_id, use_case_id, created_at),
            )
            connection.commit()

        return self.get_by_ids(requirement_id=requirement_id, use_case_id=use_case_id)

    def get_by_ids(self, requirement_id: int, use_case_id: int) -> RequirementUseCaseTrace | None:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT requirement_id, use_case_id, created_at
                FROM requirement_use_case_traces
                WHERE requirement_id = ? AND use_case_id = ?
                """,
                (requirement_id, use_case_id),
            ).fetchone()

        if row is None:
            return None

        return self._row_to_entity(row)

    @staticmethod
    def _row_to_entity(row) -> RequirementUseCaseTrace:
        return RequirementUseCaseTrace(
            requirement_id=row["requirement_id"],
            use_case_id=row["use_case_id"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )
