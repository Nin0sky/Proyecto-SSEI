# .\src\infrastructure\models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from src.infrastructure.database import Base

class ClienteDB(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    rut = Column(String(12), unique=True, nullable=False)  # Formato chileno (XX.XXX.XXX-X)


class OrdenTrabajoDB(Base):
    __tablename__ = "ordenes_trabajo"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    estado = Column(String(50), default="Pendiente", nullable=False)
    
    # Auditoría (vital para el control de sincronización y reportería)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en = Column(DateTime(timezone=True), onupdate=func.now())