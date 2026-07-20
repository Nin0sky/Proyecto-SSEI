from dataclasses import dataclass, field
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


@dataclass(slots=True)
class OtAtm:
    id: int
    ot_id: int
    etiqueta: str
    tipo_servicio: str
    numero_atm: str
    serie_cajero: str
    serie_mmbb: str
    detalles_servicio: str
    observaciones: str


@dataclass(slots=True)
class Ot:
    id: int
    banco: str
    estado: str          # asignado | en_progreso | pendiente_envio | sincronizado
    fecha_creacion: datetime
    hora_programada: datetime
    comuna: str
    direccion: str
    tecnico_id: int | None
    nombre_tecnico: str
    nombre_etv: str
    nombre_alarma: str
    origen_servidor: bool
    atms: list[OtAtm] = field(default_factory=list)


@dataclass(slots=True)
class User:
    id: int
    email: str
    hashed_password: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


@dataclass(slots=True)
class AuditLog:
    id: int
    user_id: int
    action: str
    details: str
    created_at: datetime
