# HU-13 — Desestimación motivada con causal obligatoria

## Asignación

- Responsable: Brack Rivas Hernández.
- Sprint: 2.
- Requerimiento: RF-08.
- Estimación del documento: 3 puntos de historia.
- Rama: feature/hu-13-desestimacion-reportes.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Permitir desestimar un reporte mediante una decisión motivada con causal obligatoria. Este resumen procede de la asignación de HU-13; no sustituye el texto completo ni los criterios de aceptación de RF-08 y HU-13. Antes de implementar, verificar en la especificación las causales, campos, estados elegibles, transición resultante y visibilidad de la decisión. No inventar catálogos, transiciones ni reglas de reapertura.

## Trabajo a desarrollar

1. Permitir revisar el expediente y acceder a la desestimación desde el recorrido municipal autorizado por la especificación.
2. Solicitar y validar la causal obligatoria y la motivación en los términos exactos que establezca el documento. No aceptar valores vacíos o compuestos únicamente por espacios cuando corresponda texto obligatorio.
3. Guardar la decisión y el cambio de estado sobre el mismo reporte, conservando ticket, evidencias y trazabilidad. Desestimar no equivale a borrar el expediente.
4. Registrar la operación en la bitácora con los datos exigidos y mostrar la información de la decisión conforme al documento.
5. Confirmar únicamente después de un guardado satisfactorio y evitar cambios parciales o acciones repetidas inconsistentes.
6. Gestionar reporte inexistente, estado no elegible y fallos de persistencia sin mostrar éxito falso; conservar los datos introducidos para reintentar.

## Base y coordinación

La base incluye consulta de reportes, evidencias y bitácora local. No acredita que exista desestimación. Conservar lo heredado y separar la operación de dictamen de los componentes de interfaz.

- HU-11, Brack Rivas: acordar acceso e integración desde la consola; esta rama parte de main y debe actualizarse con las dependencias integradas antes de cerrar el trabajo.
- HU-12, Brack Rivas: compartir las reglas de transición acordadas, sin duplicar ni implementar admisión en esta historia.
- HU-09, Jason Martínez: coordinar representación del resultado en seguimiento de reportes consolidados cuando corresponda.
- HU-08, Jason Martínez: verificar reglas de desestimación para maestro y reportes relacionados antes de aplicar cambios.
- HU-14, Joan Cordero: coordinar el tratamiento de reportes desestimados según la especificación, sin imponer efectos de prioridad no documentados.
- src/pages/ReportsPage.jsx y src/pages/ReportDetailPage.jsx: puntos actuales de consulta; evitar sobrescribir la consola o la complementación.
- src/services/reportRepository.js: acordar operación de desestimación, validaciones y persistencia consistente antes de modificar el contrato compartido.

Las rutas de nuevos módulos son decisiones técnicas a acordar, no requisitos documentales.

## Validación técnica propuesta

- Desestimar un reporte elegible con la causal y motivación exigidas; comprobar estado, decisión y bitácora tras recargar.
- Intentar confirmar sin causal y con texto obligatorio vacío o de espacios; comprobar rechazo sin transición indebida.
- Verificar conservación de ticket, evidencias e información previa.
- Probar reporte inexistente y estado no elegible.
- Repetir la acción y simular fallos de guardado sin cambios parciales, pérdida del borrador ni éxito falso.
- Comprobar integración con HU-11 y coherencia con las reglas compartidas de HU-12.
- Verificar visibilidad de la decisión y tratamiento de consolidación según la especificación.
- Registrar criterios completos contrastados, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales del documento.

## Límites e integración

Representar la decisión con datos locales, sin backend ni autorización municipal productiva. No usar datos personales reales ni añadir notas académicas a las pantallas. No desarrollar aquí admisión, priorización, consolidación, eliminación de expedientes ni notificaciones externas.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-13. No hacer push directo a main. Actualizar con main antes de integrar, coordinar archivos compartidos y solicitar revisión de otro integrante. Crear la rama y este README no significa que la historia esté implementada.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
