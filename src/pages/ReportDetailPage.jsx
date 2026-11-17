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
import { subscribeToReportChanges } from '../services/reportNotifications.js';
import {
  formatEvidenceSummary,
  getCitizenStatusInfo,
  isCombinedEvidenceEnabled,
  uiCopy,
} from '../constants/uiCopy.js';
import { triggerUxFeedback } from '../services/uxFeedback.js';

function formatDateTime(value) {
  if (!value) return uiCopy.common.unavailable;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? uiCopy.common.unavailable : date.toLocaleString('es-CR');
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [photoSelectionNotice, setPhotoSelectionNotice] = useState('');
  const busyRef = useRef(false);
  const operationRef = useRef(null);
  const mountedRef = useRef(false);
  const currentTicketRef = useRef(ticket);
  const detailContentRef = useRef(null);
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
    setLoading(true); setError(''); setEditing(false); setReport(null); setDraft(null);
    setMessage(''); setCopyFeedback(''); setPhotos([]); setPhotoSelectionNotice('');
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
            error: `${uiCopy.duplicates.comparisonErrorPrefix} ${failure.message}`,
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
        setMessage(uiCopy.detail.savedChangesNotice(updated.ticket));
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

  function openEditMode() {
    if (!report || !hasValidCoordinates(report.position)) return;
    setDraft({
      category: report.category || '',
      description: report.description || '',
      transcription: report.transcription || '',
      references: report.references || '',
      position: { ...report.position },
    });
    setEditing(true);
    setMessage('');
    setPhotoSelectionNotice('');
    setPendingEdit(null);
  }

  async function handleCopyTrackingNumber() {
    if (!report?.ticket) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report.ticket);
        triggerUxFeedback('action');
        setCopyFeedback(uiCopy.confirmation.copiedNotice);
      } else {
        setCopyFeedback(uiCopy.confirmation.copyFallbackNotice);
      }
    } catch {
      setCopyFeedback(uiCopy.confirmation.copyFallbackNotice);
    }
  }

  if (loading) return <p role="status">{uiCopy.reportsPage.loading}</p>;
  if (!report) return <section><h1>{uiCopy.detail.unavailableTitle}</h1><p role="alert">{error || uiCopy.detail.notFoundError}</p><Link to={fromReception ? '/recepcion' : '/reportes'}>{fromReception ? uiCopy.detail.backToReception : uiCopy.detail.backToMyReports}</Link></section>;
  const reportStatus = tracking?.masterUnavailable
    ? uiCopy.common.masterStatusUnavailable
    : tracking?.effectiveStatus ?? report.status ?? uiCopy.common.statusUnavailable;
  const citizenStatus = getCitizenStatusInfo(reportStatus, tracking?.effectiveDecision ?? report.municipalDecision);
  const effectiveReportIsActive = !tracking?.masterUnavailable
    && isActiveReport({ ...report, status: tracking?.effectiveStatus ?? report.status });
  const masterTicket = report.masterTicket || report.consolidation?.masterTicket;
  const accuracyMeters = Number.isFinite(report.originalPosition?.accuracy)
    ? Math.round(report.originalPosition.accuracy)
    : null;
  const hasLowAccuracy = accuracyMeters !== null && accuracyMeters > 50;

  return <section>
    <Link className="text-link" to={fromReception ? '/recepcion' : '/reportes'}>
      {fromReception ? uiCopy.detail.backToReception : uiCopy.detail.backToMyReports}
    </Link>
    <h1>{uiCopy.detail.title}</h1>

    {location.state?.created && (
      <section className="confirmation-banner" role="status" aria-live="polite">
        <h2>{uiCopy.confirmation.title}</h2>
        <p>{uiCopy.confirmation.subtitle}</p>
        {isCombinedEvidenceEnabled() && formatEvidenceSummary(report, { confirmationStyle: true }) && (
          <p className="confirmation-evidence-summary">
            <strong>{formatEvidenceSummary(report, { confirmationStyle: true })}</strong>
          </p>
        )}
        <div className="tracking-highlight-box">
          <span className="tracking-highlight-label">{uiCopy.common.trackingNumberFirstMention}</span>
          <strong className="tracking-highlight-code">{report.ticket}</strong>
          <button type="button" className="secondary copy-ticket-button" onClick={() => { void handleCopyTrackingNumber(); }}>
            {uiCopy.confirmation.copyAction}
          </button>
        </div>
        {copyFeedback && <p className="copy-feedback" role="status">{copyFeedback}</p>}
        <p className="confirmation-optional-note">{uiCopy.confirmation.optionalNote}</p>
        {hasLowAccuracy && (
          <p className="low-accuracy-notice" role="status">
            {uiCopy.confirmation.lowAccuracyWarning(accuracyMeters)}
          </p>
        )}
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => detailContentRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}
          >
            {uiCopy.confirmation.viewReportAction}
          </button>
          {hasValidCoordinates(report.position) && !editing && (
            <button type="button" onClick={openEditMode}>
              {uiCopy.confirmation.addDetailsAction}
            </button>
          )}
        </div>
      </section>
    )}

    <div ref={detailContentRef} className="report-summary-header">
      <p className="ticket">
        <span>{location.state?.created ? uiCopy.common.trackingNumberLabel : uiCopy.common.trackingNumberFirstMention}: </span>
        <strong>{report.ticket}</strong>
      </p>
      <p>
        <strong>{reportStatus}</strong>
        {!fromReception && citizenStatus.citizenExplanation && (
          <span> — {citizenStatus.citizenExplanation}</span>
        )}
      </p>
      {!fromReception && citizenStatus.dismissalReason && (
        <p className="dismissal-reason-banner" role="status">
          <strong>Motivo informado:</strong> {citizenStatus.dismissalReason}
        </p>
      )}
      <p>{uiCopy.detail.createdAtLabel}: {formatDateTime(report.createdAt)}</p>
      <p>{uiCopy.detail.updatedAtLabel}: {formatDateTime(tracking?.masterUnavailable ? null : tracking?.effectiveUpdatedAt ?? report.updatedAt)}</p>
    </div>

    <JointAttentionPanel tracking={tracking} municipalView={fromReception} />
    {masterTicket && <p className="consolidated-secondary-banner" role="status">
      {uiCopy.jointAttention.secondaryBannerPrefix}{' '}
      <Link to={fromReception
        ? `/recepcion/${encodeURIComponent(masterTicket)}`
        : `/reportes/${encodeURIComponent(masterTicket)}`}>
        <strong>{masterTicket}</strong>
      </Link>.
    </p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {tracking?.effectiveDecision?.publicResponse && <section className="public-decision" aria-labelledby="public-decision-title">
      <h2 id="public-decision-title">{uiCopy.detail.publicDecisionHeading}</h2>
      <p>{tracking.effectiveDecision.publicResponse}</p>
      {tracking.effectiveDecision.at && <p>{uiCopy.detail.publicDecisionDate(formatDateTime(tracking.effectiveDecision.at))}</p>}
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
    {duplicateLoading && <p role="status">{uiCopy.duplicates.comparisonChecking}</p>}
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
      <p role="status">{uiCopy.duplicates.comparisonNone}</p>
    )}
    <h2>{uiCopy.detail.evidenceHeading}</h2><Evidence audio={report.audio} photos={report.photos || []} />
    <ConsolidatedEvidenceSection report={report} />
    {report.confirmations?.some((confirmation) => confirmation.photos?.length > 0) && <>
      <h3>{uiCopy.detail.neighborPhotosHeading}</h3>
      <Evidence photos={report.confirmations.flatMap((confirmation) => confirmation.photos || [])} />
    </>}
    {report.severity && <p>{uiCopy.detail.technicalSeverityLabel}: <strong>{report.severity}</strong></p>}
    {endorsementCount(report) > 0 && <p>{uiCopy.detail.confirmationsCountLabel(endorsementCount(report))}</p>}
    {effectiveReportIsActive && report.reporterId !== viewerId && !report.confirmations?.some((confirmation) => confirmation.reporterId === viewerId) && (
      <button type="button" onClick={() => setConfirmOpen((open) => !open)}>
        {confirmOpen ? uiCopy.detail.endorseToggleClose : uiCopy.detail.endorseToggleOpen}
      </button>
    )}
    {confirmOpen && effectiveReportIsActive && report.reporterId !== viewerId && (
      <ConfirmIncidentForm
        ticket={report.ticket}
        onConfirmed={(updated) => {
          setReport(updated);
          setConfirmOpen(false);
          setMessage(uiCopy.detail.endorseSavedNotice);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    )}
    {editing ? <form className="complement-form" onSubmit={save}>
      <h2>{uiCopy.detail.editFormTitle}</h2>
      <p className="field-help">{uiCopy.detail.editFormNote}: <strong>{report.ticket}</strong>.</p>

      <fieldset className="complement-fieldset" disabled={busy}>
        <legend>{uiCopy.detail.blockDescriptionLegend}</legend>
        <label>{uiCopy.detail.descriptionFieldLabel}
          <textarea maxLength={5000} value={draft.description || ''} onChange={(event) => field('description', event.target.value)} disabled={busy} />
        </label>
        <label>{uiCopy.detail.transcriptionFieldLabel}
          <textarea maxLength={5000} value={draft.transcription || ''} onChange={(event) => field('transcription', event.target.value)} disabled={busy} />
        </label>
        <label>{uiCopy.detail.referencesFieldLabel}
          <textarea maxLength={2000} value={draft.references || ''} onChange={(event) => field('references', event.target.value)} disabled={busy} />
        </label>
      </fieldset>

      <fieldset className="complement-fieldset" disabled={busy}>
        <legend>{uiCopy.detail.blockCategoryLegend}</legend>
        <label>{uiCopy.detail.categoryFieldLabel}
          <select value={draft.category || ''} onChange={(event) => field('category', event.target.value)} disabled={busy}>
            <option value="">{uiCopy.common.unclassifiedCategory}</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <span className="field-help">{uiCopy.detail.categoryFieldHelp}</span>
        </label>
      </fieldset>

      <fieldset className="complement-fieldset" disabled={busy}>
        <legend>{uiCopy.detail.blockPhotosLegend}</legend>
        <label>{uiCopy.detail.addPhotosFieldLabel}
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => {
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
          }} />
        </label>
        {photoSelectionNotice && <p className="error-message" role="alert">{photoSelectionNotice}</p>}
        {photos.length > 0 && <><h3>{uiCopy.detail.pendingPhotosHeading}</h3><Evidence photos={photos} /></>}
      </fieldset>

      <fieldset className="complement-fieldset" disabled={busy}>
        <legend>{uiCopy.detail.blockLocationLegend}</legend>
        <LocationMap position={draft.position} editable={!busy} onChange={(position) => field('position', position)} />
        <p>{uiCopy.detail.coordinatesLine(draft.position.lat.toFixed(6), draft.position.lng.toFixed(6))}</p>
      </fieldset>

      {!pendingEdit && nearbyDraftMatches.length > 0 && <div className="duplicate-hint" role="status">
        <strong>{uiCopy.duplicates.editNearbyHint}</strong>
        <ul>{nearbyDraftMatches.map((match) => <li key={match.ticket}>
          <Link to={`/reportes/${match.ticket}`} target="_blank" rel="noopener noreferrer">
            {uiCopy.duplicates.viewExistingAction(match.ticket)}
          </Link> · {Math.round(match.distanceMeters)} m
        </li>)}</ul>
      </div>}
      {pendingEdit && <DuplicateWarning matches={pendingEdit.matches} busy={busy}
        continueLabel={uiCopy.duplicates.continueSaveEditAction}
        onContinue={() => { void saveSnapshot(pendingEdit, true); }}
        onCancel={() => setPendingEdit(null)} />}
      <div className="actions">
        <button type="submit" disabled={busy || Boolean(pendingEdit)}>
          {busy ? uiCopy.detail.savingChangesAction : uiCopy.detail.saveChangesAction}
        </button>
        <button className="secondary" type="button" disabled={busy} onClick={() => {
          setEditing(false); setDraft(null); setPhotos([]); setPhotoSelectionNotice(''); setPendingEdit(null); setError('');
        }}>{uiCopy.common.cancelAction}</button>
      </div>
    </form> : <>
      <h2>{uiCopy.detail.incidentInfoHeading}</h2>
      <p>{uiCopy.detail.categoryLabel}: {report.category || uiCopy.common.unclassifiedCategory}</p>
      <p className="preserve-lines">{report.description || uiCopy.detail.noDescription}</p>
      {report.transcription && <p className="preserve-lines">{uiCopy.detail.transcriptionLabel}: {report.transcription}</p>}
      {report.references && <p className="preserve-lines">{uiCopy.detail.referencesLabel}: {report.references}</p>}
      <h2>{uiCopy.detail.locationHeading}</h2>
      {hasValidCoordinates(report.position)
        ? <><LocationMap position={report.position} />
          <p>{uiCopy.detail.coordinatesLine(report.position.lat.toFixed(6), report.position.lng.toFixed(6))}</p></>
        : <p>{uiCopy.detail.locationUnavailable}</p>}
      {accuracyMeters !== null && <p>{uiCopy.detail.deviceAccuracyLine(accuracyMeters)}</p>}
      {hasLowAccuracy && !location.state?.created && (
        <p className="low-accuracy-notice" role="status">
          {uiCopy.confirmation.lowAccuracyWarning(accuracyMeters)}
        </p>
      )}
      {hasValidCoordinates(report.position) && <button type="button" onClick={openEditMode}>{uiCopy.detail.addDetailsButton}</button>}
    </>}
    <h2>{uiCopy.detail.historyHeading}</h2>
    <ol>{(report.history || []).map((entry, index) => <li key={index}>{formatDateTime(entry.at)} · {entry.action}</li>)}</ol>
  </section>;
}
