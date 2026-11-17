import { Link } from 'react-router-dom';
import { getCitizenStatusInfo, uiCopy } from '../constants/uiCopy.js';

function formatDateTime(isoString) {
  if (!isoString) return uiCopy.common.unavailable;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return uiCopy.common.unavailable;
  return date.toLocaleString('es-CR');
}

export default function JointAttentionPanel({ tracking, municipalView = false }) {
  if (!tracking?.isConsolidatedSecondary) return null;

  const traceInfo = uiCopy.jointAttention.citizenTraceability(
    tracking.ticket,
    tracking.masterTicket || uiCopy.common.unavailable,
  );
  const statusInfo = getCitizenStatusInfo(tracking.effectiveStatus, tracking.effectiveDecision);

  return (
    <section
      className="joint-attention-panel"
      aria-labelledby="joint-attention-title"
    >
      <div className="joint-attention-header">
        <span className="joint-attention-badge">{uiCopy.jointAttention.badge}</span>
        <h2 id="joint-attention-title">
          {municipalView ? uiCopy.jointAttention.municipalTitle : uiCopy.jointAttention.citizenTitle}
        </h2>
      </div>

      {!municipalView && (
        <p className="joint-attention-citizen-message">
          <strong>{uiCopy.jointAttention.citizenLead}</strong>
        </p>
      )}

      <p className="joint-attention-lead">
        {traceInfo.prefix}{' '}
        {tracking.masterTicket
          ? <Link to={municipalView
            ? `/recepcion/${encodeURIComponent(tracking.masterTicket)}`
            : `/reportes/${encodeURIComponent(tracking.masterTicket)}`}>
            <strong>{tracking.masterTicket}</strong>
          </Link>
          : <strong>{uiCopy.common.unavailable}</strong>}{' '}
        {traceInfo.suffix}
      </p>

      {tracking.masterUnavailable ? (
        <p className="error-message" role="alert">
          {tracking.masterUnavailableReason || `No se pudo consultar el expediente maestro (${tracking.masterTicket}).`}
          {' '}No se muestra un estado vigente hasta poder consultar el expediente maestro.
        </p>
      ) : (
        <>
          <dl className="joint-attention-metrics">
            <div className="joint-attention-metric-card">
              <dt>{uiCopy.jointAttention.masterStatusLabel}</dt>
              <dd>
                {tracking.effectiveStatus}
                {!municipalView && statusInfo.citizenExplanation && (
                  <span className="status-explanation-inline"> — {statusInfo.citizenExplanation}</span>
                )}
              </dd>
            </div>
            <div className="joint-attention-metric-card">
              <dt>{uiCopy.jointAttention.masterCodeLabel}</dt>
              <dd>{tracking.masterTicket}</dd>
            </div>
            <div className="joint-attention-metric-card">
              <dt>{uiCopy.jointAttention.masterUpdatedLabel}</dt>
              <dd>{formatDateTime(tracking.effectiveUpdatedAt)}</dd>
            </div>
          </dl>

          <h3>{uiCopy.jointAttention.timelineHeading}</h3>
          {tracking.masterProgressHistory.length > 0 ? (
            <ol className="joint-attention-timeline">
              {tracking.masterProgressHistory.map((entry, idx) => (
                <li key={idx}>
                  <strong>{formatDateTime(entry.at)}</strong> · {entry.action}
                </li>
              ))}
            </ol>
          ) : (
            <p>{uiCopy.jointAttention.timelineEmpty}</p>
          )}
        </>
      )}
    </section>
  );
}
