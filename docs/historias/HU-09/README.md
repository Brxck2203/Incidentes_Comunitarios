# HU-09 — Seguimiento ciudadano de reportes consolidados

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: 2.
- Requerimiento: RF-05.
- Estimación del documento: 3 puntos de historia.
- Rama: feature/hu-09-seguimiento-consolidados.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Permitir al ciudadano consultar el avance de su reporte cuando esté vinculado a un reporte maestro por consolidación. Este resumen procede de la asignación de HU-09; no sustituye el texto completo ni los criterios de aceptación de RF-05 y HU-09. Antes de implementar, consultar la especificación vigente y verificar qué información, estados e historial deben mostrarse. No inventar reglas de sincronización ni estados de negocio.

## Trabajo a desarrollar

1. Permitir consultar el reporte a partir de su ticket original y reconocer su relación con el maestro conforme al contrato de HU-08.
2. Mostrar el avance y la información de seguimiento que establezca la especificación, distinguiendo los datos propios del reporte original de los del maestro.
3. Mantener la trazabilidad del ticket original; no sustituirlo ni crear un reporte nuevo para consultar el avance.
4. Consultar los datos vigentes del maestro según el contrato acordado, evitando mostrar copias desactualizadas como si fueran el estado actual.
5. Gestionar reporte inexistente, vínculo inválido, maestro no disponible y fallos de consulta sin inventar un avance o un estado.
6. Mantener la consulta de reportes no consolidados y preservar acceso a sus evidencias e información previa.

## Base y coordinación

La base ya incluye Mis reportes, detalle individual, evidencias y bitácora local. No acredita seguimiento de consolidación: la relación con un maestro requiere el trabajo de HU-08. Esta rama se crea desde main, no desde la rama de HU-08; acordar el contrato primero y actualizar con main una vez integrada la dependencia. No copiar implementación entre ramas sin coordinar.

- HU-08, Jason Martínez: dependencia principal; acordar relación entre tickets, maestro y datos de seguimiento.
- HU-03, Jason Martínez: conservar la complementación y evitar que una consulta reescriba información.
- HU-04, Joan Cordero: preservar consulta de audio y fotografías.
- HU-10, Joan Cordero: coordinar la distinción entre adhesión y consolidación, sin implementar adhesión aquí.
- HU-11, Brack Rivas: coordinar coherencia entre la información municipal y la consulta ciudadana.
- src/pages/ReportsPage.jsx y src/pages/ReportDetailPage.jsx: puntos actuales de integración; evitar reescribir las páginas completas.
- src/services/reportRepository.js: lectura de vínculos y seguimiento; acordar cambios del contrato compartido.

Separar la consulta de seguimiento de la operación que consolida expedientes. Las rutas de nuevos módulos son decisiones de implementación a acordar, no requisitos documentales.

## Validación técnica propuesta

- Consultar mediante un ticket original después de consolidarlo y comprobar el seguimiento documentado.
- Actualizar el avance del maestro mediante el flujo autorizado y comprobar su representación al volver a consultar.
- Verificar conservación del ticket original, evidencias y datos propios del reporte.
- Consultar un reporte no consolidado y comprobar que mantenga su funcionamiento.
- Probar vínculo inválido, maestro inexistente y fallo de lectura sin mostrar estados inventados.
- Recargar y comprobar persistencia y coherencia del seguimiento.
- Verificar que consultar no modifique tickets, agrupaciones ni estados.
- Registrar criterios completos contrastados, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales de la especificación.

## Límites e integración

Implementar el seguimiento demostrable con datos locales, sin backend, notificaciones externas ni separación autenticada de ciudadanos. No usar datos personales reales ni añadir notas académicas a las pantallas. No desarrollar aquí consolidación, adhesión, admisión, desestimación ni priorización.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-09. No hacer push directo a main. Actualizar con main antes de integrar, resolver dependencias y solicitar revisión de otro integrante. Crear la rama y este README no significa que la historia esté implementada.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
