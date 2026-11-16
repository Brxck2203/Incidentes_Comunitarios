# HU-01 — Registro rápido por nota de voz

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: 1.
- Requerimiento: RF-01.
- Estimación registrada: 5 puntos de historia.
- Rama: feature/hu-01-registro-voz.
- Base de creación registrada: main, commit e177150101139574b19be1189627f110f2345219.
- Fuente de asignación registrada: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- La consulta del documento original no se verificó en esta intervención.

## Funcionalidad heredada de main

Al comenzar esta intervención, `feature/hu-01-registro-voz` estaba sincronizada con su rama remota y `origin/main` era ancestro de la rama. El único commit de la rama sobre `origin/main` documentaba la historia. Los archivos de funcionalidad analizados no diferían de `main`; por lo tanto, la captura y el flujo base ya existían allí y no se atribuyen a esta intervención.

La base incluye grabación desde el micrófono, límite y temporizador de 60 segundos, publicación automática al vencer el tiempo, opción de detener para escuchar, publicación manual, captura fotográfica y persistencia de reportes en IndexedDB con ticket, estado y evidencias.

La aplicación registra localmente y no realiza un envío a un servidor municipal.

## Correcciones de esta intervención

- La detención de una grabación comparte una sola promesa y solicita `MediaRecorder.stop()` una sola vez. La primera causa de detención gana; si coinciden acciones manuales y temporizador, esa causa determina si la sesión se publica automáticamente. Detener para escuchar primero no publica, salvo que el vencimiento hubiera solicitado la detención antes.
- La publicación adquiere un bloqueo sincrónico antes de esperar audio o ubicación. Los recorridos del micrófono, “Detener y enviar ahora”, “Publicar reporte” y el temporizador convergen en una sola operación de publicación por vez.
- Una grabación sin datos utilizables no crea un reporte solo de voz ni confirma una publicación. Se informa que hay que volver a grabar; el flujo de fotografía permanece disponible.
- Al abandonar la pantalla, la instancia invalida sus continuaciones, limpia temporizador y micrófono, y no publica por la limpieza. Si la ubicación aún está pendiente, no se inicia el guardado. Un guardado que ya empezó no se cancela ni se repite, y no navega desde una pantalla inactiva.
- El audio capturado se conserva ante fallos de ubicación o persistencia mientras la pantalla siga activa, para permitir reintentar.

## Verificaciones realizadas

- `git status` inicial: árbol limpio.
- Rama actual: `feature/hu-01-registro-voz`.
- `git fetch origin` y comparación de referencias: rama local y remota sincronizadas; no había commits de `origin/main` pendientes de incorporar.
- Se confirmó que `origin/main` es ancestro de la rama y se comparó el alcance heredado.
- Se inspeccionaron los archivos de captura, publicación, ubicación, persistencia, detalle y esta documentación.
- No se ejecutaron pruebas automatizadas, lint ni build en esta intervención.

## Casos manuales pendientes

Queda pendiente validar en navegador/dispositivo la grabación con permiso concedido y denegado, audio vacío, límite de 60 segundos, coincidencia entre acciones manuales y temporizador, errores de ubicación y almacenamiento, salida durante la obtención de ubicación y durante el guardado, y reproducción/publicación de fotografías. También queda pendiente comprobar el ticket, estado y evidencias de un reporte guardado tras recargar.

Estos casos son verificaciones pendientes, no criterios documentales nuevos. No se afirma que se hayan ejecutado.

## Alcance e integración

Los cambios de código de esta intervención se limitan a `src/hooks/useAudioRecorder.js` y `src/pages/HomePage.jsx`; esta documentación registra la diferencia. No se modifican servicios compartidos ni el flujo de detalle y complementación de reportes.

La rama se deja sin commit ni push para revisión. Cualquier integración posterior corresponde a un pull request hacia `main`, sujeto a revisión.
