from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.database import Base


class RequirementDB(Base):
    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(140), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

class RegionDB(Base):
    __tablename__ = "regiones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

class UseCaseDB(Base):
    __tablename__ = "use_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class RequirementUseCaseTraceDB(Base):
    __tablename__ = "requirement_use_case_traces"

    requirement_id: Mapped[int] = mapped_column(
        ForeignKey("requirements.id", ondelete="CASCADE"),
        primary_key=True,
    )
    use_case_id: Mapped[int] = mapped_column(
        ForeignKey("use_cases.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class UserDB(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    audit_logs: Mapped[list["AuditLogDB"]] = relationship(back_populates="user")


class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True)

    user: Mapped[UserDB] = relationship(back_populates="audit_logs")


class OtDB(Base):
    __tablename__ = "ots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    banco: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    estado: Mapped[str] = mapped_column(String(50), nullable=False, default="asignada")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    hora_programada: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    region: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    comuna: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    direccion: Mapped[str] = mapped_column(Text, nullable=False, default="")
    nombre_tecnico: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    nombre_etv: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    nombre_alarma: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    origen_servidor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    creado_por_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    tecnico_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    modificado_por_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    atms: Mapped[list["OtAtmDB"]] = relationship(back_populates="ot", cascade="all, delete-orphan")


class OtAtmDB(Base):
    __tablename__ = "ot_atms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ot_id: Mapped[int] = mapped_column(ForeignKey("ots.id", ondelete="CASCADE"), nullable=False)
    etiqueta: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    tipo_servicio: Mapped[str] = mapped_column(String(60), nullable=False, default="instalacion")
    numero_atm: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    serie_cajero: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    serie_mmbb: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    detalles_servicio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    observaciones: Mapped[str] = mapped_column(Text, nullable=False, default="")

    ot: Mapped[OtDB] = relationship(back_populates="atms")
    
    
class DocumentoDB(Base):
    __tablename__ = "biblioteca_documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_sistema: Mapped[str] = mapped_column(String(255), nullable=False)
    peso_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mimetype: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # METADATA DE NEGOCIO (Filtros del visualizador interactivo)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False, default="otros")
    banco: Mapped[str | None] = mapped_column(String(100), nullable=True)
    numero_atm: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # AUDITORÍA Y SEGURIDAD
    subido_por_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    
    # PAPELERA DE RECICLAJE (Soft delete de 30 días)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    deleted_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)