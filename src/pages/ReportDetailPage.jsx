import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { categories, getReport, complementReport, validatePhotos } from '../services/reportRepository.js';
import { detectDuplicatesForTicket } from '../services/duplicateDetection.js';
import DuplicateComparisonPanel from '../components/DuplicateComparisonPanel.jsx';
import Evidence from '../components/Evidence.jsx';
import LocationMap from '../components/LocationMap.jsx';

export default function ReportDetailPage() {
  const { ticket } = useParams();
  const location = useLocation();
  const fromReception = Boolean(location.state?.fromReception);
  const [report, setReport] = useState(null);
  const [draft, setDraft] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState({ isSuspectedDuplicate: false, primaryMatch: null, matches: [] });
  const [duplicateError, setDuplicateError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setEditing(false); setReport(null); setMessage(''); setPhotos([]);
    getReport(ticket).then((value) => {
      if (active) {
        setReport(value);
        setDuplicateInfo({ isSuspectedDuplicate: false, primaryMatch: null, matches: [] });
        setDuplicateError('');
      }
    })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticket]);
  useEffect(() => {
    if (!report?.ticket) return undefined;
    let active = true;
    detectDuplicatesForTicket(report.ticket)
      .then((result) => {
        if (active) {
          setDuplicateInfo(result);
          setDuplicateError('');
        }
      })
      .catch(() => {
        if (active) {
          setDuplicateError('No se pudo verificar posibles duplicados en este momento.');
        }
      });
    return () => { active = false; };
  }, [report?.ticket, report?.category, report?.updatedAt]);
  function field(name, value) { setDraft((current) => ({ ...current, [name]: value })); }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const updated = await complementReport(ticket, draft, photos);
      setReport(updated); setEditing(false); setPhotos([]); setMessage('Cambios guardados.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Cargando reporte…</p>;
  if (!report) return <section><h1>Reporte no disponible</h1><p role="alert">{error || 'No se encontró el ticket solicitado.'}</p><Link to={fromReception ? '/recepcion' : '/reportes'}>{fromReception ? 'Volver a recepción de reportes' : 'Volver a mis reportes'}</Link></section>;
  return <section>
    <Link className="text-link" to={fromReception ? '/recepcion' : '/reportes'}>
      {fromReception ? 'Volver a recepción de reportes' : 'Volver a mis reportes'}
    </Link>
    <h1>Detalle del reporte</h1>
    {location.state?.created && <p className="success-message" role="status">Reporte guardado. Conserva tu código de seguimiento.</p>}
    <p className="ticket">{report.ticket}</p>
    <p>{report.status} · {new Date(report.createdAt).toLocaleString('es-CR')}</p>
    <p>Última actualización: {new Date(report.updatedAt).toLocaleString('es-CR')}</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {duplicateError && <p className="error-message" role="alert">{duplicateError}</p>}
    {duplicateInfo.isSuspectedDuplicate && (
      <DuplicateComparisonPanel
        currentReport={report}
        primaryMatch={duplicateInfo.primaryMatch}
        matches={duplicateInfo.matches}
        fromReception={fromReception}
      />
    )}
    <h2>Evidencias</h2><Evidence audio={report.audio} photos={report.photos} />
    {editing ? <form onSubmit={save}>
      <h2>Agregar más detalles</h2>
      <label>Categoría<select value={draft.category} onChange={(event) => field('category', event.target.value)} disabled={busy}>
        <option value="">Sin clasificar</option>{categories.map((category) => <option key={category}>{category}</option>)}
      </select></label>
      <label>Descripción<textarea maxLength={5000} value={draft.description} onChange={(event) => field('description', event.target.value)} disabled={busy} /></label>
      <label>Transcripción o complemento de la nota de voz<textarea maxLength={5000} value={draft.transcription} onChange={(event) => field('transcription', event.target.value)} disabled={busy} /></label>
      <label>Señas o referencias<textarea maxLength={2000} value={draft.references} onChange={(event) => field('references', event.target.value)} disabled={busy} /></label>
      <label>Agregar fotografías<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => {
        try { setPhotos(validatePhotos(event.target.files)); setError(''); } catch (failure) { setError(failure.message); }
        event.target.value = '';
      }} /></label>
      <Evidence photos={photos} />
      <h2>Ajustar ubicación</h2>
      <LocationMap position={draft.position} editable={!busy} onChange={(position) => field('position', position)} />
      <p>Latitud: {draft.position.lat.toFixed(6)} · Longitud: {draft.position.lng.toFixed(6)}</p>
      <div className="actions"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => { setEditing(false); setPhotos([]); setError(''); }}>Cancelar</button></div>
    </form> : <>
      <h2>Información del incidente</h2>
      <p>Categoría: {report.category || 'Sin clasificar'}</p>
      <p className="preserve-lines">{report.description || 'Sin descripción adicional.'}</p>
      {report.transcription && <p className="preserve-lines">Nota: {report.transcription}</p>}
      {report.references && <p className="preserve-lines">Referencias: {report.references}</p>}
      <h2>Ubicación</h2><LocationMap position={report.position} />
      <p>Latitud: {report.position.lat.toFixed(6)} · Longitud: {report.position.lng.toFixed(6)}</p>
      <p>Precisión original del dispositivo: {Math.round(report.originalPosition.accuracy)} metros.</p>
      <button type="button" onClick={() => { setDraft({ category: report.category, description: report.description, transcription: report.transcription, references: report.references, position: { ...report.position } }); setEditing(true); setMessage(''); }}>Agregar más detalles</button>
    </>}
    <h2>Historial de actualizaciones</h2>
    <ol>{report.history.map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString('es-CR')} · {entry.action}</li>)}</ol>
  </section>;
}
