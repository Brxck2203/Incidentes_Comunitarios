# HU-34 — Control de acceso por roles y bloqueo inmediato de cuentas desactivadas

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: por confirmar.
- Requerimiento: RF-19.
- Estimación del documento: por confirmar.
- Rama: feature/hu-34-control-acceso-roles.
- Base: main, commit 929589f70c3f908df655002d1a9df86c6cb4e523.

## Objetivo

Bloquear el acceso a las funciones administrativas, de admisión y de auditoría a usuarios sin el rol correspondiente (denegando el paso y redirigiendo a su vista permitida), e impedir de inmediato el inicio de sesión o uso de sesión de cualquier funcionario cuya cuenta haya sido desactivada, conservando íntegros todos los registros históricos de sus acciones en la bitácora de auditoría (RF-19 / HU-34).

## Trabajo a desarrollar

1. Implementar `src/services/accessControl.js` con una política de denegación por defecto ante sesión ausente, sesión caducada o rol desconocido, alineada con el catálogo de cuatro roles de RF-19 (`ciudadano`, `gestor`, `cuadrilla`, `administrador`).
2. Denegar el acceso a la consola municipal de recepción/admisión (`/recepcion`) y a la auditoría a los perfiles `ciudadano` y `cuadrilla`, calculando su ruta permitida de redirección (`/reportes` para perfil ciudadano o sin sesión; `/acceso` para perfil cuadrilla mientras se integra HU-17).
3. Verificar en cada inicio de sesión y validación de acceso el estado `active` de la cuenta en el almacenamiento de usuarios (`reporte-ciudadano-usuarios` v1 de HU-33 y `reporte-ciudadano-cuentas-ciudadanas` v1 de HU-31), bloqueando e invalidando de inmediato cuentas con `active: false` sin tocar ni borrar entradas en `report.auditLog` ni `report.history` (`reporte-ciudadano` v2).
4. Crear `src/components/RouteAccessGuard.jsx` y `src/pages/AccessPortalPage.jsx` (`/acceso`) para aplicar la redirección automática con aviso informativo y restringir en `ReportDetailPage.jsx` los paneles de admisión, asignación y bitácora de auditoría según el rol activo.

## Base y coordinación

- HU-21 (RF-13 — Bitácora automática de auditoría): ya integrada en `main` (`src/services/reportAudit.js`). Al desactivar una cuenta y bloquear su sesión, los eventos previamente firmados por ese funcionario en `auditLog` y `history` se preservan sin modificación.
- HU-31 (RF-18 — Registro e inicio de sesión ciudadano, Joan Cordero) y HU-33 (RF-19 — Panel de administración de usuarios y roles, Jason Martínez): comparten la clave de sesión `reporte-ciudadano-sesion` y las bases separadas de usuarios; no se duplica aquí el panel de creación/desactivación de cuentas de HU-33.
- HU-17 (Bandeja de cuadrilla, Brack Rivas) y HU-22 (Pestaña dedicada de auditoría, Jason Martínez): aún no integradas en `main`; quedan declaradas con `TODO` en la matriz de rutas para enlazarlas al fusionarse.
- Archivos compartidos tocados de forma mínima: `src/App.jsx`, `src/layouts/MainLayout.jsx`, `src/pages/ReportsPage.jsx` y `src/pages/ReportDetailPage.jsx`.

## Validación técnica ejecutada y resultados reales

- Comprobar que `ciudadano`, `cuadrilla`, sesión nula, sesión caducada y rol desconocido reciban denegación y redirección automática al intentar entrar a admisión (`/recepcion`) o consultar auditoría: **verificado** (`src/services/accessControl.test.js`).
- Verificar que `gestor` acceda a admisión/recepción pero no a auditoría exclusiva de administración, y que `administrador` cuente con acceso a recepción y auditoría: **verificado**.
- Desactivar la cuenta de un funcionario (`active: false`) que haya registrado previamente decisiones/acciones en `auditLog`, comprobar que su inicio de sesión y sesión activa queden bloqueados de inmediato y verificar que todas las entradas de `auditLog` y `history` sigan 100 % intactas en IndexedDB: **verificado** (`tests/HU-34.test.js`).
- Resultados reales ejecutados localmente:
  - `npm run lint` (`oxlint`): **0 errores** y **0 advertencias nuevas** (solo las 6 advertencias preexistentes en `main`).
  - `npm test` (`tests/*.test.js`): **22/22 pruebas aprobadas** (incluye `tests/HU-34.test.js`).
  - `node --test src/services/*.test.js`: **27/27 pruebas aprobadas** (incluye 3 pruebas en `src/services/accessControl.test.js`).
  - `npm run build` (`vite build`): **compilación exitosa** (`67 modules transformed`).
- **Pendiente de validación manual:** prueba visual e interactiva en navegador móvil y de escritorio navegando directamente por URL a `/recepcion` desde distintos perfiles y validando el aviso de redirección.

## Límites e integración

Al tratarse de un prototipo ejecutado completamente en el navegador sin servidor backend ni validación remota de tokens, este guardián aplica control de acceso a nivel de interfaz y servicios locales, pero no constituye seguridad real frente a alteración manual del almacenamiento del cliente (RNF-05).
