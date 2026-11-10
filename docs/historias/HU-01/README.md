# HU-01 — Registro rápido por nota de voz

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: 1.
- Requerimiento: RF-01.
- Estimación del documento: 5 puntos de historia.
- Rama: feature/hu-01-registro-voz.
- Base de creación: main, commit e177150101139574b19be1189627f110f2345219.
- Fuente de asignación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit

## Historia de usuario

Como ciudadano en la vía pública, quiero presionar un botón para grabar una nota de voz y publicar el reporte al instante, para alertar sobre una anomalía sin tener que escribir bajo el sol o condiciones climáticas adversas.

## Qué corresponde implementar, completar y validar

1. Iniciar la grabación desde el control de micrófono y mostrar el tiempo restante, con un máximo de 60 segundos.
2. Permitir terminar y publicar sin solicitar campos de texto obligatorios.
3. Asociar la evidencia de voz con ubicación del dispositivo y fecha/hora, manteniendo separados los errores de grabación, ubicación y almacenamiento.
4. Confirmar el registro únicamente después de guardar correctamente, mostrando el ticket único y el estado Registrado / Recibido.
5. Liberar el micrófono y los temporizadores al finalizar o abandonar la pantalla; gestionar permisos denegados, navegador incompatible, audio vacío y fallos de persistencia.
6. Evitar publicaciones duplicadas por pulsaciones repetidas o por concurrencia entre publicación manual y finalización automática.

## Punto de partida existente

La base ya incluye grabación, temporizador, almacenamiento local y ticket. El último ajuste incorpora tarjetas con iconos, detención y publicación al volver a pulsar el micrófono, y publicación automática al agotarse el temporizador. No rehacer ni revertir estos cambios: revisar su correspondencia con los criterios del documento y corregir o completar lo necesario. La existencia del código no acredita que las pruebas hayan pasado.

La publicación automática al llegar a 60 segundos es un comportamiento de la base, no un criterio adicional atribuido al documento. Validar que respete los acuerdos de interacción y no compita con una publicación manual.

## Archivos y coordinación

- src/hooks/useAudioRecorder.js: captura y ciclo de vida del audio.
- src/pages/HomePage.jsx: integración de captura rápida; coordinar con Brack, responsable de HU-02.
- src/services/geolocation.js y src/services/reportRepository.js: contratos compartidos; acordar cambios antes de modificar campos u operaciones.
- src/components/Evidence.jsx: coordinar reproducción y consulta con HU-04; esta historia se centra en capturar y publicar, no en rehacer el visor.
- src/App.css: conservar las tarjetas actuales y limitar cambios al alcance de HU-01.

Extraer componentes pequeños si resulta necesario para reducir ediciones simultáneas de HomePage.jsx, sin imponer una reestructuración general del proyecto.

## Criterios de aceptación documentales

- Al pulsar el micrófono comienza la grabación y se muestra el tiempo restante, con máximo de 60 segundos.
- Al terminar y publicar, el reporte se registra sin campos de texto adicionales obligatorios.
- Al confirmarse la publicación se muestra el ticket asignado.

El requisito menciona registro en un servidor municipal. En esta etapa solo se representa el flujo mediante persistencia local; no declarar envío municipal real ni cumplimiento productivo de ese criterio. No añadir estas notas técnicas a las pantallas.

## Validación técnica propuesta

- Probar grabaciones cortas, límite de 60 segundos, detención manual y recuperación tras errores.
- Probar pulsaciones repetidas y la coincidencia entre detener y agotar el temporizador.
- Denegar micrófono y ubicación; comprobar que no aparezca una confirmación falsa.
- Recargar el reporte guardado y comprobar ticket, estado y audio.
- Probar salida de la pantalla y pestaña en segundo plano; comprobar liberación de recursos y duración efectiva.
- Revisar controles táctiles, foco visible, contraste y número de interacciones en móvil, sin certificar RNF-01 antes de medirlo.
- Ejecutar npm run lint y npm run build y registrar los resultados reales en el pull request.

## Reglas de integración

Trabajar únicamente en esta rama. No hacer push directo a main. Abrir un pull request hacia main con referencia a HU-01, cambios realizados, evidencia de pruebas y limitaciones. Actualizar la rama con main antes de integrar y solicitar revisión de otro integrante. No modificar historias ajenas ni presentar el trabajo heredado como implementación nueva.

Este README se ubica en una ruta propia de la historia para no sobrescribir el README general ni los documentos de otras ramas al fusionarlas.
