CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'coordinador', 'tecnico', 'externo')),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas frecuentes durante el login y filtros
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL, -- Ej: 'CREATE_OT', 'UPDATE_OT', 'DELETE_OT', 'GENERATE_REPORT'
    details TEXT NOT NULL,        -- JSON stringified con los cambios (ej: {"ot_id": 1024, "cambios": {"estado": "en_progreso"}})
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Índice para acelerar la auditoría temporal de eventos
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);

-- Estructura de referencia para actualizar o crear la tabla 'ots' con trazabilidad
CREATE TABLE ots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- O VARCHAR si se gestionan temporales móviles
    cliente VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'asignado',
    comuna VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    origen_servidor BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Campos de Trazabilidad vinculados a la tabla 'users'
    creado_por_id INTEGER NOT NULL,
    tecnico_id INTEGER NOT NULL,
    modificado_por_id INTEGER,

    FOREIGN KEY (creado_por_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (tecnico_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (modificado_por_id) REFERENCES users(id) ON DELETE SET NULL
);