# HU-05 — Ajuste manual de ubicación sobre mapa interactivo

## Asignación

- Responsable: Brack Rivas Hernández.
- Sprint: 1.
- Requerimiento: RF-03.
- Estimación del documento: 5 puntos de historia.
- Rama: feature/hu-05-ajuste-ubicacion.
- Base de creación: main, commit e177150101139574b19be1189627f110f2345219.
- Fuente de asignación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación de referencia: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo de la historia

Permitir al ciudadano ajustar la ubicación del incidente sobre un mapa interactivo, partiendo de las coordenadas obtenidas del dispositivo y conservando el mismo reporte. Este objetivo resume la asignación de HU-05; no sustituye el texto completo ni los criterios de aceptación de la especificación vigente.

## Qué corresponde implementar, completar y validar

1. Mostrar la ubicación del reporte mediante un marcador sobre el mapa.
2. Permitir arrastrar el marcador durante la edición para precisar el punto del incidente.
3. Reflejar las coordenadas seleccionadas y validar que sean finitas y estén dentro de los rangos geográficos admitidos.
4. Guardar la posición confirmada sobre el mismo ticket y conservar la posición original capturada por el dispositivo.
5. Permitir cancelar sin persistir el desplazamiento provisional del marcador.
6. Registrar la actualización y mantener la posición corregida al recargar y consultar el reporte.
7. Gestionar fallos de carga del mapa y de persistencia sin confirmar cambios que no se guardaron.
8. Coordinar que la edición de descripción o categoría no sobrescriba una corrección de ubicación ya guardada.

## Punto de partida existente

La base ya utiliza Leaflet con cartografía de calles de OpenStreetMap, marcador arrastrable, coordenadas visibles, guardado y cancelación desde el detalle. El repositorio conserva position y originalPosition y valida coordenadas. Revisar y completar estos elementos, sin rehacerlos ni declarar pruebas aprobadas antes de ejecutarlas.

El mapa requiere conexión para cargar sus teselas. No incluye imágenes satelitales ni geocodificación. La exactitud original depende del dispositivo y se conserva en accuracy; el ajuste manual no debe presentarse como una nueva medición GPS.

Preservar los ajustes de tarjetas, cámara y micrófono del commit base. No modificar la captura rápida para resolver trabajo ajeno a HU-05.

## Archivos y coordinación

- src/components/LocationMap.jsx: marcador, interacción y ciclo de vida del mapa.
- src/pages/ReportDetailPage.jsx: borrador de ubicación, guardar y cancelar; coordinar con Jason, responsable de HU-03.
- src/services/reportRepository.js: validación, persistencia y conservación de posición original; acordar cambios en el contrato compartido.
- src/services/geolocation.js: coordinar el formato de coordenadas con HU-01 y HU-02; no reemplazar la captura automática por una ubicación inventada.
- src/App.css: presentación del mapa y marcador, limitando cambios globales.

HU-02 corresponde a fotografía y ubicación automática. HU-03 corresponde a complementación de información. Esta historia se centra en corregir la ubicación; no desarrollar aquí la consola municipal de HU-11 ni despacho real a cuadrillas.

## Comprobaciones propuestas para el pull request

Estas comprobaciones son una guía técnica; contrastarlas con los criterios completos de la especificación antes de cerrar HU-05.

- Abrir un reporte y comprobar correspondencia entre coordenadas y marcador.
- Arrastrar el marcador, guardar y comprobar las coordenadas persistidas tras recargar.
- Confirmar que originalPosition y el ticket permanezcan intactos.
- Arrastrar y cancelar; comprobar que se mantenga la posición previamente guardada.
- Repetir movimientos, guardados y entradas a edición para detectar reinicios inesperados del marcador.
- Simular un fallo de persistencia y comprobar que no se muestre éxito falso ni se pierda el ajuste provisional.
- Probar sin carga de teselas y comprobar que la información del reporte siga disponible y el error se comunique.
- Guardar descripción o categoría después de corregir ubicación y comprobar que la corrección no se revierta.
- Revisar interacción táctil, zoom, foco y accesibilidad; evaluar una alternativa al arrastre si es necesaria, sin declarar cumplimiento de RNF-01 sin validación.
- Ejecutar npm run lint y npm run build y registrar resultados reales en el pull request.

## Límites y reglas de integración

La actualización utiliza almacenamiento local, sin backend ni envío real de coordenadas a un servidor municipal. No usar datos personales reales ni añadir notas académicas a las pantallas.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-05, cambios, pruebas y limitaciones. No hacer push directo a main. Actualizar con main antes de integrar y solicitar revisión de otro integrante. No implementar historias ajenas ni atribuir el código heredado como desarrollo nuevo.

Este README utiliza una ruta propia de la historia para conservar el README general y evitar sobrescribir los documentos de otras ramas al fusionar.
