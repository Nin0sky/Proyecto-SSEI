# SSEI Admin

Panel web administrativo para gestión de Órdenes de Trabajo (OT) y seguimiento operativo.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Backend SSEI ejecutándose en http://localhost:8000

## Instalación

    npm install

## Ejecución en desarrollo

    npm start

Aplicación disponible en:

- http://localhost:4200

## Scripts disponibles

- Inicio desarrollo:

      npm start

- Build producción:

      npm run build

- Build en modo watch:

      npm run watch

- Pruebas unitarias:

      npm test

## Rutas principales de la aplicación

- /dashboard
- /ots
- /ots/nueva
- /ots/:id
- /ots/:id/editar

## Integración con backend

El servicio HTTP usa como base:

- http://localhost:8000

Archivo de configuración actual:

- src/app/core/services/ot.service.ts

Si el backend corre en otra IP o puerto, actualiza la constante base en ese archivo.

## Solución de problemas rápida

- Error de CORS o conexión:
  - Verifica que la API esté activa en el puerto 8000.
- Error de dependencias:
  - Elimina node_modules y package-lock.json, luego ejecuta npm install.
- Puerto ocupado:
  - Ejecuta ng serve --port 4201.