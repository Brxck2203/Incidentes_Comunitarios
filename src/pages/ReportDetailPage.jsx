import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { categories, complementReport, findPotentialDuplicates, getCurrentReporterId, getReport, validatePhotos } from '../services/reportRepository.js';
import { endorsementCount, isActiveReport } from '../services/reportPriority.js';
import DuplicateWarning from '../components/DuplicateWarning.jsx';
import ConfirmIncidentForm from '../components/ConfirmIncidentForm.jsx';
import Evidence from '../components/Evidence.jsx';
import LocationMap from '../components/LocationMap.jsx';

export default function ReportDetailPage() {
  const { ticket } = useParams();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [draft, setDraft] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [photoSelectionNotice, setPhotoSelectionNotice] = useState('');
  const busyRef = useRef(false);
  const operationRef = useRef(null);
  const mountedRef = useRef(false);
  const currentTicketRef = useRef(ticket);
  const [confirmOpen, setConfirmOpen] = useState(Boolean(location.state?.confirm));
  const [viewerId] = useState(() => { try { return getCurrentReporterId(); } catch { return null; } });
  const [pendingEdit, setPendingEdit] = useState(null);
  const [nearbyDraftMatches, setNearbyDraftMatches] = useState([]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    currentTicketRef.current = ticket;
    setLoading(true); setError(''); setEditing(false); setReport(null); setDraft(null);
    setMessage(''); setPhotos([]); setPhotoSelectionNotice('');
    setConfirmOpen(Boolean(location.state?.confirm));
    setPendingEdit(null); setNearbyDraftMatches([]);
    getReport(ticket).then((value) => { if (active) setReport(value); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ticket, location.state?.confirm]);
  function field(name, value) {
    if (busyRef.current) return;
    setDraft((current) => ({ ...current, [name]: value }));
    setPendingEdit(null);
  }
  useEffect(() => {
    let active = true;
    if (editing && draft?.category && draft?.position) {
      findPotentialDuplicates(draft.position, draft.category, ticket)
        .then((matches) => {
          if (active && mountedRef.current && currentTicketRef.current === ticket) setNearbyDraftMatches(matches);
        })
        .catch((failure) => {
          if (active && mountedRef.current && currentTicketRef.current === ticket) setError(failure.message);
        });
    }
    else if (active) setNearbyDraftMatches([]);
    return () => { active = false; };
  }, [editing, draft?.category, draft?.position, ticket]);
  async function saveSnapshot(snapshot, duplicatesChecked = false) {
    if (busyRef.current || !mountedRef.current || currentTicketRef.current !== snapshot.ticket) return;
    const operation = Symbol('complement-save');
    busyRef.current = true;
    operationRef.current = operation;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!duplicatesChecked) {
        const matches = snapshot.details.category
          ? await findPotentialDuplicates(snapshot.details.position, snapshot.details.category, snapshot.ticket)
          : [];
        if (mountedRef.current && currentTicketRef.current === snapshot.ticket && matches.length) {
          setPendingEdit({ ...snapshot, matches });
          return;
        }
      }
      const updated = await complementReport(snapshot.ticket, snapshot.details, snapshot.photos);
      if (mountedRef.current && currentTicketRef.current === snapshot.ticket) {
        setReport(updated);
        setEditing(false);
        setDraft(null);
        setPhotos([]);
        setPhotoSelectionNotice('');
        setPendingEdit(null);
        setMessage('Cambios guardados.');
      }
    } catch (failure) {
      if (mountedRef.current && currentTicketRef.current === snapshot.ticket) setError(failure.message);
    } finally {
      if (operationRef.current === operation) {
        operationRef.current = null;
        busyRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    }
  }
  async function save(event) {
    event.preventDefault();
    if (busyRef.current || pendingEdit || !draft) return;
    const snapshot = {
      ticket,
      details: { ...draft, position: { ...draft.position } },
      photos: [...photos],
    };
    await saveSnapshot(snapshot);
  }
  if (loading) return <p role="status">Cargando reporte…</p>;
  if (!report) return <section><h1>Reporte no disponible</h1><p role="alert">{error || 'No se encontró el ticket solicitado.'}</p><Link to="/reportes">Volver a mis reportes</Link></section>;
  return <section>
    <Link className="text-link" to="/reportes">Volver a mis reportes</Link>
    <h1>Detalle del reporte</h1>
    {location.state?.created && <p className="success-message" role="status">Reporte guardado. Conserva tu código de seguimiento.</p>}
    <p className="ticket">{report.ticket}</p>
    <p>{report.status} · {new Date(report.createdAt).toLocaleString('es-CR')}</p>
    <p>Última actualización: {new Date(report.updatedAt).toLocaleString('es-CR')}</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    <h2>Evidencias</h2><Evidence audio={report.audio} photos={report.photos || []} />
    {report.severity && <p>Severidad técnica: <strong>{report.severity}</strong></p>}
    {endorsementCount(report) > 0 && <p>Vecinos que confirmaron: {endorsementCount(report)}</p>}
    {isActiveReport(report) && report.reporterId !== viewerId && !report.confirmations?.some((confirmation) => confirmation.reporterId === viewerId) && (
      <button type="button" onClick={() => setConfirmOpen((open) => !open)}>
        {confirmOpen ? 'Cerrar confirmación' : 'Confirmar incidente'}
      </button>
    )}
    {confirmOpen && isActiveReport(report) && report.reporterId !== viewerId && (
      <ConfirmIncidentForm
        ticket={report.ticket}
        onConfirmed={(updated) => {
          setReport(updated);
          setConfirmOpen(false);
          setMessage('Confirmación registrada.');
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    )}
    {editing ? <form onSubmit={save}>
      <h2>Agregar más detalles</h2>
      <label>Categoría<select value={draft.category || ''} onChange={(event) => field('category', event.target.value)} disabled={busy}>
        <option value="">Sin clasificar</option>{categories.map((category) => <option key={category}>{category}</option>)}
      </select></label>
      <label>Descripción<textarea maxLength={5000} value={draft.description || ''} onChange={(event) => field('description', event.target.value)} disabled={busy} /></label>
      <label>Transcripción o complemento de la nota de voz<textarea maxLength={5000} value={draft.transcription || ''} onChange={(event) => field('transcription', event.target.value)} disabled={busy} /></label>
      <label>Señas o referencias<textarea maxLength={2000} value={draft.references || ''} onChange={(event) => field('references', event.target.value)} disabled={busy} /></label>
      <label>Agregar fotografías<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => {
        const input = event.currentTarget;
        try {
          if (busyRef.current) return;
          if (!input.files?.length) return;
          setPhotos(validatePhotos(input.files));
          setPhotoSelectionNotice('');
          setError('');
          setPendingEdit(null);
        } catch (failure) {
          setPhotoSelectionNotice(`${failure.message} ${photos.length
            ? 'Se conserva la selección válida que ya estaba pendiente.'
            : 'No se agregó ninguna fotografía.'}`);
        } finally {
          input.value = '';
        }
      }} /></label>
      {photoSelectionNotice && <p className="error-message" role="alert">{photoSelectionNotice}</p>}
      {photos.length > 0 && <><h3>Fotografías nuevas pendientes</h3><Evidence photos={photos} /></>}
      <h2>Ajustar ubicación</h2>
      <LocationMap position={draft.position} editable={!busy} onChange={(position) => field('position', position)} />
      <p>Latitud: {draft.position.lat.toFixed(6)} · Longitud: {draft.position.lng.toFixed(6)}</p>
      {!pendingEdit && nearbyDraftMatches.length > 0 && <div className="duplicate-hint" role="status">
        <strong>Hay reportes abiertos de la misma categoría cerca de esta ubicación.</strong>
        <ul>{nearbyDraftMatches.map((match) => <li key={match.ticket}>
          <Link to={`/reportes/${match.ticket}`} target="_blank" rel="noopener noreferrer">Ver {match.ticket}</Link> · {Math.round(match.distanceMeters)} m
        </li>)}</ul>
      </div>}
      {pendingEdit && <DuplicateWarning matches={pendingEdit.matches} busy={busy}
        continueLabel="Guardar cambios de todos modos"
        onContinue={() => { void saveSnapshot(pendingEdit, true); }}
        onCancel={() => setPendingEdit(null)} />}
      <div className="actions"><button type="submit" disabled={busy || Boolean(pendingEdit)}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => {
          setEditing(false); setDraft(null); setPhotos([]); setPhotoSelectionNotice(''); setPendingEdit(null); setError('');
        }}>Cancelar</button></div>
    </form> : <>
      <h2>Información del incidente</h2>
      <p>Categoría: {report.category || 'Sin clasificar'}</p>
      <p className="preserve-lines">{report.description || 'Sin descripción adicional.'}</p>
      {report.transcription && <p className="preserve-lines">Nota: {report.transcription}</p>}
      {report.references && <p className="preserve-lines">Referencias: {report.references}</p>}
      <h2>Ubicación</h2><LocationMap position={report.position} />
      <p>Latitud: {report.position.lat.toFixed(6)} · Longitud: {report.position.lng.toFixed(6)}</p>
      <p>Precisión original del dispositivo: {Math.round(report.originalPosition.accuracy)} metros.</p>
      <button type="button" onClick={() => {
        setDraft({
          category: report.category || '',
          description: report.description || '',
          transcription: report.transcription || '',
          references: report.references || '',
          position: { ...report.position },
        });
        setEditing(true); setMessage(''); setPhotoSelectionNotice(''); setPendingEdit(null);
      }}>Agregar más detalles</button>
    </>}
    <h2>Historial de actualizaciones</h2>
    <ol>{(report.history || []).map((entry, index) => <li key={index}>{new Date(entry.at).toLocaleString('es-CR')} · {entry.action}</li>)}</ol>
  </section>;
}
