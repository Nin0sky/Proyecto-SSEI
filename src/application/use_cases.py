from src.domain.models import Requirement, RequirementUseCaseTrace, UseCase
from src.infrastructure.repositories import RequirementRepository, TraceabilityRepository, UseCaseRepository


class RequirementService:
    def __init__(self, repository: RequirementRepository):
        self.repository = repository

    def list_requirements(self) -> list[Requirement]:
        return list(self.repository.list_all())

    def create_requirement(self, title: str, description: str, priority: str) -> Requirement:
        return self.repository.create(title=title, description=description, priority=priority)

    def update_requirement_status(self, requirement_id: int, status: str) -> Requirement | None:
        return self.repository.update_status(requirement_id=requirement_id, status=status)


class UseCaseService:
    def __init__(self, repository: UseCaseRepository):
        self.repository = repository

    def list_use_cases(self) -> list[UseCase]:
        return list(self.repository.list_all())

    def create_use_case(self, code: str, name: str, description: str) -> UseCase:
        return self.repository.create(code=code, name=name, description=description)


class TraceabilityService:
    def __init__(self, repository: TraceabilityRepository):
        self.repository = repository

    def list_traces(self) -> list[RequirementUseCaseTrace]:
        return list(self.repository.list_all())

    def list_use_cases_for_requirement(self, requirement_id: int) -> list[UseCase] | None:
        if self.repository.requirement_repository.get_by_id(requirement_id) is None:
            return None

        return list(self.repository.list_use_cases_by_requirement(requirement_id=requirement_id))

    def link_requirement_to_use_case(
        self,
        requirement_id: int,
        use_case_id: int,
    ) -> RequirementUseCaseTrace | None:
        return self.repository.link(requirement_id=requirement_id, use_case_id=use_case_id)
