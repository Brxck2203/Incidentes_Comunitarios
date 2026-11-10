# HU-12 — Inspección técnica y admisión formal a trámite

## Asignación

- Responsable: Brack Rivas Hernández.
- Sprint: 2.
- Requerimiento: RF-08.
- Estimación del documento: 3 puntos de historia.
- Rama: feature/hu-12-admision-reportes.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Permitir la inspección técnica del expediente y el dictamen de admisión formal a trámite. Este resumen procede de la asignación de HU-12; no sustituye el texto completo ni los criterios de aceptación de RF-08 y HU-12. Antes de implementar, verificar en la especificación los datos a inspeccionar, condiciones de admisión, campos obligatorios, estados de origen y destino y registro del dictamen. No inventar transiciones ni validaciones de negocio.

## Trabajo a desarrollar

1. Permitir consultar la información y evidencias del expediente necesarias para la inspección documentada.
2. Presentar la acción de admisión en el recorrido municipal y bajo las condiciones que autorice la especificación.
3. Validar los datos exigidos y persistir el dictamen y la transición correspondiente sobre el mismo reporte.
4. Conservar ticket, evidencia y trazabilidad, registrando la operación en la bitácora según el documento.
5. Confirmar admisión únicamente después de guardar correctamente. Evitar cambios parciales y repeticiones inconsistentes.
6. Gestionar reporte inexistente, estado no elegible, datos incompletos y fallos de lectura o guardado sin mostrar éxito falso.

## Base y coordinación

La base incorpora Recepción local, detalle, evidencias y bitácora; el estado inicial Registrado / Recibido no demuestra admisión técnica. No equiparar automáticamente publicación con admisión. La existencia de esta rama tampoco acredita que HU-12 esté implementada.

- HU-11, Brack Rivas: acordar el punto de acceso desde la consola; esta rama parte de main y debe actualizarse con la dependencia integrada antes de cerrar el trabajo.
- HU-13, Brack Rivas: acordar las reglas de dictamen y transiciones compartidas; no implementar desestimación aquí.
- HU-14, Joan Cordero: acordar cómo se relacionan admisión y priorización conforme al documento; no duplicar el cálculo ni asumir su orden sin verificarlo.
- HU-08 y HU-09, Jason Martínez: coordinar el tratamiento y consulta de expedientes consolidados cuando corresponda.
- src/pages/ReportDetailPage.jsx y src/components/Evidence.jsx: reutilizar consulta sin sobrescribir complementación o reproductor.
- src/services/reportRepository.js: acordar operación de admisión y persistencia consistente, preservando contratos y registros previos.

Separar la lógica del dictamen de la interfaz. Las rutas de nuevos módulos son decisiones técnicas a acordar, no requisitos documentales.

## Validación técnica propuesta

- Inspeccionar y admitir un reporte elegible conforme a los criterios completos de la especificación.
- Comprobar estado resultante, dictamen, bitácora y conservación del ticket y evidencias tras recargar.
- Probar datos obligatorios ausentes y estados no elegibles sin cambios indebidos.
- Probar pulsaciones repetidas y fallos de persistencia sin transiciones parciales ni confirmaciones falsas.
- Verificar integración con HU-11 y coherencia con HU-13 y HU-14 cuando sus contratos estén disponibles.
- Comprobar que abrir un reporte para inspección no lo admita automáticamente.
- Registrar criterios contrastados, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales del documento.

## Límites e integración

Representar el flujo municipal con datos locales, sin backend ni autorización real por funcionario. No usar datos personales reales ni añadir notas académicas a las pantallas. No desarrollar aquí desestimación, priorización, consolidación ni despacho de cuadrillas.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-12. No hacer push directo a main. Actualizar con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. No atribuir el código heredado como desarrollo nuevo.

Este README usa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
