import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAudioRecorder from '../hooks/useAudioRecorder.js';
import { createReport, getCurrentReporterId, validatePhotos } from '../services/reportRepository.js';
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const draftRef = useRef(EMPTY_DRAFT);
  const publishing = useRef(false);
  const active = useRef(true);
  const cameraInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function publishReport({ audioBlob, photoList, stopReason = 'send' } = {}) {
    if (publishing.current || !active.current) return;
    publishing.current = true;
    setBusy(true);
    setError('');
    const recordTime = capturedAt.current || getTimestamp();
    const photosToSend = photoList !== undefined ? photoList : photos;
    try {
      const audio = audioBlob !== undefined
        ? audioBlob
        : (voice.recording ? await voice.stop(stopReason) : voice.audio);
      if (!active.current) return;
      if (!audio?.size && !photosToSend.length) {
        setError('La grabación no generó audio. Vuelve a grabar antes de publicar.');
        return;
      }
      const position = await getCurrentPosition();
      if (!active.current) return;
      const report = await createReport({
        audio,
        photos: photosToSend,
        position,
        capturedAt: recordTime,
        reporterId,
      });
      if (!active.current) return;
      navigate(`/reportes/${report.ticket}`, { state: { created: true } });
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
    if (!active.current) return;
    setError('');
    const files = event.target.files;
    if (!files || files.length === 0) return;
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
    if (publishing.current || busy || voice.starting) return;
    cameraInputRef.current?.click();
  }

  async function handleMicClick() {
    if (publishing.current || busy || voice.starting) return;
    if (voice.recording) {
      await publishReport({ stopReason: 'send' });
    } else {
      capturedAt.current = getTimestamp();
      setError('');
      await voice.start();
    }
  }

  function stopForReview() {
    void voice.stop('review').catch((failure) => {
      if (active.current) setError(failure.message);
    });
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
          disabled={busy || voice.starting}
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
          disabled={busy || voice.starting || voice.recording}
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
        disabled={busy || voice.starting || (!voice.recording && !draft.audio?.size && !draft.photos.length)}
        onClick={() => { void publishReport(); }}
      >
        {busy ? 'Obteniendo ubicación y guardando…' : 'Publicar reporte'}
      </button>

      <p>Se asociarán la ubicación del dispositivo al publicar y la fecha de incorporación de la evidencia.</p>
      <Link className="text-link" to="/reportes">Consultar mis reportes</Link>
    </section>
  );
}
