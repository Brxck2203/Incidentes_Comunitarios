import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_OFFICIAL_NAME } from '../services/consolidationService.js';
import { isSecondaryReport } from '../services/municipalDecisions.js';
import {
  canReassignReport,
  getAvailableCrewsForReassignment,
  getCurrentAssignment,
  reassignReportCrew,
} from '../services/crewReassignment.js';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function CrewReassignmentPanel({ report, municipalView = false, onSaved }) {
  const [open, setOpen] = useState(false);
  const [responsible, setResponsible] = useState(DEFAULT_OFFICIAL_NAME);
  const [crewId, setCrewId] = useState('');
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);

  if (!municipalView || !report) return null;

  if (isSecondaryReport(report)) {
    const masterTicket = report.masterTicket || report.consolidation?.masterTicket;
    return (
      <section className="crew-reassignment-panel" aria-labelledby="crew-reassignment-title">
        <h2 id="crew-reassignment-title">Asignación de dependencia y cuadrilla</h2>
        <p>La asignación y reasignación de cuadrilla se gestionan desde el expediente maestro.</p>
        {masterTicket ? (
          <Link to={`/recepcion/${encodeURIComponent(masterTicket)}`}>
            Abrir expediente maestro {masterTicket}
          </Link>
        ) : (
          <p role="alert">No se pudo determinar el ticket del expediente maestro.</p>
        )}
      </section>
    );
  }

  const currentAssignment = getCurrentAssignment(report);
  const eligibleToReassign = canReassignReport(report);

  if (!eligibleToReassign && !currentAssignment) {
    return null;
  }

  const availableCrews = getAvailableCrewsForReassignment(report);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busyRef.current || !eligibleToReassign) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await reassignReportCrew(report.ticket, {
        responsible: responsible.trim(),
        crewId,
        justification: justification.trim(),
      });
      onSaved?.(updated);
      setOpen(false);
      setCrewId('');
      setJustification('');
      setMessage(
        `Cuadrilla reasignada a «${updated.assignment.department} — ${updated.assignment.crewName}». El traslado quedó registrado en la bitácora.`,
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function handleCancel() {
    if (busyRef.current) return;
    setOpen(false);
    setCrewId('');
    setJustification('');
    setError('');
  }

  return (
    <section className="crew-reassignment-panel" aria-labelledby="crew-reassignment-title">
      <h2 id="crew-reassignment-title">Dependencia y cuadrilla asignada</h2>

      {currentAssignment ? (
        <dl className="crew-assignment-summary">
          <div>
            <dt>Dependencia responsable:</dt>
            <dd><strong>{currentAssignment.department}</strong></dd>
          </div>
          <div>
            <dt>Cuadrilla encargada:</dt>
            <dd><strong>{currentAssignment.crewName}</strong></dd>
          </div>
          {currentAssignment.assignedAt && (
            <div>
              <dt>Última asignación / traslado:</dt>
              <dd>{formatDateTime(report.assignment?.reassignedAt || currentAssignment.assignedAt)}</dd>
            </div>
          )}
          {currentAssignment.instructions && (
            <div>
              <dt>Instrucciones de trabajo:</dt>
              <dd className="preserve-lines">{currentAssignment.instructions}</dd>
            </div>
          )}
          {currentAssignment.deadline && (
            <div>
              <dt>Fecha límite estimada:</dt>
              <dd>{formatDateTime(currentAssignment.deadline)}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p>Expediente en estado «{report.status}» sin detalle de cuadrilla previa especificado.</p>
      )}

      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      {eligibleToReassign && !open && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            setOpen(true);
            setError('');
            setMessage('');
          }}
        >
          Reasignar
        </button>
      )}

      {eligibleToReassign && open && (
        <form className="crew-reassignment-form" onSubmit={(event) => { void handleSubmit(event); }}>
          <h3>Reasignar expediente a otra dependencia o cuadrilla</h3>
          <p>
            Selecciona la nueva cuadrilla o dependencia encargada y anota el motivo del traslado. El historial anterior
            del expediente se conservará íntegro en la bitácora.
          </p>

          <label>
            Responsable de la reasignación
            <input
              type="text"
              maxLength={120}
              required
              disabled={busy}
              value={responsible}
              onChange={(event) => setResponsible(event.target.value)}
            />
          </label>

          <label>
            Nueva dependencia y cuadrilla
            <select
              required
              disabled={busy}
              value={crewId}
              onChange={(event) => setCrewId(event.target.value)}
            >
              <option value="">Selecciona una dependencia y cuadrilla</option>
              {availableCrews.map((item) => (
                <option key={item.crewId} value={item.crewId}>
                  {item.department} — {item.crewName} ({item.category})
                </option>
              ))}
            </select>
          </label>

          <label>
            Motivo del cambio (obligatorio)
            <textarea
              maxLength={2000}
              required
              disabled={busy}
              placeholder="Explica la razón técnica u operativa para trasladar este incidente a otra cuadrilla o dependencia…"
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
            />
          </label>

          <div className="actions">
            <button
              type="submit"
              disabled={busy || !crewId || !justification.trim() || !responsible.trim()}
            >
              {busy ? 'Guardando reasignación…' : 'Confirmar reasignación'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={handleCancel}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
