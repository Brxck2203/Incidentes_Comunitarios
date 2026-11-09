import { Link, NavLink, Outlet } from 'react-router-dom';

export default function MainLayout() {
  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="site-header">
      <Link className="brand" to="/">Reporte Ciudadano</Link>
      <nav aria-label="Navegación principal">
        <NavLink to="/" end>Reportar</NavLink>
        <NavLink to="/reportes">Mis reportes</NavLink>
        <NavLink to="/recepcion">Recepción</NavLink>
      </nav>
    </header>
    <main id="contenido" className="page-container" tabIndex={-1}><Outlet /></main>
  </>;
}
