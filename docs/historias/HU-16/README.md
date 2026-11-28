# HU-16 — Reasignación de incidente a otra dependencia o cuadrilla

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: por confirmar.
- Requerimiento: RF-10.
- Estimación del documento: por confirmar.
- Rama: feature/hu-16-reasignacion-cuadrilla.
- Base: main, commit be9145cf176e4712726cadc3ed17e8ee0e1d795e.

## Objetivo

Permitir al gestor municipal reasignar un incidente que ya se encuentra en estado «Asignado» hacia otra dependencia o cuadrilla municipal anotando una justificación obligatoria, actualizando la cuadrilla responsable y registrando el traslado en la bitácora sin borrar ni alterar el historial anterior.

## Trabajo a desarrollar

1. Verificar que el expediente exista, no sea un ticket secundario consolidado y se encuentre en estado «Asignado» antes de habilitar o ejecutar una reasignación.
2. Ofrecer el catálogo de dependencias municipales definidas en RF-10 (Red Vial, Gestión Ambiental, Parques y Ornato, Mantenimiento de Infraestructura) y sus cuadrillas, exigiendo elegir una cuadrilla distinta de la actualmente asignada.
3. Validar en el servicio que se indique la persona responsable y un motivo obligatorio de reasignación (no vacío y con límites de longitud).
4. Actualizar la dependencia y cuadrilla responsable del expediente dentro de una transacción consistente en IndexedDB v2, conservando instrucciones o fechas límite previas si existieran.
5. Agregar un evento de traslado al final de la bitácora (`history`) con fecha/hora, funcionario responsable, dependencia/cuadrilla anterior, nueva dependencia/cuadrilla y motivo, preservando intactos todos los registros previos.
6. Notificar a la vista municipal una vez confirmada la transacción.

## Base y coordinación

- HU-15 (RF-10): integrado con `municipalCrews` y el contrato `{ department, crew, instructions, deadline, responsible, at }` de `src/services/crewAssignment.js`.
- HU-08 / HU-09 (RF-05): los tickets secundarios de una consolidación no se reasignan individualmente; la operación se realiza sobre el expediente maestro.
- HU-21 / HU-22 (RF-13): cada reasignación invoca `addAudit` (`src/services/reportAudit.js`) además de conservar las propiedades estructuradas en `history`.
- HU-23 (RF-14): las notificaciones automáticas corresponden a esa historia y no se implementan aquí.
- `src/pages/ReportDetailPage.jsx`: punto de integración del panel municipal de reasignación en la ruta `/recepcion/:ticket`.

## Validación técnica propuesta y resultados reales

- Reasignar un expediente en estado «Asignado» a otra cuadrilla de la misma o distinta dependencia y verificar la actualización de `assignment` y la nueva entrada en `history` sin pérdida de eventos previos: **verificado** (`src/services/crewReassignment.test.js` y `tests/HU-16.test.js`).
- Comprobar rechazo cuando el motivo está vacío o supera el límite de 2000 caracteres: **verificado**.
- Comprobar rechazo cuando se selecciona la misma cuadrilla que ya tenía asignada o una cuadrilla inexistente: **verificado**.
- Comprobar rechazo cuando el expediente está en un estado distinto de «Asignado» (`Registrado / Recibido`, `En evaluación`, `Admitido a trámite`, `Desestimado`, `Resuelto`) o cuando es un ticket secundario: **verificado**.
- Resultados ejecutados localmente:
  - `npm test`: **16/16 pruebas aprobadas** (incluye `tests/HU-16.test.js`).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (incluye `src/services/crewReassignment.test.js`).
  - `npm run lint` (`oxlint`): **0 errores** (3 warnings preexistentes en `Evidence.jsx` y `ReportDetailPage.jsx`).
  - `npm run build` (`vite build`): **Compilación exitosa** (`59 modules transformed`).
- Pendiente de prueba manual visual en navegador móvil y de integración futura con el formulario de asignación inicial de **HU-15** (`TODO` marcado en `src/services/crewReassignment.js`).

## Límites e integración

La funcionalidad opera sobre el almacenamiento local en IndexedDB v2, sin backend ni autenticación municipal real. No se implementa aquí la asignación inicial desde «Admitido a trámite» (HU-15), ni la bandeja de cuadrilla (HU-17/HU-18), ni notificaciones externas (HU-23).
