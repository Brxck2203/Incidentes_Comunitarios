import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAudioRecorder from '../hooks/useAudioRecorder.js';
import { createReport, validatePhotos } from '../services/reportRepository.js';
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

export default function HomePage() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const capturedAt = useRef(null);
  const publishing = useRef(false);
  const cameraInputRef = useRef(null);
  const navigate = useNavigate();

  async function publishReport({ audioBlob, photoList } = {}) {
    if (publishing.current) return;
    publishing.current = true;
    setBusy(true);
    setError('');
    const recordTime = capturedAt.current || getTimestamp();
    try {
      const positionPromise = getCurrentPosition().then((value) => ({ value }), (failure) => ({ failure }));
      const audio = audioBlob !== undefined ? audioBlob : (voice.recording ? await voice.stop() : voice.audio);
      const photosToSend = photoList !== undefined ? photoList : photos;
      const location = await positionPromise;
      if (location.failure) throw location.failure;
      const report = await createReport({
        audio,
        photos: photosToSend,
        position: location.value,
        capturedAt: recordTime,
      });
      navigate(`/reportes/${report.ticket}`, { state: { created: true } });
    } catch (failure) {
      setError(failure.message);
    } finally {
      publishing.current = false;
      setBusy(false);
    }
  }

  const voice = useAudioRecorder({
    onTimeout: async (recordedBlob) => {
      if (recordedBlob) {
        await publishReport({ audioBlob: recordedBlob });
      }
    },
  });

  async function handleCameraCapture(event) {
    setError('');
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const selected = validatePhotos(files);
      if (selected.length) {
        setPhotos(selected);
        capturedAt.current = getTimestamp();
        await publishReport({ photoList: selected });
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      event.target.value = '';
    }
  }

  function openCamera() {
    if (busy || voice.starting) return;
    cameraInputRef.current?.click();
  }

  async function handleMicClick() {
    if (busy || voice.starting) return;
    if (voice.recording) {
      const audioBlob = await voice.stop();
      if (audioBlob) {
        await publishReport({ audioBlob });
      }
    } else {
      capturedAt.current = getTimestamp();
      await voice.start();
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
          onChange={(event) => { void handleCameraCapture(event); }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {busy && (
        <div className="sending-indicator" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Obteniendo ubicación y enviando reporte…</span>
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
              onClick={() => { void voice.stop(); }}
              disabled={busy}
            >
              Detener y escuchar primero
            </button>
          </div>
        </div>
      )}

      <Evidence audio={voice.audio} photos={photos} />

      {(error || voice.error) && <p className="error-message" role="alert">{error || voice.error}</p>}

      <button
        className="publish-button"
        type="button"
        disabled={busy || voice.starting || (!voice.recording && !voice.audio && !photos.length)}
        onClick={() => { void publishReport(); }}
      >
        {busy ? 'Obteniendo ubicación y guardando…' : 'Publicar reporte'}
      </button>

      <p>Se asociarán la ubicación de tu dispositivo y la fecha del reporte.</p>
      <Link className="text-link" to="/reportes">Consultar mis reportes</Link>
    </section>
  );
}
