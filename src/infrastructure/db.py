from pathlib import Path
import sqlite3

from src.infrastructure.database import admin_engine, mobile_engine
from src.infrastructure.models import Base

DB_PATH = Path("data") / "ssei.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=mobile_engine)


def init_admin_db() -> None:
    if admin_engine is None:
        return

    Base.metadata.create_all(bind=admin_engine)
