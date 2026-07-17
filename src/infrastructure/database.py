import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


Base = declarative_base()

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_URL = f"sqlite:///{(PROJECT_ROOT / 'data' / 'ssei.db').as_posix()}"

SQLITE_DATABASE_URL = os.getenv("SQLITE_DATABASE_URL", DEFAULT_SQLITE_URL)
ORACLE_DATABASE_URL = os.getenv("ORACLE_DATABASE_URL")
SQL_ECHO = os.getenv("SQL_ECHO", "false").lower() == "true"


mobile_engine = create_engine(
    SQLITE_DATABASE_URL,
    echo=SQL_ECHO,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False},
)

MobileSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=mobile_engine)


admin_engine = create_engine(
    ORACLE_DATABASE_URL,
    echo=SQL_ECHO,
    pool_pre_ping=True,
    pool_recycle=3600,
) if ORACLE_DATABASE_URL else None

AdminSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=admin_engine) if admin_engine else None


def get_mobile_db():
    db = MobileSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_admin_db():
    if AdminSessionLocal is None:
        raise RuntimeError("ORACLE_DATABASE_URL is not configured")

    db = AdminSessionLocal()
    try:
        yield db
    finally:
        db.close()