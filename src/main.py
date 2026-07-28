from dataclasses import asdict
from hashlib import pbkdf2_hmac
from secrets import token_hex

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

#IMPORTACIONES DE SEGURIDAD
from src.infrastructure.security import verificar_password, crear_access_token, obtener_usuario_actual, verificar_rol
from src.interfaces.schemas import LoginRequest, TokenResponse
#############################33

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
    RegionRepository,
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
    RegionRead,
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
region_repository = RegionRepository()
requirement_service = RequirementService(repository=requirement_repository)
use_case_service = UseCaseService(repository=use_case_repository)
traceability_service = TraceabilityService(repository=traceability_repository)
ot_service = OtService(ot_repo=ot_repository, atm_repo=ot_atm_repository)


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    init_admin_db()
    seed_tecnicos()


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
        banco=ot.banco,
        estado=ot.estado,
        fecha_creacion=ot.fecha_creacion,
        hora_programada=ot.hora_programada,
        region=ot.region, 
        comuna=ot.comuna,
        direccion=ot.direccion,
        tecnico_id=ot.tecnico_id,
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

#-------Se aplica el decorador Depends para requerir un login válido (cualquier rol) antes de acceder a la lista de OTs. Esto asegura que solo los usuarios autenticados puedan ver las OTs, independientemente de su rol.
@app.get("/ots", response_model=list[OtRead])
def list_ots(
    estado: str | None = Query(default=None),
    token_data: dict = Depends(obtener_usuario_actual)  # Requiere login válido (cualquier rol)
) -> list[OtRead]:
    return [_ot_to_read(ot) for ot in ot_service.list_ots(estado=estado)]


@app.post("/ots", response_model=OtRead, status_code=201)
def create_ot(
    payload: OtCreate,
    token_data: dict = Depends(verificar_rol(["admin", "coordinador"]))  # Solo Admin o Coordinador
) -> OtRead:
    ot = ot_service.create_ot(
        banco=payload.banco,
        region=payload.region,
        comuna=payload.comuna,
        direccion=payload.direccion,
        hora_programada=payload.hora_programada,
        tecnico_id=payload.tecnico_id,
        nombre_tecnico=payload.nombre_tecnico,
        nombre_etv=payload.nombre_etv,
        nombre_alarma=payload.nombre_alarma,
        atms=[a.model_dump() for a in payload.atms],
    )
    return _ot_to_read(ot)


@app.get("/ots/{ot_id}", response_model=OtRead)
def get_ot(
    ot_id: int,
    token_data: dict = Depends(obtener_usuario_actual)  # Requiere login válido
) -> OtRead:
    ot = ot_service.get_ot(ot_id)
    if ot is None:
        raise HTTPException(status_code=404, detail="OT no encontrada")
    return _ot_to_read(ot)



@app.put("/ots/{ot_id}", response_model=OtRead)
def update_ot(
    ot_id: int,
    payload: OtUpdate,
    token_data: dict = Depends(verificar_rol(["admin", "coordinador"]))  # Solo Admin o Coordinador
) -> OtRead:
    ot = ot_service.update_ot(
        ot_id=ot_id,
        banco=payload.banco,
        region=payload.region,
        comuna=payload.comuna,
        direccion=payload.direccion,
        hora_programada=payload.hora_programada,
        tecnico_id=payload.tecnico_id,
        nombre_tecnico=payload.nombre_tecnico,
        nombre_etv=payload.nombre_etv,
        nombre_alarma=payload.nombre_alarma,
        atms=[a.model_dump() for a in payload.atms] if payload.atms is not None else None,
    )
    if ot is None:
        raise HTTPException(status_code=404, detail="OT no encontrada")
    return _ot_to_read(ot)


@app.patch("/ots/{ot_id}/estado", response_model=OtRead)
def update_ot_estado(
    ot_id: int,
    payload: OtEstadoUpdate,
    token_data: dict = Depends(verificar_rol(["admin", "coordinador"]))  # Solo Admin o Coordinador
) -> OtRead:
    ot = ot_service.update_estado(ot_id=ot_id, estado=payload.estado)
    if ot is None:
        raise HTTPException(status_code=404, detail="OT no encontrada")
    return _ot_to_read(ot)


@app.delete("/ots/{ot_id}", status_code=204)
def delete_ot(
    ot_id: int,
    token_data: dict = Depends(verificar_rol(["admin", "coordinador"]))  # Solo Admin o Coordinador
) -> None:
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
    salt = token_hex(16)
    password_hash = pbkdf2_hmac("sha256", payload.password.encode("utf-8"), bytes.fromhex(salt), 390000).hex()
    stored_hash = f"pbkdf2_sha256${salt}${password_hash}"
    try:
        user = user_repository.create(
            email=payload.email,
            hashed_password=stored_hash,
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
# ---------------------------------------------------------------------------
# Autenticación Endpoints
# ---------------------------------------------------------------------------

@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    # 1. Buscar al usuario en la base de datos por email
    user = user_repository.get_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # 2. Validar que la cuenta esté activa para iniciar sesión
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado. Contacte al administrador.")

    # 3. Validar coincidencia de la contraseña plana contra el Hash PBKDF2
    is_valid = verificar_password(payload.password, user.hashed_password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # 4. Generar Claims para el Payload JWT
    token_payload = {
        "sub": user.email,
        "id": user.id,
        "name": user.full_name,
        "role": user.role
    }

    # 5. Firmar JWT
    token = crear_access_token(data=token_payload)

    # 6. Preparar lectura de los datos públicos del usuario
    user_read_data = UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_read_data
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

def seed_tecnicos() -> None:
    """Registra técnicos por defecto en la base de datos si no existen."""
    tecnicos_por_defecto = [
        {"email": "rodolfo@ssei.cl", "full_name": "Rodolfo Carreño", "role": "tecnico"},
        {"email": "juan@ssei.cl", "full_name": "Juan Albornoz", "role": "tecnico"},
        {"email": "pedro@ssei.cl", "full_name": "Pedro Berrios", "role": "tecnico"},
    ]
    
    for tec in tecnicos_por_defecto:
        try:
            # Generamos una contraseña por defecto (ej: 'password123') usando el mismo hash del backend
            salt = token_hex(16)
            password_hash = pbkdf2_hmac("sha256", "password123".encode("utf-8"), bytes.fromhex(salt), 390000).hex()
            stored_hash = f"pbkdf2_sha256${salt}${password_hash}"
            
            user_repository.create(
                email=tec["email"],
                hashed_password=stored_hash,
                full_name=tec["full_name"],
                role=tec["role"],
                is_active=True
            )
            print(f"Técnico registrado exitosamente: {tec['full_name']}")
        except IntegrityError:
            # Si el correo ya existe, SQLite capturará la violación de la restricción UNIQUE y continuará
            pass

def seed_regiones() -> None:
    if region_repository.count() == 0:
        regiones_chile = [
            'Región de Arica y Parinacota',
            'Región de Tarapacá',
            'Región de Antofagasta',
            'Región de Atacama',
            'Región de Coquimbo',
            'Región de Valparaíso',
            'Región Metropolitana',
            'Región de O’Higgins',
            'Región del Maule',
            'Región de Ñuble',
            'Región del Biobío',
            'Región de La Araucanía',
            'Región de Los Ríos',
            'Región de Los Lagos',
            'Región de Aysén',
            'Región de Magallanes'
        ]
        region_repository.bulk_create(regiones_chile)

@app.on_event("startup")
def startup_event() -> None:
    init_db()
    init_admin_db()
    seed_tecnicos()
    seed_regiones()  # <-- Añadir esta llamada
    
@app.get("/regiones", response_model=list[RegionRead])
def list_regiones() -> list[RegionRead]:
    return [RegionRead(id=r.id, nombre=r.nombre) for r in region_repository.list_all()]