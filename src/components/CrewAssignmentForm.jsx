import { useState } from 'react';
import { assignReportCrew } from '../services/reportRepository.js';
import { municipalCrews } from '../services/crewAssignment.js';
export default function CrewAssignmentForm({ report, onSaved }) {
  const option = municipalCrews[report.category];
  const [crew, setCrew] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsible, setResponsible] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!option || report.status !== 'Admitido a trámite' || report.masterTicket || report.consolidation?.role === 'secondary') return null;
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const updated = await assignReportCrew(report.ticket, { department: option.department, crew, instructions, deadline, responsible }); onSaved(updated); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="selected-incident" aria-label="Asignar cuadrilla">
    <h2>Asignar cuadrilla</h2>
    <p>Dependencia competente: <strong>{option.department}</strong></p>
    <label>Cuadrilla<select required value={crew} onChange={e => setCrew(e.target.value)} disabled={busy}>
      <option value="">Seleccione una cuadrilla</option>{option.crews.map(name => <option key={name}>{name}</option>)}</select></label>
    <label>Funcionario responsable<input required maxLength={120} value={responsible} onChange={e => setResponsible(e.target.value)} disabled={busy} /></label>
    <label>Instrucciones técnicas<textarea required maxLength={2000} value={instructions} onChange={e => setInstructions(e.target.value)} disabled={busy} /></label>
    <label>Fecha límite<input type="date" required value={deadline} min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`} onChange={e => setDeadline(e.target.value)} disabled={busy} /></label>
    {error && <p className="error-message" role="alert">{error}</p>}
    <button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar asignación'}</button>
  </form>;
}
