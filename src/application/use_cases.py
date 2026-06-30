from src.domain.models import Ot, OtAtm, Requirement, RequirementUseCaseTrace, UseCase
from src.infrastructure.repositories import OtAtmRepository, OtRepository, RequirementRepository, TraceabilityRepository, UseCaseRepository


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


# ---------------------------------------------------------------------------
# OT Service
# ---------------------------------------------------------------------------

class OtService:
    def __init__(self, ot_repo: OtRepository, atm_repo: OtAtmRepository):
        self.ot_repo = ot_repo
        self.atm_repo = atm_repo

    def _with_atms(self, ot: Ot) -> Ot:
        """Embed ATMs into the OT dataclass."""
        ot.atms = self.atm_repo.list_by_ot(ot.id)
        return ot

    def list_ots(self, estado: str | None = None) -> list[Ot]:
        return [self._with_atms(ot) for ot in self.ot_repo.list_all(estado=estado)]

    def get_ot(self, ot_id: int) -> Ot | None:
        ot = self.ot_repo.get_by_id(ot_id)
        return self._with_atms(ot) if ot else None

    def create_ot(
        self,
        cliente: str,
        comuna: str,
        direccion: str,
        nombre_tecnico: str,
        nombre_etv: str,
        nombre_alarma: str,
        atms: list[dict],
    ) -> Ot:
        ot = self.ot_repo.create(
            cliente=cliente,
            comuna=comuna,
            direccion=direccion,
            nombre_tecnico=nombre_tecnico,
            nombre_etv=nombre_etv,
            nombre_alarma=nombre_alarma,
            origen_servidor=True,
        )
        for atm in atms:
            self.atm_repo.create(ot_id=ot.id, **atm)
        return self._with_atms(ot)

    def update_ot(
        self,
        ot_id: int,
        cliente: str,
        comuna: str,
        direccion: str,
        nombre_tecnico: str,
        nombre_etv: str,
        nombre_alarma: str,
        atms: list[dict],
    ) -> Ot | None:
        ot = self.ot_repo.update(
            ot_id=ot_id,
            cliente=cliente,
            comuna=comuna,
            direccion=direccion,
            nombre_tecnico=nombre_tecnico,
            nombre_etv=nombre_etv,
            nombre_alarma=nombre_alarma,
        )
        if ot is None:
            return None
        # Reemplazar ATMs: eliminar las anteriores y crear las nuevas
        self.atm_repo.delete_by_ot(ot_id)
        for atm in atms:
            self.atm_repo.create(ot_id=ot.id, **atm)
        return self._with_atms(ot)

    def update_estado(self, ot_id: int, estado: str) -> Ot | None:
        ot = self.ot_repo.update_estado(ot_id=ot_id, estado=estado)
        return self._with_atms(ot) if ot else None

    def delete_ot(self, ot_id: int) -> bool:
        return self.ot_repo.delete(ot_id)
