# HU-21 — Bitácora automática de auditoría

Implementación independiente construida desde main, sin incluir las otras historias del Sprint 3.

## Alcance

Bitácora automática de auditoría. Se integró en las pantallas y servicios actuales sin cambiar el diseño general.

## Limitaciones y dependencias

La aplicación local no puede garantizar inmutabilidad frente a manipulación directa de IndexedDB; requiere servidor con control de acceso.

## Pruebas

`npm install && npm run check` y `node --test tests/HU-21.test.js`.
