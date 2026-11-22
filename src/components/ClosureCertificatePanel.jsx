import { useRef, useState } from 'react';
import Evidence from './Evidence.jsx';
import {
  confirmClosureSolution,
  extractClosureCertificate,
} from '../services/closureConfirmation.js';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function ClosureCertificatePanel({
  report,
  municipalView = false,
  confirmationHours,
  onConfirmed,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);

  const certificate = extractClosureCertificate(report, { confirmationHours });
  if (!certificate) return null;

  async function handleConfirmSolution() {
    if (busyRef.current || !certificate.canConfirmSolution) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await confirmClosureSolution(report.ticket, { confirmationHours });
      onConfirmed?.(updated);
      setMessage('Solución confirmada. El expediente ha quedado archivado definitivamente.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="closure-certificate-panel"
      aria-labelledby="closure-certificate-title"
    >
      <div className="closure-certificate-header">
        <span className="closure-certificate-badge">
          {certificate.isArchived ? 'Expediente archivado' : 'Constancia oficial de cierre'}
        </span>
        <h2 id="closure-certificate-title">
          Comprobante digital de atención y cierre del incidente
        </h2>
      </div>

      <dl className="closure-certificate-grid">
        <div>
          <dt>Fecha y hora de cierre</dt>
          <dd><strong>{formatDateTime(certificate.closedAt)}</strong></dd>
        </div>
        <div>
          <dt>Dependencia encargada</dt>
          <dd>
            <strong>{certificate.department}</strong>
            {certificate.crewName ? ` (${certificate.crewName})` : ''}
          </dd>
        </div>
        <div>
          <dt>Plazo de validación ciudadana</dt>
          <dd>
            {certificate.confirmationWindowHours} horas
            {certificate.confirmationDeadlineAt
              ? ` (hasta ${formatDateTime(certificate.confirmationDeadlineAt)})`
              : ''}
          </dd>
        </div>
      </dl>

      <div className="closure-technical-note">
        <h3>Nota técnica del trabajo realizado</h3>
        <p className="preserve-lines">{certificate.technicalNote}</p>
      </div>

      <div className="closure-final-photo">
        <h3>Fotografía final del trabajo realizado</h3>
        {certificate.hasClosurePhoto ? (
          <Evidence photos={certificate.photos} />
        ) : (
          <p role="status">Sin fotografía de cierre adjunta en el registro técnico.</p>
        )}
      </div>

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      {certificate.isConfirmedByCitizen && (
        <p className="closure-archived-notice" role="status">
          <strong>Solución confirmada por el ciudadano</strong>
          {certificate.solutionConfirmedAt
            ? ` el ${formatDateTime(certificate.solutionConfirmedAt)}`
            : ''}
          . El expediente se encuentra archivado definitivamente.
        </p>
      )}

      {!certificate.isConfirmedByCitizen && certificate.windowExpired && (
        <p className="closure-expired-notice" role="status">
          El plazo de {certificate.confirmationWindowHours} horas para validación ciudadana expiró y el expediente
          quedó archivado por vencimiento del plazo.
        </p>
      )}

      {!municipalView && certificate.canConfirmSolution && (
        <div className="closure-confirmation-actions">
          <p>
            Si la atención realizada solucionó el problema de forma satisfactoria, puedes confirmar la solución dentro
            del plazo de {certificate.confirmationWindowHours} horas para dar por cerrado y archivar definitivamente el
            expediente.
          </p>
          <div className="actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => { void handleConfirmSolution(); }}
            >
              {busy ? 'Archivando expediente…' : 'Confirmar solución'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
