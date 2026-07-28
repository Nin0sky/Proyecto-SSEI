from datetime import datetime, timedelta, UTC
import os
from hashlib import pbkdf2_hmac
from secrets import token_hex
from typing import Any
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


# Configuraciones por defecto (en producción, se priorizan variables de entorno)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "b3ca82dd2fa397262ff4a6cf80e5b7218671607ef11f1737beba90a2a4b895fc")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 horas


# =================================================================----------
# 1. Utilidades de Hashing de Contraseñas (PBKDF2-HMAC compatible con SSEI)
# =================================================================----------

def generar_hash_password(password: str) -> str:
    """
    Genera un hash seguro utilizando PBKDF2-HMAC idéntico al estándar para SSEI.
    El resultado tiene el formato: pbkdf2_sha256$salt$hash
    """
    salt = token_hex(16)
    password_hash = pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 390000).hex()
    return f"pbkdf2_sha256${salt}${password_hash}"


def verificar_password(password_plano: str, password_hasheado: str) -> bool:
    """
    Verifica si una contraseña en texto plano corresponde al hash seguro guardado.
    """
    try:
        if not password_hasheado.startswith("pbkdf2_sha256$"):
            return False
            
        parts = password_hasheado.split("$")
        if len(parts) != 3:
            return False
            
        _, salt, db_hash = parts
        password_hash = pbkdf2_hmac("sha256", password_plano.encode("utf-8"), bytes.fromhex(salt), 390000).hex()
        return password_hash == db_hash
    except Exception:
        return False


# =================================================================----------
# 2. Utilidades para generación y decodificación de JWT
# =================================================================----------

def crear_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Genera un token firmado JWT que expira tras un periodo de tiempo.
    El payload incluirá las llaves provistas, por ejemplo "sub" (subject: identificador o email)
    y el parámetro "exp" (expiración).
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": int(expire.timestamp())})
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decodificar_access_token(token: str) -> dict[str, Any] | None:
    """
    Intenta decodificar y validar un Token JWT.
    Retorna el payload (diccionario) si el token es válido y está vigente, de lo contrario None.
    """
    try:
        decoded_payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return decoded_payload
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    
security_scheme = HTTPBearer()

def obtener_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict[str, Any]:
    """
    Dependencia de FastAPI para proteger rutas.
    Extrae, decodifica y valida el token JWT de la cabecera Authorization.
    Retorna el payload con la información del usuario autenticado si es válido.
    """
    token = credentials.credentials
    payload = decodificar_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido, expirado o malformado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def verificar_rol(roles_permitidos: list[str]):
    """
    Dependencia parametrizada para verificar roles (RBAC).
    Permite restringir endpoints según la lista de roles proporcionada.
    """
    def dependencia_rol(usuario: dict[str, Any] = Depends(obtener_usuario_actual)) -> dict[str, Any]:
        rol_usuario = usuario.get("role")
        if rol_usuario not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta acción"
            )
        return usuario
    return dependencia_rol