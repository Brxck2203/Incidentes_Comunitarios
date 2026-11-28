# HU-33 — Administración de cuentas de funcionarios, roles y dependencias

## Asignación

- Responsable: Jason Martínez Gutiérrez.
- Sprint: por confirmar.
- Requerimiento: RF-19.
- Estimación del documento: por confirmar.
- Rama: feature/hu-33-administracion-usuarios-roles.
- Base: main, commit 929589f70c3f908df655002d1a9df86c6cb4e523.

## Objetivo

Permitir al administrador municipal registrar cuentas internas de funcionarios en el panel de administración de usuarios, asignándoles su rol (`Gestor Municipal`, `Encargado de Cuadrilla` o `Administrador`) y asociándolos a su dependencia municipal (y cuadrilla específica cuando corresponda), de modo que al guardar cada funcionario reciba asignados únicamente los módulos autorizados para su perfil (RF-19 / HU-33).

## Trabajo a desarrollar

1. Definir el catálogo predefinido de roles y permisos por módulo (`src/services/rolePermissions.js`) cubriendo los cuatro perfiles de RF-19 (`Ciudadano`, `Gestor Municipal`, `Encargado de Cuadrilla` y `Administrador`) y reutilizando las dependencias y cuadrillas oficiales de `municipalCrews` (`src/services/crewAssignment.js`, HU-15).
2. Implementar el servicio `src/services/userAdministration.js` con almacenamiento aislado en una base IndexedDB propia (`reporte-ciudadano-usuarios`, versión 1) para no modificar `reportRepository.js` ni subir la versión de `reporte-ciudadano` (v2).
3. Validar en el servicio nombre obligatorio, correo electrónico con formato válido y único (sin sobrescribir cuentas existentes), rol del catálogo, dependencia obligatoria para `Gestor Municipal` y `Encargado de Cuadrilla` (opcional para `Administrador`) y cuadrilla perteneciente a la dependencia para `Encargado de Cuadrilla`.
4. Resolver el arranque inicial sin cuentas presembradas ni puertas traseras: cuando no existe ningún administrador activo, el primer registro debe crearse con el rol `Administrador`, y no se permite desactivar la última cuenta de `Administrador` activa.
5. No solicitar ni almacenar contraseñas en texto plano ni en el código (`credential: null`), dejando el punto de enlace para el módulo de credenciales e inicio de sesión de HU-31.
6. Construir el panel accesible `src/pages/UserAdminPage.jsx` (`/usuarios`) con controles de al menos 48 px (RNF-02) y estilos propios (`src/components/UserAdminPanel.css`), mostrando los módulos exclusivos habilitados para cada funcionario registrado y permitiendo activar o desactivar cuentas.

## Base y coordinación

- HU-15 (RF-10 — Asignación de cuadrillas): ya integrada en `main`; se consume directamente `municipalCrews` desde `src/services/crewAssignment.js` para las cuatro dependencias (`Red Vial`, `Gestión Ambiental`, `Parques y Ornato`, `Mantenimiento de Infraestructura`) y sus cuadrillas.
- HU-31 y HU-32 (RF-18 — Registro, inicio de sesión y recuperación de contraseña): pendientes de integración. Las cuentas internas se crean con `credential: null` (`TODO: vincular credenciales cuando se integre HU-31`), sin implementar aquí formularios de inicio de sesión ni restablecimiento de contraseña.
- HU-34 (RF-19 — Bloqueo de acceso a rutas y acciones por rol): pendiente de integración. `src/services/rolePermissions.js` exporta `hasModulePermission` y `authorizedModules` listos para que HU-34 bloquee rutas no autorizadas y sesiones de cuentas desactivadas (`TODO` documentado).
- `src/App.jsx` y `src/layouts/MainLayout.jsx`: únicos archivos compartidos modificados para exponer la ruta `/usuarios`.

## Validación técnica ejecutada y resultados reales

- Ejecutar el arranque inicial registrando el primer `Administrador` y verificar que luego se habiliten los tres roles internos (`Gestor Municipal`, `Encargado de Cuadrilla`, `Administrador`) sin almacenar contraseñas: **verificado** (`src/services/userAdministration.test.js` y `tests/HU-33.test.js`).
- Registrar un `Gestor Municipal` y un `Encargado de Cuadrilla` asociados a su dependencia/cuadrilla y comprobar que cada cuenta reciba únicamente los módulos autorizados para su rol: **verificado**.
- Comprobar rechazo ante correos inválidos o duplicados (sin sobrescribir registros previos), dependencias ausentes/inválidas, cuadrillas que no correspondan a la dependencia e intento de desactivar al último administrador activo: **verificado**.
- Verificar que la persistencia ocurra en la base aislada `reporte-ciudadano-usuarios` (v1) sin abrir ni alterar `reporte-ciudadano` (v2): **verificado** (`tests/HU-33.test.js`).
- Resultados reales ejecutados localmente:
  - `npm run lint` (`oxlint`): **0 errores** y **0 advertencias nuevas** (solo las 6 advertencias preexistentes en `main`).
  - `npm test` (`tests/*.test.js`): **22/22 pruebas aprobadas** (incluye `tests/HU-33.test.js`).
  - `node --test src/services/*.test.js`: **28/28 pruebas aprobadas** (incluye 4 pruebas en `src/services/userAdministration.test.js`).
  - `npm run build` (`vite build`): **compilación exitosa** (`67 modules transformed`).
- **Pendiente de validación manual:** recorrido visual e interactivo en navegador móvil y de escritorio sobre `/usuarios` (flujo de primer administrador, cambio dinámico de cuadrillas por dependencia y tamaños táctiles >= 48 px).

## Límites e integración

Este prototipo opera íntegramente en el navegador mediante IndexedDB local, sin servidor backend ni autenticación real: la asignación de roles, módulos autorizados y estado activo/inactivo demuestra las reglas de negocio de RF-19 / HU-33 localmente, pero no constituye seguridad criptográfica ni control de acceso real frente a manipulación del navegador (RNF-05). El bloqueo efectivo de navegación y redirección por rol corresponde a HU-34. No se deben ingresar datos personales ni correos reales.
