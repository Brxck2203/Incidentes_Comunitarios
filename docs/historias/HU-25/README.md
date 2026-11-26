# HU-25 — Constancia oficial de cierre y confirmación ciudadana de solución

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: por confirmar.
- Requerimiento: RF-15.
- Estimación del documento: por confirmar.
- Rama: feature/hu-25-confirmacion-cierre-ciudadano.
- Base: main, commit 929589f (actualizada con HU-15, HU-18, HU-21 y HU-24).

## Objetivo

Poner a disposición del ciudadano la constancia oficial de cierre cuando su incidente se marque como «Atendido» (o «Resuelto» en registros heredados), mostrando la fecha de cierre, dependencia encargada, nota técnica y fotografía final del trabajo realizado, y permitiéndole pulsar «Confirmar solución» dentro de un plazo configurable (por defecto 72 horas) para archivar definitivamente el expediente (RF-15).

## Trabajo a desarrollar

1. Extraer y normalizar la constancia digital de cierre (`extractClosureCertificate`) incluyendo fecha y hora de finalización, dependencia/cuadrilla encargada, nota técnica y fotografía(s) final(es), manejando de forma segura el caso en que el registro técnico no traiga fotografía final adjunta.
2. Configurar un plazo parametrizable de validación ciudadana (`DEFAULT_CLOSURE_CONFIRMATION_HOURS = 72`, sin escribirlo a fuego en la interfaz) y calcular la vigencia del plazo a partir de la fecha de cierre.
3. Permitir al ciudadano accionar «Confirmar solución» mientras el plazo esté vigente y el expediente no haya sido archivado, cambiando el estado a «Cerrado / Archivado» (`closureArchived: true`), conservando la compatibilidad con `isActiveReport` y registrando la confirmación en la bitácora (`history`) sin borrar eventos previos.
4. Si el plazo configurado ya venció sin confirmación manual, mostrar en la constancia que el plazo expiró y que el expediente quedó archivado por vencimiento del plazo, impidiendo confirmaciones tardías.
5. Si el reporte consultado es un ticket secundario consolidado (HU-08 / HU-09), consultar o confirmar sobre el expediente maestro vigente cuando corresponda.

## Base y coordinación

- HU-15 (RF-10) y HU-18 (RF-11): `src/services/closureConfirmation.js` consume directamente el catálogo `municipalCrews` y `report.assignment` de HU-15 (`department`, `crew`) junto con `report.technicalClosure` de HU-18 (`at`, `note`, `photos`, `worker`), manteniendo compatibilidad con cierres heredados (`resolveIncident`).
- HU-21 (RF-13): al confirmar la solución ciudadana (`applySolutionConfirmation`), además de la entrada en `history`, se registra automáticamente el movimiento en `auditLog` mediante `addAudit`.
- HU-26 (RF-15): la opción «Reportar inconformidad / persistencia» corresponde a HU-26 y no se implementa aquí (`TODO: integrar acción Reportar inconformidad / persistencia cuando se integre HU-26`).
- HU-23 / HU-24 (RF-14): las notificaciones automáticas externas pertenecen a esas historias; en este prototipo local sin backend ni servidor de correo, la entrega de la constancia se realiza directamente en la vista de seguimiento del ticket (`/reportes/:ticket`), incluyendo expedientes secundarios consolidados cuyo caso maestro haya sido atendido.
- `src/pages/ReportDetailPage.jsx`: punto de integración de `ClosureCertificatePanel.jsx`.

## Validación técnica propuesta y resultados reales

- Generar la constancia digital al marcarse un reporte como «Atendido» mediante `closeTechnicalOrder` (y «Resuelto») con fecha de cierre, dependencia, cuadrilla, nota técnica y foto final, así como el aviso explícito cuando la foto final está ausente: **verificado** (`src/services/closureConfirmation.test.js` y `tests/HU-25.test.js`).
- Confirmar la solución dentro del plazo configurable (72 horas por defecto y plazos personalizados) y verificar el paso a «Cerrado / Archivado», `closureArchived: true`, la nueva entrada en `history` y el registro en `auditLog`: **verificado**.
- Comprobar rechazo cuando el plazo configurado ya expiró, cuando el expediente ya estaba archivado o cuando aún se encuentra abierto: **verificado**.
- Resultados ejecutados localmente:
  - `npm test`: **23/23 pruebas aprobadas** (`tests/HU-25.test.js` incluido).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (`src/services/closureConfirmation.test.js` incluido).
  - `npm run lint` (`oxlint`): **0 errores**.
  - `npm run build` (`vite build`): **Compilación exitosa**.
- Pendiente de validación manual visual en móvil y de integración futura con **HU-26**.

## Límites e integración

El prototipo opera localmente sobre IndexedDB v2 sin backend ni envío de correos electrónicos: «enviar al ciudadano el comprobante digital» se implementa haciendo disponible la constancia oficial de cierre en la vista de detalle del ticket (`/reportes/:ticket`). No implementa el reporte de inconformidad (HU-26).
