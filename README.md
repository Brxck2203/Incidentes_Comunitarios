# Incidentes_Comunitarios

Tercer proyecto de Requerimientos de Software: prototipo académico del Sistema de Gestión y Reporte de Incidentes Comunitarios (Reporte Ciudadano), desarrollado progresivamente mediante sprints Scrum.

## Base tecnológica

React + Vite, JavaScript/JSX, React Router y Oxlint. Las dependencias y la configuración inicial siguen la base revisada de Brxck2203/CateringService. No se copia código de negocio de catering.

## Instalación y ejecución

Utiliza una versión de Node.js compatible con Vite 8 y npm.

```sh
npm install
npm run dev
```

```sh
npm run lint
npm run build
npm run preview
```

`preview` requiere haber ejecutado `build`. El primer `npm install` generará `package-lock.json`: debe versionarse tras instalar y validar las dependencias. No se incluye un lockfile inventado ni se afirma que la compilación haya sido ejecutada remotamente.

## Organización

- `src/components`: componentes reutilizables y límite de errores de renderizado.
- `src/layouts`: estructura compartida de las pantallas.
- `src/pages`: páginas y rutas.
- `src/assets`: recursos importados por el código.
- `src/data`: futuros datos simulados.
- `src/services`: futura capa de acceso a datos locales.
- `public`: recursos estáticos.

## Estado de la entrega

Esta inicialización incorpora únicamente la base técnica, una pantalla de bienvenida, una ruta 404 y un límite de errores. No implementa RF-01, RF-02, RF-03 ni acredita el cumplimiento completo de RNF-01. No implementa grabación, fotografía, GPS, mapas, publicación, autenticación ni gestión municipal.

El prototipo evolucionará para permitir interacciones demostrables con datos simulados. Se podrá utilizar localStorage cuando un sprint requiera persistencia de prueba, sin backend ni conexión real con servicios municipales. No almacenar datos personales reales ni credenciales en el prototipo.

## Desarrollo incremental

Cada incremento debe relacionarse con los requerimientos e historias validados y conservar evidencia de los cambios reales. La planificación y la trazabilidad se completarán a partir de los documentos del curso, sin declarar funcionalidades pendientes como terminadas.

Conservar versiones diferenciadas del prototipo utilizado en la prueba de concepto y de la entrega final ajustada. Antes de publicar cada incremento: instalar dependencias, ejecutar lint y build, y revisar navegación, comportamiento responsive y accesibilidad manualmente.

## Despliegue

BrowserRouter requiere que el alojamiento redirija las rutas de la aplicación a index.html. La configuración inicial no presupone GitHub Pages ni un proveedor de despliegue.

## Equipo

- Joan Cordero Coto
- Jason Martínez Gutiérrez
- Brack Rivas Hernández

IC-5821 Requerimientos de Software, Grupo 50, II semestre de 2026.
