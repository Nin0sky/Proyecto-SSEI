from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class Requirement:
    id: int
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime


@dataclass(slots=True)
class UseCase:
    id: int
    code: str
    name: str
    description: str
    created_at: datetime


@dataclass(slots=True)
class RequirementUseCaseTrace:
    requirement_id: int
    use_case_id: int
    created_at: datetime
