# HU-22 — Revisión del historial cronológico de auditoría por expediente

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: por confirmar.
- Requerimiento: RF-13.
- Estimación del documento: por confirmar.
- Rama: feature/hu-22-historial-auditoria.
- Base: main, commit be9145cf176e4712726cadc3ed17e8ee0e1d795e.

## Objetivo

Permitir al administrador o auditor municipal abrir la pestaña «Historial de Auditoría» dentro del detalle administrativo de cualquier expediente y revisar en orden cronológico completo todos los movimientos desde su recepción hasta su cierre, visualizando qué funcionario, cuadrilla o participante realizó cada cambio de estado u observación técnica, en modo estrictamente de solo lectura (RF-13, RNF-05).

## Trabajo a desarrollar

1. Incorporar la navegación por pestañas («Expediente del reporte» y «Historial de Auditoría») en la vista administrativa del detalle del reporte (`/recepcion/:ticket`).
2. Construir el listado cronológico ascendente de auditoría a partir de la bitácora del expediente (`report.auditLog` o `report.history`), normalizando fecha y hora exacta, movimiento/evento, funcionario o cuadrilla responsable, rol, estado anterior, estado nuevo y observación técnica.
3. Garantizar que tanto el servicio de lectura (`buildAuditHistory`) como el componente de interfaz (`AuditHistoryTab`) sean de solo lectura e inmutables (`Object.freeze`), sin ofrecer ningún control para editar, ocultar ni eliminar registros históricos.
4. Soportar registros heredados de `main` y registros enriquecidos por HU-15, HU-16, HU-17, HU-18 y HU-21.

## Base y coordinación

- HU-21 (RF-13): encargada del registro automático de cada movimiento. Mientras HU-21 no esté integrada en `main`, `src/services/auditHistory.js` consume los campos estructurados si existen y reconstruye los metadatos de estado anterior/nuevo, responsable y rol para las entradas actuales de `report.history` (`TODO: consumir campos nativos de HU-21 cuando se integre`).
- HU-08 (RF-05), HU-12 / HU-13 (RF-08), HU-14 (RF-09), HU-15 / HU-16 (RF-10), HU-17 / HU-18 (RF-11): sus entradas en `report.history` se interpretan preservando el nombre del funcionario (`responsible`, `official`, `assignedBy`) o de la cuadrilla encargada y sus motivos o justificaciones técnicas.
- `src/pages/ReportDetailPage.jsx`: punto de integración de la pestaña «Historial de Auditoría» en el contexto administrativo (`fromReception === true`).

## Validación técnica propuesta y resultados reales

- Verificar que `buildAuditHistory` ordene cronológicamente todos los movimientos desde la recepción inicial hasta el cierre del expediente: **verificado** (`src/services/auditHistory.test.js` y `tests/HU-22.test.js`).
- Comprobar que cada movimiento identifique al funcionario, cuadrilla o actor responsable, su rol, la transición de estado (`previousStatus` → `newStatus`) y la observación técnica o motivo: **verificado**.
- Comprobar que la estructura devuelta sea inmutable (`Object.isFrozen`) y que no altere el expediente almacenado en IndexedDB: **verificado**.
- Resultados ejecutados localmente:
  - `npm test`: **16/16 pruebas aprobadas** (`tests/HU-22.test.js` incluido).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (`src/services/auditHistory.test.js` incluido).
  - `npm run lint` (`oxlint`): **0 errores**.
  - `npm run build` (`vite build`): **Compilación exitosa** (`59 modules transformed`).
- Pendiente de validación manual visual en móvil y de conexión con posibles campos adicionales de **HU-21**.

## Límites e integración

El prototipo utiliza IndexedDB v2 local y no cuenta con autenticación ni control de acceso por roles en servidor; la pestaña «Historial de Auditoría» se restringe a la vista administrativa municipal (`/recepcion/:ticket`, `fromReception === true`) y no se expone en la vista ciudadana (`/reportes/:ticket`). No incluye ningún control de edición, ocultamiento o borrado de entradas de bitácora.
