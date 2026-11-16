# HU-06 — Alerta preventiva ante reportes duplicados

**Requerimiento:** RF-04.

**Archivos:** `src/pages/HomePage.jsx`, `src/pages/ReportDetailPage.jsx`, `src/components/DuplicateWarning.jsx`, `src/services/reportDuplicates.js`, `src/services/reportRepository.js`.

- La detección requiere categoría y coordenadas conocidas; usa el índice de categoría de IndexedDB y distancia Haversine menor o igual a 50 m.
- Solo se incluyen reportes abiertos; se permite consultar identificador, fecha y estado, o continuar/cancelar la publicación.
- Durante la complementación también se advierte al ajustar el mapa y se verifica de nuevo antes de guardar.
- La selección inicial de categoría es opcional para preservar el reporte rápido por voz/foto de HU-01. Sin categoría inicial, la detección espera a su complementación.

**Comprobar:** crear un reporte categorizado y otro en la misma zona/categoría; comprobar alerta y opción continuar; probar otra categoría, 51 m, reporte resuelto, exclusión del propio ticket y permanencia de las evidencias originales.

**Alcance técnico:** prototipo en IndexedDB. RNF-02 exige detección en servidor y latencia <=1,5 segundos, algo pendiente de la futura integración backend.
