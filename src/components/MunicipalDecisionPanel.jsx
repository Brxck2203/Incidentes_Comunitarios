import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_OFFICIAL_NAME } from '../services/consolidationService.js';
import { recordMunicipalDecision } from '../services/reportRepository.js';
import {
  canAdjudicateMunicipalReport,
  canStartMunicipalEvaluation,
  municipalDecisionCauses,
  municipalDecisionStatuses,
} from '../services/municipalDecisions.js';

export default function MunicipalDecisionPanel({ report, municipalView, onSaved }) {
  const [action, setAction] = useState('');
  const [responsible, setResponsible] = useState(DEFAULT_OFFICIAL_NAME);
  const [cause, setCause] = useState('');
  const [justification, setJustification] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busyRef = useRef(false);

  if (!municipalView) return null;

  if (report.masterTicket || report.consolidation?.role === 'secondary') {
    const masterTicket = report.masterTicket || report.consolidation.masterTicket;
    return <section className="municipal-decision-panel" aria-labelledby="municipal-decision-title">
      <h2 id="municipal-decision-title">Gestión municipal</h2>
      <p>Las decisiones se registran desde el expediente maestro.</p>
      {masterTicket
        ? <Link to={`/recepcion/${encodeURIComponent(masterTicket)}`}>Abrir expediente maestro {masterTicket}</Link>
        : <p role="alert">No se pudo determinar el ticket del expediente maestro.</p>}
    </section>;
  }

  const canAdjudicate = canAdjudicateMunicipalReport(report);
  const canEvaluate = canStartMunicipalEvaluation(report)
    && report.status !== municipalDecisionStatuses.evaluation;
  const dismissal = action === 'dismiss';
  const actionLabel = {
    evaluation: 'Pasar a evaluación',
    admit: 'Admitir a trámite',
    dismiss: 'Desestimar el expediente',
  }[action];

  async function saveDecision() {
    if (busyRef.current || !action) return;
    const snapshot = {
      ticket: report.ticket,
      action,
      responsible: responsible.trim(),
      ...(action === 'dismiss' ? { cause, justification } : {}),
    };
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await recordMunicipalDecision(snapshot.ticket, snapshot);
      onSaved(updated);
      setAction('');
      setConfirming(false);
      setCause('');
      setJustification('');
      setMessage(updated.municipalDecision?.action === snapshot.action
        ? `Dictamen guardado: ${updated.status}.`
        : 'El expediente ya tenía esta decisión registrada.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function cancelAction() {
    if (busyRef.current) return;
    setAction('');
    setConfirming(false);
    setError('');
  }

  return <section className="municipal-decision-panel" aria-labelledby="municipal-decision-title">
    <h2 id="municipal-decision-title">Gestión municipal</h2>
    <p>Contexto de Recepción. El nombre indicado identifica localmente a quien registra el dictamen.</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}

    {!action && <>
      {canEvaluate && <button type="button" disabled={busy} onClick={() => { setAction('evaluation'); setError(''); }}>
        Marcar En evaluación
      </button>}
      {canAdjudicate && <>
        <button type="button" className="secondary" disabled={busy} onClick={() => { setAction('admit'); setError(''); }}>
          Admitir a trámite
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => { setAction('dismiss'); setError(''); }}>
          Desestimar
        </button>
      </>}
      {!canEvaluate && !canAdjudicate && <p role="status">No hay decisiones disponibles para el estado actual.</p>}
    </>}

    {action && <div className="municipal-decision-form">
      <h3>{actionLabel}</h3>
      <label>Responsable del dictamen
        <input value={responsible} maxLength={120} required disabled={busy || confirming}
          onChange={(event) => setResponsible(event.target.value)} />
      </label>
      {dismissal && !confirming && <>
        <label>Causal de desestimación
          <select value={cause} required disabled={busy}
            onChange={(event) => setCause(event.target.value)}>
            <option value="">Selecciona una causal</option>
            {municipalDecisionCauses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>Justificación
          <textarea value={justification} maxLength={2000} required disabled={busy}
            onChange={(event) => setJustification(event.target.value)} />
        </label>
        <p>La respuesta formal quedará disponible en el seguimiento del expediente.</p>
      </>}
      {confirming && <p role="status">
        ¿Confirmas {actionLabel.toLocaleLowerCase()} para {report.ticket}
        {dismissal ? ` con la causal «${cause}»` : ''}?
      </p>}
      <div className="actions">
        {confirming
          ? <button type="button" disabled={busy} onClick={() => { void saveDecision(); }}>
            {busy ? 'Guardando…' : `Confirmar ${actionLabel.toLocaleLowerCase()}`}
          </button>
          : dismissal
            ? <button type="button" disabled={busy || !cause || !justification.trim() || !responsible.trim()}
              onClick={() => { setConfirming(true); setError(''); }}>Revisar y confirmar</button>
            : <button type="button" disabled={busy || !responsible.trim()} onClick={() => {
              if (action === 'admit') setConfirming(true);
              else void saveDecision();
            }}>{action === 'evaluation' ? 'Guardar evaluación' : 'Continuar'}</button>}
        {confirming && dismissal && <button type="button" className="secondary" disabled={busy}
          onClick={() => setConfirming(false)}>Volver al formulario</button>}
        <button type="button" className="secondary" disabled={busy} onClick={cancelAction}>Cancelar</button>
      </div>
    </div>}
  </section>;
}
