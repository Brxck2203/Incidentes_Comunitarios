# HU-27 — Tablero estadístico de incidentes por estado y tiempos promedio de resolución

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: por confirmar.
- Requerimiento: RF-16.
- Estimación del documento: por confirmar.
- Rama: feature/hu-27-tablero-estadistico.
- Base: main, commit 929589f70c3f908df655002d1a9df86c6cb4e523.

## Objetivo

Ofrecer a las autoridades y gestores municipales un tablero estadístico adaptable a teléfonos móviles y escritorio (`/estadisticas`) con gráficos e indicadores del total de incidentes por estado, cantidad de casos resueltos por categoría y tiempo promedio de resolución por dependencia municipal, actualizables al instante al filtrar por rango de fechas o categoría (RF-16 / HU-27).

## Trabajo a desarrollar

1. Implementar `src/services/statisticsMetrics.js` para calcular en una sola pasada (`O(N)`, RNF-03) los totales por estado, casos resueltos por categoría y tiempos promedio de resolución por cada dependencia de `municipalCrews` (`src/services/crewAssignment.js`, HU-15).
2. Medir el tiempo de resolución de los expedientes cerrados (`Atendido`, `Resuelto`, `Cerrado / Archivado`) desde su registro (`createdAt`) hasta su marca real de cierre (`technicalClosure.at` de HU-18 o `resolvedAt` de HU-10), excluyendo `Desestimado` del tiempo de resolución, evitando duplicar tickets secundarios consolidados (HU-08) y contabilizando por separado los casos cerrados sin dependencia identificable o sin fecha válida de cierre.
3. Validar filtros por categoría y rango de fechas (`fromDate`, `toDate`), informando con claridad cuando la fecha inicial sea posterior a la fecha final o cuando no existan datos para los criterios elegidos.
4. Construir `src/pages/StatisticsDashboardPage.jsx` y `src/components/StatisticsDashboard.css` con enfoque *mobile-first*, controles táctiles de al menos 48 px (RNF-02) y gráficos de barras horizontales en SVG/CSS sin añadir dependencias externas en `package.json`.
5. Dejar puntos de extensión desacoplados (`TODO`) para integrar posteriormente la exportación PDF/CSV (HU-28), el mapa de calor (HU-29) y la comparación de periodos (HU-30).

## Base y coordinación

- HU-15 (`src/services/crewAssignment.js`) y HU-18 (`src/services/technicalClosure.js`): ya integradas en `main`; proveen `municipalCrews`, `report.assignment.department` y `report.technicalClosure.at`.
- HU-28 (RF-16 — Exportación PDF/CSV, Brack Rivas): `computeMunicipalStatistics` entrega el resumen completo y los filtros aplicados listos para exportar sin recalcular (`TODO` en cabecera del tablero).
- HU-29 (RF-17 — Mapa de calor, Jason Martínez) y HU-30 (RF-17 — Comparación de periodos, Brack Rivas): comparten el módulo `/estadisticas`; el tablero reserva el espacio de extensión inferior con `TODO` y mantiene sus estilos aislados en `StatisticsDashboard.css` para minimizar conflictos de *merge*.
- `src/App.jsx` y `src/layouts/MainLayout.jsx`: únicos archivos compartidos modificados para registrar la ruta `/estadisticas`.

## Validación técnica ejecutada y resultados reales

- Verificar el cálculo del total de incidentes por estado, casos resueltos por categoría y tiempo promedio por dependencia sobre expedientes reales en IndexedDB v2: **verificado** (`src/services/statisticsMetrics.test.js` y `tests/HU-27.test.js`).
- Comprobar actualización inmediata al filtrar por rango de fechas y categoría, rechazo ante fechas invertidas, exclusión de secundarios consolidados y conteo separado de cierres sin dependencia o sin marca temporal válida: **verificado**.
- Comprobar estado vacío con `0` reportes y rendimiento ágil con 3 000 registros (~8.2 ms, RNF-03): **verificado**.
- Resultados reales ejecutados localmente:
  - `npm run lint` (`oxlint`): **0 errores** y **0 advertencias nuevas** (solo las 6 advertencias preexistentes en `main`).
  - `npm test` (`tests/*.test.js`): **22/22 pruebas aprobadas** (incluye `tests/HU-27.test.js`).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (incluye 4 pruebas en `src/services/statisticsMetrics.test.js`).
  - `npm run build` (`vite build`): **compilación exitosa** (`66 modules transformed`).
- **Pendiente de validación manual:** revisión visual e interactiva en pantallas de teléfono móvil (apilado vertical sin desplazamiento lateral, contraste exterior y controles táctiles >= 48 px) y escritorio sobre `/estadisticas`.

## Límites e integración

El repositorio no cuenta con un catálogo cantonal de distritos o sectores geográficos, por lo que no se inventan filtros por sector. El tablero calcula las métricas sobre los reportes almacenados localmente en IndexedDB v2 de este navegador, sin servidor central ni exportación de archivos (alcance propio de HU-28).
