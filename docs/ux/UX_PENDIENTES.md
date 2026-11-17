# Puntos Pendientes de Definición de UX y Requerimientos (v3)

Este documento registra los puntos de la **Sección 12** de `docs/ux/Recomendaciones_UX_Reporte_Ciudadano_v3.md` que están marcados como **[PROPUESTA – requiere aprobación]** o **[DECISIÓN PENDIENTE]**. Ninguno de ellos se ha dado por cerrado de forma unilateral: se describe qué hace hoy el código, dónde se ubica, qué opciones tiene el equipo y cuál es el valor configurable sugerido.

---

## 1. Aprobación del flujo combinado de voz y fotografías (RF-01 y RNF-01)

* **Estado:** `[PROPUESTA – requiere aprobación del Product Owner]`
* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`export const COMBINED_EVIDENCE_ENABLED = false` y función `isCombinedEvidenceEnabled()`).
  * `src/pages/HomePage.jsx` (flujo condicional controlado por `combinedEnabled`).
  * `src/components/Evidence.jsx`, `src/pages/ReportDetailPage.jsx`, `src/pages/ReportsPage.jsx`.
* **Qué hace hoy el código:**
  * Con el interruptor `COMBINED_EVIDENCE_ENABLED = false` (valor por defecto), la aplicación ejecuta **exactamente** el flujo vigente de RF-01 (voz sola o foto sola).
  * Cuando el interruptor se activa (`COMBINED_EVIDENCE_ENABLED = true` o `localStorage.setItem('ux-combined-evidence', 'true')`), la pantalla inicial permite detener la nota de voz con el botón secundario **«Detener»**, sumar fotografías con **«+ Agregar foto»** o **«+ Agregar nota de voz»**, ver el contador **«X de 5 fotos»**, quitar elementos individuales antes de publicar y enviar todo bajo un único reporte y un único número de seguimiento.
* **Opciones existentes:**
  1. **Si el Product Owner aprueba el cambio en RF-01 y RNF-01:** cambiar `COMBINED_EVIDENCE_ENABLED = true` en `src/constants/uiCopy.js`.
  2. **Si el Product Owner mantiene RF-01 sin cambios:** conservar `COMBINED_EVIDENCE_ENABLED = false` (las fotos adicionales se siguen agregando en «Agregar más detalles» según RF-02).
* **Valor sugerido por defecto:** `COMBINED_EVIDENCE_ENABLED = false` hasta aprobación formal.

---

## 2. Conteo de los dos toques (RNF-01)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (`handleMicClick`, `openCamera`, `handleCameraCapture`, `publishReport`).
  * `README.md` (línea 37: trazabilidad de RNF-01).
* **Qué hace hoy el código:**
  * En el flujo rápido de una sola evidencia, iniciar grabación (toque 1) y tocar «Publicar reporte» (toque 2) completa el envío; en fotografía, tocar «Tomar foto» abre la cámara y al seleccionar la imagen se invoca `publishReport()`. Sin embargo, los diálogos nativos de permisos del navegador (micrófono, cámara, GPS), el obturador nativo de la cámara del sistema operativo, el aviso de duplicidad (`DuplicateWarning`) y el flujo combinado opcional suman interacciones adicionales.
* **Opciones existentes:**
  1. **Opción A:** Contabilizar únicamente los toques dentro de la aplicación web en el **flujo rápido con una sola evidencia**, excluyendo permisos nativos del navegador, cámara del sistema operativo, alertas excepcionales de duplicidad y el flujo combinado opcional.
  2. **Opción B:** Contabilizar toda interacción física incluyendo la cámara nativa del sistema operativo.
* **Valor sugerido:** Definir formalmente la Opción A en la especificación de RNF-01. **No se afirma cumplimiento certificado del límite de dos toques mientras este punto esté abierto.**

---

## 3. Cantidad máxima de fotos, cantidad de audios y peso/compresión

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`export const DEFAULT_MAX_PHOTOS_PER_REPORT = 5`, `export const DEFAULT_MAX_VOICE_SECONDS = 60`).
  * `src/services/reportRepository.js` (líneas 95–107: `validatePhotos` permite hasta 8 fotos por carga técnica y máximo 10 MB por archivo en formatos JPG, PNG, WebP o AVIF).
  * `src/hooks/useAudioRecorder.js` (línea 132: `audioBitsPerSecond: 32000` y límite de 60 segundos).
* **Qué hace hoy el código:**
  * Para audio: admite **1 nota de voz de hasta 60 segundos** codificada a 32 kbps.
  * Para fotografías en el flujo combinado (Fase 7): usa la constante configurable `DEFAULT_MAX_PHOTOS_PER_REPORT = 5` y muestra el contador `"X de 5 fotos"` y el aviso *"Llegó al máximo de fotos"*. En el repositorio base (`validatePhotos`), el límite técnico provisional es de 8 fotos por selección y 10 MB por imagen sin recorte ni recompresión con pérdida.
* **Opciones existentes:**
  1. Unificar el límite en **5 fotografías por reporte** y **1 nota de voz de máximo 60 s**, agregando compresión cliente (Canvas/WebP) si se despliega en redes móviles lentas.
  2. Mantener el límite técnico actual de 8 fotografías de hasta 10 MB en `reportRepository.js`.
* **Valor sugerido por defecto:** `DEFAULT_MAX_PHOTOS_PER_REPORT = 5`, `DEFAULT_MAX_VOICE_SECONDS = 60`.

---

## 4. Subida parcial de evidencias cuando falla un archivo

* **Estado:** `[PROPUESTA / DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (validación individual por archivo en `handleCameraCapture` cuando `combinedEnabled` está activo y mensaje `uiCopy.home.partialPhotoError`).
  * `src/services/reportRepository.js` (`createReport` guarda el registro completo en una sola transacción local de IndexedDB).
* **Qué hace hoy el código:**
  * Como el prototipo persiste localmente en IndexedDB sin subida HTTP multiparte a un servidor externo, el guardado de `createReport` es transaccional. Sin embargo, al adjuntar varias fotos en el flujo combinado, el código valida cada fotografía por separado: si una falla (por formato o peso), conserva todas las evidencias válidas previas, informa exactamente cuál archivo falló (`partialPhotoError`) y permite reintentar solo esa fotografía o publicar con las evidencias válidas ya cargadas.
* **Opciones existentes (para futura integración con backend):**
  1. Publicar el reporte con las evidencias que sí subieron y permitir reintentar únicamente el archivo fallido.
  2. Mantener la publicación como transacción todo-o-nada conservando los archivos en pantalla para reintentar.
* **Valor sugerido por defecto:** Conservar evidencias válidas e indicar exactamente cuál archivo falló para reintentar solo ese.

---

## 5. Publicación automática vs. botón explícito en fotografías (HU-02)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (`handleCameraCapture`).
  * `docs/historias/HU-02/README.md`.
* **Qué hace hoy el código:**
  * En el flujo rápido (y cuando se toma la primera foto sin evidencia previa), `handleCameraCapture` guarda la foto y llama a `publishReport()` automáticamente para no romper el flujo de dos toques (RNF-01). Si el envío se detiene por alerta de duplicado o error de GPS, la foto queda visible junto a los botones «Publicar reporte» y «Repetir foto». Si en el flujo combinado ya existía una evidencia previa, agregar una foto adicional no dispara el envío automático, sino que espera al botón «Publicar reporte».
* **Opciones existentes:**
  1. **Opción A (actual):** Publicar de inmediato cuando es foto única en flujo rápido, y esperar al botón «Publicar reporte» cuando se están sumando múltiples evidencias.
  2. **Opción B:** Exigir siempre tocar «Publicar reporte» después de tomar la fotografía (alineado literalmente con el texto de HU-02, pero añade un tercer toque si se cuenta la cámara nativa).
* **Valor sugerido por defecto:** Opción A mientras no se redefina el conteo de RNF-01.

---

## 6. Momento de la georreferenciación con una o varias evidencias (RF-01 vs. RF-03)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (`capturedAt` se fija en la primera evidencia capturada y se conserva en el borrador; `getCurrentPosition()` se solicita al ejecutar `publishReport()`).
  * `src/services/geolocation.js`.
* **Qué hace hoy el código:**
  * Conserva `capturedAt` de la primera evidencia del borrador y obtiene las coordenadas GPS (`position`) en el instante de publicar. La nota informativa en pantalla (`uiCopy.home.autoLocationFootnote`) describe este comportamiento con exactitud.
* **Opciones existentes:**
  1. **Opción A (actual):** Usar la ubicación obtenida al presionar «Publicar reporte» y conservar `capturedAt` de la primera evidencia.
  2. **Opción B:** Capturar una coordenada GPS al tomar la primera evidencia y usarla aunque el usuario camine unos metros antes de terminar de adjuntar la segunda evidencia.
* **Valor sugerido por defecto:** Opción A (evita pedir permisos de micrófono y GPS al mismo tiempo en el primer toque).

---

## 7. Reglas de edición posterior (quitar o reemplazar evidencia antes de «Admitido»)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/services/reportRepository.js` (líneas 158–218: `complementReport` actualmente solo **agrega** fotografías nuevas `[...current.photos, ...newPhotos]` y conserva intacto `current.audio`, tal como exige RF-02 y HU-03 vigentes).
  * `src/pages/ReportDetailPage.jsx` (formulario de complementación).
  * `src/pages/ReportsPage.jsx` (en Recepción municipal ya se muestra el aviso *"Modificado por el ciudadano · <fecha>"* cuando `report.receptionEvent === 'Información complementada'`).
* **Qué hace hoy el código:**
  * Siguiendo estrictamente **RF-02 y HU-03 vigentes** (y las pruebas de integración en `tests/main-integration.test.js` que verifican que las evidencias originales nunca se eliminan al complementar), `complementReport` permite **agregar** descripción, categoría, referencias, ubicación y fotografías adicionales, registrando el cambio en `history` y mostrando en Recepción municipal que el reporte fue modificado y cuándo.
  * **No se implementó el borrado o reemplazo destructivo de evidencias ya guardadas en `complementReport`** porque el contrato actual del repositorio y las pruebas de regresión de HU-03/HU-04 exigen conservar las evidencias originales.
* **Opciones existentes para el Product Owner:**
  1. **Mantener RF-02 vigente:** En la edición posterior solo se permite **agregar** información y fotografías (nunca borrar evidencia ya registrada), mientras que en la pantalla inicial de captura (Fase 7) sí se puede quitar cualquier foto o audio antes de publicar.
  2. **Aprobar la regla sugerida en la Sección 7 de v3:** Ampliar `complementReport` en `reportRepository.js` para permitir quitar o reemplazar fotos/audio propios únicamente cuando `report.status` sea `'Registrado / Recibido'` o `'En evaluación'` (bloqueándolo a partir de `'Admitido a trámite'`), dejando constancia en `history`.
* **Valor sugerido por defecto:** Mantener solo adición en reportes ya publicados hasta que el Product Owner apruebe modificar RF-02.

---

## 8. Nombre del botón de adhesión (RF-06 vs. HU-10)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`uiCopy.detail.endorseToggleOpen`, `uiCopy.endorsement.formTitle`, `uiCopy.endorsement.submitIdle`).
  * `src/components/ConfirmIncidentForm.jsx`, `src/components/IncidentMap.jsx`, `src/pages/ReportDetailPage.jsx`.
* **Qué hace hoy el código:**
  * Utiliza el título ciudadano **`A mí también me afecta`** y en el botón de acción **`A mí también me afecta (Confirmar incidente)`**, reconciliando las tres variantes de los documentos (*"A mí también me afecta"*, *"Confirmar situación"* en RF-06 y *"Confirmar incidente"* en HU-10).
* **Opciones existentes:**
  1. Dejar solo `A mí también me afecta`.
  2. Dejar solo `Confirmar incidente`.
  3. Dejar `Confirmar situación`.
* **Valor sugerido por defecto:** `A mí también me afecta (Confirmar incidente)` en `src/constants/uiCopy.js`.

---

## 9. Nombre de los estados («Admitido» vs. «Admitido a trámite»)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/services/municipalDecisions.js` (`municipalDecisionStatuses.admitted = 'Admitido a trámite'`).
  * `src/constants/uiCopy.js` (`getCitizenStatusInfo`).
* **Qué hace hoy el código:**
  * Conserva `'Admitido a trámite'` en IndexedDB, bitácora y Recepción municipal (cumpliendo las pruebas de HU-12), y en la vista ciudadana muestra la explicación sencilla *"Su reporte fue aceptado y será atendido."* tanto para `'Admitido'` como para `'Admitido a trámite'`.
* **Opciones existentes:**
  1. Mantener `'Admitido a trámite'` como valor oficial.
  2. Unificar en `'Admitido'` si se actualiza la especificación de HU-12.
* **Valor sugerido por defecto:** `'Admitido a trámite'` en BD + explicación ciudadana en interfaz.

---

## 10. Posición del aviso de duplicado respecto al botón de publicar

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` y `src/components/DuplicateWarning.jsx`.
* **Qué hace hoy el código:**
  * Muestra el aviso `<DuplicateWarning />` justo encima del botón «Publicar reporte» cuando se detectan reportes abiertos de la misma categoría dentro de los 50 metros, ofreciendo «Ver reporte existente» y «Continuar con el envío» sin bloquear la publicación.
* **Opciones existentes:**
  1. Mantener el aviso inmediatamente antes de confirmar el envío (cuando ya se conocen categoría y ubicación GPS).
  2. Pre-consultar duplicados al elegir categoría antes de tocar «Publicar reporte».
* **Valor sugerido por defecto:** Opción 1 (actual).

---

## 11. Tratamiento del texto (usted, tuteo o voseo)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`export const DEFAULT_TONE = 'usted'`).
* **Qué hace hoy el código:**
  * Usa tratamiento formal/neutro de **«usted»** en toda la interfaz, centralizado en `COPY_BY_TONE.usted`.
* **Opciones existentes:**
  1. `usted` (actual por defecto).
  2. `tuteo` (*tú*).
  3. `voseo` (*vos*).
* **Valor sugerido por defecto:** `DEFAULT_TONE = 'usted'`.

---

## 12. Validación de la sección «Reportes que sigo» con el Product Owner

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/constants/uiCopy.js` (`export const ENABLE_FOLLOWED_REPORTS_SECTION = true`).
  * `src/pages/ReportsPage.jsx`.
* **Qué hace hoy el código:**
  * Muestra la sección «Reportes que sigo» separada de «Mis reportes» y «Problemas en mi comunidad». Puede ocultarse en un solo punto cambiando `ENABLE_FOLLOWED_REPORTS_SECTION = false`.
* **Opciones existentes:**
  1. Mantener `ENABLE_FOLLOWED_REPORTS_SECTION = true` si el Product Owner valida la sección.
  2. Cambiar a `false` si se prefiere mostrar únicamente el bloque de avisos de resolución.
* **Valor sugerido por defecto:** `ENABLE_FOLLOWED_REPORTS_SECTION = true`.

---

## 13. Privacidad en fotografías (rostros y placas de vehículos)

* **Estado:** `[DECISIÓN PENDIENTE]`
* **Ubicación en el código:**
  * `src/pages/HomePage.jsx` (`uiCopy.home.permissionContext` / captura de cámara) y `src/pages/ReportDetailPage.jsx` (carga de fotografías).
  * `README.md` (línea 22: *"No usar datos personales reales"*).
* **Qué hace hoy el código:**
  * Almacena las imágenes localmente en IndexedDB sin enviarlas a servidores externos. No aplica difuminado automático ni muestra una advertencia específica sobre rostros o matrículas vehiculares en la pantalla de captura para no sobrecargar de texto el flujo rápido.
* **Opciones existentes:**
  1. Agregar una nota breve junto al botón de cámara/fotografías: *"Evite incluir rostros de personas o placas de vehículos en las fotografías."* (configurable en `src/constants/uiCopy.js`).
  2. Mantener la advertencia únicamente en los términos/documentación general sin añadir texto extra en la pantalla de captura.
* **Valor sugerido por defecto:** Opción 2 mientras el equipo o el Product Owner definan si desean mostrar el aviso en pantalla.
