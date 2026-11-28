# HU-19 — Consulta pública de estado y línea de tiempo por ticket

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: por confirmar.
- Requerimiento: RF-12.
- Estimación del documento: por confirmar.
- Rama: feature/hu-19-consulta-publica-ticket.
- Base: main, commit be9145cf176e4712726cadc3ed17e8ee0e1d795e.

## Objetivo

Permitir a cualquier ciudadano consultar en tiempo real el estado actual y la línea de tiempo cronológica de las etapas completadas de un reporte ingresando únicamente su número de ticket en un buscador público sin iniciar sesión, omitiendo cualquier dato personal de quien creó o respaldó el reporte y de los funcionarios municipales (RF-12, RNF-05).

## Trabajo a desarrollar

1. Exponer un buscador público por código de ticket (`/consulta` y `/consulta/:ticket`) independiente de «Mis reportes» y sin exigir sesión ni identidad local (`reporterId`).
2. Validar el formato del código de ticket ingresado y gestionar de manera clara los casos de ticket inexistente o código inválido sin revelar datos internos.
3. Mapear los estados y eventos reales del expediente a las etapas de RF-12 («Registrado / Recibido», «En evaluación», «Admitido», «Asignado», «En atención», «Atendido» o «Desestimado»), construyendo la línea de tiempo únicamente con las etapas que realmente ocurrieron y su fecha y hora.
4. Para tickets secundarios unificados en una consolidación (HU-08 / HU-09), derivar el estado actual y el avance global desde el expediente maestro vigente sin exponer identificadores de terceros vecinos.
5. Proteger la privacidad (RNF-05) omitiendo en el resultado público `reporterId`, lista de `confirmations`, nombres de funcionarios (`responsible`, `official`, `assignedBy`), coordenadas GPS exactas y archivos multimedia privados.

## Base y coordinación

- HU-08 / HU-09 (RF-05): reutiliza `getConsolidatedTrackingForTicket` y `resolveReportTracking` en `src/services/consolidatedTracking.js` para reflejar el avance del caso maestro en tickets secundarios.
- HU-12 / HU-13 (RF-08): reconoce los cambios a «En evaluación», «Admitido a trámite» (normalizado a «Admitido» en la etapa pública) y «Desestimado».
- HU-15 / HU-16 / HU-17 / HU-18 (RF-10, RF-11): reconoce los eventos y estados «Asignado», «En atención» y «Atendido» (así como «Resuelto» en el código heredado).
- HU-20 (RF-12): la visualización del dictamen técnico detallado de desestimación y la fotografía final de cierre corresponde a HU-20 y queda marcada con `TODO: mostrar dictamen de desestimación y fotografía de cierre cuando se integre HU-20`.
- `src/App.jsx` y `src/layouts/MainLayout.jsx`: puntos de integración de la ruta `/consulta` y el acceso en la navegación principal.

## Validación técnica propuesta y resultados reales

- Consultar un ticket válido con varias etapas y verificar el estado actual y la línea de tiempo cronológica con fecha y hora de cada etapa completada, sin inventar etapas que no ocurrieron: **verificado** (`src/services/publicTicketTracking.test.js` y `tests/HU-19.test.js`).
- Comprobar que el objeto y la vista de consulta pública omitan `reporterId`, `confirmations`, `position`, `originalPosition`, `audio`, `photos` y nombres de funcionarios (RNF-05): **verificado**.
- Consultar un ticket secundario consolidado y verificar que refleje el estado y avance del expediente maestro: **verificado**.
- Probar código vacío, formato inválido y ticket inexistente verificando mensajes claros: **verificado**.
- Resultados ejecutados localmente:
  - `npm test`: **16/16 pruebas aprobadas** (`tests/HU-19.test.js` incluido).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (`src/services/publicTicketTracking.test.js` incluido).
  - `npm run lint` (`oxlint`): **0 errores**.
  - `npm run build` (`vite build`): **Compilación exitosa** (`59 modules transformed`).
- Pendiente de validación manual visual en móvil y de integración futura con el dictamen de desestimación y fotografía de cierre de **HU-20** (`TODO` marcado en `src/services/publicTicketTracking.js`).

## Límites e integración

El buscador público consulta el almacenamiento local IndexedDB v2 del navegador, sin backend en la nube. No implementa autenticación, ni edición de reportes, ni el dictamen detallado o foto final de cierre que pertenecen a HU-20.
