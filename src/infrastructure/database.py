# .\src\infrastructure\database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Cargamos la URL de la base de datos desde variables de entorno para mayor seguridad.
# Por defecto, configuramos una estructura compatible con Oracle XE usando el driver 'oracledb'.
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "oracle+oracledb://usuario:password@localhost:1521/?service_name=XEPDB1"
)

# 2. Creamos el motor de SQLAlchemy (Engine)
engine = create_engine(
    DATABASE_URL,
    echo=True,             # Muestra las consultas SQL en consola (ideal para desarrollo)
    pool_pre_ping=True,    # Verifica si la conexión sigue viva antes de usarla (evita caídas en redes inestables)
    pool_recycle=3600      # Recicla las conexiones inactivas cada hora
)

# 3. Creamos la fábrica de sesiones de base de datos
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine
)

# 4. Definimos la clase Base declarativa para construir nuestros modelos de persistencia
Base = declarative_base()

# 5. Generador/Dependencia para abrir y cerrar la sesión por cada petición HTTP (útil para FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()