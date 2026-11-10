# HU-11 — Consola municipal centralizada con lista y mapa

## Asignación

- Responsable: Brack Rivas Hernández.
- Sprint: 2.
- Requerimiento: RF-07.
- Estimación del documento: 8 puntos de historia.
- Rama: feature/hu-11-consola-municipal.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Implementar la consola municipal de recepción centralizada mediante lista y mapa. Este resumen procede de la asignación de HU-11; no sustituye el texto completo ni los criterios de aceptación de RF-07 y HU-11. Antes de programar, consultar la especificación vigente para verificar campos, filtros, ordenación, estados y comportamiento entre vistas. No añadir reglas de negocio ni declarar requisitos que el documento no contemple.

## Trabajo a desarrollar

1. Presentar los reportes en la lista centralizada con los datos y controles que exija la especificación.
2. Representar los incidentes en el mapa conforme a sus coordenadas guardadas, sin inventar ubicaciones para registros incompletos.
3. Mantener coherencia entre el conjunto de reportes consultado en lista y mapa según los criterios documentados.
4. Permitir consultar el expediente y sus evidencias desde la consola mediante el recorrido definido.
5. Distinguir carga, conjunto vacío, datos incompletos y error de consulta o cartografía. No bloquear toda la recepción cuando falle una tesela.
6. Definir puntos de integración para los componentes de otras historias, sin implementar en esta rama sus operaciones de negocio.
7. Conservar la consulta ciudadana y los ajustes de captura rápida existentes.

## Punto de partida existente

ReportsPage.jsx ya ofrece una vista local de Recepción con listado, acceso al detalle y consulta periódica de actualizaciones. LocationMap.jsx muestra la ubicación de un reporte individual. Estos elementos no constituyen una consola completa con mapa de incidentes: reutilizar lo útil y completar únicamente HU-11, sin presentar el código heredado como nuevo.

El mapa individual de HU-05 permite corregir una ubicación; no habilitar accidentalmente edición de coordenadas en el mapa general de recepción. La base utiliza Leaflet y cartografía de calles de OpenStreetMap, con conexión necesaria para las teselas.

## Archivos y coordinación

- src/pages/ReportsPage.jsx: recepción actual; separar la consola en componentes propios si ayuda a no afectar Mis reportes.
- src/components/LocationMap.jsx: evaluar reutilización sin romper el mapa individual de HU-05; el mapa multirreporte puede requerir un componente específico.
- src/pages/ReportDetailPage.jsx y src/components/Evidence.jsx: reutilizar consulta de expediente y evidencias sin sobrescribir HU-03 y HU-04.
- src/services/reportRepository.js: acordar el contrato de consulta y cualquier evolución de datos antes de modificarlo.
- src/App.jsx y src/layouts/MainLayout.jsx: coordinar rutas y navegación, limitando cambios a la consola.
- HU-07, Jason Martínez: reservar un punto de integración para el indicador de posibles duplicados.
- HU-08, Jason Martínez: coordinar selección y acceso a consolidación sin implementarla aquí.
- HU-12 y HU-13, Brack Rivas: acordar acceso a admisión y desestimación, manteniendo sus operaciones separadas.
- HU-14, Joan Cordero: acordar presentación e integración de prioridad sin duplicar su cálculo.

Las rutas de nuevos módulos y la división de componentes son decisiones técnicas a acordar, no requisitos documentales.

## Validación técnica propuesta

- Consultar un conjunto de reportes y comprobar datos de la lista y posiciones del mapa.
- Aplicar los controles documentados y verificar coherencia entre vistas.
- Abrir un expediente desde el recorrido previsto y consultar sus evidencias.
- Probar conjunto vacío, coordenadas ausentes o inválidas, error de lectura y fallo de cartografía sin posiciones ficticias.
- Comprobar que el mapa general no modifique por accidente la ubicación del reporte.
- Verificar que Mis reportes y la captura rápida sigan funcionando.
- Revisar integración de componentes de otras historias cuando estén disponibles, sin declararlos implementados por mostrar accesos.
- Revisar móvil, teclado, foco y nombres accesibles.
- Registrar criterios completos contrastados, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales del documento.

## Límites e integración

La consola representa el rol municipal con datos locales; no tiene backend ni autorización municipal real. No usar datos personales reales ni añadir notas académicas a las pantallas. No desarrollar aquí detección, consolidación, admisión, desestimación ni cálculo de prioridad.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-11. No hacer push directo a main. Actualizar con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. Crear la rama y este README no significa que la historia esté implementada.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
