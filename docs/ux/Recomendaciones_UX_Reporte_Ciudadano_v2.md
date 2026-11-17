# Recomendaciones de UX — Reporte Ciudadano (versión ampliada)

**Curso:** IC-5821 Requerimientos de Software · Grupo 50 · II Semestre 2026
**Proyecto:** Proyecto III — Sistema de Gestión y Reporte de Incidentes Comunitarios

---

## 1. Objetivo y alcance

Mejorar la claridad de la interfaz y de los flujos ciudadano y municipal para que cualquier persona (joven, adulta mayor, con poca experiencia digital o usando el teléfono en la calle bajo el sol) pueda reportar y dar seguimiento a un problema sin ayuda, **conservando el comportamiento definido en la Especificación de Requerimientos de Software**.

Estas recomendaciones se basan en los requerimientos, el código compartido y una captura de escritorio. **No constituyen una prueba de usabilidad con usuarios** (ver sección 12).

**Descartado:** exigir descripción, ubicación y revisión en pantallas sucesivas antes de publicar. RF-01 y RNF-01 priorizan la publicación rápida, sin escribir y en un máximo de dos toques. RF-02 y RF-03 reservan la complementación y el ajuste manual de la ubicación para después de publicar.

---

## 2. Flujo que se debe conservar

**Capturar voz o foto → Publicar con ubicación automática → Recibir número de seguimiento (ticket) → Completar detalles opcionalmente.**

- La nota de voz tiene un máximo de 60 segundos (RF-01).
- No se requieren campos de texto para publicar (RF-01, HU-01).
- La ubicación y la fecha/hora se vinculan automáticamente (RF-01, RF-03).
- El reporte pasa al estado oficial «Registrado / Recibido» con un ticket único (RF-01).
- Descripción, categoría, fotografías adicionales y ajuste del marcador se hacen después, **conservando el ticket** (RF-02, RF-03).
- Se mantienen las alertas de posible duplicado, las adhesiones y el seguimiento de reportes unificados (RF-04, RF-05, RF-06).

---

## 3. Principios de redacción y tono

Estos principios son nuevos respecto a la versión anterior y buscan que el texto funcione para cualquier usuario.

| Principio | Recomendación |
| --- | --- |
| **Una sola forma de tratamiento** | Elegir una (usted, tuteo o voseo) y usarla en toda la interfaz. Para una aplicación municipal usada por públicos muy distintos, recomiendo **"usted" o un imperativo neutro** ("Reporte un problema en su comunidad"). El voseo ("Reportá", "Podés") es cercano, pero puede sentirse informal o ajeno para parte de la población. **Decisión pendiente del equipo.** |
| **Una acción, un nombre** | Cada acción se llama igual en toda la interfaz. Ejemplo: siempre **"Publicar reporte"**, nunca "Enviar" en una pantalla y "Publicar" en otra. |
| **Lenguaje ciudadano primero** | Reemplazar o acompañar la jerga administrativa con una explicación breve (ver glosario en la sección 4). |
| **El botón anticipa su consecuencia** | Si una acción publica, el botón lo dice. Un ícono de detener por sí solo no comunica el envío. |
| **Frases cortas, una idea por mensaje** | Evitar párrafos largos en pantallas de captura. El usuario puede estar de pie, al sol y con prisa. |
| **Texto junto al ícono** | Ningún ícono se usa sin etiqueta de texto. |

---

## 4. Glosario de términos hacia el ciudadano

El nombre oficial se conserva en la trazabilidad y en la vista municipal; hacia el ciudadano se agrega una explicación simple.

| Término técnico | Texto sugerido para el ciudadano |
| --- | --- |
| Ticket | **Número de seguimiento** (puede mostrarse "(ticket)" solo la primera vez). |
| Registrado / Recibido | **Reporte recibido.** "La municipalidad ya tiene su aviso." |
| En evaluación | "La municipalidad está revisando su reporte." |
| Admitido / Admitido a trámite | "Su reporte fue aceptado y será atendido." |
| Desestimado | "Su reporte no pudo tramitarse." Mostrar siempre el **motivo** en lenguaje claro (HU-13 exige comunicarlo con transparencia). |
| Reporte principal / secundario | Hacia el ciudadano: "Su reporte se atiende junto con otros del mismo problema." En la vista municipal se conservan los términos. |
| Posible duplicado | "Ya existe un reporte parecido cerca de este lugar." |
| Adhesión / Confirmar situación | **A mí también me afecta** (ver punto abierto en la sección 11). |

> Los nombres oficiales de estado se mantienen sin cambios en la base de datos, la bitácora y la vista municipal. Solo se agrega una explicación en la vista ciudadana.

---

## 5. Cambios recomendados por parte de la interfaz

| Parte de la interfaz | Cambio de UX | Requerimiento |
| --- | --- | --- |
| Inicio | Título claro y explicación breve de la captura y la ubicación automática. | RF-01 |
| Grabación | Mostrar **"Grabando · 45 segundos restantes"** y una acción principal explícita **"Publicar reporte"**. | HU-01 |
| Fotografía | Mostrar la foto seleccionada y la acción **"Publicar reporte"**, sin pantalla obligatoria de revisión. | HU-02 |
| Ubicación | Explicar antes del envío que se obtiene automáticamente. El ajuste del marcador queda en la complementación. | RF-03 / HU-05 |
| Permisos y errores *(nuevo)* | Explicar por qué se pide micrófono, cámara y ubicación, y qué hacer si se niegan o fallan. | RF-01, RNF-01 |
| Categoría | **"Categoría (opcional)"** como elemento secundario, con la ayuda "Puede seleccionarla después". | RF-02 / RF-04 |
| Confirmación | Destacar **"Reporte recibido"**, el número de seguimiento y las acciones **"Ver mi reporte"** y **"Agregar más detalles"**. | HU-01 / HU-03 |
| Duplicados | Aviso previsto con fecha y estado del reporte existente, más **"Ver reporte existente"** y **"Continuar con el envío"**. | RF-04 / HU-06 |
| Adhesión | **"A mí también me afecta"**, explicando que suma un respaldo y permite recibir novedades de resolución. | RF-06 / HU-10 |
| Atención conjunta | Explicar que el reporte se atiende con otros del mismo problema y que el ciudadano conserva su número de seguimiento. | RF-05 / HU-09 |
| Panel municipal | Identificar el acceso como **"Recepción municipal"** y agrupar filtros, mapa, lista y acciones de gestión. | RF-07 a RF-09 |

---

## 6. Detalle por pantalla

### 6.1 Pantalla inicial

Texto sugerido (en tratamiento neutro; adaptar si el equipo elige voseo o tuteo):

> **Reporte un problema en su comunidad**
>
> Grabe una nota de voz o tome una foto. La ubicación se agrega automáticamente. Puede completar los detalles después.

Debe haber **dos acciones principales visibles sin desplazarse**: "Grabar nota de voz" y "Tomar foto". Reducir espacios vacíos para que se encuentren rápido.

### 6.2 Grabación y publicación

Diferenciar visualmente tres estados: **reposo, grabando y publicando**.

- **Reposo:** botón grande "Grabar nota de voz".
- **Grabando:** indicador **"Grabando · 45 segundos restantes"** (el contador debe decir claramente que es tiempo restante), con una barra de progreso además del número. Acción principal: **"Publicar reporte"**.
- **Publicando:** mensaje de progreso comprensible ("Enviando su reporte…") y controles bloqueados para evitar envíos repetidos.

Al llegar a los 60 segundos, avisar con claridad qué ocurre (por ejemplo, que la grabación terminó y puede publicarse).

*Adición menor:* ofrecer una forma discreta de **descartar y volver a grabar**, como acción secundaria, para quien se equivoca. No agrega pasos al flujo principal.

### 6.3 Fotografía

Mostrar la foto seleccionada con **"Publicar reporte"** como acción principal y una acción secundaria para repetir la foto. El código revisado publica automáticamente al seleccionar la foto; la historia HU-02 habla de capturar y **presionar publicar**. Alinear etiquetas y controles con la historia sin añadir pantallas obligatorias (ver sección 11).

### 6.4 Permisos y errores *(sección nueva)*

No añade reglas de negocio; define cómo se comunica lo que ya puede ocurrir.

- **Antes de pedir un permiso**, una línea de contexto: "Necesitamos su ubicación para indicar dónde está el problema."
- **Si se niega un permiso**, explicar qué no se podrá hacer y cómo continuar o activarlo.
- **Si el GPS tiene poca precisión**, avisar que podrá ajustar el marcador después (RF-03, HU-05).
- **Si falla el envío**, mostrar el mensaje **cerca del botón afectado**, indicar si el reporte se conserva y cómo reintentar.
- Los mensajes de error explican cómo continuar, no solo qué falló.

### 6.5 Confirmación

Presentar el **número de seguimiento como información principal** y grande, con opción de copiarlo.

- Título: **"Reporte recibido"**.
- Acciones visibles: **"Ver mi reporte"** y **"Agregar más detalles"**.
- Explicar que agregar detalles es **opcional y no genera otro reporte**.

### 6.6 Complementación (Agregar más detalles)

Agrupar los campos en bloques comprensibles: **descripción, categoría, fotografías y ubicación**. Conservar la reproducción del audio y la galería para consultar lo aportado antes de editar (HU-04). Al guardar, confirmar que el número de seguimiento no cambió (RF-02).

### 6.7 Duplicados

Mostrar el aviso previsto con fecha y estado del reporte existente, más **"Ver reporte existente"** y **"Continuar con el envío"**. El aviso debe ser claro pero **no bloquear la publicación** ni sentirse como un error. Debe aparecer en un máximo de 1,5 segundos (RNF-02).

### 6.8 Adhesión

Botón **"A mí también me afecta"** con una línea explicativa: "Suma un respaldo a este reporte y le avisaremos cuando se resuelva." Permitir adjuntar foto o nota sin crear un nuevo ticket (RF-06, HU-10).

### 6.9 Atención conjunta

> Su reporte se está atendiendo junto con otros del mismo problema. Puede seguir consultando con este número.

Mantener los identificadores, enlaces y trazabilidad requeridos. Mostrar el avance del expediente principal (HU-09).

---

## 7. Organización de Mis reportes

En el código revisado, esta pantalla combina el mapa comunitario con el listado general. Separar visualmente tres secciones:

1. **Mis reportes:** solicitudes creadas por la persona.
2. **Reportes que sigo:** incidentes a los que se adhirió.
3. **Problemas en mi comunidad:** mapa de incidentes para consultar y respaldar.

**Mis reportes debe mostrar realmente los reportes propios**, como establece RF-02. Si requiere corregir el filtrado del código, se trata de alinear la implementación con el requisito existente, además de mejorar la presentación.

**Nota sobre "Reportes que sigo":** HU-10 indica que quien se adhiere queda suscrito a las notificaciones de resolución, pero los requerimientos no describen un listado de reportes seguidos. Es una mejora de presentación razonable, pero conviene **validarla con el Product Owner** para que no se interprete como funcionalidad nueva.

**Tarjetas de reporte:** priorizar categoría, estado, fecha y número de seguimiento. Mantener una acción clara para abrir el detalle. Explicar los estados con lenguaje sencillo, conservando sus nombres oficiales (sección 4).

---

## 8. Diseño móvil, claridad visual y accesibilidad

**Heredado y conservado**

- Alto contraste y controles de al menos **48 × 48 dp** (RNF-01).
- Acciones principales en una columna en pantallas estrechas.
- Una acción principal clara según el momento: grabar, publicar o agregar detalles.
- Textos breves y consistentes: **"Publicar reporte"** para la misma acción en toda la interfaz.
- Mensajes de error cerca de la acción afectada, explicando cómo continuar.
- Sin desplazamiento horizontal por mapas, botones o tarjetas.

**Ampliado en esta versión**

- **No depender solo del color.** Los estados y prioridades llevan siempre nombre, y si es posible un ícono distinto.
- **Tamaño de texto legible** y respeto del ajuste de tamaño de fuente del sistema, especialmente para personas mayores.
- **Compatibilidad con lectores de pantalla:** etiquetas accesibles en botones, imágenes y el mapa.
- **Retroalimentación múltiple:** al iniciar la grabación, publicar o recibir el ticket, combinar texto con vibración o sonido breve, no solo un cambio visual.
- **Legibilidad al sol:** probar contraste real en exteriores, ya que RNF-01 lo exige bajo luz solar directa.
- **Espaciado entre botones** suficiente para evitar toques accidentales, sobre todo entre "Publicar reporte" y acciones secundarias como descartar.

---

## 9. Recepción municipal

Mantener las funciones previstas y mejorar su organización:

- Agrupar búsqueda y filtros en un bloque claramente identificado (RF-07).
- Mantener **sincronizados el mapa y la lista**, haciendo evidente qué reporte está seleccionado (HU-11).
- Destacar **"Posible duplicado"** sin confundirlo con una duplicidad confirmada.
- Agrupar evidencia y ubicación para facilitar la evaluación (RF-08, HU-12).
- Diferenciar visualmente las acciones de **admitir, desestimar, asignar severidad y consolidar**.
- Conservar las justificaciones obligatorias y las confirmaciones establecidas (HU-08, HU-13).
- Mantener los colores de prioridad previstos (verde, amarillo, naranja, rojo) **acompañados del nombre del nivel** (RF-09).

**Adición: estabilidad ante actualizaciones en tiempo real.** Como RNF-03 exige actualizar la vista en máximo 3 segundos, evitar que la lista "salte" o se reordene mientras el funcionario lee o edita un caso. Opciones: indicar "Hay reportes nuevos" con un aviso discreto, o resaltar brevemente los nuevos sin mover el elemento seleccionado. Cuando una severidad Grave o Crítica reordene la cola (HU-14), hacerlo visible pero sin perder el caso en el que se está trabajando.

---

## 10. Cambios respecto a la versión anterior

| Tema | Versión anterior | Esta versión |
| --- | --- | --- |
| Tratamiento (voseo) | Voseo en todos los textos. | Se recomienda tratamiento neutro o "usted"; decisión del equipo. |
| "Ticket" | Se usa "ticket". | **"Número de seguimiento"** con "(ticket)" en la primera mención. |
| Estados oficiales | Se mencionan, con explicación general. | Glosario explícito con frases ciudadanas, incluido el motivo de "Desestimado". |
| Permisos y errores | Solo mensajes de error cerca de la acción. | Sección dedicada: permisos, GPS impreciso, fallos de envío. |
| Accesibilidad | Contraste, 48 dp, ícono con texto. | Se agregan lectores de pantalla, tamaño de texto, retroalimentación múltiple y prueba al sol. |
| Descartar grabación | No se contempla. | Acción secundaria discreta, sin añadir pasos. |
| Panel municipal en tiempo real | No se contempla. | Criterios para no desordenar la lista durante las actualizaciones (RNF-03). |
| "Reportes que sigo" | Se propone sin advertencia. | Se marca para validación con el Product Owner. |
| Validación | Se aclara que no es prueba de usabilidad. | Se agrega un plan de prueba con usuarios (sección 12). |

---

## 11. Puntos que requieren aclaración antes de modificar la interacción

1. **Conteo de los dos toques (RNF-01).** Pueden intervenir controles de cámara, permisos y alertas de duplicidad. Con foto: abrir cámara, capturar y publicar pueden sumar tres. Hay que definir **cómo se cuentan** esas interacciones y qué excepciones contempla el criterio. No afirmar cumplimiento sin esa definición.
2. **Publicación de fotografías.** HU-02 menciona capturar y presionar publicar; el código publica automáticamente tras seleccionar. Alinear etiquetas y controles con la historia sin pantallas obligatorias adicionales.
3. **Momento de la georreferenciación.** RF-01 menciona coordenadas y fecha/hora en el momento de captura; RF-03 se refiere a la publicación rápida. Acordar la precisión temporal. La interfaz debe describir fielmente el mecanismo implementado.
4. **Nombre del botón de adhesión.** RF-06 usa "A mí también me afecta" o "Confirmar situación", y HU-10 usa "Confirmar incidente". Elegir **un solo nombre** y alinear los requerimientos.
5. **Nombre de los estados.** RF-08 usa "Admitido" y HU-12 "Admitido a trámite". Unificar el nombre oficial.
6. **Posición del aviso de duplicado.** Definir si aparece antes o después de tocar "Publicar reporte" y si cuenta como toque adicional.
7. **Tratamiento del texto** (usted, tuteo o voseo): decisión del equipo y, de ser posible, del Product Owner.
8. **"Reportes que sigo"**: confirmar con el Product Owner si es aceptable como presentación (sección 7).

---

## 12. Validación con usuarios (propuesta)

Antes de dar el diseño por cerrado, hacer una prueba breve:

- **Participantes:** 3 a 5 personas, incluyendo al menos una persona adulta mayor y alguien con poca experiencia con aplicaciones.
- **Tarea 1:** reportar un problema (bache o basura) usando voz, sin explicación previa.
- **Tarea 2:** reportar con foto.
- **Tarea 3:** encontrar su reporte y agregar una descripción.
- **Tarea 4:** respaldar un reporte existente.
- **Qué observar:** dónde dudan, qué botón buscan, si entienden el número de seguimiento y si saben que su reporte ya fue enviado.
- **Condición extra:** probar al menos una vez en exteriores con luz solar.

---

## 13. Orden sugerido de trabajo

1. Corregir etiquetas y explicaciones para que cada acción indique su consecuencia.
2. Unificar tratamiento, glosario y nombres (botón de adhesión, estados).
3. Mejorar la visibilidad del estado de grabación, publicación y confirmación.
4. Destacar el número de seguimiento y la complementación opcional posterior.
5. Definir mensajes de permisos y errores.
6. Organizar Mis reportes, Reportes que sigo y Problemas en mi comunidad.
7. Simplificar los avisos de duplicidad y atención conjunta.
8. Ajustar la distribución móvil y la jerarquía visual del panel municipal, incluyendo el comportamiento en tiempo real.
9. Reforzar accesibilidad y validar con usuarios.

Estas recomendaciones **no añaden formularios obligatorios, nuevas reglas de negocio ni etapas previas a la publicación**. Los puntos ambiguos se resuelven con base en los requisitos antes de implementar cambios de interacción.

---

## 14. Trazabilidad rápida

| Recomendación | RF / RNF / HU |
| --- | --- |
| Publicar en voz o foto sin escribir | RF-01, HU-01, HU-02 |
| Contador de tiempo restante | HU-01 |
| Número de seguimiento visible | RF-01, HU-01 |
| Complementación posterior con el mismo ticket | RF-02, HU-03 |
| Escuchar audio y ver fotos propias | HU-04 |
| Ajuste del marcador | RF-03, HU-05 |
| Botones de 48 × 48 dp, alto contraste, dos toques | RNF-01 |
| Aviso de posible duplicado | RF-04, RNF-02 |
| Atención conjunta y ticket individual | RF-05, HU-08, HU-09 |
| Adhesión con foto opcional | RF-06, HU-10 |
| Consola con lista y mapa sincronizados | RF-07, HU-11, RNF-03 |
| Admitir o desestimar con motivo | RF-08, HU-12, HU-13 |
| Severidad, colores y prioridad | RF-09, HU-14 |
