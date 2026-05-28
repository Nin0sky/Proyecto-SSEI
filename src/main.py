from dataclasses import asdict
from sqlite3 import IntegrityError

from fastapi import FastAPI, HTTPException

from src.application.use_cases import RequirementService, TraceabilityService, UseCaseService
from src.infrastructure.db import init_db
from src.infrastructure.repositories import RequirementRepository, TraceabilityRepository, UseCaseRepository
from src.interfaces.schemas import (
    RequirementCreate,
    RequirementRead,
    RequirementStatusUpdate,
    TraceabilityRead,
    UseCaseCreate,
    UseCaseRead,
)


app = FastAPI(title="Proyecto SSEI API", version="0.1.0")
requirement_repository = RequirementRepository()
use_case_repository = UseCaseRepository()
traceability_repository = TraceabilityRepository(
    requirement_repository=requirement_repository,
    use_case_repository=use_case_repository,
)

requirement_service = RequirementService(repository=requirement_repository)
use_case_service = UseCaseService(repository=use_case_repository)
traceability_service = TraceabilityService(repository=traceability_repository)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/requirements", response_model=list[RequirementRead])
def list_requirements() -> list[RequirementRead]:
    return [RequirementRead(**asdict(item)) for item in requirement_service.list_requirements()]


@app.post("/requirements", response_model=RequirementRead, status_code=201)
def create_requirement(payload: RequirementCreate) -> RequirementRead:
    requirement = requirement_service.create_requirement(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
    )
    return RequirementRead(**asdict(requirement))


@app.patch("/requirements/{requirement_id}/status", response_model=RequirementRead)
def update_requirement_status(requirement_id: int, payload: RequirementStatusUpdate) -> RequirementRead:
    requirement = requirement_service.update_requirement_status(requirement_id=requirement_id, status=payload.status)
    if requirement is None:
        raise HTTPException(status_code=404, detail="Requirement not found")

    return RequirementRead(**asdict(requirement))


@app.get("/use-cases", response_model=list[UseCaseRead])
def list_use_cases() -> list[UseCaseRead]:
    return [UseCaseRead(**asdict(item)) for item in use_case_service.list_use_cases()]


@app.post("/use-cases", response_model=UseCaseRead, status_code=201)
def create_use_case(payload: UseCaseCreate) -> UseCaseRead:
    try:
        use_case = use_case_service.create_use_case(
            code=payload.code,
            name=payload.name,
            description=payload.description,
        )
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Use case code already exists") from exc

    return UseCaseRead(**asdict(use_case))


@app.get("/traceability", response_model=list[TraceabilityRead])
def list_traceability() -> list[TraceabilityRead]:
    return [TraceabilityRead(**asdict(item)) for item in traceability_service.list_traces()]


@app.get("/requirements/{requirement_id}/use-cases", response_model=list[UseCaseRead])
def list_use_cases_by_requirement(requirement_id: int) -> list[UseCaseRead]:
    use_cases = traceability_service.list_use_cases_for_requirement(requirement_id=requirement_id)
    if use_cases is None:
        raise HTTPException(status_code=404, detail="Requirement not found")

    return [UseCaseRead(**asdict(item)) for item in use_cases]


@app.post(
    "/requirements/{requirement_id}/use-cases/{use_case_id}",
    response_model=TraceabilityRead,
    status_code=201,
)
def link_requirement_use_case(requirement_id: int, use_case_id: int) -> TraceabilityRead:
    try:
        trace = traceability_service.link_requirement_to_use_case(
            requirement_id=requirement_id,
            use_case_id=use_case_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Traceability link already exists") from exc

    if trace is None:
        raise HTTPException(status_code=404, detail="Requirement or use case not found")

    return TraceabilityRead(**asdict(trace))
