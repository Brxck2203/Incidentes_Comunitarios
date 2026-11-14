# HU-08 — Consolidación de casos en reporte maestro

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: 2.
- Requerimiento: RF-05.
- Estimación del documento: 8 puntos de historia.
- Rama: feature/hu-08-consolidar-reportes.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Permitir consolidar expedientes relacionados en un reporte maestro. Este resumen procede de la asignación de HU-08; no sustituye el texto completo ni los criterios de aceptación de RF-05 y HU-08. Antes de implementar, consultar la especificación vigente y documentar las reglas verificadas de selección, elegibilidad, conservación de información y resultado de la consolidación. No inventar estados ni reglas sobre elección o creación del maestro.

## Trabajo a desarrollar

1. Permitir seleccionar y revisar los expedientes que se consolidarán conforme al recorrido documentado.
2. Aplicar la regla documentada para establecer el reporte maestro y vincular los casos relacionados.
3. Conservar la trazabilidad entre tickets originales y maestro, sin eliminar evidencia ni reemplazar identificadores de manera destructiva.
4. Realizar los cambios relacionados como una operación consistente: si falla el guardado, no dejar una consolidación parcial ni mostrar confirmación falsa.
5. Registrar la operación en la bitácora con la información exigida por la especificación.
6. Exponer un contrato de consulta para que HU-09 pueda mostrar el avance de reportes consolidados.
7. Gestionar selecciones inválidas, expedientes inexistentes y acciones repetidas, sin generar relaciones inconsistentes.

Los puntos de integridad y manejo de errores son orientaciones técnicas; contrastar el comportamiento de negocio y los criterios completos antes de cerrar la historia.

## Base y coordinación

La base incorpora registros individuales, tickets, evidencias, bitácora y una recepción local. Esto no acredita que exista consolidación en reporte maestro. Conservar el código heredado y desarrollar la operación en módulos separados de la interfaz cuando corresponda.

- HU-07, Jason Martínez: el indicador propone posibles duplicados; no debe consolidar automáticamente por sí solo.
- HU-06, Joan Cordero: la alerta ciudadana pertenece a esa historia y no confirma equivalencia entre incidentes.
- HU-09, Jason Martínez: acordar la relación entre tickets originales y maestro y el contrato para consultar el avance.
- HU-11, Brack Rivas: coordinar dónde se integra la selección y revisión en la consola municipal.
- HU-10, Joan Cordero: coordinar cómo se relacionan adhesiones y consolidación según la especificación, sin implementar adhesión aquí.
- src/services/reportRepository.js: coordinar cambios de estructura y transacciones; conservar compatibilidad con registros existentes o acordar una migración.
- src/pages/ReportsPage.jsx y src/pages/ReportDetailPage.jsx: puntos actuales de consulta; no reescribir unilateralmente la consola o el detalle.

Las rutas de nuevos componentes y servicios son decisiones de implementación a acordar, no requisitos documentales.

## Validación técnica propuesta

- Consolidar casos elegibles y comprobar la relación persistida con el maestro.
- Verificar conservación de tickets, evidencias e información exigida por el documento.
- Recargar y consultar tanto el maestro como los tickets relacionados.
- Simular un fallo durante el guardado y comprobar ausencia de cambios parciales.
- Repetir la acción y comprobar que no se dupliquen vínculos ni se genere una relación inválida.
- Probar ticket inexistente, selección inválida y datos previos a la incorporación de consolidación.
- Comprobar el contrato de seguimiento que utilizará HU-09 y la integración acordada con HU-11.
- Registrar en el pull request criterios contrastados, pruebas manuales, npm run lint y npm run build, con resultados reales.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales de la especificación.

## Límites e integración

Implementar el comportamiento demostrable sobre almacenamiento local, sin backend ni autorización municipal productiva. No usar datos personales reales ni añadir notas académicas a las pantallas. No implementar en esta historia detección, adhesión, admisión, desestimación ni priorización.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-08. No hacer push directo a main. Actualizar con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. Crear la rama y este README no significa que la historia esté implementada.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
