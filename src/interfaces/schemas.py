from datetime import datetime

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
