import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MIN_PASSWORD_LENGTH,
  buildCitizenPortfolio,
  canClaimCurrentBrowserActivity,
  getCurrentSession,
  loginCitizenAccount,
  logoutCurrentSession,
  registerCitizenAccount,
  subscribeToSessionChanges,
} from '../services/citizenAuth.js';
import { getReports } from '../services/reportRepository.js';
import { subscribeToReportChanges } from '../services/reportNotifications.js';
import '../components/CitizenAccountPage.css';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function CitizenAccountPage() {
  const initialSessionState = useMemo(() => getCurrentSession({ renew: true }), []);
  const [session, setSession] = useState(initialSessionState.session);
  const [expiredNotice, setExpiredNotice] = useState(initialSessionState.expired);

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [canClaimBrowser, setCanClaimBrowser] = useState(false);
  const [claimBrowserReports, setClaimBrowserReports] = useState(true);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);
  const refreshSeqRef = useRef(0);

  useEffect(() => {
    return subscribeToSessionChanges(() => {
      const current = getCurrentSession();
      setSession(current.session);
      if (current.expired) {
        setExpiredNotice(true);
      }
    });
  }, []);

  useEffect(() => {
    let active = true;
    if (session) return () => { active = false; };

    canClaimCurrentBrowserActivity()
      .then((available) => {
        if (active) {
          setCanClaimBrowser(available);
          setClaimBrowserReports(available);
        }
      })
      .catch(() => {
        if (active) setCanClaimBrowser(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let active = true;
    if (!session) {
      return () => {
        active = false;
      };
    }

    async function loadCitizenReports() {
      const currentCheck = getCurrentSession({ renew: true });
      if (!currentCheck.session) {
        if (active) {
          setSession(null);
          setExpiredNotice(currentCheck.expired);
        }
        return;
      }

      const seq = ++refreshSeqRef.current;
      if (active) setLoadingReports(true);
      try {
        const allReports = await getReports();
        if (active && seq === refreshSeqRef.current) {
          setReports(allReports);
          setError('');
        }
      } catch (failure) {
        if (active && seq === refreshSeqRef.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'No se pudo cargar tu historial de reportes.',
          );
        }
      } finally {
        if (active && seq === refreshSeqRef.current) {
          setLoadingReports(false);
        }
      }
    }

    void loadCitizenReports();
    window.addEventListener('focus', loadCitizenReports);
    const unsubscribeReports = subscribeToReportChanges(loadCitizenReports);

    return () => {
      active = false;
      refreshSeqRef.current += 1;
      window.removeEventListener('focus', loadCitizenReports);
      unsubscribeReports();
    };
  }, [session]);

  const portfolio = useMemo(
    () => buildCitizenPortfolio(reports, session),
    [reports, session],
  );

  function switchAuthMode(nextMode) {
    setMode(nextMode);
    setError('');
    setMessage('');
    setExpiredNotice(false);
    setPassword('');
    setConfirmPassword('');
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (busyRef.current) return;

    setError('');
    setMessage('');
    setExpiredNotice(false);

    if (mode === 'register' && password !== confirmPassword) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      if (mode === 'register') {
        const result = await registerCitizenAccount({
          email,
          password,
          claimBrowserReports: canClaimBrowser ? claimBrowserReports : false,
        });
        setSession(result.session);
        setPassword('');
        setConfirmPassword('');
        setMessage('Cuenta creada y sesión iniciada correctamente.');
      } else {
        const result = await loginCitizenAccount({ email, password });
        setSession(result.session);
        setPassword('');
        setMessage('Sesión iniciada correctamente.');
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'No se pudo procesar tu solicitud.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleLogout() {
    logoutCurrentSession();
    setSession(null);
    setReports([]);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('Has cerrado sesión de forma segura.');
  }

  if (!session) {
    return (
      <section>
        <h1>Mi cuenta ciudadana</h1>
        <p className="lead">
          Crea una cuenta o inicia sesión para consultar en un solo lugar todos los reportes que has publicado y los incidentes comunitarios que has respaldado.
        </p>

        {expiredNotice && (
          <p className="error-message" role="status">
            Tu sesión anterior se cerró automáticamente por inactividad. Inicia sesión nuevamente.
          </p>
        )}
        {error && <p className="error-message" role="alert">{error}</p>}
        {message && <p className="success-message" role="status">{message}</p>}

        <div className="citizen-auth-tabs" role="group" aria-label="Opciones de acceso ciudadano">
          <button
            type="button"
            className={mode === 'login' ? '' : 'secondary'}
            aria-pressed={mode === 'login'}
            onClick={() => switchAuthMode('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={mode === 'register' ? '' : 'secondary'}
            aria-pressed={mode === 'register'}
            onClick={() => switchAuthMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        <form className="citizen-auth-card" onSubmit={handleAuthSubmit}>
          <h2>{mode === 'register' ? 'Crear cuenta ciudadana' : 'Ingresar a mi cuenta'}</h2>

          <div className="citizen-auth-fields">
            <label htmlFor="citizen-email">
              Correo electrónico
              <input
                id="citizen-email"
                type="email"
                required
                maxLength={160}
                autoComplete="email"
                placeholder="vecino@ejemplo.local"
                value={email}
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label htmlFor="citizen-password">
              Contraseña {mode === 'register' ? `(mínimo ${MIN_PASSWORD_LENGTH} caracteres)` : ''}
              <input
                id="citizen-password"
                type="password"
                required
                minLength={mode === 'register' ? MIN_PASSWORD_LENGTH : undefined}
                maxLength={128}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {mode === 'register' && (
              <label htmlFor="citizen-confirm-password">
                Confirmar contraseña
                <input
                  id="citizen-confirm-password"
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={busy}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            )}

            {mode === 'register' && canClaimBrowser && (
              <label className="citizen-claim-checkbox" htmlFor="citizen-claim-browser">
                <input
                  id="citizen-claim-browser"
                  type="checkbox"
                  checked={claimBrowserReports}
                  disabled={busy}
                  onChange={(event) => setClaimBrowserReports(event.target.checked)}
                />
                <span>
                  Conservar en mi cuenta los reportes y respaldos realizados antes en este navegador
                </span>
              </label>
            )}
          </div>

          {/* TODO: agregar enlace "Olvidé mi contraseña" cuando se integre HU-32 */}
          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy
                ? 'Procesando…'
                : mode === 'register'
                  ? 'Registrar cuenta e ingresar'
                  : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section>
      <h1>Mi cuenta ciudadana</h1>

      <div className="citizen-session-banner" role="region" aria-label="Sesión ciudadana activa">
        <div>
          <p>
            Sesión activa: <strong>{session.email}</strong> ({session.roleLabel})
          </p>
          <p>
            Reportes publicados: <strong>{portfolio.publishedReports.length}</strong> · Casos respaldados:{' '}
            <strong>{portfolio.supportedReports.length}</strong>
          </p>
        </div>
        <button type="button" className="secondary" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {loadingReports && <p role="status">Actualizando historial de tu cuenta…</p>}

      <div className="citizen-portfolio-grid">
        <section aria-labelledby="published-reports-heading">
          <h2 id="published-reports-heading">Mis reportes publicados</h2>
          {portfolio.publishedReports.length === 0 ? (
            <p role="status">Aún no has publicado reportes desde esta cuenta.</p>
          ) : (
            <ul className="citizen-portfolio-list">
              {portfolio.publishedReports.map((item) => (
                <li key={item.ticket} className="citizen-portfolio-item">
                  <p>
                    <Link to={`/reportes/${encodeURIComponent(item.ticket)}`}>
                      <strong>{item.ticket}</strong>
                    </Link>{' '}
                    · {item.category} · <strong>{item.effectiveStatus}</strong>
                  </p>
                  <p>
                    Publicado el {formatDateTime(item.createdAt)}
                    {item.supportersCount > 0
                      ? ` · Respaldos vecinales: ${item.supportersCount}`
                      : ''}
                  </p>
                  {item.isConsolidatedSecondary && item.masterTicket && (
                    <p>
                      Atendido en conjunto mediante el expediente maestro{' '}
                      <Link to={`/reportes/${encodeURIComponent(item.masterTicket)}`}>
                        {item.masterTicket}
                      </Link>
                      .
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="supported-reports-heading">
          <h2 id="supported-reports-heading">Casos comunitarios a los que me he sumado</h2>
          {portfolio.supportedReports.length === 0 ? (
            <p role="status">
              Aún no te has sumado con tu respaldo a reportes abiertos por otros vecinos.
            </p>
          ) : (
            <ul className="citizen-portfolio-list">
              {portfolio.supportedReports.map((item) => (
                <li
                  key={item.ticket}
                  className="citizen-portfolio-item citizen-portfolio-item-supported"
                >
                  <p>
                    <Link to={`/reportes/${encodeURIComponent(item.ticket)}`}>
                      <strong>{item.ticket}</strong>
                    </Link>{' '}
                    · {item.category} · <strong>{item.effectiveStatus}</strong>
                  </p>
                  <p>
                    Te sumaste el {formatDateTime(item.supportedAt)} · Total de respaldos:{' '}
                    {item.supportersCount}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="citizen-portfolio-actions">
        <Link className="button-link" to="/">
          Publicar nuevo reporte
        </Link>
        <Link className="text-link" to="/reportes">
          Ver mapa comunitario de incidentes
        </Link>
      </div>
    </section>
  );
}
