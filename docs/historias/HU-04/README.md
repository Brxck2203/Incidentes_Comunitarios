# HU-04 — Reproductor de audio y consulta de evidencias

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: 1.
- Requerimiento: RF-02.
- Estimación del documento: 2 puntos de historia.
- Rama: feature/hu-04-consulta-evidencias.
- Base de creación: main, commit e177150101139574b19be1189627f110f2345219.
- Fuente de asignación: https://docs.google.com/document/d/1SxqVmyQkNqSJGzvKjUk7TBfGP0-DD-9Y7N0zp3kc_nk/edit
- Especificación de referencia: https://docs.google.com/document/d/1w4tSEZFZGkNG4bxGxhghY0A0Ve_6IDnXUHttDeeDOqM/edit

## Objetivo de la historia

Permitir consultar la evidencia previamente registrada y reproducir la nota de voz original desde el reporte. Este objetivo resume la asignación de HU-04; no sustituye el texto completo ni los criterios de aceptación de la especificación vigente.

## Qué corresponde implementar, completar y validar

1. Mostrar la nota de voz asociada al reporte mediante un reproductor integrado con controles de reproducción y pausa.
2. Mostrar las fotografías conservadas en el expediente y permitir consultar su contenido sin modificar los archivos originales.
3. Mantener acceso a la evidencia original después de complementar el reporte y al recargar la aplicación.
4. Presentar correctamente reportes que solo tienen audio, solo fotografías o ambos tipos de evidencia, sin controles vacíos o errores de renderizado.
5. Gestionar errores de lectura, archivo no disponible y formato que el navegador no pueda reproducir o mostrar, comunicando el problema sin bloquear el resto del detalle.
6. Liberar las URLs temporales al sustituir evidencias o abandonar la pantalla; detener la reproducción al desmontar el reproductor.
7. Mantener controles y alternativas de texto comprensibles para navegación por teclado y tecnologías de asistencia.

## Punto de partida existente

La base ya contiene src/components/Evidence.jsx, con reproductor HTML de audio, galería, apertura de fotografías y liberación de URLs temporales. El detalle utiliza este componente para consultar los blobs conservados en IndexedDB. Revisar y completar esta implementación; no rehacerla ni declarar que pasó pruebas sin ejecutarlas.

Conservar los ajustes de micrófono, cámara y tarjetas visuales del commit base. Esta rama se centra en consulta, no en modificar la captura rápida o la publicación automática.

## Archivos y coordinación

- src/components/Evidence.jsx: reproductor, galería y ciclo de vida de URLs temporales.
- src/pages/ReportDetailPage.jsx: integración de consulta; coordinar con Jason, responsable de HU-03, para no sobrescribir el formulario.
- src/services/reportRepository.js: lectura de evidencia persistida; acordar cualquier cambio en el contrato compartido.
- src/App.css: estilos del reproductor y galería sin alterar innecesariamente estilos globales.
- HU-01: coordinar formatos de audio producidos por la captura; no duplicar el grabador.
- HU-02: coordinar formatos y representación de fotografías con Brack; no duplicar la cámara.
- HU-03: conservar la visualización de evidencias originales cuando se agreguen fotografías o detalles.

La transcripción manual y la carga de fotografías adicionales se coordinan con HU-03. No añadir transcripción automática, edición destructiva de archivos ni servicios externos de multimedia dentro de esta historia.

## Comprobaciones propuestas para el pull request

Estas comprobaciones son una guía técnica; contrastarlas con los criterios completos de la especificación antes de cerrar HU-04.

- Registrar audio, abrir el detalle, reproducir, pausar y volver a reproducir.
- Registrar fotografías y comprobar miniaturas y consulta de originales.
- Probar reportes de solo audio, solo fotografías y evidencia mixta.
- Complementar el reporte y comprobar que el audio y las fotografías originales permanezcan disponibles.
- Recargar y volver a consultar las evidencias persistidas.
- Probar errores de reproducción o carga sin bloquear la información del reporte.
- Cambiar de reporte y abandonar la pantalla; comprobar que no continúe audio anterior y que las URLs temporales se liberen.
- Revisar presentación móvil, teclado, nombres accesibles y foco visible.
- Ejecutar npm run lint y npm run build y registrar resultados reales en el pull request.

## Límites y reglas de integración

La consulta utiliza almacenamiento local del navegador, sin backend ni autorización real por usuario. No usar datos personales reales ni añadir avisos académicos a las pantallas.

Trabajar únicamente en esta rama. Abrir pull request hacia main con referencia a HU-04, cambios, pruebas y limitaciones. No hacer push directo a main. Actualizar con main antes de integrar y solicitar revisión de otro integrante. No implementar historias ajenas ni presentar código heredado como desarrollo nuevo.

Este README usa una ruta propia de la historia para conservar el README general y evitar sobrescribir documentos de otras ramas al fusionar.
