import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAudioRecorder from '../hooks/useAudioRecorder.js';
import { categories, createReport, findPotentialDuplicates, getCurrentReporterId, validatePhotos } from '../services/reportRepository.js';
import DuplicateWarning from '../components/DuplicateWarning.jsx';
import { getCurrentPosition } from '../services/geolocation.js';
import Evidence from '../components/Evidence.jsx';

function MicrophoneIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function getTimestamp() {
  return new Date().toISOString();
}

const EMPTY_DRAFT = { mode: null, audio: null, photos: [], capturedAt: null };

function hasEvidence(draft) {
  return Boolean(draft.audio?.size || draft.photos.length);
}

export default function HomePage() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [category, setCategory] = useState('');
  const [pendingReport, setPendingReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const draftRef = useRef(EMPTY_DRAFT);
  const publishing = useRef(false);
  const active = useRef(true);
  const cameraInputRef = useRef(null);
  const [reporterId] = useState(() => { try { return getCurrentReporterId(); } catch { return null; } });
  const navigate = useNavigate();

  function updateDraft(nextDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function persistReport(payload) {
    const report = await createReport(payload);
    if (active.current) navigate(`/reportes/${report.ticket}`, { state: { created: true } });
  }

  async function continuePending() {
    if (publishing.current || !pendingReport) return;
    publishing.current = true; setBusy(true); setError('');
    try { await persistReport(pendingReport); if (active.current) setPendingReport(null); }
    catch (failure) { if (active.current) setError(failure.message); }
    finally { publishing.current = false; if (active.current) setBusy(false); }
  }

  async function publishReport(options = {}) {
    if (publishing.current || !active.current || pendingReport) return;
    publishing.current = true;
    setBusy(true);
    setError('');
    const currentDraft = draftRef.current;
    const snapshot = {
      ...currentDraft,
      audio: currentDraft.audio,
      photos: [...currentDraft.photos],
      capturedAt: currentDraft.capturedAt || getTimestamp(),
    };
    if (!currentDraft.capturedAt) updateDraft(snapshot);
    const hasAudioOverride = Object.prototype.hasOwnProperty.call(options, 'audioBlob');
    try {
      let audio = hasAudioOverride ? options.audioBlob : snapshot.audio;
      if (snapshot.mode === 'voice' && !hasAudioOverride && voice.recording) {
        audio = await voice.stop(options.stopReason || 'send');
      }
      if (!active.current) return;
      if (snapshot.mode === 'voice' && audio?.size) {
        snapshot.audio = audio;
        if (draftRef.current.mode === 'voice' && draftRef.current.capturedAt === snapshot.capturedAt) {
          updateDraft({ ...draftRef.current, audio });
        }
      }
      if (!audio?.size && !snapshot.photos.length) {
        setError(snapshot.mode === 'voice'
          ? 'La grabación no generó audio. Vuelve a grabar antes de publicar.'
          : 'Selecciona una fotografía o graba una nota de voz antes de publicar.');
        return;
      }
      const position = await getCurrentPosition();
      if (!active.current) return;
      const payload = {
        audio,
        photos: snapshot.photos,
        position,
        capturedAt: snapshot.capturedAt,
        reporterId,
        category,
      };
      const matches = category ? await findPotentialDuplicates(position, category) : [];
      if (!active.current) return;
      if (matches.length) {
        setPendingReport({ ...payload, matches });
        return;
      }
      await persistReport(payload);
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      publishing.current = false;
      if (active.current) setBusy(false);
    }
  }

  const voice = useAudioRecorder({
    onTimeout: (recordedBlob) => publishReport({ audioBlob: recordedBlob, stopReason: 'timeout' }),
  });

  async function handleCameraCapture(event) {
    const input = event.currentTarget;
    try {
      if (!active.current || publishing.current) return;
      const files = input.files;
      if (!files?.length) return;
      if (voice.recording || voice.starting) {
        setError('Detén la grabación antes de seleccionar una fotografía.');
        return;
      }
      const selected = validatePhotos(files);
      if (selected.length) {
        if (hasEvidence(draftRef.current)
          && !window.confirm('Hay una evidencia pendiente. ¿Deseas reemplazarla por esta fotografía?')) return;
        updateDraft({ mode: 'photo', audio: null, photos: selected, capturedAt: getTimestamp() });
        setError('');
        await publishReport();
      }
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      input.value = '';
    }
  }

  function openCamera() {
    if (!active.current || publishing.current || busy || voice.starting || voice.recording || pendingReport) return;
    cameraInputRef.current?.click();
  }

  async function handleMicClick() {
    if (publishing.current || busy || voice.starting || pendingReport) return;
    if (voice.recording) {
      await publishReport({ stopReason: 'send' });
    } else {
      if (hasEvidence(draftRef.current)
        && !window.confirm('Hay una evidencia pendiente. ¿Deseas reemplazarla por una nueva nota de voz?')) return;
      updateDraft({ mode: 'voice', audio: null, photos: [], capturedAt: getTimestamp() });
      setError('');
      await voice.start();
    }
  }

  async function stopForReview() {
    try {
      const audio = await voice.stop('review');
      if (audio?.size && draftRef.current.mode === 'voice' && !publishing.current) {
        updateDraft({ ...draftRef.current, audio });
      }
    } catch (failure) {
      if (active.current) setError(failure.message);
    }
  }

  return (
    <section aria-labelledby="capture-title">
      <p className="eyebrow">Tu comunidad, en tus manos</p>
      <h1 id="capture-title">¿Qué está pasando?</h1>
      <p className="lead">Graba una nota de voz o toma una fotografía. Podrás agregar los detalles después.</p>

      <div className="capture-actions">
        <button
          type="button"
          className={`capture-action-card mic-card ${voice.recording ? 'recording-active' : ''}`}
          disabled={busy || voice.starting || Boolean(pendingReport)}
          onClick={() => { void handleMicClick(); }}
          aria-label={voice.recording ? 'Detener grabación y enviar reporte' : 'Grabar nota de voz y enviar al instante'}
        >
          <span className="action-icon-circle">
            {voice.recording ? <StopIcon /> : <MicrophoneIcon />}
          </span>
          <span className="action-card-text">
            <strong className="action-title">
              {voice.starting
                ? 'Activando micrófono…'
                : voice.recording
                ? `Grabando (${voice.seconds}s)`
                : 'Grabar nota de voz'}
            </strong>
            <span className="action-subtitle">
              {voice.recording ? 'Toca para enviar de inmediato' : 'Toca para grabar y enviar'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="capture-action-card camera-card"
          disabled={busy || voice.starting || voice.recording || Boolean(pendingReport)}
          onClick={openCamera}
          aria-label="Tomar fotografía con la cámara y enviar al instante"
        >
          <span className="action-icon-circle">
            <CameraIcon />
          </span>
          <span className="action-card-text">
            <strong className="action-title">Tomar fotografía</strong>
            <span className="action-subtitle">Abre la cámara y envía al instante</span>
          </span>
        </button>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          capture="environment"
          style={{ display: 'none' }}
          disabled={busy || voice.starting || voice.recording}
          onChange={(event) => { void handleCameraCapture(event); }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      <label className="report-category-field">Categoría del incidente (opcional)
        <select value={category} disabled={busy || Boolean(pendingReport)} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Seleccionar después</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <span className="field-help">Seleccionarla permite detectar reportes cercanos antes de enviarlo. Puedes seguir reportando sin elegirla.</span>
      </label>

      {pendingReport && <DuplicateWarning matches={pendingReport.matches} busy={busy}
        onContinue={() => { void continuePending(); }}
        onCancel={() => { setPendingReport(null); setError(''); }} />}

      {busy && (
        <div className="sending-indicator" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Obteniendo ubicación y guardando el reporte local…</span>
        </div>
      )}

      {voice.recording && (
        <div className="recording-status" role="status">
          <p><strong>Grabando nota de voz</strong> · {voice.seconds} segundos restantes</p>
          <p>Al tocar nuevamente el ícono de micrófono se enviará de inmediato.</p>
          <div className="recording-status-actions">
            <button
              type="button"
              className="primary"
              onClick={() => { void handleMicClick(); }}
              disabled={busy}
            >
              Detener y enviar ahora
            </button>
            <button
              type="button"
              className="secondary"
              onClick={stopForReview}
              disabled={busy}
            >
              Detener y escuchar primero
            </button>
          </div>
        </div>
      )}

      <Evidence
        audio={draft.mode === 'voice' ? draft.audio : null}
        photos={draft.mode === 'photo' ? draft.photos : []}
      />

      {(error || voice.error) && <p className="error-message" role="alert">{error || voice.error}</p>}

      <button
        className="publish-button"
        type="button"
        disabled={busy || voice.starting || Boolean(pendingReport) || (!voice.recording && !voice.audio && !draft.photos.length)}
        onClick={() => { void publishReport(); }}
      >
        {busy ? 'Obteniendo ubicación y guardando…' : 'Publicar reporte'}
      </button>

      <p>Se asociarán la ubicación del dispositivo al publicar y la fecha de incorporación de la evidencia.</p>
      <Link className="text-link" to="/reportes">Consultar mis reportes</Link>
    </section>
  );
}
