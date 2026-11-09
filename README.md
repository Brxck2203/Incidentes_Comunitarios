# Reporte Ciudadano — Incidentes_Comunitarios

React + Vite, JavaScript/JSX, React Router y Oxlint, siguiendo la base de CateringService. Desarrollo incremental para IC-5821, Grupo 50.

## Ejecución

Node.js compatible con Vite 8 y npm. Instalar y validar localmente:

```sh
npm install
npm run lint
npm run build
npm run dev
```

`npm run preview` sirve el resultado de `build`. BrowserRouter necesita redirección a index.html en el alojamiento. Cámara, micrófono, ubicación y UUID requieren navegador compatible y contexto seguro (HTTPS o localhost).

`package-lock.json` se excluye de Git por decisión explícita del equipo. Se genera localmente y no se comparte; las instalaciones pueden resolver versiones distintas dentro de los rangos de package.json. La exclusión no significa que el archivo sea inútil.

## Contrato del prototipo

La interfaz muestra lenguaje del producto, sin etiquetas académicas, mensajes de implementación pendiente ni advertencias sobre el entorno de desarrollo. No hay backend, autenticación ni envío real a una municipalidad. Todos los reportes pertenecen a este navegador y origen; no hay separación real de usuarios o roles. No usar datos personales reales.

## Datos y tecnologías

IndexedDB conserva registros, notas de voz y fotografías mediante transacciones y blobs; se usa en vez de localStorage para evitar serializar multimedia como texto. No es una base de datos en la nube. Los datos pueden perderse al limpiar el navegador, cambiar de origen o usar sesiones privadas. Los errores de cuota se comunican sin confirmar un guardado fallido.

Leaflet proporciona el mapa de calles y marcador arrastrable. Las teselas provienen de OpenStreetMap: necesitan internet y generan solicitudes externas; el contenido de fotos y audio no se envía allí. No hay mapas satelitales, geocodificación ni claves de API.

## Trazabilidad

- RF-01 / HU-01: nota de voz en un formato compatible negociado con el navegador, temporizador de hasta 60 segundos, parada automática y publicación sin texto obligatorio. Publicar durante la grabación la termina antes de guardar. El límite se controla con temporizador del navegador: validar duración real bajo suspensión o pestañas en segundo plano.
- RF-01 / HU-02: fotografía desde cámara o selector del dispositivo, ubicación obtenida con alta precisión solicitada al publicar, fecha/hora, estado Registrado / Recibido y ticket UUID. No se inventa ubicación si hay rechazo o error. capturedAt es la hora de incorporación de la evidencia a la aplicación, no la fecha EXIF de una foto importada. La precisión efectiva depende del dispositivo y se conserva en metros.
- RF-02 / HU-03: historial, detalle, categoría, descripción, transcripción manual, referencias y fotos adicionales; ticket inmutable y bitácora. El evento de complementación se refleja en Recepción al cargar, recuperar el foco o refrescar cada cinco segundos. Es una bandeja local compartida, no una notificación a un servidor municipal.
- RF-02 / HU-04: reproductor de audio y galería con apertura de originales. URLs temporales liberadas al desmontar.
- RF-03 / HU-05: mapa de calles, posición original conservada y marcador arrastrable durante la edición. Guardar confirma las nuevas coordenadas; Cancelar no persiste. El destino de cuadrillas solo se representa en el registro local, sin despacho real.
- RNF-01: contraste alto y controles principales de al menos 48 px CSS. No se declara equivalencia validada con dp ni cumplimiento bajo luz solar sin pruebas físicas. El camino de audio permite Grabar -> Publicar; los permisos del navegador y controles de cámara/selector añaden interacciones. Detener y escuchar es opcional. El máximo de dos toques no está certificado para todos los dispositivos ni para la cámara nativa.

## Límites de carga

JPG, PNG, WebP o AVIF; hasta ocho fotos por selección y 10 MB por foto. Son límites técnicos provisionales, no nuevos requerimientos de negocio. El tamaño total depende de la cuota del navegador. Transcripción manual, sin IA ni servicios externos.

## Pruebas de aceptación pendientes de ejecutar

1. Grabar y publicar; comprobar ticket, estado, audio reproducible y persistencia tras recargar. Verificar parada a los 60 s.
2. Publicar una foto sin escribir texto; comprobar ubicación real, precisión y visibilidad en Recepción.
3. Denegar micrófono y ubicación; comprobar errores y ausencia de tickets falsos.
4. Abrir detalle, añadir categoría, texto y fotos; comprobar mismo ticket, evidencias originales y bitácora.
5. Mover marcador y cancelar; comprobar que no cambia el registro. Repetir y guardar; comprobar coordenadas y evento en Recepción.
6. Probar sin internet, sin espacio, ticket inexistente, doble publicación y formatos no admitidos.
7. Validar móvil, foco, lector de pantalla, contraste exterior, tamaño táctil y conteo real de interacciones.
8. Ejecutar lint y build. No se han ejecutado desde el conector de GitHub.

Conservar versiones separadas de la prueba de concepto y la entrega final. No marcar estos requerimientos como certificados hasta completar la validación.
