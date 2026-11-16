import { Link } from 'react-router-dom';

export default function DuplicateWarning({ matches, onContinue, onCancel, busy = false, continueLabel = 'Continuar con el envío' }) {
  if (!matches.length) return null;
  return <div className="duplicate-warning" role="alert" aria-live="polite">
    <h2>Ya existe un reporte registrado en este punto</h2>
    <p>Se encontraron incidentes abiertos de la misma categoría a menos de 50 metros. Puedes consultar el ticket existente o continuar.</p>
    <ul>{matches.map((match) => <li key={match.ticket}>
      <Link to={`/reportes/${match.ticket}`} target="_blank" rel="noopener noreferrer">Ver reporte existente: {match.ticket}</Link>
      <span> · {match.status} · {new Date(match.createdAt).toLocaleString('es-CR')} · {Math.round(match.distanceMeters)} m</span>
    </li>)}</ul>
    <div className="actions">
      <button type="button" disabled={busy} onClick={onContinue}>{continueLabel}</button>
      {onCancel && <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>}
    </div>
  </div>;
}
