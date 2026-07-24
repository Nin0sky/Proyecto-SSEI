from datetime import UTC, datetime
from typing import Iterable

from sqlalchemy.exc import IntegrityError

from src.domain.models import AuditLog, Ot, OtAtm, Requirement, RequirementUseCaseTrace, UseCase, User, Region
from src.infrastructure.database import AdminSessionLocal, MobileSessionLocal
from src.infrastructure.models import (
    AuditLogDB,
    OtAtmDB,
    OtDB,
    RequirementDB,
    RequirementUseCaseTraceDB,
    UseCaseDB,
    UserDB,
    RegionDB,
)


class RequirementRepository:
    def list_all(self) -> Iterable[Requirement]:
        with MobileSessionLocal() as session:
            rows = session.query(RequirementDB).order_by(RequirementDB.id.desc()).all()
            return [self._row_to_entity(row) for row in rows]

    def create(self, title: str, description: str, priority: str) -> Requirement:
        with MobileSessionLocal() as session:
            item = RequirementDB(
                title=title,
                description=description,
                priority=priority,
                status="pendiente",
                created_at=datetime.now(UTC),
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def update_status(self, requirement_id: int, status: str) -> Requirement | None:
        with MobileSessionLocal() as session:
            item = session.get(RequirementDB, requirement_id)
            if item is None:
                return None

            item.status = status
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def get_by_id(self, user_id: int) -> User | None:
        with self._session_factory()() as session:
            row = session.get(UserDB, user_id)
            return self._row_to_entity(row) if row else None

    @staticmethod
    def _row_to_entity(row: RequirementDB) -> Requirement:
        return Requirement(
            id=row.id,
            title=row.title,
            description=row.description,
            priority=row.priority,
            status=row.status,
            created_at=row.created_at,
        )


class UseCaseRepository:
    def list_all(self) -> Iterable[UseCase]:
        with MobileSessionLocal() as session:
            rows = session.query(UseCaseDB).order_by(UseCaseDB.id.desc()).all()
            return [self._row_to_entity(row) for row in rows]
        
    def get_by_id(self, use_case_id: int) -> UseCase | None:
        with MobileSessionLocal() as session:
            row = session.get(UseCaseDB, use_case_id)
            return self._row_to_entity(row) if row else None

    def create(self, code: str, name: str, description: str) -> UseCase:
        with MobileSessionLocal() as session:
            item = UseCaseDB(
                code=code,
                name=name,
                description=description,
                created_at=datetime.now(UTC),
            )
            session.add(item)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise
            session.refresh(item)
            return self._row_to_entity(item)

    def get_by_id(self, use_case_id: int) -> UseCase | None:
        with MobileSessionLocal() as session:
            row = session.get(UseCaseDB, use_case_id)
            return self._row_to_entity(row) if row else None

    @staticmethod
    def _row_to_entity(row: UseCaseDB) -> UseCase:
        return UseCase(
            id=row.id,
            code=row.code,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
        )


class TraceabilityRepository:
    def __init__(self, requirement_repository: RequirementRepository, use_case_repository: UseCaseRepository):
        self.requirement_repository = requirement_repository
        self.use_case_repository = use_case_repository

    def list_all(self) -> Iterable[RequirementUseCaseTrace]:
        with MobileSessionLocal() as session:
            rows = session.query(RequirementUseCaseTraceDB).order_by(RequirementUseCaseTraceDB.created_at.desc()).all()
            return [self._row_to_entity(row) for row in rows]

    def list_use_cases_by_requirement(self, requirement_id: int) -> Iterable[UseCase]:
        with MobileSessionLocal() as session:
            rows = (
                session.query(UseCaseDB)
                .join(RequirementUseCaseTraceDB, RequirementUseCaseTraceDB.use_case_id == UseCaseDB.id)
                .filter(RequirementUseCaseTraceDB.requirement_id == requirement_id)
                .order_by(UseCaseDB.id.desc())
                .all()
            )
            return [UseCaseRepository._row_to_entity(row) for row in rows]

    def link(self, requirement_id: int, use_case_id: int) -> RequirementUseCaseTrace | None:
        if self.requirement_repository.get_by_id(requirement_id) is None:
            return None

        if self.use_case_repository.get_by_id(use_case_id) is None:
            return None

        if self.get_by_ids(requirement_id=requirement_id, use_case_id=use_case_id) is not None:
            raise ValueError("Link already exists")

        with MobileSessionLocal() as session:
            item = RequirementUseCaseTraceDB(
                requirement_id=requirement_id,
                use_case_id=use_case_id,
                created_at=datetime.now(UTC),
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def get_by_ids(self, requirement_id: int, use_case_id: int) -> RequirementUseCaseTrace | None:
        with MobileSessionLocal() as session:
            row = (
                session.query(RequirementUseCaseTraceDB)
                .filter(
                    RequirementUseCaseTraceDB.requirement_id == requirement_id,
                    RequirementUseCaseTraceDB.use_case_id == use_case_id,
                )
                .first()
            )
            return self._row_to_entity(row) if row else None

    @staticmethod
    def _row_to_entity(row: RequirementUseCaseTraceDB) -> RequirementUseCaseTrace:
        return RequirementUseCaseTrace(
            requirement_id=row.requirement_id,
            use_case_id=row.use_case_id,
            created_at=row.created_at,
        )


# ---------------------------------------------------------------------------
# OT Repositories
# ---------------------------------------------------------------------------

class OtAtmRepository:
    def list_by_ot(self, ot_id: int) -> list[OtAtm]:
        with MobileSessionLocal() as session:
            rows = session.query(OtAtmDB).filter(OtAtmDB.ot_id == ot_id).order_by(OtAtmDB.id).all()
            return [self._row_to_entity(row) for row in rows]

    def create(
        self,
        ot_id: int,
        etiqueta: str,
        tipo_servicio: str,
        numero_atm: str,
        serie_cajero: str,
        serie_mmbb: str,
        detalles_servicio: str,
        observaciones: str,
    ) -> OtAtm:
        with MobileSessionLocal() as session:
            item = OtAtmDB(
                ot_id=ot_id,
                etiqueta=etiqueta,
                tipo_servicio=tipo_servicio,
                numero_atm=numero_atm,
                serie_cajero=serie_cajero,
                serie_mmbb=serie_mmbb,
                detalles_servicio=detalles_servicio,
                observaciones=observaciones,
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def get_by_id(self, atm_id: int) -> OtAtm:
        with MobileSessionLocal() as session:
            row = session.get(OtAtmDB, atm_id)
            return self._row_to_entity(row) if row else None

    def delete_by_ot(self, ot_id: int) -> None:
        with MobileSessionLocal() as session:
            session.query(OtAtmDB).filter(OtAtmDB.ot_id == ot_id).delete()
            session.commit()

    @staticmethod
    def _row_to_entity(row: OtAtmDB) -> OtAtm:
        return OtAtm(
            id=row.id,
            ot_id=row.ot_id,
            etiqueta=row.etiqueta,
            tipo_servicio=row.tipo_servicio,
            numero_atm=row.numero_atm,
            serie_cajero=row.serie_cajero,
            serie_mmbb=row.serie_mmbb,
            detalles_servicio=row.detalles_servicio,
            observaciones=row.observaciones,
        )


class OtRepository:
    def list_all(self, estado: str | None = None) -> list[Ot]:
        with MobileSessionLocal() as session:
            query = session.query(OtDB)
            if estado:
                query = query.filter(OtDB.estado == estado)
            rows = query.order_by(OtDB.id.desc()).all()
            return [self._row_to_entity(row) for row in rows]

    def create(
        self,
        banco: str,
        comuna: str,
        direccion: str,
        hora_programada: datetime,
        tecnico_id: int,
        nombre_tecnico: str,
        nombre_etv: str,
        nombre_alarma: str,
        origen_servidor: bool = True,
        region: str | None = None,
    ) -> Ot:
        with MobileSessionLocal() as session:
            item = OtDB(
                banco=banco,
                estado="asignada",
                fecha_creacion=datetime.now(UTC),
                hora_programada=hora_programada,
                region=region,
                comuna=comuna,
                direccion=direccion,
                tecnico_id=tecnico_id,
                nombre_tecnico=nombre_tecnico,
                nombre_etv=nombre_etv,
                nombre_alarma=nombre_alarma,
                origen_servidor=origen_servidor,
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def get_by_id(self, ot_id: int) -> Ot | None:
        with MobileSessionLocal() as session:
            row = session.get(OtDB, ot_id)
            return self._row_to_entity(row) if row else None

    def update(
        self,
        ot_id: int,
        banco: str | None = None,
        region: str | None = None,
        comuna: str | None = None,
        direccion: str | None = None,
        hora_programada: datetime | None = None,
        tecnico_id: int | None = None,
        nombre_tecnico: str | None = None,
        nombre_etv: str | None = None,
        nombre_alarma: str | None = None,
    ) -> Ot | None:
        with MobileSessionLocal() as session:
            item = session.get(OtDB, ot_id)
            if item is None:
                return None

            if banco is not None:
                item.banco = banco
            if region is not None:
                item.region = region
            if comuna is not None:
                item.comuna = comuna
            if direccion is not None:
                item.direccion = direccion
            if hora_programada is not None:
                item.hora_programada = hora_programada
            if tecnico_id is not None:
                item.tecnico_id = tecnico_id
            if nombre_tecnico is not None:
                item.nombre_tecnico = nombre_tecnico
            if nombre_etv is not None:
                item.nombre_etv = nombre_etv
            if nombre_alarma is not None:
                item.nombre_alarma = nombre_alarma
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def update_estado(self, ot_id: int, estado: str) -> Ot | None:
        with MobileSessionLocal() as session:
            item = session.get(OtDB, ot_id)
            if item is None:
                return None

            item.estado = estado
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    def delete(self, ot_id: int) -> bool:
        with MobileSessionLocal() as session:
            rowcount = session.query(OtDB).filter(OtDB.id == ot_id).delete()
            session.commit()
            return rowcount > 0

    @staticmethod
    def _row_to_entity(row: OtDB) -> Ot:
        return Ot(
            id=row.id,
            banco=row.banco,
            estado=row.estado,
            fecha_creacion=row.fecha_creacion,
            hora_programada=row.hora_programada,
            region=row.region,
            comuna=row.comuna,
            direccion=row.direccion,
            tecnico_id=row.tecnico_id,
            nombre_tecnico=row.nombre_tecnico,
            nombre_etv=row.nombre_etv,
            nombre_alarma=row.nombre_alarma,
            origen_servidor=row.origen_servidor,
        )


class UserRepository:
    @staticmethod
    def _session_factory():
        return AdminSessionLocal or MobileSessionLocal

    def list_all(self) -> list[User]:
        with self._session_factory()() as session:
            rows = session.query(UserDB).order_by(UserDB.id.desc()).all()
            return [self._row_to_entity(row) for row in rows]
        
    def get_by_id(self, user_id: int) -> User | None:
        with self._session_factory()() as session:
            row = session.get(UserDB, user_id)
            return self._row_to_entity(row) if row else None

    def create(self, email: str, hashed_password: str, full_name: str, role: str, is_active: bool = True) -> User:
        with self._session_factory()() as session:
            item = UserDB(
                email=email,
                hashed_password=hashed_password,
                full_name=full_name,
                role=role,
                is_active=is_active,
                created_at=datetime.now(UTC),
            )
            session.add(item)
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise
            session.refresh(item)
            return self._row_to_entity(item)

    @staticmethod
    def _row_to_entity(row: UserDB) -> User:
        return User(
            id=row.id,
            email=row.email,
            hashed_password=row.hashed_password,
            full_name=row.full_name,
            role=row.role,
            is_active=row.is_active,
            created_at=row.created_at,
        )


class AuditLogRepository:
    @staticmethod
    def _session_factory():
        return AdminSessionLocal or MobileSessionLocal

    def list_all(self) -> list[AuditLog]:
        with self._session_factory()() as session:
            rows = session.query(AuditLogDB).order_by(AuditLogDB.created_at.desc()).all()
            return [self._row_to_entity(row) for row in rows]

    def create(self, user_id: int, action: str, details: str) -> AuditLog:
        with self._session_factory()() as session:
            item = AuditLogDB(
                user_id=user_id,
                action=action,
                details=details,
                created_at=datetime.now(UTC),
            )
            session.add(item)
            session.commit()
            session.refresh(item)
            return self._row_to_entity(item)

    @staticmethod
    def _row_to_entity(row: AuditLogDB) -> AuditLog:
        return AuditLog(
            id=row.id,
            user_id=row.user_id,
            action=row.action,
            details=row.details,
            created_at=row.created_at,
        )

class RegionRepository:
    def list_all(self) -> list[Region]:
        with MobileSessionLocal() as session:
            rows = session.query(RegionDB).order_by(RegionDB.id).all()
            return [self._row_to_entity(row) for row in rows]

    def count(self) -> int:
        with MobileSessionLocal() as session:
            return session.query(RegionDB).count()

    def bulk_create(self, nombres: list[str]) -> None:
        with MobileSessionLocal() as session:
            regiones = [RegionDB(nombre=nombre) for nombre in nombres]
            session.add_all(regiones)
            session.commit()

    @staticmethod
    def _row_to_entity(row: RegionDB) -> Region:
        return Region(
            id=row.id,
            nombre=row.nombre
        )