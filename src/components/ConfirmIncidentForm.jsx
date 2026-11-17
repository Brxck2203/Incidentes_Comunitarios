import { useState } from 'react';
import { confirmIncident, getCurrentReporterId, validatePhotos } from '../services/reportRepository.js';
import Evidence from './Evidence.jsx';
import { uiCopy } from '../constants/uiCopy.js';

export default function ConfirmIncidentForm({ ticket, onConfirmed, onCancel }) {
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const updated = await confirmIncident(ticket, photos, getCurrentReporterId());
      setPhotos([]);
      onConfirmed?.(updated);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <form className="confirm-form" onSubmit={(event) => { void submit(event); }}>
    <h3>{uiCopy.endorsement.formTitle}</h3>
    <p>{uiCopy.endorsement.formExplanation}</p>
    <label>{uiCopy.endorsement.optionalPhotoLabel}
      <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy}
        onChange={(event) => {
          try { setPhotos(validatePhotos(event.target.files)); setError(''); }
          catch (failure) { setPhotos([]); setError(failure.message); }
          event.target.value = '';
        }} />
    </label>
    <Evidence photos={photos} />
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="actions">
      <button type="submit" disabled={busy}>{busy ? uiCopy.endorsement.submitBusy : uiCopy.endorsement.submitIdle}</button>
      {onCancel && <button type="button" className="secondary" disabled={busy} onClick={onCancel}>{uiCopy.common.cancelAction}</button>}
    </div>
  </form>;
}
