import { Link, Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header">
        <Link className="brand" to="/">Reporte Ciudadano</Link>
        <span className="prototype-label">Prototipo académico</span>
      </header>
      <main id="contenido" className="page-container" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>IC-5821 · Requerimientos de Software · Grupo 50</p>
        <p>Demostración sin conexión con servicios municipales.</p>
      </footer>
    </>
  );
}
