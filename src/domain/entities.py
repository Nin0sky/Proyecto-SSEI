# .\src\domain\entities.py
from datetime import datetime
from typing import Optional

class OrdenTrabajo:
    def __init__(
        self,
        cliente_id: int,
        tipo_servicio_id: int,
        descripcion: str,
        id: Optional[int] = None,
        estado: str = "Pendiente",
        creado_en: Optional[datetime] = None
    ):
        self.id = id
        self.cliente_id = cliente_id
        self.tipo_servicio_id = tipo_servicio_id
        self.descripcion = descripcion
        self.estado = estado
        self.creado_en = creado_en or datetime.utcnow()

    def puede_iniciarse(self) -> bool:
        # Ejemplo de regla de negocio pura
        return self.estado == "Pendiente"