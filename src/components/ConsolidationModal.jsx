import { useState } from 'react';
import { DEFAULT_OFFICIAL_NAME } from '../services/consolidationService.js';

// TODO: integrar en consola municipal cuando se integre HU-11

export default function ConsolidationModal({
  selectedReports = [],
  busy = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  // Por defecto sugerir el reporte más antiguo como caso maestro
  const sortedByAge = [...selectedReports].sort((a, b) =>
    String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')),
  );
  const defaultMaster = sortedByAge[0]?.ticket ?? '';

  const [masterTicket, setMasterTicket] = useState(defaultMaster);
  const [reason, setReason] = useState('');
  const [official, setOfficial] = useState(DEFAULT_OFFICIAL_NAME);
  const [localError, setLocalError] = useState('');

  if (selectedReports.length < 2) return null;

  function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    setLocalError('');

    if (!masterTicket) {
      setLocalError('Selecciona cuál de los tickets quedará como caso maestro.');
      return;
    }
    if (!reason.trim()) {
      setLocalError('Ingresa el motivo obligatorio de consolidación.');
      return;
    }

    onConfirm({
      tickets: selectedReports.map((item) => item.ticket),
      masterTicket,
      reason: reason.trim(),
      official: official.trim() || DEFAULT_OFFICIAL_NAME,
    });
  }

  return (
    <section
      className="consolidation-modal-panel"
      aria-labelledby="consolidation-modal-title"
    >
      <h2 id="consolidation-modal-title">Consolidar en reporte principal (caso maestro)</h2>
      <p>
        Selecciona cuál de los <strong>{selectedReports.length} reportes elegidos</strong> quedará como{' '}
        <strong>caso maestro</strong>. Los demás reportes quedarán enlazados como secundarios, conservando sus números
        de ticket individuales y agregando sus fotografías y notas de voz al expediente maestro.
      </p>

      {(localError || error) && (
        <p className="error-message" role="alert">
          {localError || error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset className="consolidation-fieldset" disabled={busy}>
          <legend>1. Selecciona el ticket que actuará como caso maestro</legend>
          <ul className="consolidation-candidate-list">
            {sortedByAge.map((item, index) => {
              const isSelectedMaster = masterTicket === item.ticket;
              const photoCount = Array.isArray(item.photos) ? item.photos.length : 0;
              const hasAudio = Boolean(item.audio?.size);
              return (
                <li
                  key={item.ticket}
                  className={`consolidation-candidate-item ${isSelectedMaster ? 'selected-master' : ''}`}
                >
                  <label className="consolidation-radio-label">
                    <input
                      type="radio"
                      name="masterTicket"
                      value={item.ticket}
                      checked={isSelectedMaster}
                      onChange={() => setMasterTicket(item.ticket)}
                    />
                    <div className="consolidation-candidate-info">
                      <strong>{item.ticket}</strong>{' '}
                      <span className="consolidation-role-pill">
                        {isSelectedMaster ? 'Caso maestro (Principal)' : 'Reporte secundario'}
                      </span>
                      {index === 0 && <span className="consolidation-oldest-hint"> · Más antiguo</span>}
                      <p>
                        {item.category || 'Sin clasificar'} · Ingreso:{' '}
                        {new Date(item.createdAt).toLocaleString('es-CR')}
                      </p>
                      <p className="consolidation-evidence-summary">
                        Evidencia aportada: {hasAudio ? '1 nota de voz' : 'Sin nota de voz'} · {photoCount}{' '}
                        {photoCount === 1 ? 'fotografía' : 'fotografías'}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <label>
          2. Funcionario responsable
          <input
            type="text"
            maxLength={120}
            value={official}
            onChange={(event) => setOfficial(event.target.value)}
            disabled={busy}
            required
          />
        </label>

        <label>
          3. Motivo de consolidación (obligatorio)
          <textarea
            maxLength={2000}
            placeholder="Indica la justificación técnica u operativa para unificar estos reportes en una sola orden de trabajo…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            required
          />
        </label>

        <div className="actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Consolidando expedientes…' : 'Confirmar consolidación'}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
