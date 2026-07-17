from dataclasses import asdict

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from src.application.use_cases import OtService, RequirementService, TraceabilityService, UseCaseService
from src.infrastructure.db import init_admin_db, init_db
from src.infrastructure.repositories import (
    AuditLogRepository,
    OtAtmRepository,
    OtRepository,
    RequirementRepository,
    TraceabilityRepository,
    UseCaseRepository,
    UserRepository,
)
from src.interfaces.schemas import (
    AuditLogCreate,
    AuditLogRead,
    OtCreate,
    OtEstadoUpdate,
    OtRead,
    OtUpdate,
    RequirementCreate,
    RequirementRead,
    RequirementStatusUpdate,
    TraceabilityRead,
    UseCaseCreate,
    UseCaseRead,
    UserCreate,
    UserRead,
)


app = FastAPI(title="SSEI API", version="0.3.0")

# CORS permite conexiones desde app mobile y panel admin durante desarrollo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

requirement_repository = RequirementRepository()
use_case_repository = UseCaseRepository()
traceability_repository = TraceabilityRepository(
    requirement_repository=requirement_repository,
    use_case_repository=use_case_repository,
)
ot_repository = OtRepository()
ot_atm_repository = OtAtmRepository()
user_repository = UserRepository()
audit_log_repository = AuditLogRepository()

requirement_service = RequirementService(repository=requirement_repository)
use_case_service = UseCaseService(repository=use_case_repository)
traceability_service = TraceabilityService(repository=traceability_repository)
ot_service = OtService(ot_repo=ot_repository, atm_repo=ot_atm_repository)


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    init_admin_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Requirements
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# OTs - Mobile
# ---------------------------------------------------------------------------

def _ot_to_read(ot) -> OtRead:
    return OtRead(
        id=ot.id,
        cliente=ot.cliente,
        estado=ot.estado,
        fecha_creacion=ot.fecha_creacion,
        comuna=ot.comuna,
        direccion=ot.direccion,
        nombre_tecnico=ot.nombre_tecnico,
        nombre_etv=ot.nombre_etv,
        nombre_alarma=ot.nombre_alarma,
        origen_servidor=ot.origen_servidor,
        atms=[
            {
                "id": a.id,
                "ot_id": a.ot_id,
                "etiqueta": a.etiqueta,
                "tipo_servicio": a.tipo_servicio,
                "numero_atm": a.numero_atm,
                "serie_cajero": a.serie_cajero,
                "serie_mmbb": a.serie_mmbb,
                "detalles_servicio": a.detalles_servicio,
                "observaciones": a.observaciones,
            }
            for a in ot.atms
        ],
    )


@app.get("/ots", response_model=list[OtRead])
def list_ots(estado: str | None = Query(default=None)) -> list[OtRead]:
    return [_ot_to_read(ot) for ot in ot_service.list_ots(estado=estado)]


@app.post("/ots", response_model=OtRead, status_code=201)
def create_ot(payload: OtCreate) -> OtRead:
    ot = ot_service.create_ot(
        cliente=payload.cliente,
        comuna=payload.comuna,
        direccion=payload.direccion,
        nombre_tecnico=payload.nombre_tecnico,
        nombre_etv=payload.nombre_etv,
        nombre_alarma=payload.nombre_alarma,
        atms=[a.model_dump() for a in payload.atms],
    )
    return _ot_to_read(ot)


@app.get("/ots/{ot_id}", response_model=OtRead)
def get_ot(ot_id: int) -> OtRead:
    ot = ot_service.get_ot(ot_id)
    if ot is None:
        raise HTTPException(status_code=404, detail="OT no encontrada")
    return _ot_to_read(ot)


@app.put("/ots/{ot_id}", response_model=OtRead)
def update_ot(ot_id: int, payload: OtUpdate) -> OtRead:
    ot = ot_service.update_ot(
        ot_id=ot_id,
        cliente=payload.cliente,
        comuna=payload.comuna,
        direccion=payload.direccion,
        nombre_tecnico=payload.nombre_tecnico,
        nombre_etv=payload.nombre_etv,
        nombre_alarma=payload.nombre_alarma,
        atms=[a.model_dump() for a in payload.atms],
    )
    if ot is None:
        raise HTTPException(status_code=404, detail="OT no encontrada")
    return _ot_to_read(ot)


@app.patch("/ots/{ot_id}/estado", response_model=OtRead)
def update_ot_estado(ot_id: int, payload: OtEstadoUpdate) -> OtRead:
    ot = ot_service.update_estado(ot_id=ot_id, estado=payload.estado)
    if ot is None:
        raise HTTPException(status_code=404, detail="OT no encontrada")
    return _ot_to_read(ot)


@app.delete("/ots/{ot_id}", status_code=204)
def delete_ot(ot_id: int) -> None:
    if not ot_service.delete_ot(ot_id):
        raise HTTPException(status_code=404, detail="OT no encontrada")


# ---------------------------------------------------------------------------
# Admin foundations: users and audit logs
# ---------------------------------------------------------------------------

@app.get("/admin/users", response_model=list[UserRead])
def list_users() -> list[UserRead]:
    users = user_repository.list_all()
    return [
        UserRead(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )
        for user in users
    ]


@app.post("/admin/users", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate) -> UserRead:
    try:
        user = user_repository.create(
            email=payload.email,
            hashed_password=payload.hashed_password,
            full_name=payload.full_name,
            role=payload.role,
            is_active=payload.is_active,
        )
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="User email already exists") from exc

    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@app.get("/admin/audit-logs", response_model=list[AuditLogRead])
def list_audit_logs() -> list[AuditLogRead]:
    logs = audit_log_repository.list_all()
    return [AuditLogRead(**asdict(log)) for log in logs]


@app.post("/admin/audit-logs", response_model=AuditLogRead, status_code=201)
def create_audit_log(payload: AuditLogCreate) -> AuditLogRead:
    log = audit_log_repository.create(
        user_id=payload.user_id,
        action=payload.action,
        details=payload.details,
    )
    return AuditLogRead(**asdict(log))
