from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class Requirement:
    id: int
    title: str
    description: str
    priority: str
    status: str
    created_at: datetime
