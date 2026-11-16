# Gestión municipal local — HU-11, HU-12 y HU-13

**Responsable original:** Brack Rivas Hernández.

Esta entrega agrega herramientas de Recepción sobre los reportes y datos ya existentes. Mantiene el almacenamiento local, tickets, evidencia original y complementaria, priorización, detección de duplicados, bitácora, consolidación y seguimiento por ticket secundario. No añade backend, autenticación, permisos reales ni comunicación externa con una municipalidad.

## HU-11 — Consola municipal

- Recepción muestra la lista y un mapa de la misma colección filtrada por categoría, estado y búsqueda de ticket o descripción. El orden de la lista conserva la prioridad existente.
- Los estados de tickets secundarios se derivan del maestro. Seleccionar un marcador resalta y desplaza a su tarjeta; el marcador permite abrir el expediente en contexto de Recepción.
- Marcadores usan forma/color para categoría y un número/patrón de borde para severidad, con leyenda textual. Los reportes con coordenadas ausentes o inválidas permanecen en la lista y se cuentan junto al mapa.
- Los cambios se consultan mediante las notificaciones locales existentes, foco de ventana y refresco periódico de 3 segundos en Recepción. El intervalo no constituye una garantía temporal. Las respuestas de lecturas anteriores no reemplazan lecturas más recientes.
- **Diferencia de RF-07:** el repositorio no cuenta con un catálogo acordado de sectores geográficos. No se inventan sectores ni se infieren del GPS; se ofrecen los filtros explícitos de categoría y estado, además de búsqueda.

## HU-12 / HU-13 — Inspección y dictamen

Las decisiones son explícitas, locales y guardadas en una transacción `readwrite`. El servicio vuelve a leer el expediente vigente, valida la acción y sus campos, conserva las demás propiedades y agrega fecha, responsable, respuesta y bitácora. Recepción se notifica una vez completada la transacción. No se requiere severidad para admitir.

| Estado vigente | Pasar a evaluación | Admitir a trámite | Desestimar | Resolver |
|---|---:|---:|---:|---:|
| Registrado / Recibido | Sí | Sí, con confirmación | Sí, causal y justificación obligatorias | Sí, flujo existente |
| En evaluación | Sí, sin duplicar bitácora | Sí, con confirmación | Sí, causal y justificación obligatorias | Sí, flujo existente |
| Otro estado abierto no secundario | Sí | No | No | Sí, flujo existente |
| Admitido a trámite | No | No | No por este dictamen preliminar | Sí, flujo existente |
| Desestimado, Resuelto u otro estado terminal | No | No | No | No |
| Ticket secundario | No; abrir el maestro | No; abrir el maestro | No; abrir el maestro | No; abrir el maestro |

Estas transiciones son decisiones propuestas para esta implementación, no una cita literal de la especificación. Los servicios también impiden recalificar severidad, resolver o consolidar un ticket secundario, y rechazan confirmaciones cuando el maestro está cerrado o no disponible. La consolidación valida de nuevo dentro de su transacción que maestro y secundarios no sean terminales. La edición de evidencia complementaria no se bloquea por el solo hecho de que un ticket sea secundario.

La causal de desestimación requiere seleccionar una opción de un catálogo inicial propuesto: “Fuera de jurisdicción cantonal”, “Competencia de otra entidad” o “Información inverosímil”. No es un catálogo oficial ni representa detección automática de falsedad. La justificación admite hasta 2000 caracteres; el responsable se exige no vacío y admite hasta 120 caracteres. Ambos límites se validan en el servicio.

La respuesta formal queda disponible en el seguimiento ciudadano del maestro y de sus secundarios, sin exponer el nombre local del responsable. No se envía correo ni aviso externo. El nombre del responsable es un dato indicado localmente, no una identidad autenticada.

## Alcance conservado y límites

- No cambia la versión ni la estructura requerida de IndexedDB; las propiedades del dictamen son opcionales para registros anteriores.
- La vista secundaria deriva estado y dictamen público del maestro; si el maestro no está disponible, no presenta el estado local como vigente y comunica que no se pudo resolver el vínculo.
- La sincronización de evidencia secundaria agregada después de consolidar con `mergedEvidence` no forma parte de este cambio y permanece como trabajo independiente.
- Se conservan las funcionalidades ciudadanas de reporte, edición/complementación, evidencia original y vecinal, confirmaciones, prioridad, duplicados y seguimiento.
