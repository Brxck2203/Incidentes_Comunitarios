# Recomendaciones de UX — Reporte Ciudadano (v3)

**Curso:** IC-5821 Requerimientos de Software · Grupo 50 · II Semestre 2026
**Proyecto:** Proyecto III — Sistema de Gestión y Reporte de Incidentes Comunitarios

---

## 0. Estado de este documento y cómo leerlo

Esta versión incorpora una propuesta nueva del equipo: **permitir que el ciudadano publique una nota de voz y una o varias fotografías en un mismo reporte, sin tener que ir a "Agregar más detalles" después.** El video queda fuera de esta propuesta.

Esa propuesta **modifica requerimientos aprobados** (RF-01 y RNF-01) y por eso se marca así en todo el documento:

| Marca | Significado |
| --- | --- |
| **[VIGENTE]** | Está en los requerimientos actuales. Se puede implementar. |
| **[PROPUESTA – requiere aprobación]** | Depende de que el Product Owner apruebe el cambio de requerimientos. **No debe implementarse como definitivo sin esa aprobación.** |
| **[DECISIÓN PENDIENTE]** | Hay un valor por defecto sugerido, pero lo debe confirmar el equipo o el Product Owner. |

Las recomendaciones se basan en los requerimientos, el código compartido y una captura de escritorio. **No constituyen una prueba de usabilidad con usuarios** (ver sección 14).

---

## 1. Objetivo y alcance

Mejorar la claridad de la interfaz y de los flujos ciudadano y municipal para que cualquier persona (joven, adulta mayor, con poca experiencia digital o usando el teléfono en la calle bajo el sol) pueda reportar y dar seguimiento a un problema sin ayuda, **conservando el comportamiento definido en la Especificación de Requerimientos**, salvo los cambios marcados como propuesta.

**Descartado:** exigir descripción, ubicación y revisión en pantallas sucesivas antes de publicar. RF-01 y RNF-01 priorizan la publicación rápida, sin escribir y en un máximo de dos toques.

---

## 2. Flujos que se deben conservar o incorporar

### 2.1 Flujo rápido [VIGENTE] — no cambia

**Capturar voz o foto → Publicar con ubicación automática → Recibir número de seguimiento (ticket) → Completar detalles opcionalmente.**

- Nota de voz de máximo 60 segundos (RF-01).
- Sin campos de texto obligatorios (RF-01, HU-01).
- Ubicación y fecha/hora vinculadas automáticamente (RF-01, RF-03).
- Estado oficial «Registrado / Recibido» y ticket único (RF-01).
- Descripción, categoría, fotos adicionales y ajuste del marcador después, **conservando el ticket** (RF-02, RF-03).
- Se mantienen alertas de posible duplicado, adhesiones y seguimiento de reportes unificados (RF-04, RF-05, RF-06).

### 2.2 Flujo combinado [PROPUESTA – requiere aprobación]

**Ejemplo guía:** una persona documenta una avería en el parque. Graba una nota de voz, toma una foto de la parte deteriorada y publica ambas **en el mismo reporte**, con un solo número de seguimiento.

Principio de diseño: **el flujo combinado es una opción, nunca una obligación.** Quien no la usa publica exactamente igual que en el flujo rápido, en dos toques.

Reglas del flujo combinado:

1. Después de capturar la primera evidencia, la misma pantalla de captura ofrece una acción secundaria para sumar otra: **"+ Agregar foto"** o **"+ Agregar nota de voz"**.
2. La acción principal siempre sigue siendo **"Publicar reporte"**.
3. Lo ya adjuntado se muestra **en la misma pantalla** (reproductor de audio y miniaturas de fotos), con opción de quitar cada elemento antes de publicar. **No se agrega una pantalla de revisión obligatoria.**
4. Se publica todo junto bajo un único reporte y un único número de seguimiento.
5. La edición posterior sigue disponible (sección 7).

> Una persona que graba y presiona **"Publicar reporte"** obtiene el mismo resultado que hoy. El flujo combinado solo agrega opciones visibles, no pasos obligatorios.

---

## 3. Principios de redacción y tono

| Principio | Recomendación |
| --- | --- |
| **Una sola forma de tratamiento** | Elegir una (usted, tuteo o voseo) y usarla en toda la interfaz. Se recomienda **"usted" o un imperativo neutro** para una aplicación municipal con públicos muy distintos. **[DECISIÓN PENDIENTE]** |
| **Una acción, un nombre** | Cada acción se llama igual en toda la interfaz: siempre **"Publicar reporte"**. |
| **Lenguaje ciudadano primero** | Reemplazar o acompañar la jerga administrativa con una explicación breve (sección 4). |
| **El botón anticipa su consecuencia** | Si una acción publica, el botón lo dice. |
| **Frases cortas, una idea por mensaje** | El usuario puede estar de pie, al sol y con prisa. |
| **Texto junto al ícono** | Ningún ícono se usa sin etiqueta de texto. |

---

## 4. Glosario de términos hacia el ciudadano

El nombre oficial se conserva en la trazabilidad y en la vista municipal; hacia el ciudadano se agrega una explicación simple.

| Término técnico | Texto sugerido para el ciudadano |
| --- | --- |
| Ticket | **Número de seguimiento** ("(ticket)" solo la primera vez). |
| Registrado / Recibido | **Reporte recibido.** "La municipalidad ya tiene su aviso." |
| En evaluación | "La municipalidad está revisando su reporte." |
| Admitido / Admitido a trámite | "Su reporte fue aceptado y será atendido." |
| Desestimado | "Su reporte no pudo tramitarse." Mostrar siempre el **motivo** (HU-13). |
| Reporte principal / secundario | Al ciudadano: "Su reporte se atiende junto con otros del mismo problema." En la vista municipal se conservan los términos. |
| Posible duplicado | "Ya existe un reporte parecido cerca de este lugar." |
| Adhesión / Confirmar situación | **A mí también me afecta** (ver sección 12). |

> Los nombres oficiales de estado no cambian en base de datos, bitácora ni vista municipal. Solo se agrega una explicación en la vista ciudadana.

---

## 5. Cambios recomendados por parte de la interfaz

| Parte de la interfaz | Cambio de UX | Requerimiento | Estado |
| --- | --- | --- | --- |
| Inicio | Título claro, explicación breve y dos acciones principales visibles sin desplazarse. | RF-01 | VIGENTE |
| Grabación | **"Grabando · 45 segundos restantes"** y acción principal **"Publicar reporte"**. | HU-01 | VIGENTE |
| Fotografía | Mostrar la foto y la acción **"Publicar reporte"**, sin pantalla de revisión obligatoria. | HU-02 | VIGENTE |
| **Sumar evidencia** | **"+ Agregar foto" / "+ Agregar nota de voz"** como acción secundaria, con evidencia adjunta visible en la misma pantalla. | RF-01 (ampliado) | **PROPUESTA** |
| Ubicación | Explicar antes del envío que se obtiene automáticamente. Ajuste del marcador en la complementación. | RF-03 / HU-05 | VIGENTE |
| Permisos y errores | Explicar por qué se pide micrófono, cámara y ubicación, y qué hacer si se niegan o fallan. | RF-01, RNF-01 | VIGENTE |
| Categoría | **"Categoría (opcional)"**, con la ayuda "Puede seleccionarla después". | RF-02 / RF-04 | VIGENTE |
| Confirmación | **"Reporte recibido"**, número de seguimiento, **"Ver mi reporte"** y **"Agregar más detalles"**. | HU-01 / HU-03 | VIGENTE |
| Duplicados | Aviso con fecha y estado del reporte existente, **"Ver reporte existente"** y **"Continuar con el envío"**. | RF-04 / HU-06 | VIGENTE |
| Adhesión | **"A mí también me afecta"**, explicando el respaldo y las novedades de resolución. | RF-06 / HU-10 | VIGENTE |
| Atención conjunta | Explicar que se atiende con otros reportes del mismo problema y que conserva su número. | RF-05 / HU-09 | VIGENTE |
| Panel municipal | **"Recepción municipal"** con filtros, mapa, lista y acciones agrupados. | RF-07 a RF-09 | VIGENTE |

---

## 6. Detalle por pantalla

### 6.1 Pantalla inicial [VIGENTE]

Texto sugerido (tratamiento neutro; adaptar si el equipo elige voseo o tuteo):

> **Reporte un problema en su comunidad**
>
> Grabe una nota de voz o tome una foto. La ubicación se agrega automáticamente. Puede completar los detalles después.

Si se aprueba el flujo combinado, agregar una línea breve: *"También puede usar ambas."*

### 6.2 Grabación y publicación

Tres estados visibles: **reposo, grabando y publicando**.

- **Reposo:** botón grande "Grabar nota de voz".
- **Grabando:** indicador **"Grabando · 45 segundos restantes"** con barra de progreso. Acción principal: **"Publicar reporte"**.
- **Publicando:** mensaje de progreso ("Enviando su reporte…") y controles bloqueados contra envíos repetidos.

Al llegar a 60 segundos, avisar con claridad qué ocurre.

**[PROPUESTA]** Mientras graba, ofrecer además una acción secundaria **"Detener"** que conserva el audio y permite sumar fotos antes de publicar. La acción principal sigue siendo **"Publicar reporte"**, que detiene y publica en un solo paso.

*Adición menor [VIGENTE]:* acción secundaria discreta para **descartar y volver a grabar**, sin añadir pasos al flujo principal.

### 6.3 Fotografía

Mostrar la foto seleccionada con **"Publicar reporte"** como acción principal y una acción secundaria para repetirla. El código revisado publica automáticamente al seleccionar la foto, mientras que HU-02 habla de capturar y **presionar publicar**. Alinear etiquetas y controles con la historia sin pantallas obligatorias (sección 12).

**[PROPUESTA]** Tras la primera foto, ofrecer **"+ Agregar foto"** y **"+ Agregar nota de voz"** como acciones secundarias.

### 6.4 Evidencia adjunta en la pantalla de captura [PROPUESTA]

Cuando haya más de una evidencia, mostrar en la misma pantalla:

- Un **reproductor de audio** compacto si hay nota de voz.
- **Miniaturas** de las fotos, con un contador (por ejemplo "2 de 5 fotos").
- Una acción **"Quitar"** por elemento, con texto además del ícono.
- Un aviso claro al alcanzar el máximo permitido ("Llegó al máximo de fotos").

La acción **"Publicar reporte"** debe permanecer siempre visible y en el mismo lugar.

### 6.5 Permisos y errores [VIGENTE]

- **Antes de pedir un permiso**, una línea de contexto: "Necesitamos su ubicación para indicar dónde está el problema."
- **Si se niega un permiso**, explicar qué no se podrá hacer y cómo continuar o activarlo.
- **Si el GPS tiene poca precisión**, avisar que podrá ajustar el marcador después (RF-03, HU-05).
- **Si falla el envío**, mostrar el mensaje cerca del botón afectado, indicar si el reporte se conserva y cómo reintentar.
- **[PROPUESTA]** Si en un reporte combinado falla la subida de una evidencia, indicar **cuál** falló y ofrecer reintentar solo esa (ver sección 12).

### 6.6 Confirmación [VIGENTE]

- Título **"Reporte recibido"**.
- **Número de seguimiento como información principal**, grande y copiable.
- Acciones visibles: **"Ver mi reporte"** y **"Agregar más detalles"**, aclarando que es opcional y no genera otro reporte.
- **[PROPUESTA]** Si el reporte incluye varias evidencias, resumirlas ("Recibimos 1 nota de voz y 3 fotos").

### 6.7 Complementación (Agregar más detalles) [VIGENTE]

Agrupar los campos en bloques comprensibles: **descripción, categoría, fotografías y ubicación**. Conservar la reproducción del audio y la galería (HU-04). Al guardar, confirmar que el número de seguimiento no cambió (RF-02).

### 6.8 Duplicados [VIGENTE]

Aviso con fecha y estado del reporte existente, **"Ver reporte existente"** y **"Continuar con el envío"**. Debe ser claro pero **no bloquear la publicación** ni sentirse como un error. Debe aparecer en máximo 1,5 segundos (RNF-02).

### 6.9 Adhesión [VIGENTE]

**"A mí también me afecta"** con una línea explicativa: "Suma un respaldo a este reporte y le avisaremos cuando se resuelva." Permite adjuntar foto o nota sin crear un nuevo ticket (RF-06, HU-10).

### 6.10 Atención conjunta [VIGENTE]

> Su reporte se está atendiendo junto con otros del mismo problema. Puede seguir consultando con este número.

Mantener los identificadores, enlaces y trazabilidad requeridos.

---

## 7. Edición posterior del reporte

**Hoy [VIGENTE]:** RF-02 permite al ciudadano agregar descripciones, categoría y fotografías adicionales, sin cambiar el ticket. No contempla quitar ni reemplazar la evidencia original.

**Reglas sugeridas [DECISIÓN PENDIENTE]**, para confirmar con el Product Owner:

| Acción | Regla sugerida |
| --- | --- |
| **Agregar** descripción, categoría, fotos o nota de voz | Siempre permitido mientras el reporte esté abierto. |
| **Quitar o reemplazar** evidencia propia | Permitido solo **antes de que el reporte pase a "Admitido"**. Debe quedar registro en la trazabilidad. |
| Después de "Admitido" o en atención | Solo **agregar**. No quitar ni reemplazar, para no afectar el trabajo de la cuadrilla. |
| Número de seguimiento | **Nunca cambia** (RF-02). |
| Aviso al municipio | El panel municipal debe indicar que el reporte fue modificado y cuándo. |

La interfaz de edición debe explicar con lenguaje simple qué se puede y qué no se puede cambiar según el estado del reporte.

---

## 8. Organización de Mis reportes

En el código revisado, esta pantalla combina el mapa comunitario con el listado general. Separar visualmente tres secciones:

1. **Mis reportes:** solicitudes creadas por la persona.
2. **Reportes que sigo:** incidentes a los que se adhirió.
3. **Problemas en mi comunidad:** mapa de incidentes para consultar y respaldar.

**Mis reportes debe mostrar realmente los reportes propios**, como establece RF-02. Si requiere corregir el filtrado del código, se trata de alinear la implementación con el requisito existente.

**Nota sobre "Reportes que sigo":** HU-10 indica que quien se adhiere queda suscrito a las notificaciones de resolución, pero los requerimientos no describen un listado de seguidos. Es una mejora de presentación razonable que conviene **validar con el Product Owner**.

**Tarjetas:** priorizar categoría, estado, fecha y número de seguimiento. **[PROPUESTA]** Mostrar un indicador de qué tipo de evidencia tiene el reporte (por ejemplo "1 audio · 3 fotos"), con texto además del ícono.

---

## 9. Diseño móvil, claridad visual y accesibilidad

- Alto contraste y controles de al menos **48 × 48 dp** (RNF-01), incluidas las miniaturas, los botones "Quitar" y "+ Agregar".
- Acciones principales en una columna en pantallas estrechas.
- Una acción principal clara según el momento: grabar, publicar o agregar detalles.
- Textos breves y consistentes: **"Publicar reporte"** en toda la interfaz.
- Mensajes de error cerca de la acción afectada, explicando cómo continuar.
- Sin desplazamiento horizontal por mapas, botones, tarjetas o carruseles de miniaturas (usar cuadrícula).
- **No depender solo del color:** estados y prioridades llevan nombre y, si es posible, un ícono distinto.
- **Tamaño de texto legible** y respeto del ajuste de fuente del sistema.
- **Lectores de pantalla:** etiquetas accesibles en botones, imágenes (por ejemplo "Foto 2 de 3") y el mapa.
- **Retroalimentación múltiple:** al iniciar la grabación, publicar o recibir el ticket, combinar texto con vibración o sonido breve.
- **Legibilidad al sol:** probar el contraste en exteriores, como exige RNF-01.
- **Espaciado suficiente** entre "Publicar reporte" y las acciones secundarias ("Detener", "Quitar", "+ Agregar") para evitar toques accidentales.

---

## 10. Recepción municipal

- Agrupar búsqueda y filtros en un bloque identificado (RF-07).
- Mantener **mapa y lista sincronizados**, con el reporte seleccionado evidente (HU-11).
- Destacar **"Posible duplicado"** sin confundirlo con duplicidad confirmada.
- Agrupar evidencia y ubicación para evaluar (RF-08, HU-12). **[PROPUESTA]** Mostrar la nota de voz y todas las fotos del reporte en el mismo panel, sin truncar (HU-12 ya lo exige).
- Diferenciar visualmente **admitir, desestimar, asignar severidad y consolidar**.
- Conservar justificaciones obligatorias y confirmaciones (HU-08, HU-13).
- Colores de prioridad previstos **acompañados del nombre del nivel** (RF-09).
- **Indicar cuando un reporte fue modificado por el ciudadano** (sección 7).
- **Tiempo real (RNF-03):** evitar que la lista salte o se reordene mientras se lee o edita un caso. Usar un aviso discreto de "Hay reportes nuevos" o un resaltado que no mueva el elemento seleccionado.

---

## 11. Impacto de la propuesta en los requerimientos

Para presentar al Product Owner como solicitud de cambio:

| Requerimiento | Situación actual | Cambio propuesto |
| --- | --- | --- |
| **RF-01** | Nota de voz **o** evidencia fotográfica. | Nota de voz **y/o** una o más fotografías en un mismo reporte. |
| **RNF-01** | Publicación completa en máximo dos toques. | Los dos toques aplican al **flujo rápido con una sola evidencia**. El flujo combinado es opcional y puede requerir más toques. |
| **HU-01 / HU-02** | Voz sola o foto sola. | Se mantienen sin cambios. |
| **Historia nueva** | No existe. | "Como ciudadano que documenta una avería, quiero publicar una nota de voz y una o varias fotos en un mismo reporte, para que la municipalidad reciba el contexto completo sin que yo deba agregar información después." |
| **RF-02 / HU-04** | Escuchar audio y ver galería. | Sin cambio; ahora el reporte puede nacer con ambos. |
| **RF-05, RF-08, HU-12** | Ya mencionan audio, fotos y galerías. | Cambio mínimo o nulo. |
| **RF-06 / HU-10** | La adhesión permite foto o nota. | Sin cambio obligatorio. |
| **Edición posterior** | Solo agregar. | Reglas de la sección 7, si se aprueban. |

**Argumento para el Product Owner:** la propuesta no agrega formularios ni pantallas obligatorias, conserva intacto el flujo rápido y responde a un caso real. El video queda fuera de alcance.

---

## 12. Puntos que requieren aclaración antes de modificar la interacción

Los valores entre paréntesis son sugerencias por defecto, **no decisiones tomadas**.

1. **Aprobación del flujo combinado** (RF-01 y RNF-01). Sin ella, no implementar como definitivo.
2. **Conteo de los dos toques (RNF-01).** Definir cómo se cuentan cámara, permisos, alertas de duplicidad y el flujo combinado.
3. **Cantidad máxima de fotos por reporte** (sugerido: 5).
4. **Cantidad de notas de voz por reporte** (sugerido: una, máximo 60 s).
5. **Peso máximo y compresión de las fotos**, para que publicar siga siendo rápido con mala conexión.
6. **Subida parcial:** si una evidencia falla, ¿se publica con lo que sí subió o se reintenta todo? (sugerido: publicar y reintentar solo la que falló, avisando claramente).
7. **Publicación de fotografías.** HU-02 dice capturar y presionar publicar; el código publica automáticamente al seleccionar la foto.
8. **Momento de la georreferenciación.** RF-01 habla del momento de captura; RF-03, de la publicación rápida. Con varias evidencias, definir cuál ubicación se usa.
9. **Reglas de edición posterior** (sección 7).
10. **Nombre del botón de adhesión.** RF-06 usa "A mí también me afecta" o "Confirmar situación"; HU-10 usa "Confirmar incidente". Elegir uno.
11. **Nombre de los estados.** "Admitido" (RF-08) vs. "Admitido a trámite" (HU-12).
12. **Posición del aviso de duplicado** respecto al botón de publicar.
13. **Tratamiento del texto** (usted, tuteo o voseo).
14. **"Reportes que sigo"**: validar con el Product Owner.
15. **Privacidad:** las fotos pueden captar rostros o placas. Definir si el equipo agrega algún aviso al usuario.

---

## 13. Cambios respecto a la versión anterior (v2)

| Tema | v2 | v3 |
| --- | --- | --- |
| Voz y foto en un mismo reporte | No contemplado. | Flujo combinado opcional, marcado como propuesta. |
| Múltiples fotos al publicar | Solo después, en complementación. | Permitido en el flujo combinado (propuesta). |
| Video | Mencionado como opción en la conversación. | **Fuera de alcance.** |
| Edición posterior | Se conserva lo de RF-02. | Reglas sugeridas para agregar, quitar y reemplazar según el estado. |
| Etiquetado de requisitos | Todo se presenta como recomendación. | Cada cambio se marca VIGENTE, PROPUESTA o DECISIÓN PENDIENTE. |
| Impacto en requerimientos | No incluido. | Sección 11 con los cambios a RF-01, RNF-01 e historia nueva. |
| Puntos pendientes | 8 puntos. | 15 puntos, con valores sugeridos por defecto. |
| Panel municipal | Estabilidad en tiempo real. | Se agrega indicador de reporte modificado y visualización de todas las evidencias. |

---

## 14. Validación con usuarios (propuesta)

- **Participantes:** 3 a 5 personas, incluyendo al menos una adulta mayor y alguien con poca experiencia con aplicaciones.
- **Tarea 1:** reportar un problema solo con voz, sin explicación previa.
- **Tarea 2:** reportar solo con foto.
- **Tarea 3 [PROPUESTA]:** documentar una avería (por ejemplo, un juego del parque dañado) con voz y foto en el mismo reporte.
- **Tarea 4:** encontrar su reporte y agregar o cambiar algo.
- **Tarea 5:** respaldar un reporte existente.
- **Qué observar:** dónde dudan, qué botón buscan, si entienden que "Publicar reporte" envía todo, si perciben que combinar es opcional y si saben que su reporte ya fue enviado.
- **Condición extra:** probar al menos una vez en exteriores con luz solar.

---

## 15. Orden sugerido de trabajo

1. Corregir etiquetas y explicaciones para que cada acción indique su consecuencia **[VIGENTE]**.
2. Unificar tratamiento, glosario y nombres **[VIGENTE]**.
3. Mejorar la visibilidad de grabación, publicación y confirmación **[VIGENTE]**.
4. Definir mensajes de permisos y errores **[VIGENTE]**.
5. Corregir y organizar Mis reportes **[VIGENTE]**.
6. Simplificar avisos de duplicidad y atención conjunta **[VIGENTE]**.
7. Ajustar distribución móvil, accesibilidad y panel municipal **[VIGENTE]**.
8. Implementar el flujo combinado y la edición ampliada **[PROPUESTA — solo tras aprobación]**.
9. Validar con usuarios.

Estas recomendaciones **no añaden formularios obligatorios, nuevas reglas de negocio ni etapas previas obligatorias a la publicación**. Los puntos ambiguos se resuelven con base en los requisitos antes de implementar cambios de interacción.

---

## 16. Trazabilidad rápida

| Recomendación | RF / RNF / HU |
| --- | --- |
| Publicar con voz o foto sin escribir | RF-01, HU-01, HU-02 |
| Contador de tiempo restante | HU-01 |
| Número de seguimiento visible | RF-01, HU-01 |
| Voz y fotos en un mismo reporte (propuesta) | RF-01 (ampliado), historia nueva |
| Flujo rápido en dos toques | RNF-01 (reformulado en la propuesta) |
| Complementación con el mismo ticket | RF-02, HU-03 |
| Escuchar audio y ver fotos propias | HU-04 |
| Ajuste del marcador | RF-03, HU-05 |
| Aviso de posible duplicado | RF-04, RNF-02 |
| Atención conjunta y ticket individual | RF-05, HU-08, HU-09 |
| Adhesión con foto opcional | RF-06, HU-10 |
| Consola con lista y mapa sincronizados | RF-07, HU-11, RNF-03 |
| Admitir o desestimar con motivo | RF-08, HU-12, HU-13 |
| Severidad, colores y prioridad | RF-09, HU-14 |