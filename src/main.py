from fastapi import FastAPI, HTTPException

from src.application.use_cases import RequirementService
from src.infrastructure.db import init_db
from src.infrastructure.repositories import RequirementRepository
from src.interfaces.schemas import RequirementCreate, RequirementRead, RequirementStatusUpdate


app = FastAPI(title="Proyecto SSEI API", version="0.1.0")
service = RequirementService(repository=RequirementRepository())


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/requirements", response_model=list[RequirementRead])
def list_requirements() -> list[RequirementRead]:
    return [RequirementRead(**item.__dict__) for item in service.list_requirements()]


@app.post("/requirements", response_model=RequirementRead, status_code=201)
def create_requirement(payload: RequirementCreate) -> RequirementRead:
    requirement = service.create_requirement(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
    )
    return RequirementRead(**requirement.__dict__)


@app.patch("/requirements/{requirement_id}/status", response_model=RequirementRead)
def update_requirement_status(requirement_id: int, payload: RequirementStatusUpdate) -> RequirementRead:
    requirement = service.update_requirement_status(requirement_id=requirement_id, status=payload.status)
    if requirement is None:
        raise HTTPException(status_code=404, detail="Requirement not found")

    return RequirementRead(**requirement.__dict__)
