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

## Funcionalidad heredada

HomePage.jsx ya incorpora una tarjeta de cámara con icono, un input con capture=environment y publicación automática al seleccionar una fotografía. También existen validación de fotos, geolocalización y persistencia local. No rehacer ni revertir esos ajustes: completar y verificar el flujo.

La captura fotográfica publica automáticamente al seleccionar una imagen válida. La ubicación se consulta al publicar y el registro se guarda en IndexedDB; el estado “Registrado / Recibido” y la visibilidad desde Recepción describen este prototipo local, no una recepción real por un servidor municipal.

Los límites de ocho fotografías por carga y 10 MB por archivo que aparecen en el servicio son restricciones técnicas provisionales de la base, no criterios de aceptación añadidos al documento.

## Correcciones realizadas

- Cada borrador identifica explícitamente si contiene voz o foto; al cambiar de modalidad o reemplazar evidencia se solicita confirmación, y la vista previa corresponde solo al borrador activo.
- Todos los envíos usan una instantánea del borrador y la misma protección de concurrencia. Los eventos tardíos del selector se ignoran durante la publicación; los errores conservan evidencia y fecha para reintentar.
- `createReport()` normaliza y valida las fotos en el propio servicio, incluso si un llamador omite la validación previa. La lista se actualiza tras confirmarse la transacción local.

## Borrador, publicación y fechas

- El borrador activo declara su modalidad (voz o fotografía), evidencia y fecha de incorporación. La vista previa muestra solo esa evidencia.
- Si ya hay evidencia pendiente, cambiar de modalidad o reemplazarla requiere confirmación. Cancelar el selector no cambia ni publica el borrador.
- La publicación automática y el botón “Publicar reporte” usan la misma ruta protegida contra concurrencia. Ante un error de ubicación o guardado se conserva evidencia y fecha para reintentar; el reintento vuelve a consultar ubicación y solo confirma/navega con el ticket al completar el guardado.
- `createdAt` es la fecha/hora local asignada al registrar el reporte. `capturedAt` es la hora guardada al iniciar la solicitud de grabación de voz o al incorporar la foto seleccionada al borrador; no es la fecha EXIF ni garantiza el instante exacto del obturador.
- `position.measuredAt` es la fecha/hora reportada por la consulta de ubicación del dispositivo realizada al publicar. No se inventan coordenadas ni se asegura que correspondan al instante de la fotografía.
- `capture="environment"` conserva la preferencia por la cámara trasera, pero la apertura de cámara o selector depende del navegador y dispositivo.

## Visibilidad local desde Recepción

Una vez confirmada la transacción de creación, la aplicación notifica a la lista abierta en la misma pestaña y, mediante BroadcastChannel, a otras pestañas del mismo origen. Recepción también consulta IndexedDB cada tres segundos como respaldo. El canal transmite solo una notificación, no archivos; las evidencias permanecen en IndexedDB y siguen disponibles desde el detalle del reporte.

Esto no sincroniza dispositivos ni constituye una conexión con el municipio. No se implementan aquí autenticación, admisión, filtros ni mapa de HU-11.

## Archivos y coordinación

- src/pages/HomePage.jsx: captura y publicación de fotografía; coordinar con Joan, responsable de HU-01, para no sobrescribir la captura de voz.
- src/services/geolocation.js: obtención de ubicación; coordinar su contrato con HU-01 y HU-05.
- src/services/reportRepository.js: validación de evidencia en el límite de persistencia, registro y notificación posterior a la transacción; conserva la estructura del reporte.
- src/services/reportNotifications.js: notificación local y entre pestañas; no transporta evidencias.
- src/components/Evidence.jsx: visualización de la evidencia; coordinar con Joan en HU-04.
- src/pages/ReportsPage.jsx y src/pages/ReportDetailPage.jsx: comprobar acceso a evidencia desde Recepción, sin desarrollar aquí la consola completa de HU-11.
- src/App.css: preservar las tarjetas y limitar los cambios visuales a esta historia.

HU-05 se ocupa de ajustar manualmente la ubicación. HU-02 se centra en capturar, vincular la ubicación automática y registrar la fotografía; no implementar aquí la edición del mapa ni la complementación de HU-03.

## Verificaciones

- En esta intervención se inspeccionaron los flujos de captura, grabación, persistencia, geolocalización, listado y detalle, y se verificó el estado limpio de la rama y su relación con `origin/main`.
- No se ejecutaron lint, build, pruebas automatizadas ni verificaciones manuales en navegador/dispositivos; no se declaran aprobadas.
- Queda pendiente probar en navegador el selector cancelado, errores de ubicación/guardado, reintentos y actualización de Recepción en varias pestañas; también comprobar captura y controles táctiles en dispositivos móviles.
- La automatización de lint/build/pruebas está pospuesta por decisión del equipo. Antes de declarar cumplimiento de RNF-01 se deben medir las interacciones reales y los controles táctiles en móvil.

## Reglas de integración

Trabajar únicamente en esta rama y solicitar revisión antes de integrar a `main`. No integrar mientras no se hayan revisado los cambios y sus limitaciones. Conservar los ajustes de cámara y micrófono heredados, sin presentarlos como implementación nueva.

Este README usa una ruta propia para no sobrescribir el README general ni los documentos de otras historias al fusionar.
