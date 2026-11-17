# Puntos Pendientes de Definición de UX y Requerimientos

Este documento registra los puntos identificados en la **Sección 11** de `docs/ux/Recomendaciones_UX_Reporte_Ciudadano_v2.md` que requieren aclaración formal del equipo o validación con el Product Owner antes de modificar reglas de interacción o contratos de negocio.

---

## 1. Conteo de los dos toques (RNF-01)

* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (líneas 155–200: `handleCameraCapture`, `openCamera`, `handleMicClick`, `publishReport`).
  * `README.md` (línea 37: trazabilidad de RNF-01).
* **Qué hace hoy el código:**
  * **En nota de voz:** el primer toque en la tarjeta «Grabar nota de voz» inicia la grabación; el segundo toque en «Publicar reporte» (o de nuevo en la tarjeta activa) detiene la grabación y publica el reporte (o se publica automáticamente al cumplirse los 60 segundos).
  * **En fotografía:** el primer toque en «Tomar foto» abre el selector/cámara nativa del dispositivo (`<input type="file" capture="environment">`); al confirmar la foto en la cámara del sistema operativo, `handleCameraCapture` invoca `publishReport()` automáticamente. Sin embargo, los diálogos nativos de permisos del navegador (micrófono, cámara, ubicación GPS) y la alerta preventiva de duplicados (`DuplicateWarning`) añaden interacciones cuando se presentan.
* **Opciones existentes para decisión del equipo:**
  1. **Opción A:** Contabilizar únicamente los toques realizados dentro de la interfaz de la aplicación web, excluyendo los diálogos nativos del sistema operativo/navegador (cámara nativa, permisos de navegador) y las alertas excepcionales de duplicidad.
  2. **Opción B:** Contabilizar toda interacción física del usuario incluyendo el disparador de la cámara nativa, en cuyo caso la captura fotográfica con confirmación explícita de publicación requeriría 3 toques.
* **Nota:** No se afirma cumplimiento certificado del límite de dos toques hasta que el equipo formalice esta regla de medición.

---

## 2. Publicación automática vs. botón explícito en fotografías (HU-02)

* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (líneas 155–180: `handleCameraCapture`, y líneas 346–358: acciones secundarias sobre borrador fotográfico y botón principal `Publicar reporte`).
  * `docs/historias/HU-02/README.md`.
* **Qué hace hoy el código:**
  * Al seleccionar o capturar una fotografía válida en `handleCameraCapture`, se guarda el borrador en estado (`updateDraft`) y se llama de inmediato a `await publishReport()`. Si ocurre un error de ubicación o una alerta de duplicado, la fotografía queda visible en pantalla junto con el botón «Publicar reporte» y la acción secundaria «Repetir foto» para reintentar sin perder la evidencia.
* **Opciones existentes para decisión del equipo:**
  1. **Opción A (comportamiento actual conservado):** Mantener la publicación inmediata al seleccionar la foto para no añadir un toque extra al flujo rápido (RNF-01), dejando el botón «Publicar reporte» y «Repetir foto» activos si el usuario cancela el aviso de duplicado o si falla la obtención de GPS.
  2. **Opción B:** No invocar `publishReport()` automáticamente en `handleCameraCapture`, sino mostrar primero la vista previa de la foto seleccionada y esperar a que el usuario toque explícitamente el botón «Publicar reporte» (lo cual alinea literalmente la frase de HU-02 *"capturar una fotografía... y presionar publicar"*, pero suma un toque adicional respecto a RNF-01).

---

## 3. Momento de la georreferenciación (RF-01 vs. RF-03)

* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (líneas 94–135: `capturedAt` registrado al iniciar la captura/selección y `getCurrentPosition()` invocado dentro de `publishReport`).
  * `src/services/geolocation.js` (líneas 3–11: `getCurrentPosition` con `measuredAt`).
  * `src/services/reportRepository.js` (líneas 128–133: persistencia de `createdAt`, `capturedAt`, `position` y `originalPosition`).
* **Qué hace hoy el código:**
  * `capturedAt` guarda la marca temporal del momento en que se inicia la grabación o se incorpora la fotografía, mientras que las coordenadas GPS (`getCurrentPosition()`) se solicitan al momento de publicar (`publishReport`). La interfaz explica este comportamiento fielmente en `uiCopy.home.autoLocationFootnote`.
* **Opciones existentes para decisión del equipo:**
  1. **Opción A (actual):** Solicitar el GPS al momento de publicar (evita pedir dos permisos simultáneos —micrófono + GPS— en el primer toque).
  2. **Opción B:** Pre-solicitar el GPS en segundo plano apenas inicia la grabación o se abre la cámara, guardando esa coordenada inicial como `position` de captura y usando la coordenada al publicar solo como respaldo.

---

## 4. Nombre del botón de adhesión (RF-06 vs. HU-10)

* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`uiCopy.detail.endorseToggleOpen`, `uiCopy.endorsement.formTitle`, `uiCopy.endorsement.submitIdle`).
  * `src/components/ConfirmIncidentForm.jsx` (líneas 21–36).
  * `src/components/IncidentMap.jsx` (línea 48).
  * `src/pages/ReportDetailPage.jsx` (líneas 315–325).
* **Qué hace hoy el código:**
  * Los documentos de requerimientos utilizan tres variantes distintas: *"A mí también me afecta"*, *"Confirmar situación"* (RF-06) y *"Confirmar incidente"* (HU-10).
  * En `src/constants/uiCopy.js` se centralizó la etiqueta combinada `"A mí también me afecta (Confirmar incidente)"` y el encabezado `"A mí también me afecta"` para que sea comprensible al ciudadano sin romper la trazabilidad con HU-10.
* **Opciones existentes para decisión del equipo:**
  1. Dejar únicamente **`A mí también me afecta`** (recomendado por la guía de UX ciudadano).
  2. Dejar únicamente **`Confirmar incidente`** (literal de HU-10).
  3. Dejar **`Confirmar situación`** (variante de RF-06).
  * *(Cualquiera de las tres opciones se cambia en una sola línea dentro de `src/constants/uiCopy.js`).*

---

## 5. Nombre oficial del estado de admisión ("Admitido" vs. "Admitido a trámite")

* **Ubicación en el código:**
  * `src/services/municipalDecisions.js` (línea 12: `admitted: 'Admitido a trámite'`).
  * `src/constants/uiCopy.js` (`getCitizenStatusInfo`: reconoce tanto `Admitido` como `Admitido a trámite` y muestra la explicación ciudadana *"Su reporte fue aceptado y será atendido."*).
  * `tests/main-integration.test.js` (línea 99: verifica `'Admitido a trámite'`).
* **Qué hace hoy el código:**
  * En la base de datos local (`IndexedDB`), bitácora y consola municipal se conserva el valor oficial `'Admitido a trámite'` (según HU-12), sin alterarlo, y en la vista ciudadana se acompaña con la explicación sencilla del glosario.
* **Opciones existentes para decisión del equipo:**
  1. Mantener **`Admitido a trámite`** como nombre oficial en base de datos y bitácora (alineado con HU-12 y las pruebas de integración actuales).
  2. Acortar a **`Admitido`** (literal de RF-08) en `municipalDecisions.js` y actualizar las pruebas correspondientes si el equipo decide unificarlo así en la especificación.

---

## 6. Posición del aviso de duplicado respecto al botón de publicar

* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (líneas 128–131 y 360–380: renderizado de `<DuplicateWarning />` justo encima del botón `.publish-button` «Publicar reporte»).
  * `src/components/DuplicateWarning.jsx`.
* **Qué hace hoy el código:**
  * Cuando la persona usuaria elige una categoría opcional y toca «Publicar reporte», el sistema obtiene las coordenadas, verifica duplicados en un radio de 50 metros y, si encuentra coincidencias abiertas, muestra el bloque `<DuplicateWarning />` inmediatamente encima del botón de publicación con las opciones «Ver reporte existente» y «Continuar con el envío».
* **Opciones existentes para decisión del equipo:**
  1. **Opción A (actual):** Mostrar el aviso tras tocar «Publicar reporte» (cuando ya se obtuvo la ubicación GPS real) y permitir confirmar con «Continuar con el envío».
  2. **Opción B:** Pre-consultar ubicación y duplicados antes de tocar «Publicar reporte» (por ejemplo, al seleccionar la categoría), mostrando el aviso de forma preventiva arriba o debajo del botón sin detener el envío cuando se presiona «Publicar reporte».

---

## 7. Tratamiento gramatical del texto (usted, tuteo o voseo)

* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`export const DEFAULT_TONE = 'usted'` y diccionario `COPY_BY_TONE`).
* **Qué hace hoy el código:**
  * Siguiendo la recomendación de la Sección 3 de `Recomendaciones_UX_Reporte_Ciudadano_v2.md`, toda la interfaz utiliza el tratamiento neutro/formal de **«usted»** por defecto (*"Reporte un problema en su comunidad"*, *"Grabe una nota de voz o tome una foto"*, *"Su reporte fue aceptado"*).
* **Opciones existentes para decisión del equipo y Product Owner:**
  1. **Usted / neutro (actual por defecto):** Adecuado para un servicio público municipal dirigido a personas de todas las edades.
  2. **Tuteo (*tú*):** *"Reporta un problema en tu comunidad"*, *"Graba una nota de voz"*.
  3. **Voseo (*vos*):** *"Reportá un problema en tu comunidad"*, *"Grabá una nota de voz"*.
  * *(La arquitectura en `src/constants/uiCopy.js` permite agregar la clave `tuteo` o `voseo` en `COPY_BY_TONE` y cambiar `DEFAULT_TONE` en una sola línea).*

---

## 8. Validación de la sección «Reportes que sigo» con el Product Owner

* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`export const ENABLE_FOLLOWED_REPORTS_SECTION = true`).
  * `src/pages/ReportsPage.jsx` (líneas 320–329: renderizado condicional de la sección `<section className="citizen-reports-section followed-reports-section">`).
* **Qué hace hoy el código:**
  * La página ciudadana separa visualmente tres secciones: **«Mis reportes»** (solo los reportes propios según RF-02), **«Reportes que sigo»** (aquellos reportes de terceros en los que la persona usuaria registró su adhesión/confirmación en este navegador) y **«Problemas en mi comunidad»** (mapa de incidentes abiertos).
  * La visibilidad de «Reportes que sigo» está controlada por la constante booleana `ENABLE_FOLLOWED_REPORTS_SECTION` en `src/constants/uiCopy.js`.
* **Opciones existentes tras consultar al Product Owner:**
  1. **Si el Product Owner aprueba la sección:** Mantener `ENABLE_FOLLOWED_REPORTS_SECTION = true`.
  2. **Si el Product Owner solicita ceñirse estrictamente a solo avisos de resolución sin listado de seguidos:** Cambiar `ENABLE_FOLLOWED_REPORTS_SECTION = false` en `src/constants/uiCopy.js` (los avisos de resolución de HU-10 continúan mostrándose sin cambios).
