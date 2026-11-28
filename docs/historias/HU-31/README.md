# HU-31 — Registro e inicio de sesión de cuenta ciudadana

## Asignación

- Responsable: Joan Cordero Coto.
- Sprint: por confirmar.
- Requerimiento: RF-18.
- Estimación del documento: por confirmar.
- Rama: feature/hu-31-registro-ciudadano.
- Base: main, commit 929589f70c3f908df655002d1a9df86c6cb4e523.

## Objetivo

Permitir al ciudadano crear una cuenta con correo electrónico y contraseña cifrada e iniciar sesión en la plataforma para consultar en un solo lugar el historial completo de los reportes que ha publicado y los casos comunitarios a los que se ha sumado mediante respaldos (RF-18 / HU-31).

## Trabajo a desarrollar

1. Implementar `src/services/citizenAuth.js` sobre una base IndexedDB propia (`reporte-ciudadano-cuentas-ciudadanas`, versión 1) sin modificar `reportRepository.js` ni subir la versión de `reporte-ciudadano` (v2).
2. Derivar las contraseñas mediante Web Crypto API (`PBKDF2` con `SHA-256` y sal aleatoria de 16 bytes), garantizando que nunca se guarden ni expongan contraseñas en texto plano.
3. Validar en el servicio correo obligatorio con formato válido y único (insensible a mayúsculas), contraseña de entre 6 y 128 caracteres, y mensajes genéricos en inicio de sesión que no revelen si un correo existe o no.
4. Gestionar la sesión ciudadana activa con cierre de sesión manual, expiración configurable por inactividad (30 minutos por defecto) y sincronización segura del `reporterId` del navegador para conservar reportes previos no reclamados sin mezclar cuentas distintas en el mismo dispositivo.
5. Construir `src/pages/CitizenAccountPage.jsx` (`/cuenta`) con estilos propios (`src/components/CitizenAccountPage.css`) y controles táctiles de al menos 48 px (RNF-02), presentando al ingresar tanto los reportes publicados por la cuenta como los incidentes respaldados (`confirmations`), sin exponer identificadores de terceros.

## Base y coordinación

- HU-01 / HU-02 / HU-03 y HU-10 (`src/services/reportRepository.js`, `src/services/reportEndorsements.js`): reutiliza `reporterId` y `report.confirmations` para vincular publicaciones y respaldos vecinales sin tocar el repositorio de reportes, y `resolveReportsListTracking` (`src/services/consolidatedTracking.js`, HU-09) para reflejar el avance vigente en tickets consolidados.
- HU-32 (RF-18 — Recuperación de contraseña, Brack Rivas): fuera del alcance de esta historia; no se implementa restablecimiento de contraseña (`TODO` documentado).
- HU-33 (RF-19 — Administración de cuentas internas y catálogo de roles, Jason Martínez): las cuentas ciudadanas utilizan el mismo identificador de rol (`role: 'ciudadano'`, `roleLabel: 'Ciudadano'`) en una base separada para no interferir con el padrón interno de funcionarios.
- HU-34 (RF-19 — Bloqueo de acceso por rol, Joan Cordero): la estructura de sesión (`role`, `active`, `expiresAt`) queda preparada para que el guardián de rutas y acciones valide permisos y sesiones caducadas.
- `src/App.jsx` y `src/layouts/MainLayout.jsx`: únicos archivos compartidos modificados para exponer la ruta `/cuenta`.

## Validación técnica ejecutada y resultados reales

- Registrar una cuenta ciudadana con correo único y contraseña válida, verificando que se guarde únicamente el hash `PBKDF2-SHA-256` con sal aleatoria y permita iniciar sesión de inmediato o tras cerrar y reabrir sesión: **verificado** (`src/services/citizenAuth.test.js` y `tests/HU-31.test.js`).
- Comprobar rechazo de correos inválidos o duplicados, contraseñas fuera de longitud (`6..128`) y mensaje genérico uniforme ante correo inexistente o contraseña incorrecta: **verificado**.
- Verificar que al ingresar se listen por separado todos los reportes publicados por la cuenta y los casos respaldados por ella sin filtrar `reporterId` de terceros, aislando correctamente dos cuentas distintas en el mismo navegador y aplicando la expiración suave por inactividad (30 min): **verificado**.
- Comprobar que la base `reporte-ciudadano` permanece intacta en versión `2`: **verificado**.
- Resultados reales ejecutados localmente:
  - `npm run lint` (`oxlint`): **0 errores** y **0 advertencias nuevas** (solo las 6 advertencias preexistentes en `main`).
  - `npm test` (`tests/*.test.js`): **22/22 pruebas aprobadas** (incluye `tests/HU-31.test.js`).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (incluye 4 pruebas en `src/services/citizenAuth.test.js`).
  - `npm run build` (`vite build`): **compilación exitosa** (`66 modules transformed`).
- **Pendiente de validación manual:** prueba visual e interactiva en navegador móvil y de escritorio sobre `/cuenta` (creación de cuenta, cierre/inicio de sesión, enlace de reportes previos y controles táctiles >= 48 px).

## Límites e integración

Al no existir servidor backend ni transporte autenticado remoto en este prototipo, el hash PBKDF2, las cuentas en IndexedDB y la sesión en almacenamiento del navegador constituyen una simulación funcional local de RF-18 / HU-31 y no equivalen a seguridad real frente a acceso físico al navegador (RNF-05). No se deben registrar correos ni contraseñas reales.
