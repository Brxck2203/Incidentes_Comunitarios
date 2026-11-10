# HU-02 — Fotografía georreferenciada

## Asignación

- Responsable: Brack Rivas Hernández.
- Sprint: 1.
- Requerimiento: RF-01.
- Estimación del documento: 3 puntos de historia.
- Rama: feature/hu-02-fotografia-georreferenciada.
- Base de creación: main, commit e177150101139574b19be1189627f110f2345219.
- Fuente de asignación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit

## Historia de usuario

Como vecino que transita por la zona, quiero capturar una fotografía del problema para que se publique con mi ubicación actual en un solo paso, para que el municipio reciba la alerta aunque no tenga tiempo de dar más detalles.

## Criterios de aceptación documentales

- Al capturar una fotografía desde la interfaz de reporte rápido y presionar publicar, el sistema toma automáticamente las coordenadas del dispositivo.
- La imagen se anexa al expediente del incidente y queda inmediatamente visible para el personal municipal de recepción.

RF-01 también establece fecha/hora, ticket único, estado Registrado / Recibido y publicación sin formularios de texto obligatorios. La versión actual representa el registro y recepción mediante datos locales; no hay envío real a un servidor municipal ni separación autenticada de roles. No declarar ese criterio productivo como satisfecho por el almacenamiento local.

## Qué corresponde implementar, completar y validar

1. Permitir iniciar la captura fotográfica desde el control de cámara, conservando la interfaz visual existente.
2. Obtener y vincular la ubicación del dispositivo, la fecha/hora y la fotografía al mismo reporte, sin inventar coordenadas. Verificar la diferencia entre hora de captura, incorporación y publicación: la base solicita ubicación al publicar, y capturedAt no representa la fecha EXIF de una imagen importada.
3. Registrar sin texto obligatorio y mostrar ticket y estado únicamente después de un guardado satisfactorio.
4. Conservar la fotografía para consulta posterior y comprobar que sea accesible desde el detalle abierto por Recepción.
5. Gestionar cancelación de cámara o selector, formato no admitido, archivo vacío, permisos de ubicación denegados y errores de almacenamiento.
6. Evitar registros duplicados al coincidir publicación automática, reintentos y pulsaciones repetidas.
7. Conservar la evidencia seleccionada cuando falle el guardado o la ubicación, permitiendo reintentar sin confirmar falsamente un registro.

## Punto de partida existente

HomePage.jsx ya incorpora una tarjeta de cámara con icono, un input con capture=environment y publicación automática al seleccionar una fotografía. También existen validación de fotos, geolocalización y persistencia local. No rehacer ni revertir esos ajustes: completar y verificar el flujo.

La publicación automática tras seleccionar una foto es una decisión de la base; el criterio documental describe captura y publicación. Mantener esta distinción y validar con el equipo la interacción final. La apertura de cámara frente a selector depende del dispositivo y navegador; no certificar comportamiento móvil desde una inspección de código.

Los límites de ocho fotografías por carga y 10 MB por archivo que aparecen en el servicio son restricciones técnicas provisionales de la base, no criterios de aceptación añadidos al documento.

## Archivos y coordinación

- src/pages/HomePage.jsx: captura y publicación de fotografía; coordinar con Joan, responsable de HU-01, para no sobrescribir la captura de voz.
- src/services/geolocation.js: obtención de ubicación; coordinar su contrato con HU-01 y HU-05.
- src/services/reportRepository.js: validación y registro; acordar cambios de estructura antes de modificar operaciones compartidas.
- src/components/Evidence.jsx: visualización de la evidencia; coordinar con Joan en HU-04.
- src/pages/ReportsPage.jsx y src/pages/ReportDetailPage.jsx: comprobar acceso a evidencia desde Recepción, sin desarrollar aquí la consola completa de HU-11.
- src/App.css: preservar las tarjetas y limitar los cambios visuales a esta historia.

HU-05 se ocupa de ajustar manualmente la ubicación. HU-02 se centra en capturar, vincular la ubicación automática y registrar la fotografía; no implementar aquí la edición del mapa ni la complementación de HU-03.

## Validación técnica propuesta

- Tomar una fotografía en móvil, publicar sin texto y comprobar ticket, estado, coordenadas y evidencia.
- Abrir el reporte desde Recepción y comprobar la imagen; recargar y verificar persistencia.
- Cancelar la captura y comprobar que no se cree un reporte vacío.
- Denegar ubicación y comprobar mensaje de error, ausencia de confirmación falsa y posibilidad de reintento.
- Probar archivo vacío, formato no admitido y fallo de persistencia sin perder evidencia seleccionada.
- Probar publicación automática y manual concurrentes y comprobar que no generen dos tickets.
- Comprobar que usar la cámara no publique por accidente audio previo conservado de otro intento.
- Medir interacciones reales y controles táctiles en móvil antes de declarar cumplimiento de RNF-01.
- Ejecutar npm run lint y npm run build y registrar resultados reales en el pull request.

## Reglas de integración

Trabajar únicamente en esta rama y abrir pull request hacia main, con referencia a HU-02, cambios, pruebas y limitaciones. No hacer push directo a main. Actualizar con main antes de integrar y solicitar revisión de otro integrante. Conservar los ajustes de cámara y micrófono heredados, sin presentar ese código como implementación nueva.

Este README usa una ruta propia para no sobrescribir el README general ni los documentos de otras historias al fusionar.
