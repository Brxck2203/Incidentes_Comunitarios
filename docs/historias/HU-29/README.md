# HU-29 — Mapa de calor de zonas con mayor concentración de incidentes

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: por confirmar.
- Requerimiento: RF-17.
- Estimación del documento: por confirmar.
- Rama: feature/hu-29-mapa-calor-incidentes.
- Base: main, commit 929589f70c3f908df655002d1a9df86c6cb4e523.

## Objetivo

Permitir a las autoridades y gestores municipales activar una vista de mapa de calor dentro del módulo de estadísticas para identificar visualmente las zonas con mayor acumulación y reincidencia histórica de reportes registrados, filtrando los puntos críticos por categoría de incidente para apoyar la planificación de mantenimientos preventivos (RF-17 / HU-29).

## Trabajo a desarrollar

1. Implementar un servicio puro de agregación espacial (`src/services/incidentHeatmap.js`) que agrupe los reportes georreferenciados en celdas de concentración y calcule niveles de intensidad cromática en una sola pasada (`O(N)`), cumpliendo RNF-03.
2. Incluir en el cálculo los reportes activos y los cerrados históricamente (`Atendido`, `Resuelto`, `Cerrado / Archivado`) para reflejar reincidencia en la zona, excluyendo expedientes en estado `Desestimado` y contando cada ticket registrado una sola vez sin duplicar conteos desde `secondaryTickets` ni `mergedEvidence`.
3. Excluir del mapa los reportes sin coordenadas válidas (`hasValidCoordinates`) sin producir errores y contabilizarlos por separado en el resumen visible.
4. Incorporar el filtro por categoría oficial (`Baches`, `Basura clandestina`, `Ramas/arbolado`, `Aceras dañadas`) junto con la opción para restablecer todas las categorías, dejando preparado en el servicio el filtrado opcional por rango de fechas (`fromDate`, `toDate`) para la integración futura de HU-30.
5. Construir el componente `src/components/IncidentHeatmapView.jsx` sobre Leaflet nativo (`L.canvas()`) con leyenda accesible de alto contraste, controles de al menos 48 px (RNF-02) y estado vacío explícito cuando no existan reportes registrados o coincidencias para la categoría elegida.
6. Proveer un punto de entrada mínimo en `/estadisticas` (`src/pages/StatisticsPage.jsx`) para activar la vista de mapa de calor mientras se integra el tablero estadístico de HU-27.

## Base y coordinación

- HU-27 (RF-16 — Tablero de métricas estadísticas): dependencia del contenedor principal del módulo de estadísticas. Como aún no está integrada en `main`, `src/pages/StatisticsPage.jsx` provee únicamente el acceso mínimo para activar el mapa de calor (marcado con `TODO: reemplazar cuando se integre HU-27`), sin implementar métricas de tiempos ni gráficos por estado.
- HU-28 (RF-16 — Exportación PDF/CSV): fuera del alcance de esta historia; no se implementan funciones de exportación aquí.
- HU-30 (RF-17 — Comparación de concentración entre periodos): `buildIncidentHeatmap` y `IncidentHeatmapView` aceptan parámetros opcionales `fromDate` y `toDate` para facilitar su extensión directa cuando se implemente HU-30.
- HU-34 (RF-19 — Restricción de acceso por rol): el control de permisos sobre rutas administrativas corresponde a HU-34 (`TODO` documentado en la vista).
- `src/App.jsx` y `src/layouts/MainLayout.jsx`: únicos archivos compartidos tocados para exponer la ruta `/estadisticas`. Los estilos propios viven en `src/components/IncidentHeatmapView.css` para no generar conflictos en `src/App.css`.

## Validación técnica ejecutada y resultados reales

- Activar la vista de mapa de calor en `/estadisticas` y comprobar que las celdas con mayor acumulación de reportes se resalten con la escala de color e intensidad correspondiente: **implementado** (`StatisticsPage.jsx` + `IncidentHeatmapView.jsx`) y **verificado en lógica de negocio** (`src/services/incidentHeatmap.test.js`).
- Filtrar por cada categoría (`Baches`, `Basura clandestina`, `Ramas/arbolado`, `Aceras dañadas`) verificando que solo se representen puntos críticos de esa categoría, y volver a «Todas las categorías» comprobando el restablecimiento completo: **verificado** (`src/services/incidentHeatmap.test.js` y `tests/HU-29.test.js`).
- Verificar que reportes `Atendido` / `Resuelto` aporten a la reincidencia histórica, que `Desestimado` quede excluido y que los casos consolidados no dupliquen el conteo: **verificado** (`tests/HU-29.test.js`).
- Comprobar el manejo seguro de `0` reportes registrados, de reportes sin coordenadas válidas (contados aparte sin fallar) y el rendimiento con 2 500 reportes georreferenciados (~18 ms, RNF-03): **verificado**.
- Resultados reales ejecutados localmente:
  - `npm run lint` (`oxlint`): **0 errores** y **0 advertencias nuevas** (solo las 6 advertencias preexistentes en `main`).
  - `npm test` (`tests/*.test.js`): **22/22 pruebas aprobadas** (incluye `tests/HU-29.test.js`).
  - `node --test src/services/*.test.js`: **29/29 pruebas aprobadas** (incluye 5 pruebas en `src/services/incidentHeatmap.test.js`).
  - `npm run build` (`vite build`): **compilación exitosa** (`67 modules transformed`).
- **Pendiente de validación manual:** inspección visual interactiva en navegador móvil y de escritorio (contraste exterior bajo luz solar directa, apertura táctil de *popups* de celda y carga real de teselas OpenStreetMap con red activa).

## Límites e integración

El repositorio no dispone de un catálogo oficial de barrios, distritos o sectores ni de geocodificación inversa; por ello, las zonas de concentración se representan como celdas geográficas con coordenadas de referencia y no se inventan nombres de barrios. El mapa utiliza teselas de OpenStreetMap (requiere conexión para cargar el fondo cartográfico) y opera sobre los datos locales de IndexedDB v2 en este navegador, sin backend ni control de acceso real por servidor (RNF-05).
