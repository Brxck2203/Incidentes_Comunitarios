import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ROLE_DEFINITIONS,
  getActiveAccessSession,
  loginRoleSession,
  logoutAccessSession,
  resolveAllowedRedirectRoute,
  subscribeToAccessSession,
  verifySessionAccountActive,
} from '../services/accessControl.js';
import '../components/AccessPortalPage.css';

export default function AccessPortalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState(() => getActiveAccessSession());
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('gestor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);

  const deniedReason = location.state?.accessDeniedReason || '';

  useEffect(() => {
    let active = true;
    verifySessionAccountActive().then((verified) => {
      if (!active) return;
      setSessionState(verified);
      if (verified.reason === 'deactivated') {
        setError(
          'Tu cuenta fue desactivada por la administración municipal y tu sesión se bloqueó de inmediato.',
        );
      }
    });

    const unsubscribe = subscribeToAccessSession(() => {
      if (active) setSessionState(getActiveAccessSession());
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const created = await loginRoleSession({ email, role });
      setSessionState({ valid: true, reason: 'ok', session: created });
      setEmail('');
      const targetRoute = resolveAllowedRedirectRoute(created);
      if (targetRoute !== '/acceso') {
        navigate(targetRoute);
      } else {
        setMessage(`Sesión activa iniciada como ${created.roleLabel}.`);
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo iniciar la sesión solicitada.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleLogout() {
    logoutAccessSession();
    setSessionState({ valid: false, reason: 'unauthenticated', session: null });
    setMessage('Sesión cerrada correctamente.');
    setError('');
  }

  const activeSession = sessionState.valid ? sessionState.session : null;

  return (
    <section>
      <h1>Control de acceso y perfil activo</h1>
      <p className="lead">
        Inicia sesión según tu perfil para acceder únicamente a las vistas y herramientas operativas autorizadas para tu rol.
      </p>

      {deniedReason && (
        <p className="access-denied-banner" role="alert">
          {deniedReason}
        </p>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      {activeSession ? (
        <div className="access-session-summary" role="region" aria-label="Perfil autenticado">
          <h2>Sesión activa: {activeSession.roleLabel}</h2>
          <p>
            Correo: <strong>{activeSession.email}</strong>
            {activeSession.department ? ` · Dependencia: ${activeSession.department}` : ''}
            {activeSession.crew ? ` · Cuadrilla: ${activeSession.crew}` : ''}
          </p>
          <p>
            {activeSession.role === 'cuadrilla'
              ? 'Tu perfil cuenta con autorización para el registro de avance y cierre técnico en órdenes asignadas, sin acceso a la consola de admisión ni a la bitácora de auditoría.'
              : activeSession.role === 'ciudadano'
                ? 'Tu perfil cuenta con acceso a la publicación y seguimiento ciudadano de incidentes.'
                : activeSession.role === 'gestor'
                  ? 'Tu perfil cuenta con autorización para la consola municipal de admisión, priorización y asignación de cuadrillas.'
                  : 'Tu perfil cuenta con autorización administrativa para consola de recepción, auditoría y gestión de accesos.'}
          </p>

          <div className="access-session-actions">
            {(activeSession.role === 'gestor' ||
              activeSession.role === 'administrador') && (
              <Link className="button-link" to="/recepcion">
                Ir a Recepción municipal
              </Link>
            )}
            <Link className="button-link" to="/reportes">
              Ir a Mis reportes
            </Link>
            <button type="button" className="secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : (
        <form className="access-portal-card" onSubmit={handleLogin}>
          <h2>Iniciar sesión por perfil</h2>
          <div className="access-portal-fields">
            <label htmlFor="access-email">
              Correo electrónico
              <input
                id="access-email"
                type="email"
                required
                maxLength={160}
                placeholder="funcionario@municipalidad.local"
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label htmlFor="access-role">
              Perfil de acceso
              <select
                id="access-role"
                value={role}
                disabled={busy}
                onChange={(event) => setRole(event.target.value)}
              >
                {Object.values(ROLE_DEFINITIONS).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Verificando acceso…' : 'Ingresar'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
