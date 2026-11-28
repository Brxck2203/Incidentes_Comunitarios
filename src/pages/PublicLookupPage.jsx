import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { lookupPublicTicket } from '../services/publicTicketTracking.js';
import { subscribeToReportChanges } from '../services/reportNotifications.js';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function PublicLookupPage() {
  const { ticket: routeTicket } = useParams();
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState(routeTicket ?? '');
  const [result, setResult] = useState(null);
  const [searchedCode, setSearchedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!routeTicket) return undefined;
    void executeLookup(routeTicket);
    const refresh = () => { void executeLookup(routeTicket); };
    window.addEventListener('focus', refresh);
    const unsubscribe = subscribeToReportChanges(refresh);
    return () => {
      requestSeq.current += 1;
      window.removeEventListener('focus', refresh);
      unsubscribe();
    };
  }, [routeTicket]);

  async function executeLookup(codeToSearch) {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const publicView = await lookupPublicTicket(codeToSearch);
      if (seq !== requestSeq.current) return;
      setInputCode(codeToSearch.trim());
      setSearchedCode(codeToSearch.trim());
      setResult(publicView);
    } catch (failure) {
      if (seq !== requestSeq.current) return;
      setResult(null);
      setSearchedCode('');
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    const trimmed = inputCode.trim();
    if (routeTicket && routeTicket === trimmed) {
      void executeLookup(trimmed);
      return;
    }
    if (trimmed) {
      navigate(`/consulta/${encodeURIComponent(trimmed)}`);
    } else {
      void executeLookup('');
    }
  }

  return (
    <section aria-labelledby="public-lookup-title">
      <h1 id="public-lookup-title">Consulta pública de reporte por ticket</h1>
      <p className="lead">
        Ingresa tu número de ticket para conocer el estado actual y la línea de tiempo de tu solicitud sin necesidad de
        iniciar sesión.
      </p>

      <form className="public-lookup-form" onSubmit={handleSubmit}>
        <label>
          Código de ticket
          <input
            type="search"
            maxLength={128}
            placeholder="Ejemplo: RC-..."
            value={inputCode}
            disabled={loading}
            onChange={(event) => setInputCode(event.target.value)}
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Consultando…' : 'Consultar estado'}
          </button>
          {(result || error || searchedCode) && (
            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() => {
                setInputCode('');
                setResult(null);
                setSearchedCode('');
                setError('');
                if (routeTicket) navigate('/consulta');
              }}
            >
              Limpiar consulta
            </button>
          )}
        </div>
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && searchedCode && !result && (
        <p className="error-message" role="alert">
          No se encontró ningún reporte registrado con el número de ticket <strong>{searchedCode}</strong>. Verifica el
          código e inténtalo nuevamente.
        </p>
      )}

      {result && (
        <article className="public-status-card" aria-labelledby="public-result-heading">
          <div className="public-status-header">
            <h2 id="public-result-heading">Estado de la solicitud</h2>
            <span className="public-stage-pill">{result.currentStage}</span>
          </div>

          <dl className="public-status-summary">
            <div>
              <dt>Número de ticket</dt>
              <dd className="ticket">{result.ticket}</dd>
            </div>
            <div>
              <dt>Etapa actual</dt>
              <dd><strong>{result.currentStage}</strong></dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{result.category}</dd>
            </div>
            <div>
              <dt>Fecha y hora de registro</dt>
              <dd>{formatDateTime(result.createdAt)}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>{formatDateTime(result.updatedAt)}</dd>
            </div>
          </dl>

          {result.isJointAttention && (
            <div className="public-joint-notice" role="status">
              {result.masterUnavailable ? (
                <p>
                  Este ticket está vinculado al expediente principal <strong>{result.masterTicket}</strong>, pero no se
                  pudo consultar su estado vigente en este momento.
                </p>
              ) : (
                <p>
                  Esta solicitud fue integrada a una atención conjunta bajo el expediente principal{' '}
                  <Link to={`/consulta/${encodeURIComponent(result.masterTicket)}`}>
                    <strong>{result.masterTicket}</strong>
                  </Link>
                  . El estado y la línea de tiempo reflejan el avance de dicho expediente.
                </p>
              )}
            </div>
          )}

          <h3>Línea de tiempo de etapas completadas</h3>
          {result.timeline.length > 0 ? (
            <ol className="public-timeline" aria-label="Historial cronológico de etapas del reporte">
              {result.timeline.map((step, index) => (
                <li key={`${step.stage}-${step.at ?? index}`} className="public-timeline-item">
                  <div className="public-timeline-header">
                    <strong className="public-timeline-stage">{step.stage}</strong>
                    <span className="public-timeline-date">{formatDateTime(step.at)}</span>
                  </div>
                  <p className="public-timeline-summary">{step.summary}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p>No hay etapas registradas disponibles para este ticket.</p>
          )}

          <p className="public-privacy-note">
            Por protección de privacidad, esta consulta pública muestra únicamente el avance operativo del ticket y
            omite los datos de las personas reportantes.
          </p>
        </article>
      )}
    </section>
  );
}
