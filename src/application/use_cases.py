from src.domain.models import Requirement
from src.infrastructure.repositories import RequirementRepository


class RequirementService:
    def __init__(self, repository: RequirementRepository):
        self.repository = repository

    def list_requirements(self) -> list[Requirement]:
        return list(self.repository.list_all())

    def create_requirement(self, title: str, description: str, priority: str) -> Requirement:
        return self.repository.create(title=title, description=description, priority=priority)

    def update_requirement_status(self, requirement_id: int, status: str) -> Requirement | None:
        return self.repository.update_status(requirement_id=requirement_id, status=status)
