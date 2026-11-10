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

## Archivos y coordinación

- src/pages/ReportDetailPage.jsx: formulario y confirmación de complementación.
- src/pages/ReportsPage.jsx: acceso desde el listado y representación local de la actualización.
- src/services/reportRepository.js: actualización del registro y bitácora; coordinar cambios del contrato compartido antes de implementarlos.
- src/components/Evidence.jsx: reutilizar la visualización existente y coordinar con Joan, responsable de HU-04; no reescribir el reproductor.
- src/components/LocationMap.jsx: la edición del marcador corresponde a Brack en HU-05; preservar su integración y no redefinir el contrato de coordenadas unilateralmente.

Separar el formulario en un componente propio si ayuda a evitar cambios simultáneos en ReportDetailPage.jsx. No convertir esta historia en una reestructuración general.

## Comprobaciones propuestas para el pull request

Estas comprobaciones son una guía técnica de validación; contrastarlas con los criterios completos del documento antes de cerrar HU-03.

- Publicar un reporte rápido, abrirlo y añadir categoría y descripción.
- Verificar que ticket, fecha original y evidencias previas no cambien.
- Guardar, recargar y comprobar información y bitácora.
- Añadir evidencia sin eliminar las fotografías originales.
- Cancelar una edición y comprobar que los datos guardados permanezcan intactos.
- Simular un fallo de persistencia y comprobar que el borrador se conserve y no aparezca éxito falso.
- Consultar Recepción y comprobar la representación local de la complementación.
- Comprobar que editar información no revierta un ajuste de ubicación previamente guardado por HU-05.
- Ejecutar npm run lint y npm run build; registrar resultados reales y pruebas manuales en el pull request.

## Límites y reglas de integración

Sin backend, autenticación real, transcripción automática ni envío municipal real. No almacenar datos personales reales ni añadir avisos académicos a las pantallas.

Trabajar en esta rama y abrir pull request hacia main con referencia a HU-03, cambios, pruebas y limitaciones. No hacer push directo a main. Actualizar la rama con main antes de integrar y solicitar revisión de otro integrante. No implementar historias ajenas ni atribuirse el código heredado como desarrollo nuevo.

Este README utiliza una ruta específica de la historia para conservar el README general y evitar sobrescribir documentos de otras ramas al fusionar.
