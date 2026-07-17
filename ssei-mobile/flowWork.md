[Técnico completa OT] 
       │
       ▼
[Se comprime la foto] ➔ Se guarda en disco (Filesystem) y nos da la ruta: "ruta/foto.jpg"
       │
       ▼
[Se guarda la OT local] ➔ SQLite registra: { id: 105, estado: 'pendiente', foto_path: 'ruta/foto.jpg' }
       │
       ▼
[¿Hay conexión a internet?] 
  ├── NO ➔ La OT se queda guardada de forma segura en el dispositivo.
  └── SÍ ➔ Se dispara la API REST:
            1. Lee la data de SQLite.
            2. Busca el archivo físico en la ruta guardada.
            3. Envía todo a Django mediante FormData.
                   │
                   ▼
       [Django responde 201 Created] (Handshake exitoso)
                   │
                   ▼
       [Limpieza Automática] ➔ Ionic borra el registro de SQLite y elimina el archivo físico con Filesystem.