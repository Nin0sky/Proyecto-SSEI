# Esquema de Base de Datos: Usuarios, Roles y Auditoría (SSEI)

**Fecha:** 2026-07-16  
**Estado:** Propuesta de Integración para Backend (FastAPI) y Web Admin (Angular)  
**Motor de Persistencia:** SQLite (`data/ssei.db`)

---

## 1. Matriz de Control de Acceso basado en Roles (RBAC)

Para garantizar la seguridad del sistema y la separación de funciones, se definen cuatro roles con permisos específicos en el entorno administrativo y móvil:

| Rol | Sigla | Entorno Principal | Permisos Clave |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` | SSEI Admin (Web) | Acceso total, gestión de usuarios (crear/desactivar cuentas), visualización de logs de auditoría. |
| **Coordinador** | `coordinador` | SSEI Admin (Web) | Creación, asignación, edición y eliminación lógica de OTs; ordenamiento y generación de informes DOCX. |
| **Técnico** | `tecnico` | SSEI Mobile (App) | Lectura de OTs asignadas, registro de actividades en terreno, captura offline y sincronización de evidencias. |
| **Externo** | `externo` | SSEI Admin (Web) | Lectura de OTs asignadas, registro de actividades en terreno, captura offline y sincronización de evidencias. |

---

## 2. Diagrama Entidad-Relación (Lógico)

```text
  ┌────────────────────────┐             ┌────────────────────────┐
  │         users          │             │       audit_logs       │
  ├────────────────────────┤             ├────────────────────────┤
  │ PK  id (INTEGER)       │             │ PK  id (INTEGER)       │
  │     email (VARCHAR)    │────────────<│ FK  user_id (INTEGER)  │
  │     hashed_pass (TEXT) │             │     action (VARCHAR)   │
  │     full_name (VARCHAR)│             │     details (TEXT/JSON)│
  │     role (VARCHAR)     │             │     created_at (DATETIME)
  │     is_active (BOOLEAN)│             └────────────────────────┘
  │     created_at (DATETIME)
  └────────────────────────┘
               │
               │  ┌───────────────────────────────────┐
               └──│                ots                │
                  ├───────────────────────────────────┤
                  │ PK  id (INTEGER/VARCHAR)          │
                  │ FK  creado_por_id (INTEGER)───┐   │
                  │ FK  tecnico_id (INTEGER)──────┼───│
                  │ FK  modificado_por_id(INTEGER)│   │
                  │     ...[Resto de campos Core] │   │
                  └───────────────────────────────┘   │
                                                      │
                                                      │