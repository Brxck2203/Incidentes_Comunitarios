# HU-10 — Adhesión ciudadana a un reporte existente

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: 2.
- Requerimiento: RF-06.
- Estimación del documento: 3 puntos de historia.
- Rama: feature/hu-10-adhesion-ciudadana.
- Base: main, commit e177150101139574b19be1189627f110f2345219.
- Planificación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo

Permitir que un ciudadano se adhiera a un reporte preexistente para confirmar su afectación. Este resumen procede de la asignación de HU-10; no sustituye el texto completo ni los criterios de aceptación de RF-06 y HU-10. Antes de implementar, consultar la especificación vigente y verificar elegibilidad, identificación del ciudadano, repetición de adhesiones y datos que deben mostrarse. No inventar reglas de identidad, contadores ni efectos sobre prioridad.

## Trabajo a desarrollar

1. Presentar la acción de adhesión en el recorrido y para los reportes que autorice la especificación.
2. Registrar la adhesión vinculada al reporte existente, sin crear un ticket de incidente nuevo ni consolidar expedientes por esa acción.
3. Mostrar la confirmación y la información de adhesión que establezca el documento únicamente después de guardar correctamente.
4. Gestionar pulsaciones repetidas y aplicar las reglas documentadas sobre adhesiones repetidas del mismo ciudadano.
5. Distinguir reporte no disponible, acción no permitida y fallo de persistencia; no mostrar éxito falso.
6. Conservar la información previa del reporte y coordinar el tratamiento de adhesiones cuando exista consolidación.

## Base y coordinación

La base ya incluye reportes individuales, consulta de detalle y almacenamiento local. No acredita que exista adhesión ciudadana. Actualmente no hay autenticación ni identidad separada por ciudadano: acordar y documentar cómo se representará la identidad de prueba si el criterio requiere distinguir personas. Una identidad local no demuestra unicidad de personas ni seguridad productiva.

- HU-06, Joan Cordero: coordinar el acceso desde la alerta preventiva cuando lo contemple la especificación, sin duplicar detección.
- HU-08, Jason Martínez: acordar a qué registro se asocia la adhesión cuando hay un maestro y cómo se conserva la trazabilidad.
- HU-09, Jason Martínez: coordinar consulta y seguimiento sin confundir adhesión con consolidación.
- HU-11, Brack Rivas: coordinar la representación municipal de la información que exija el documento.
- HU-14, Joan Cordero: no modificar prioridad por adhesiones salvo regla explícita de la especificación.
- src/pages/ReportDetailPage.jsx: posible integración de la acción; coordinar con complementación y evidencias.
- src/services/reportRepository.js: persistencia y consulta; acordar cambios del contrato antes de implementarlos.

Separar la operación de adhesión de los componentes de interfaz. Las rutas de nuevos módulos son decisiones de diseño a acordar, no requisitos documentales.

## Validación técnica propuesta

- Adherirse a un reporte elegible y comprobar el registro y la confirmación definidos en la especificación.
- Recargar y verificar la persistencia sin creación de un nuevo ticket de incidente.
- Repetir la acción y comprobar la regla documental de adhesiones repetidas, incluyendo pulsaciones rápidas.
- Probar reporte inexistente o no elegible y fallos de guardado sin confirmaciones falsas.
- Comprobar que la acción no altere evidencias, ticket ni estado por reglas no documentadas.
- Verificar el tratamiento acordado para reportes consolidados y la representación de identidad de prueba.
- Revisar accesibilidad, foco y claridad del estado de la acción.
- Registrar criterios completos contrastados, pruebas manuales, npm run lint y npm run build con resultados reales en el pull request.

Estas comprobaciones son propuestas técnicas, no criterios textuales adicionales de la especificación.

## Límites e integración

Implementar el comportamiento demostrable con datos locales, sin backend ni autenticación productiva. No usar datos personales reales ni añadir notas académicas a las pantallas. No desarrollar aquí detección de duplicados, consolidación, admisión, desestimación ni cálculo de prioridad.

Trabajar únicamente en esta rama y abrir pull request hacia main con referencia a HU-10. No hacer push directo a main. Actualizar con main antes de integrar, coordinar dependencias y solicitar revisión de otro integrante. Crear la rama y este README no significa que la historia esté implementada.

Este README ocupa una ruta propia para conservar el README general y no sobrescribir documentos de otras historias al fusionar.
