# HU-10 — Confirmación y respaldo de incidentes existentes

**Requerimiento:** RF-06.

**Archivos:** `src/components/IncidentMap.jsx`, `src/components/ConfirmIncidentForm.jsx`, `src/pages/ReportsPage.jsx`, `src/pages/ReportDetailPage.jsx`, `src/services/reportRepository.js`.

- Mapa de reportes abiertos con botón «Confirmar incidente» en cada marcador y opción equivalente en el detalle.
- Se registra una confirmación por ticket e identidad local de navegador, con fotos complementarias opcionales, sin sobrescribir las originales.
- El contador de respaldos se actualiza y queda disponible para el cálculo de prioridad al integrar HU-14.
- La confirmación queda asociada a la resolución; «Mis reportes» muestra los incidentes seguidos y el aviso cuando se marcan resueltos.
- En «Recepción» se agregó únicamente el cambio mínimo de estado «Marcar resuelto» para activar el aviso de HU-10.

**Prueba con otro vecino sin backend:** se puede generar un segundo ID local en la consola del mismo origen con `localStorage.setItem('reporte-ciudadano-participante', crypto.randomUUID())` y luego recargar. Es una simulación, no un mecanismo de identidad seguro. El aviso solo existe en ese navegador y origen, no por email, push ni dispositivos externos.

**Comprobar:** confirmación con y sin foto, rechazo al confirmar dos veces, rechazo a confirmar ticket propio, conteo, fotos de terceros, suscripción y notificación tras marcar resuelto.
