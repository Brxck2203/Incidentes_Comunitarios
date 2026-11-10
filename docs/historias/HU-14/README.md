# HU-14 — Calificación de severidad y cálculo de prioridad

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: 2.
- Requerimiento: RF-09.
- Estimación del documento: 5 puntos de historia.
- Rama: feature/hu-14-priorizacion.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Permitir la calificación de severidad y el cálculo de prioridad de los incidentes. Este resumen procede de la asignación de HU-14; no sustituye el texto completo ni los criterios de aceptación de RF-09 y HU-14. Antes de implementar, consultar la especificación vigente y verificar factores, escalas, fórmula o matriz, ponderaciones, estados elegibles y reglas de modificación. No inventar valores ni presentar una fórmula propuesta como requisito aprobado.

## Trabajo a desarrollar

1. Presentar los datos y controles de calificación exigidos por la especificación, validando entradas obligatorias y valores admitidos.
2. Separar la calificación de severidad del cálculo de prioridad, respetando su relación documental.
3. Implementar el cálculo documentado en lógica de negocio independiente de la interfaz, reutilizable y comprobable.
4. Persistir los datos de calificación y el resultado exigido sobre el mismo reporte, conservando ticket y trazabilidad.
5. Mostrar el resultado en la consola según el recorrido acordado con HU-11, sin alterar estados u ordenaciones por reglas no documentadas.
6. Confirmar únicamente después de guardar correctamente y gestionar datos incompletos, reporte inexistente y fallos de persistencia sin éxito falso.
7. Registrar modificaciones y recalcular solo cuando lo establezcan las reglas documentadas.

## Base y coordinación

La base incorpora reportes, categorías, ubicación, evidencias, recepción local y bitácora. No acredita que exista calificación ni cálculo de prioridad. No deducir severidad automáticamente de la categoría, proximidad o cantidad de adhesiones salvo regla explícita de la especificación.

- HU-11, Brack Rivas: acordar componentes, datos y punto de integración de la calificación y el resultado en la consola.
- HU-12 y HU-13, Brack Rivas: acordar elegibilidad y relación entre dictamen y prioridad; no asumir el orden de operaciones sin verificarlo.
- HU-10, Joan Cordero: verificar si la adhesión interviene en el cálculo; no imponer ese efecto por decisión técnica.
- HU-08 y HU-09, Jason Martínez: acordar tratamiento del maestro, reportes relacionados y datos visibles en seguimiento cuando corresponda.
- src/services/reportRepository.js: acordar campos, validaciones, persistencia y compatibilidad con registros previos.
- src/pages/ReportsPage.jsx y src/pages/ReportDetailPage.jsx: puntos actuales de integración; evitar reescribir las páginas completas.

Esta rama parte de main, no de las otras ramas funcionales. Acordar contratos primero y actualizar con main cuando las dependencias se integren. Las rutas de nuevos módulos son decisiones técnicas a acordar, no requisitos documentales.

## Validación técnica propuesta

- Construir casos con resultados esperados derivados de la fórmula o matriz exacta de la especificación.
- Probar valores límite y combinaciones relevantes de factores, incluyendo datos ausentes o inválidos.
- Verificar resultados consistentes para las mismas entradas y ausencia de dependencias ocultas de la interfaz.
- Guardar, recargar y comprobar factores, resultado y trazabilidad, conservando ticket y evidencias.
- Simular fallos de guardado y comprobar ausencia de cambios parciales y confirmaciones falsas.
- Verificar integración con HU-11 y elegibilidad acordada con HU-12 y HU-13.
- Comprobar tratamiento de consolidación y adhesiones únicamente conforme a reglas verificadas.
- Presentar etiquetas comprensibles y no depender solo del color para comunicar prioridad.
- Registrar criterios completos contrastados, pruebas del cálculo, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales del documento.

## Límites e integración

Implementar el comportamiento demostrable con datos locales, sin backend ni autorización municipal productiva. No usar datos personales reales ni añadir notas académicas a las pantallas. No desarrollar aquí admisión, desestimación, consolidación, adhesión ni despacho de cuadrillas.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-14. No hacer push directo a main. Actualizar con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. Crear la rama y este README no significa que la historia esté implementada.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
