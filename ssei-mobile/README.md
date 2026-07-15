# SSEI Mobile

Aplicación móvil para ejecución en terreno de Órdenes de Trabajo (OT), construida con Ionic, Angular y Capacitor.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Ionic/Angular tooling vía npx (no requiere instalación global)
- Opcional para Android nativo:
  - Android Studio
  - SDK Android configurado

## Instalación

    npm install

## Desarrollo (web)

    npm start

Por defecto usa el comportamiento de ng serve.
Si necesitas un puerto específico:

    npx ng serve --port 8100

## Build

    npm run build

## Pruebas

    npm test

## Flujo con Capacitor (Android)

1. Generar build web:

       npm run build

2. Sincronizar recursos con Android:

       npx cap sync android

3. Abrir proyecto nativo:

       npx cap open android

## Scripts disponibles

- Inicio desarrollo:

      npm start

- Build:

      npm run build

- Build watch:

      npm run watch

- Pruebas:

      npm test

- Lint:

      npm run lint

## Rutas principales

- /login
- /dashboard
- /formulario-ot
- /registro-otubi

## Estado actual de datos

La app mantiene contexto de trabajo en almacenamiento local (localStorage), útil para flujo offline/local durante desarrollo.
La sincronización automática con backend no está implementada como flujo principal en este módulo.

## Integraciones externas actuales

- Geocodificación y reverse geocoding con Nominatim (OpenStreetMap) para apoyo de ubicación.
- Capacitor para empaquetado y ejecución nativa.