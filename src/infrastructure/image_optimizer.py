import io
import logging

from PIL import Image, ImageOps

from src.infrastructure.config import (
    IMG_JPEG_QUALITY,
    IMG_MAX_DIMENSION,
    IMG_MIN_BYTES_TO_OPTIMIZE,
    IMG_OPTIMIZATION_ENABLED,
)

logger = logging.getLogger("ssei.image_optimizer")

IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


def optimize_image(data: bytes, mimetype: str) -> tuple[bytes, str]:
    """
    Comprime y reescala una imagen. Retorna (bytes_optimizados, extension).
    - Corrige orientación EXIF (fotos móviles rotadas).
    - Reescala a IMG_MAX_DIMENSION manteniendo proporción.
    - Convierte a JPEG calidad 80 (fotos de terreno no necesitan PNG/alpha).
    - Omite imágenes pequeñas o si la optimización está desactivada.
    """
    if not IMG_OPTIMIZATION_ENABLED:
        return data, _ext_from_mime(mimetype)

    if mimetype not in IMAGE_MIMETYPES or len(data) < IMG_MIN_BYTES_TO_OPTIMIZE:
        return data, _ext_from_mime(mimetype)

    try:
        original_size = len(data)
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)  # Corrige rotación según EXIF

        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        img.thumbnail((IMG_MAX_DIMENSION, IMG_MAX_DIMENSION), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=IMG_JPEG_QUALITY, optimize=True)
        optimized = buffer.getvalue()

        # Si la compresión no mejoró (raro), conservar el original
        if len(optimized) >= original_size:
            return data, _ext_from_mime(mimetype)

        logger.info(
            "Imagen optimizada: %.1f KB -> %.1f KB (%.0f%% reducción)",
            original_size / 1024,
            len(optimized) / 1024,
            (1 - len(optimized) / original_size) * 100,
        )
        return optimized, "jpg"

    except Exception as exc:
        logger.warning("No se pudo optimizar la imagen (%s). Se guarda el original.", exc)
        return data, _ext_from_mime(mimetype)


def _ext_from_mime(mimetype: str) -> str:
    return {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/bmp": "bmp",
        "application/pdf": "pdf",
        "application/zip": "zip",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
    }.get(mimetype, "bin")