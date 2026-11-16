# HU-14 — Calificación de severidad y priorización

**Requerimiento:** RF-09.

**Archivos:** `src/pages/ReportsPage.jsx`, `src/services/reportPriority.js`, `src/services/reportRepository.js`, `src/App.css`.

- Recepción permite asignar Leve, Moderado, Grave o Crítico, con etiqueta verde, amarilla, naranja o roja.
- Al actualizar la severidad, la cola se reordena de inmediato: primero incidentes activos, luego severidad descendente, respaldos descendentes y antigüedad.
- El indicador visible se calcula como `100 * nivel + 10 * confirmaciones`. El orden mantiene Crítico/Grave delante de severidades menores incluso si el número de respaldos es elevado.
- Cuando se integre HU-10, sus confirmaciones aumentarán la prioridad del incidente; la vista de Recepción consulta cambios cada tres segundos.
- Las decisiones quedan reflejadas en el historial del reporte.

**Comprobar:** asignar severidad Crítico y Grave, cambiar a Moderado, registrar nuevos respaldos, verificar actualización y orden, recargar y comprobar persistencia.

**Alcance técnico:** no se agregó autenticación municipal ni backend. Las restricciones de frecuencia de actualización de pestañas en segundo plano dependen del navegador.
