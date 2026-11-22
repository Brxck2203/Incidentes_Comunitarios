import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { categories, complementReport, findPotentialDuplicates, getCurrentReporterId, validatePhotos } from '../services/reportRepository.js';
import { getConsolidatedTrackingForTicket } from '../services/consolidatedTracking.js';
import { endorsementCount, isActiveReport } from '../services/reportPriority.js';
import { hasValidCoordinates } from '../services/municipalConsole.js';
import { detectDuplicatesForTicket } from '../services/duplicateDetection.js';
import DuplicateWarning from '../components/DuplicateWarning.jsx';
import DuplicateComparisonPanel from '../components/DuplicateComparisonPanel.jsx';
import ConfirmIncidentForm from '../components/ConfirmIncidentForm.jsx';
import ConsolidatedEvidenceSection from '../components/ConsolidatedEvidenceSection.jsx';
import JointAttentionPanel from '../components/JointAttentionPanel.jsx';
import Evidence from '../components/Evidence.jsx';
import LocationMap from '../components/LocationMap.jsx';
import MunicipalDecisionPanel from '../components/MunicipalDecisionPanel.jsx';
import AuditHistoryTab from '../components/AuditHistoryTab.jsx';
import { subscribeToReportChanges } from '../services/reportNotifications.js';

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function ReportDetailPage() {
  const { ticket } = useParams();
  const location = useLocation();
  const fromReception = Boolean(location.state?.fromReception || location.pathname.startsWith('/recepcion/'));
  const [report, setReport] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [draft, setDraft] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('detail');
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
  const [duplicateResult, setDuplicateResult] = useState({
    key: '',
    info: { isSuspectedDuplicate: false, primaryMatch: null, matches: [] },
    error: '',
  });
  const duplicateRequestKey = report?.ticket
    ? `${report.ticket}|${report.category || ''}|${report.updatedAt || ''}`
    : '';
  const duplicateStateCurrent = duplicateResult.key === duplicateRequestKey;
  const duplicateLoading = Boolean(duplicateRequestKey) && !duplicateStateCurrent;
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    let requestSequence = 0;
    currentTicketRef.current = ticket;
    setLoading(true); setError(''); setEditing(false); setActiveTab('detail'); setReport(null); setDraft(null);
    setMessage(''); setPhotos([]); setPhotoSelectionNotice('');
    setConfirmOpen(Boolean(location.state?.confirm));
    setPendingEdit(null); setNearbyDraftMatches([]);
    async function loadTracking() {
      const currentSequence = ++requestSequence;
      try {
        const result = await getConsolidatedTrackingForTicket(ticket);
        if (active && currentSequence === requestSequence && currentTicketRef.current === ticket) {
          setReport(result.report);
          setTracking(result.tracking);
          setError('');
        }
      } catch (failure) {
        if (active && currentSequence === requestSequence && currentTicketRef.current === ticket) setError(failure.message);
      } finally {
        if (active && currentSequence === requestSequence && currentTicketRef.current === ticket) setLoading(false);
      }
    }
    void loadTracking();
    window.addEventListener('focus', loadTracking);
    const unsubscribe = subscribeToReportChanges(loadTracking);
    return () => {
      active = false;
      requestSequence += 1;
      window.removeEventListener('focus', loadTracking);
      unsubscribe();
    };
  }, [ticket, location.state?.confirm]);
  useEffect(() => {
    if (!report?.ticket) return undefined;
    let active = true;
    const key = `${report.ticket}|${report.category || ''}|${report.updatedAt || ''}`;
    detectDuplicatesForTicket(report.ticket)
      .then((result) => {
        if (active) {
          setDuplicateResult({ key, info: result, error: '' });
        }
      })
      .catch((failure) => {
        if (active) {
          setDuplicateResult({
            key,
            info: { isSuspectedDuplicate: false, primaryMatch: null, matches: [] },
            error: `No se pudo verificar posibles duplicados: ${failure.message}`,
          });
        }
      });
    return () => { active = false; };
  }, [report?.ticket, report?.category, report?.updatedAt]);
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
  if (!report) return <section><h1>Reporte no disponible</h1><p role="alert">{error || 'No se encontró el ticket solicitado.'}</p><Link to={fromReception ? '/recepcion' : '/reportes'}>{fromReception ? 'Volver a recepción de reportes' : 'Volver a mis reportes'}</Link></section>;
  const reportStatus = tracking?.masterUnavailable
    ? 'Estado del maestro no disponible'
    : tracking?.effectiveStatus ?? report.status ?? 'Estado no disponible';
  const effectiveReportIsActive = !tracking?.masterUnavailable
    && isActiveReport({ ...report, status: tracking?.effectiveStatus ?? report.status });
  const masterTicket = report.masterTicket || report.consolidation?.masterTicket;
  return <section>
    <Link className="text-link" to={fromReception ? '/recepcion' : '/reportes'}>
      {fromReception ? 'Volver a recepción de reportes' : 'Volver a mis reportes'}
    </Link>
    <h1>Detalle del reporte</h1>
    {location.state?.created && <p className="success-message" role="status">Reporte guardado. Conserva tu código de seguimiento.</p>}
    <p className="ticket">{report.ticket}</p>
    <p>{reportStatus} · {formatDateTime(report.createdAt)}</p>
    <p>Última actualización: {formatDateTime(tracking?.masterUnavailable ? null : tracking?.effectiveUpdatedAt ?? report.updatedAt)}</p>
    {fromReception && (
      <div className="municipal-tabs" role="tablist" aria-label="Secciones del expediente municipal">
        <button
          type="button"
          role="tab"
          id="tab-detalle-expediente"
          aria-selected={activeTab === 'detail'}
          aria-controls="panel-detalle-expediente"
          className={`municipal-tab-button ${activeTab === 'detail' ? 'active' : 'secondary'}`}
          onClick={() => setActiveTab('detail')}
        >
          Expediente del reporte
        </button>
        <button
          type="button"
          role="tab"
          id="tab-historial-auditoria"
          aria-selected={activeTab === 'audit'}
          aria-controls="panel-historial-auditoria"
          className={`municipal-tab-button ${activeTab === 'audit' ? 'active' : 'secondary'}`}
          onClick={() => setActiveTab('audit')}
        >
          Historial de Auditoría
        </button>
      </div>
    )}
    {fromReception && activeTab === 'audit' ? (
      <AuditHistoryTab report={report} />
    ) : (
      <div id="panel-detalle-expediente" role={fromReception ? 'tabpanel' : undefined} aria-labelledby={fromReception ? 'tab-detalle-expediente' : undefined}>
    <JointAttentionPanel tracking={tracking} municipalView={fromReception} />
    {masterTicket && <p className="consolidated-secondary-banner" role="status">
      Este reporte está enlazado como solicitud secundaria al expediente principal{' '}
      <Link to={fromReception
        ? `/recepcion/${encodeURIComponent(masterTicket)}`
        : `/reportes/${encodeURIComponent(masterTicket)}`}>
        <strong>{masterTicket}</strong>
      </Link>.
    </p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {tracking?.effectiveDecision?.publicResponse && <section className="public-decision" aria-labelledby="public-decision-title">
      <h2 id="public-decision-title">Respuesta de Recepción</h2>
      <p>{tracking.effectiveDecision.publicResponse}</p>
      {tracking.effectiveDecision.at && <p>Registrada el {formatDateTime(tracking.effectiveDecision.at)}.</p>}
    </section>}
    <MunicipalDecisionPanel key={report.ticket} report={report} municipalView={fromReception} onSaved={(updated) => {
      if (currentTicketRef.current !== updated.ticket) return;
      setReport(updated);
      setTracking((current) => current ? { ...current, effectiveStatus: updated.status,
        effectiveUpdatedAt: updated.updatedAt,
        effectiveDecision: {
          action: updated.municipalDecision.action,
          status: updated.municipalDecision.status,
          at: updated.municipalDecision.at,
          cause: updated.municipalDecision.cause || '',
          justification: updated.municipalDecision.justification || '',
          publicResponse: updated.municipalDecision.publicResponse,
        } } : current);
    }} />
    {duplicateLoading && <p role="status">Verificando posibles reportes duplicados…</p>}
    {duplicateStateCurrent && duplicateResult.error && <p className="error-message" role="alert">{duplicateResult.error}</p>}
    {duplicateStateCurrent && duplicateResult.info.isSuspectedDuplicate && (
      <DuplicateComparisonPanel
        currentReport={report}
        primaryMatch={duplicateResult.info.primaryMatch}
        matches={duplicateResult.info.matches}
        fromReception={fromReception}
      />
    )}
    {duplicateStateCurrent && !duplicateResult.error && !duplicateResult.info.isSuspectedDuplicate && (
      <p role="status">No se encontraron posibles reportes duplicados.</p>
    )}
    <h2>Evidencias</h2><Evidence audio={report.audio} photos={report.photos || []} />
    <ConsolidatedEvidenceSection report={report} />
    {report.confirmations?.some((confirmation) => confirmation.photos?.length > 0) && <>
      <h3>Fotografías complementarias de vecinos</h3>
      <Evidence photos={report.confirmations.flatMap((confirmation) => confirmation.photos || [])} />
    </>}
    {report.severity && <p>Severidad técnica: <strong>{report.severity}</strong></p>}
    {endorsementCount(report) > 0 && <p>Vecinos que confirmaron: {endorsementCount(report)}</p>}
    {effectiveReportIsActive && report.reporterId !== viewerId && !report.confirmations?.some((confirmation) => confirmation.reporterId === viewerId) && (
      <button type="button" onClick={() => setConfirmOpen((open) => !open)}>
        {confirmOpen ? 'Cerrar confirmación' : 'Confirmar incidente'}
      </button>
    )}
    {confirmOpen && effectiveReportIsActive && report.reporterId !== viewerId && (
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
      <h2>Ubicación</h2>
      {hasValidCoordinates(report.position)
        ? <><LocationMap position={report.position} />
          <p>Latitud: {report.position.lat.toFixed(6)} · Longitud: {report.position.lng.toFixed(6)}</p></>
        : <p>Ubicación no disponible.</p>}
      {Number.isFinite(report.originalPosition?.accuracy) && <p>Precisión original del dispositivo: {Math.round(report.originalPosition.accuracy)} metros.</p>}
      {hasValidCoordinates(report.position) && <button type="button" onClick={() => {
        setDraft({
          category: report.category || '',
          description: report.description || '',
          transcription: report.transcription || '',
          references: report.references || '',
          position: { ...report.position },
        });
        setEditing(true); setMessage(''); setPhotoSelectionNotice(''); setPendingEdit(null);
      }}>Agregar más detalles</button>}
    </>}
    <h2>Historial de actualizaciones</h2>
    <ol>{(report.history || []).map((entry, index) => <li key={index}>{formatDateTime(entry.at)} · {entry.action}</li>)}</ol>
      </div>
    )}
  </section>;
}
