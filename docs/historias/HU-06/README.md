# HU-06 — Alerta ciudadana de posible duplicado

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: 2.
- Requerimiento: RF-04.
- Estimación del documento: 8 puntos de historia.
- Rama: feature/hu-06-alerta-duplicados.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Implementar la alerta preventiva al ciudadano ante un posible reporte duplicado. Este resumen procede de la asignación de HU-06; no sustituye el texto completo ni los criterios de aceptación de RF-04 y HU-06. Antes de programar, leer esos criterios en la especificación vigente y trasladar sus reglas verificadas a las pruebas. No inventar radios geográficos, ventanas temporales, categorías, estados elegibles ni umbrales de similitud.

## Trabajo a desarrollar

1. Definir con HU-07 un contrato compartido para consultar posibles duplicados y representar sus resultados, aplicando las reglas documentadas.
2. Integrar la alerta en el recorrido ciudadano en el punto indicado por la especificación, antes de confirmar un nuevo registro cuando corresponda.
3. Presentar las coincidencias como posibles duplicados, sin afirmar que la proximidad por sí sola demuestra que son el mismo incidente.
4. Implementar las opciones ciudadanas que autorice el documento. No imponer bloqueos, crear adhesiones ni consolidar expedientes automáticamente por decisión técnica.
5. Distinguir ausencia de coincidencias, búsqueda en curso y fallo de consulta. No representar un error como resultado negativo.
6. Evitar publicaciones repetidas al coordinar comprobación, aviso y registro. Conservar la evidencia capturada mientras se resuelve la interacción.

## Base y coordinación

La captura rápida ya existe. HomePage.jsx publica la foto después de seleccionarla y permite publicar audio manualmente o al agotarse el temporizador. La incorporación de una comprobación preventiva debe coordinarse con estos tres caminos; no permitir que uno omita la comprobación por accidente ni revertir los ajustes visuales heredados.

- src/pages/HomePage.jsx: integración del flujo ciudadano; coordinar con HU-01 y HU-02.
- src/services/reportRepository.js: consulta y registro compartidos; acordar cambios de datos antes de modificar el contrato.
- src/services/geolocation.js: reutilizar coordenadas reales y manejar permisos o fallos sin inventar ubicación.
- HU-07, Jason Martínez: compartir lógica de detección, sin duplicar reglas en la consola municipal.
- HU-08, Jason Martínez: la consolidación en reporte maestro pertenece a esa historia.
- HU-10, Joan Cordero: coordinar el enlace con adhesión si la especificación lo contempla, sin implementarla aquí.

Las rutas de nuevos módulos son una decisión de implementación a acordar; separar la detección de duplicados de los componentes de interfaz.

## Validación técnica propuesta

- Preparar datos de prueba que cubran coincidencias, ausencia de coincidencias y los límites exactos que establezca la especificación.
- Verificar que la alerta aparezca en los recorridos de fotografía, audio manual y finalización automática cuando corresponda.
- Comprobar que un fallo de búsqueda no produzca un mensaje falso de ausencia de duplicados.
- Verificar conservación de evidencia y ausencia de tickets duplicados por pulsaciones repetidas.
- Comprobar que HU-06 y HU-07 obtengan resultados coherentes para los mismos datos y reglas.
- Documentar en el pull request los criterios completos contrastados, pruebas manuales, npm run lint y npm run build, con resultados reales.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales del documento.

## Límites e integración

Esta rama prepara la funcionalidad dentro del prototipo local, sin backend, motor municipal real ni autenticación productiva. No usar datos personales reales ni añadir notas académicas a las pantallas.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-06. No hacer push directo a main. Actualizar la rama con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. No declarar la historia terminada por crear esta rama o su README.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
