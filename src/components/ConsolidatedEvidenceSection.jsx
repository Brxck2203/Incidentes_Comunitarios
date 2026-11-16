import { Link } from 'react-router-dom';
import Evidence from './Evidence.jsx';

export default function ConsolidatedEvidenceSection({ report }) {
  const secondaryTickets = Array.isArray(report?.secondaryTickets) ? report.secondaryTickets : [];
  const mergedEvidence = Array.isArray(report?.mergedEvidence) ? report.mergedEvidence : [];

  if (secondaryTickets.length === 0 && mergedEvidence.length === 0) {
    return null;
  }

  return (
    <section
      className="consolidated-evidence-section"
      aria-labelledby="consolidated-evidence-title"
    >
      <div className="consolidated-section-header">
        <span className="consolidation-status-badge master-badge">Caso maestro</span>
        <h2 id="consolidated-evidence-title">
          Solicitudes vecinales y evidencias consolidadas ({secondaryTickets.length})
        </h2>
      </div>

      <p>
        Este expediente principal agrupa los siguientes tickets vecinales:{' '}
        {secondaryTickets.map((secTicket, idx) => (
          <span key={secTicket}>
            {idx > 0 && ', '}
            <Link to={`/reportes/${secTicket}`}>
              <strong>{secTicket}</strong>
            </Link>
          </span>
        ))}
        .
      </p>

      {mergedEvidence.length > 0 && (
        <div className="merged-evidence-list">
          {mergedEvidence.map((item) => {
            const hasAudio = Boolean(item.audio?.size);
            const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
            return (
              <article
                key={item.sourceTicket}
                className="merged-evidence-card"
                aria-label={`Evidencia aportada por el ticket ${item.sourceTicket}`}
              >
                <div className="merged-evidence-card-header">
                  <p className="ticket">
                    Aportado por ticket:{' '}
                    <Link to={`/reportes/${item.sourceTicket}`}>{item.sourceTicket}</Link>
                  </p>
                  <p className="merged-evidence-meta">
                    Ingreso original: {new Date(item.createdAt).toLocaleString('es-CR')}
                  </p>
                </div>

                {item.description && (
                  <p className="preserve-lines">Descripción aportada: {item.description}</p>
                )}
                {item.transcription && (
                  <p className="preserve-lines">Nota / transcripción: {item.transcription}</p>
                )}
                {item.references && (
                  <p className="preserve-lines">Referencias: {item.references}</p>
                )}

                {hasAudio || photoCount > 0 ? (
                  <Evidence audio={item.audio} photos={item.photos} />
                ) : (
                  <p>Sin archivos multimedia adicionales en este ticket.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
