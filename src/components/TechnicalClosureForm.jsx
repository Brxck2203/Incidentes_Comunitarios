import { useState } from 'react';
import { closeTechnicalOrder, validatePhotos } from '../services/reportRepository.js';
export default function TechnicalClosureForm({ report, onSaved }) {
  const [worker, setWorker] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!['Asignado', 'En atención'].includes(report.status) || report.masterTicket || report.consolidation?.role === 'secondary') return null;
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const updated = await closeTechnicalOrder(report.ticket, { worker, note, photos }); onSaved(updated); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form className="selected-incident" onSubmit={submit} aria-label="Cierre técnico de orden">
    <h2>Concluir orden</h2>
    <label>Encargado de cuadrilla<input required maxLength={120} value={worker} onChange={e => setWorker(e.target.value)} disabled={busy} /></label>
    <label>Nota técnica<textarea required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></label>
    <label>Fotografías del trabajo terminado<input required={!photos.length} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy} onChange={e => {
      try { setPhotos(validatePhotos(e.target.files)); setError(''); }
      catch (failure) { setPhotos([]); setError(failure.message); }
    }} /></label>
    <p>{photos.length} fotografía(s) seleccionada(s).</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    <button disabled={busy || !photos.length} type="submit">{busy ? 'Guardando…' : 'Concluir orden'}</button>
  </form>;
}
