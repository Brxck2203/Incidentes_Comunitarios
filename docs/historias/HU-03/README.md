# HU-03 — Complementación del reporte y selección de categoría

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: 1.
- Requerimiento: RF-02.
- Estimación del documento: 5 puntos de historia.
- Rama: feature/hu-03-complementar-reporte.
- Base de creación: main, commit e177150101139574b19be1189627f110f2345219.
- Fuente de asignación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación de referencia: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo de la historia

Permitir que el ciudadano complemente posteriormente un reporte rápido con descripción y categoría, conservando el ticket original. Este objetivo resume la asignación de HU-03; no sustituye el texto completo ni los criterios de aceptación de la especificación vigente.

## Criterios documentales contrastados

- “Agregar más detalles” presenta las categorías documentadas, los campos complementarios y la opción de añadir fotografías.
- Guardar actualiza el mismo reporte, conserva su ticket y agrega una entrada a la bitácora.
- Descripción y categoría no son obligatorias en la fuente; un reporte rápido puede permanecer “Sin clasificar”.
- La actualización se refleja en Recepción local mediante IndexedDB y avisos entre pestañas del mismo origen. No se envía al municipio ni se sincroniza entre dispositivos.

## Qué corresponde implementar, completar y validar

1. Acceder al reporte previamente publicado desde el listado y abrir la opción de complementación.
2. Permitir añadir o modificar descripción, categoría y señas o referencias; coordinar el complemento escrito de la nota y fotografías adicionales dentro del alcance de RF-02.
3. Mantener las categorías documentadas: baches, basura clandestina, ramas/arbolado y aceras dañadas. No agregar categorías de negocio sin validación.
4. Guardar los cambios sobre el mismo ticket, conservando fecha de registro y evidencias originales.
5. Registrar la actualización en la bitácora y permitir consultar la información guardada tras recargar.
6. Representar la complementación en la recepción local sin afirmar que existe una notificación real a un servidor municipal.
7. Gestionar ticket inexistente, fallo de lectura o guardado y datos no válidos; no mostrar confirmación si la transacción falla.
8. Permitir cancelar sin persistir los cambios del formulario. Conservar el borrador si falla el guardado para permitir reintentar.

## Punto de partida existente

La base ya incluye listado y detalle, formulario de complementación, categorías, descripción, transcripción manual, referencias, fotos adicionales, bitácora y persistencia local. Recepción muestra un evento de complementación mediante consulta del almacenamiento. Estos elementos deben revisarse y completarse, no desarrollarse otra vez ni declararse certificados sin pruebas.

Conservar los ajustes de micrófono, cámara y tarjetas visuales heredados del commit base. Esta historia no debe cambiar la captura rápida de HomePage.jsx salvo una dependencia justificada y coordinada.

## Correcciones de esta intervención

- `complementReport()` valida el ticket, el objeto de entrada, los tipos y longitudes de texto, las categorías del catálogo, la posición y las fotos nuevas. Reutiliza `validatePhotos()` y conserva su máximo técnico de ocho archivos por carga; no impone un máximo total nuevo al expediente.
- La lectura del registro actual, construcción de la bitácora y escritura ocurren en una transacción `readwrite`. Errores de entrada y ticket inexistente abortan con mensajes controlados; el servicio resuelve solo tras completar la transacción.
- La actualización modifica únicamente campos de complementación permitidos y preserva ticket, fechas, audio, fotos originales, ubicación original, estado e información adicional ya guardada. Los textos y arrays ausentes en registros antiguos se tratan de forma compatible.
- La bitácora indica confirmación de ubicación solo cuando cambian latitud o longitud.
- Tras el commit se emite un aviso local de actualización con tipo y ticket; no incluye fotografías ni textos. La suscripción existente actualiza el listado de Recepción, que relee categoría, evento y fecha de actualización desde IndexedDB.
- El formulario bloquea el doble envío antes del primer `await`, envía una instantánea del ticket/campos/fotos y descarta respuestas obsoletas de otro ticket o de una pantalla desmontada. Ante error conserva edición y fotos para reintentar.
- Al cancelar se descarta solamente el borrador de edición. Una selección fotográfica inválida muestra un aviso y conserva explícitamente cualquier selección válida previa; cancelar el selector no reemplaza la selección.

La intervención actual corrige el código heredado; no atribuye retrospectivamente su implementación a quien realiza esta corrección.

## Archivos y coordinación

- src/pages/ReportDetailPage.jsx: formulario y confirmación de complementación.
- src/pages/ReportsPage.jsx: acceso desde el listado y representación local de la actualización.
- src/services/reportRepository.js: validación y actualización transaccional del registro y su bitácora, preservando el contrato almacenado.
- src/services/reportNotifications.js: reutilización del mecanismo local de HU-02 para avisar creación y complementación con metadatos mínimos.
- src/components/Evidence.jsx: reutilizar la visualización existente y coordinar con Joan, responsable de HU-04; no reescribir el reproductor.
- src/components/LocationMap.jsx: la edición del marcador corresponde a Brack en HU-05; preservar su integración y no redefinir el contrato de coordenadas unilateralmente.

Separar el formulario en un componente propio si ayuda a evitar cambios simultáneos en ReportDetailPage.jsx. No convertir esta historia en una reestructuración general.

## Verificaciones

- En esta intervención se inspeccionaron los seis archivos solicitados, se verificó el árbol limpio, la rama de trabajo y que `origin/main` ya era antecesor. También se revisó el diff y se ejecutó `git diff --check`.
- No se ejecutaron lint, build, pruebas automatizadas ni verificaciones manuales de interfaz/IndexedDB; no se declaran aprobadas.
- Queda pendiente comprobar en navegador guardado y reintento, doble envío, selección/cancelación de fotos, ticket inexistente, errores de transacción, bitácora sin cambio real de ubicación y actualización de Recepción en varias pestañas.
- La automatización de lint/build/pruebas está pospuesta por decisión del equipo. No se instalaron herramientas ni se añadieron pruebas nuevas.

## Límites y reglas de integración

Sin backend, autenticación real, transcripción automática ni envío municipal real. No almacenar datos personales reales ni añadir avisos académicos a las pantallas.

Trabajar en esta rama y detenerse para revisión antes de commit, push o integración. No implementar historias ajenas ni atribuirse el código heredado como desarrollo nuevo.

Este README utiliza una ruta específica de la historia para conservar el README general y evitar sobrescribir documentos de otras ramas al fusionar.
