import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # Lee el archivo .env si existe

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# --- Almacenamiento (ajustable por entorno: disco 500GB hoy, RAID 2TB mañana) ---
# Desarrollo actual:  ./data
# Producción futura:  /mnt/storage/ssei_data  (punto de montaje del RAID)
STORAGE_ROOT = Path(os.getenv("STORAGE_ROOT", str(PROJECT_ROOT / "data")))

BIBLIOTECA_UPLOAD_DIR = STORAGE_ROOT / "biblioteca"
DATABASE_PATH = STORAGE_ROOT / "ssei.db"

# --- Compresión de imágenes (ajustables para testeos) ---
IMG_OPTIMIZATION_ENABLED = os.getenv("IMG_OPTIMIZATION_ENABLED", "true").lower() == "true"
IMG_MAX_DIMENSION = int(os.getenv("IMG_MAX_DIMENSION", "1920"))  # px lado mayor
IMG_JPEG_QUALITY = int(os.getenv("IMG_JPEG_QUALITY", "80"))
IMG_MIN_BYTES_TO_OPTIMIZE = int(os.getenv("IMG_MIN_BYTES_TO_OPTIMIZE", "153600"))  # 150 KB


def storage_report() -> dict:
    """Reporte del disco activo, útil para testeos de puesta en marcha."""
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    usage = shutil.disk_usage(STORAGE_ROOT)
    return {
        "storage_root": str(STORAGE_ROOT.resolve()),
        "total_gb": round(usage.total / 1024**3, 2),
        "used_gb": round(usage.used / 1024**3, 2),
        "free_gb": round(usage.free / 1024**3, 2),
        "pct_used": round(usage.used / usage.total * 100, 1),
    }