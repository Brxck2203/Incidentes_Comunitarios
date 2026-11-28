import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  evaluateActionAccess,
  getActiveAccessSession,
  subscribeToAccessSession,
} from '../services/accessControl.js';

export default function MainLayout() {
  const [sessionState, setSessionState] = useState(() => getActiveAccessSession());

  useEffect(() => {
    return subscribeToAccessSession(() => {
      setSessionState(getActiveAccessSession());
    });
  }, []);

  const canAccessReception = evaluateActionAccess(
    'municipal-admission',
    sessionState.session,
  );

  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className="site-header">
      <Link className="brand" to="/">Reporte Ciudadano</Link>
      <nav aria-label="Navegación principal">
        <NavLink to="/" end>Reportar</NavLink>
        <NavLink to="/reportes">Mis reportes</NavLink>
        {canAccessReception && <NavLink to="/recepcion">Recepción</NavLink>}
        <NavLink to="/acceso">
          {sessionState.valid ? `Perfil: ${sessionState.session.roleLabel}` : 'Acceso'}
        </NavLink>
      </nav>
    </header>
    <main id="contenido" className="page-container" tabIndex={-1}><Outlet /></main>
  </>;
}
