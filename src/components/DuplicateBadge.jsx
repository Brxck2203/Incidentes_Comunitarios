// TODO: reemplazar o integrar en consola municipal cuando se integre HU-11

export default function DuplicateBadge({ match, count = 1 }) {
  if (!match?.originalReport) return null;

  const distanceText = Number.isFinite(match.distanceMeters)
    ? `${match.distanceMeters} m`
    : '';

  return (
    <div className="duplicate-badge-container" role="status" aria-label="Indicador de posible duplicado">
      <span className="duplicate-badge">
        <span className="duplicate-badge-icon" aria-hidden="true">⚠</span>
        <span>Posible duplicado</span>
      </span>
      <span className="duplicate-badge-meta">
        Coincide con <strong>{match.originalReport.ticket}</strong>
        {distanceText ? ` (${distanceText})` : ''}
        {count > 1 ? ` y ${count - 1} más` : ''}
      </span>
    </div>
  );
}
