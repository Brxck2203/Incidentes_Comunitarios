import { Link, NavLink, Outlet } from 'react-router-dom';
import { uiCopy } from '../constants/uiCopy.js';

export default function MainLayout() {
  return <>
    <a className="skip-link" href="#contenido">{uiCopy.common.skipToContent}</a>
    <header className="site-header">
      <Link className="brand" to="/">{uiCopy.common.appName}</Link>
      <nav aria-label={uiCopy.common.mainNavAria}>
        <NavLink to="/" end>{uiCopy.common.navReport}</NavLink>
        <NavLink to="/reportes">{uiCopy.common.navMyReports}</NavLink>
        <NavLink to="/recepcion">{uiCopy.common.navMunicipalReception}</NavLink>
      </nav>
    </header>
    <main id="contenido" className="page-container" tabIndex={-1}><Outlet /></main>
  </>;
}
