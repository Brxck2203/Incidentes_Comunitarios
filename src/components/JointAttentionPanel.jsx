import { Link } from 'react-router-dom';

function formatDateTime(isoString) {
  if (!isoString) return 'No disponible';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return date.toLocaleString('es-CR');
}

export default function JointAttentionPanel({ tracking }) {
  if (!tracking?.isConsolidatedSecondary) return null;

  return (
    <section
      className="joint-attention-panel"
      aria-labelledby="joint-attention-title"
    >
      <div className="joint-attention-header">
        <span className="joint-attention-badge">Atención conjunta</span>
        <h2 id="joint-attention-title">
          Tu reporte fue integrado a una orden de atención conjunta
        </h2>
      </div>

      <p className="joint-attention-lead">
        Tu número de ticket <strong>{tracking.ticket}</strong> fue tomado en cuenta y unificado con el expediente
        maestro{' '}
        <Link to={`/reportes/${tracking.masterTicket}`}>
          <strong>{tracking.masterTicket}</strong>
        </Link>{' '}
        para coordinar una sola cuadrilla de atención en el punto reportado.
      </p>

      {tracking.masterUnavailable ? (
        <p className="error-message" role="alert">
          No se pudo consultar en este momento el detalle del expediente maestro ({tracking.masterTicket}). Se muestra
          el último estado registrado en tu ticket.
        </p>
      ) : (
        <>
          <dl className="joint-attention-metrics">
            <div className="joint-attention-metric-card">
              <dt>Estado global del expediente maestro</dt>
              <dd>{tracking.effectiveStatus}</dd>
            </div>
            <div className="joint-attention-metric-card">
              <dt>Expediente maestro</dt>
              <dd>{tracking.masterTicket}</dd>
            </div>
            <div className="joint-attention-metric-card">
              <dt>Última actualización del maestro</dt>
              <dd>{formatDateTime(tracking.effectiveUpdatedAt)}</dd>
            </div>
          </dl>

          <h3>Avance global del expediente maestro</h3>
          {tracking.masterProgressHistory.length > 0 ? (
            <ol className="joint-attention-timeline">
              {tracking.masterProgressHistory.map((entry, idx) => (
                <li key={idx}>
                  <strong>{formatDateTime(entry.at)}</strong> · {entry.action}
                </li>
              ))}
            </ol>
          ) : (
            <p>El expediente maestro se encuentra registrado y en espera de nuevas actualizaciones.</p>
          )}
        </>
      )}
    </section>
  );
}
