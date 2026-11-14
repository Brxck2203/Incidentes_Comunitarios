import { Link } from 'react-router-dom';

// TODO: reemplazar o integrar con acción de consolidación cuando se integren HU-08 y HU-11

function formatDateTime(isoString) {
  if (!isoString) return 'Fecha no disponible';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return date.toLocaleString('es-CR');
}

function formatCoordinates(position) {
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)) {
    return 'Coordenadas no disponibles';
  }
  return `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
}

export default function DuplicateComparisonPanel({
  currentReport,
  primaryMatch,
  matches = [],
  fromReception = false,
}) {
  if (!currentReport || !primaryMatch?.originalReport) return null;

  const { originalReport, distanceMeters, maxRadiusMeters } = primaryMatch;
  const additionalMatches = matches.slice(1);

  return (
    <section
      className="duplicate-comparison-panel"
      aria-labelledby="duplicate-comparison-title"
    >
      <div className="duplicate-comparison-header">
        <span className="duplicate-badge">
          <span className="duplicate-badge-icon" aria-hidden="true">⚠</span>
          <span>Posible duplicado</span>
        </span>
        <h2 id="duplicate-comparison-title">
          Comparación con reporte preexistente en la misma zona y categoría
        </h2>
      </div>

      <p className="duplicate-comparison-summary">
        Se detectó un incidente previo de categoría <strong>{currentReport.category}</strong> a{' '}
        <strong>{distanceMeters} metros</strong> de distancia (radio configurado: {maxRadiusMeters} m).
      </p>

      <dl className="duplicate-metrics-bar">
        <div className="duplicate-metric-item">
          <dt>Distancia entre puntos</dt>
          <dd>{distanceMeters} metros</dd>
        </div>
        <div className="duplicate-metric-item">
          <dt>Fecha y hora del reporte original</dt>
          <dd>{formatDateTime(originalReport.createdAt)}</dd>
        </div>
        <div className="duplicate-metric-item">
          <dt>Ticket original</dt>
          <dd>{originalReport.ticket}</dd>
        </div>
      </dl>

      <div className="duplicate-comparison-grid">
        <article className="duplicate-comparison-card original-report-card" aria-label="Reporte original preexistente">
          <p className="comparison-card-tag">Reporte original (preexistente)</p>
          <p className="ticket">{originalReport.ticket}</p>
          <dl className="comparison-details-list">
            <div>
              <dt>Fecha y hora de ingreso:</dt>
              <dd>{formatDateTime(originalReport.createdAt)}</dd>
            </div>
            <div>
              <dt>Categoría:</dt>
              <dd>{originalReport.category || 'Sin clasificar'}</dd>
            </div>
            <div>
              <dt>Estado:</dt>
              <dd>{originalReport.status}</dd>
            </div>
            <div>
              <dt>Coordenadas GPS:</dt>
              <dd>{formatCoordinates(originalReport.position)}</dd>
            </div>
            <div>
              <dt>Descripción:</dt>
              <dd className="preserve-lines">{originalReport.description || 'Sin descripción adicional.'}</dd>
            </div>
          </dl>
          <Link
            className="text-link"
            to={`/reportes/${originalReport.ticket}`}
            state={{ fromReception }}
          >
            Abrir expediente original ({originalReport.ticket})
          </Link>
        </article>

        <article className="duplicate-comparison-card incoming-report-card" aria-label="Reporte entrante evaluado">
          <p className="comparison-card-tag">Reporte actual (entrante)</p>
          <p className="ticket">{currentReport.ticket}</p>
          <dl className="comparison-details-list">
            <div>
              <dt>Fecha y hora de ingreso:</dt>
              <dd>{formatDateTime(currentReport.createdAt)}</dd>
            </div>
            <div>
              <dt>Categoría:</dt>
              <dd>{currentReport.category || 'Sin clasificar'}</dd>
            </div>
            <div>
              <dt>Estado:</dt>
              <dd>{currentReport.status}</dd>
            </div>
            <div>
              <dt>Coordenadas GPS:</dt>
              <dd>{formatCoordinates(currentReport.position)}</dd>
            </div>
            <div>
              <dt>Descripción:</dt>
              <dd className="preserve-lines">{currentReport.description || 'Sin descripción adicional.'}</dd>
            </div>
          </dl>
        </article>
      </div>

      {additionalMatches.length > 0 && (
        <div className="duplicate-additional-matches">
          <h3>Otros reportes previos coincidentes en la zona ({additionalMatches.length})</h3>
          <ul>
            {additionalMatches.map((item) => (
              <li key={item.originalReport.ticket}>
                <Link
                  to={`/reportes/${item.originalReport.ticket}`}
                  state={{ fromReception }}
                >
                  {item.originalReport.ticket}
                </Link>
                {' · '}Distancia: <strong>{item.distanceMeters} metros</strong>
                {' · '}Ingreso: {formatDateTime(item.originalReport.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
