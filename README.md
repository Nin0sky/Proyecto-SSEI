# Proyecto SSEI

Proyecto SSEI con arquitectura por capas y tres módulos principales:

- Backend API en FastAPI
- Frontend web de administración (Angular)
- Frontend móvil técnico (Ionic + Angular + Capacitor)

## Estructura general

- src/: backend (dominio, aplicación, infraestructura e interfaces)
- ssei-admin/: panel administrativo web
- ssei-mobile/: aplicación móvil
- tests/: pruebas backend
- data/: base SQLite local

## Requisitos

- Python 3.10 o superior
- Node.js 20 o superior
- npm 10 o superior
- (Opcional para mobile nativo) Android Studio y SDK Android

## 1) Backend API (FastAPI)

### Instalación

    python -m venv .venv
    .venv\Scripts\activate
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt

En Linux/macOS, activar entorno con:

    source .venv/bin/activate

### Ejecución

    python -m uvicorn src.main:app --reload

Variables de entorno opcionales para persistencia dual:

    set SQLITE_DATABASE_URL=sqlite:///./data/ssei.db
    set ORACLE_DATABASE_URL=oracle+oracledb://usuario:password@host:1521/?service_name=XEPDB1
    set SQL_ECHO=false

Nota:
- Si ORACLE_DATABASE_URL no esta configurada, los endpoints admin usan SQLite como fallback de desarrollo.
- Si ORACLE_DATABASE_URL esta configurada, la capa admin (usuarios/auditoria) usa OracleXE.

API disponible en:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

### Pruebas

    python -m pytest -q

### Endpoints principales

- GET /health
- GET /requirements
- POST /requirements
- PATCH /requirements/{requirement_id}/status
- GET /use-cases
- POST /use-cases
- GET /traceability
- GET /requirements/{requirement_id}/use-cases
- POST /requirements/{requirement_id}/use-cases/{use_case_id}
- GET /ots
- POST /ots
- GET /ots/{ot_id}
- PUT /ots/{ot_id}
- PATCH /ots/{ot_id}/estado
- DELETE /ots/{ot_id}
- GET /admin/users
- POST /admin/users
- GET /admin/audit-logs
- POST /admin/audit-logs

Nota: la base de datos local se crea automáticamente en data/ssei.db al iniciar la API.

## 2) Panel Admin (Angular)

Ubicación: ssei-admin

### Instalación

    cd ssei-admin
    npm install

### Desarrollo

    npm start

Por defecto abre en:

- http://localhost:4200

### Build

    npm run build

### Pruebas

    npm test

### Configuración de API

El panel consume backend en http://localhost:8000.
Si necesitas cambiarlo, actualiza la constante base en:
ssei-admin/src/app/core/services/ot.service.ts

## 3) App Mobile (Ionic + Angular + Capacitor)

Ubicación: ssei-mobile

### Instalación

    cd ssei-mobile
    npm install

### Desarrollo web

    npm start

Si ya usas el puerto 4200 en admin, puedes levantar mobile en otro puerto:

    npx ng serve --port 8100

### Build web

    npm run build

### Sincronizar y abrir Android (opcional)

    npx cap sync android
    npx cap open android

### Pruebas

    npm test

### Nota funcional actual

La app mobile actualmente maneja contexto de OT en almacenamiento local del navegador/dispositivo.
No sincroniza automáticamente con la API en su flujo principal.
```

## Flujo recomendado de trabajo

1. Levantar backend en puerto 8000.
2. Levantar ssei-admin en 4200 para gestión y seguimiento.
3. Levantar ssei-mobile en otro puerto (por ejemplo 8100) para pruebas de terreno.
4. Ejecutar pruebas backend antes de integrar cambios.