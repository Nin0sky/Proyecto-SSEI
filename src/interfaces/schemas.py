from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class RequirementCreate(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=3, max_length=1200)
    priority: str = Field(default="media", pattern="^(baja|media|alta)$")


class RequirementRead(BaseModel):
    id: int
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime


class RequirementStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pendiente|en_progreso|completado)$")


class UseCaseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=20, pattern="^[A-Z]{2}-[0-9]{2,3}$")
    name: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=3, max_length=1200)


class UseCaseRead(BaseModel):
    id: int
    code: str
    name: str
    description: str
    created_at: datetime


class TraceabilityRead(BaseModel):
    requirement_id: int
    use_case_id: int
    created_at: datetime


# ---------------------------------------------------------------------------
# OT Schemas
# ---------------------------------------------------------------------------

OtEstado = Literal[
    "creada",
    "asignada",
    "en_progreso",
    "pendiente_envio",
    "sincronizada",
    "cerrada",
    # Compatibilidad temporal con estados antiguos.
    "asignado",
    "sincronizado",
]


class OtAtmCreate(BaseModel):
    etiqueta: str = Field(default="ATM 1", max_length=50)
    tipo_servicio: str = Field(min_length=2, max_length=60)
    numero_atm: str = Field(min_length=1, max_length=20)
    serie_cajero: str = Field(default="", max_length=60)
    serie_mmbb: str = Field(default="", max_length=60)
    detalles_servicio: str = Field(default="", max_length=2000)
    observaciones: str = Field(default="", max_length=1000)


class OtAtmRead(OtAtmCreate):
    id: int
    ot_id: int
    
class RegionRead(BaseModel):
    id: int
    nombre: str


class OtCreate(BaseModel):
    banco: str = Field(min_length=2, max_length=100)
    region: str | None = Field(default=None, max_length=100) 
    comuna: str = Field(default="", max_length=100)
    direccion: str = Field(min_length=3, max_length=200)
    ubicacion: str = Field(default="", max_length=200)
    hora_programada: datetime
    tecnico_id: int = Field(ge=1)
    nombre_tecnico: str = Field(default="", max_length=100)
    nombre_etv: str = Field(default="", max_length=100)
    nombre_alarma: str = Field(default="", max_length=100)
    atms: list[OtAtmCreate] = Field(min_length=1)


class OtUpdate(BaseModel):
    banco: str | None = Field(default=None, min_length=2, max_length=100)
    region: str | None = Field(default=None, max_length=100)
    comuna: str | None = Field(default=None, max_length=100)
    direccion: str | None = Field(default=None, min_length=3, max_length=200)
    hora_programada: datetime | None = None
    tecnico_id: int | None = Field(default=None, ge=1)
    nombre_tecnico: str | None = Field(default=None, max_length=100)
    nombre_etv: str | None = Field(default=None, max_length=100)
    nombre_alarma: str | None = Field(default=None, max_length=100)
    atms: list[OtAtmCreate] | None = None


class OtEstadoUpdate(BaseModel):
    estado: OtEstado


class OtRead(BaseModel):
    id: int
    banco: str
    estado: str
    fecha_creacion: datetime
    hora_programada: datetime
    region: str | None = None 
    comuna: str
    direccion: str
    tecnico_id: int | None = None
    nombre_tecnico: str
    nombre_etv: str
    nombre_alarma: str
    origen_servidor: bool
    atms: list[OtAtmRead] = []


class UserCreate(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=255)
    full_name: str = Field(min_length=3, max_length=150)
    role: str = Field(pattern="^(admin|coordinador|tecnico|externo)$")
    is_active: bool = True


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class AuditLogCreate(BaseModel):
    user_id: int
    action: str = Field(min_length=2, max_length=100)
    details: str = Field(min_length=2, max_length=5000)


class AuditLogRead(BaseModel):
    id: int
    user_id: int
    action: str
    details: str
    created_at: datetime
