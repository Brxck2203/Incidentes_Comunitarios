import { Link } from 'react-router-dom';
import { uiCopy } from '../constants/uiCopy.js';

export default function DuplicateWarning({
  matches,
  onContinue,
  onCancel,
  busy = false,
  continueLabel = uiCopy.duplicates.continuePublishAction,
}) {
  if (!matches.length) return null;
  return <div className="duplicate-warning" role="alert" aria-live="polite">
    <h2>{uiCopy.duplicates.citizenHeading}</h2>
    <p>{uiCopy.duplicates.citizenDescription}</p>
    <ul>{matches.map((match) => <li key={match.ticket}>
      <Link to={`/reportes/${match.ticket}`} target="_blank" rel="noopener noreferrer">
        {uiCopy.duplicates.viewExistingAction(match.ticket)}
      </Link>
      <span> · {match.status} · {new Date(match.createdAt).toLocaleString('es-CR')} · {Math.round(match.distanceMeters)} m</span>
    </li>)}</ul>
    <div className="actions">
      <button type="button" disabled={busy} onClick={onContinue}>{continueLabel}</button>
      {onCancel && <button type="button" className="secondary" disabled={busy} onClick={onCancel}>{uiCopy.common.cancelAction}</button>}
    </div>
  </div>;
}
