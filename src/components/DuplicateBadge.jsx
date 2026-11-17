import { uiCopy } from '../constants/uiCopy.js';

export default function DuplicateBadge({ match, count = 1 }) {
  if (!match?.originalReport) return null;

  const distanceText = Number.isFinite(match.distanceMeters)
    ? `${match.distanceMeters} m`
    : '';
  const summary = uiCopy.duplicates.municipalMatchesSummary(
    match.originalReport.ticket,
    distanceText,
    count - 1,
  );

  return (
    <div className="duplicate-badge-container" role="status" aria-label={uiCopy.duplicates.municipalBadgeAria}>
      <span className="duplicate-badge">
        <span className="duplicate-badge-icon" aria-hidden="true">⚠</span>
        <span>{uiCopy.duplicates.municipalBadge}</span>
      </span>
      <span className="duplicate-badge-meta">
        {summary.prefix} <strong>{summary.ticket}</strong>
        {summary.distance}
        {summary.extra}
      </span>
    </div>
  );
}
