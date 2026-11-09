import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAudioRecorder from '../hooks/useAudioRecorder.js';
import { createReport, validatePhotos } from '../services/reportRepository.js';
import { getCurrentPosition } from '../services/geolocation.js';
import Evidence from '../components/Evidence.jsx';

export default function HomePage() {
  const voice = useAudioRecorder();
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const capturedAt = useRef(null);
  const publishing = useRef(false);
  const navigate = useNavigate();

  function selectPhoto(event) {
    setError('');
    try {
      const selected = validatePhotos(event.target.files);
      if (selected.length) { setPhotos(selected); capturedAt.current = new Date().toISOString(); }
    } catch (failure) { setError(failure.message); }
    event.target.value = '';
  }

  async function publish() {
    if (publishing.current) return;
    publishing.current = true; setBusy(true); setError('');
    try {
      const positionPromise = getCurrentPosition().then((value) => ({ value }), (failure) => ({ failure }));
      const audio = voice.recording ? await voice.stop() : voice.audio;
      const location = await positionPromise;
      if (location.failure) throw location.failure;
      const report = await createReport({ audio, photos, position: location.value, capturedAt: capturedAt.current });
      navigate(`/reportes/${report.ticket}`, { state: { created: true } });
    } catch (failure) { setError(failure.message); }
    finally { publishing.current = false; setBusy(false); }
  }

  return <section aria-labelledby="capture-title">
    <p className="eyebrow">Tu comunidad, en tus manos</p>
    <h1 id="capture-title">¿Qué está pasando?</h1>
    <p className="lead">Graba una nota de voz o toma una fotografía. Podrás agregar los detalles después.</p>
    <div className="capture-actions">
      <button className="capture-button" type="button" disabled={busy || voice.starting || voice.recording}
        onClick={() => { capturedAt.current = new Date().toISOString(); void voice.start(); }}>
        {voice.starting ? 'Activando micrófono…' : voice.recording ? 'Grabando…' : 'Grabar nota de voz'}
      </button>
      <label className="file-control">Tomar o elegir fotografía
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment" disabled={busy || voice.starting || voice.recording} onChange={selectPhoto} />
      </label>
    </div>
    {voice.recording && <div className="recording-status" role="status">
      <p>Grabando · {voice.seconds} segundos restantes</p>
      <p>Pulsa Publicar reporte para terminar y guardar.</p>
      <button type="button" className="secondary" onClick={() => { void voice.stop(); }} disabled={busy}>Detener y escuchar</button>
    </div>}
    <Evidence audio={voice.audio} photos={photos} />
    {(error || voice.error) && <p className="error-message" role="alert">{error || voice.error}</p>}
    <button className="publish-button" type="button" disabled={busy || voice.starting || (!voice.recording && !voice.audio && !photos.length)} onClick={() => { void publish(); }}>
      {busy ? 'Obteniendo ubicación y guardando…' : 'Publicar reporte'}
    </button>
    <p>Se asociarán la ubicación de tu dispositivo y la fecha del reporte.</p>
    <Link className="text-link" to="/reportes">Consultar mis reportes</Link>
  </section>;
}
