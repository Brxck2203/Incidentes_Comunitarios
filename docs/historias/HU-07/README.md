# HU-07 — Indicador municipal de posible duplicado

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: 2.
- Requerimiento: RF-04.
- Estimación del documento: 5 puntos de historia.
- Rama: feature/hu-07-indicador-duplicados.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Mostrar al personal municipal un indicador de posible duplicidad en la consola de recepción. Este resumen procede de la asignación de HU-07; no sustituye el texto completo ni los criterios de aceptación de RF-04 y HU-07. Antes de implementar, leer la especificación vigente y trasladar sus reglas verificadas a las pruebas. No inventar radios geográficos, ventanas temporales, umbrales, categorías ni estados elegibles.

## Trabajo a desarrollar

1. Consultar posibles coincidencias mediante la misma lógica de detección acordada con HU-06.
2. Presentar el indicador municipal y la información de coincidencias que establezca la especificación, sin confundir una sugerencia con una duplicidad confirmada.
3. Facilitar la revisión de los reportes relacionados conforme al recorrido documentado, preservando sus identificadores.
4. Distinguir resultados vacíos, consulta pendiente y error de detección; no interpretar un fallo como ausencia de posibles duplicados.
5. Actualizar el indicador cuando cambien los datos relevantes según el contrato acordado, evitando resultados obsoletos.
6. Mantener separadas la detección, la presentación del indicador y la decisión de consolidar. No fusionar, eliminar ni desestimar expedientes automáticamente desde esta historia.

## Base y coordinación

La base incorpora una vista local de Recepción mediante ReportsPage.jsx y acceso al detalle. No equivale a la consola municipal completa ni acredita que la detección de duplicados esté implementada. Conservar el código heredado y añadir únicamente el alcance de esta historia.

- HU-06, Joan Cordero: acordar y reutilizar un contrato de detección común; no crear criterios diferentes para ciudadano y municipalidad.
- HU-11, Brack Rivas: acordar el punto de integración y los componentes de la consola antes de editar simultáneamente la recepción.
- HU-08, Jason Martínez: coordinar el acceso a la consolidación; la creación del reporte maestro pertenece a esa historia.
- src/pages/ReportsPage.jsx: integración actual de Recepción; evitar reescribir la página completa.
- src/pages/ReportDetailPage.jsx: consulta de casos relacionados si el recorrido lo requiere; preservar complementación y evidencias.
- src/services/reportRepository.js: acordar consultas y cambios del contrato compartido antes de modificarlos.

Separar el indicador en un componente propio y la detección en un servicio compartido si ayuda a evitar solapamientos. Las rutas de nuevos módulos son propuestas de diseño a acordar, no requisitos del documento.

## Validación técnica propuesta

- Preparar casos con y sin coincidencias, y límites exactos derivados de la especificación.
- Comprobar coherencia entre el resultado ciudadano de HU-06 y el indicador municipal para los mismos datos y reglas.
- Comprobar que el indicador no cambie por sí solo el ticket, estado o agrupación de los reportes.
- Verificar acceso a la información de coincidencias y retorno a la consola sin perder el contexto necesario.
- Probar fallos de consulta sin mostrar un resultado negativo falso.
- Verificar actualización del indicador tras cambios relevantes y su integración con HU-11.
- Revisar identificación del aviso mediante texto, no únicamente color, además de teclado y foco.
- Documentar criterios completos contrastados, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales del documento.

## Límites e integración

El prototipo utiliza datos locales y no tiene backend ni autorización municipal real. No usar datos personales reales ni añadir avisos académicos a las pantallas. No desarrollar aquí alerta ciudadana, consolidación, admisión o desestimación.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-07. No hacer push directo a main. Actualizar con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. No declarar terminada la historia por crear esta rama o su README.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
