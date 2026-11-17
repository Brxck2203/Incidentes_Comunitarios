import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { filterOwnReports, getCurrentReporterId, getReports, resolveIncident, setReportSeverity } from '../services/reportRepository.js';
import { resolveReportsListTracking } from '../services/consolidatedTracking.js';
import { endorsementCount, isActiveReport, priorityInfo, severityLevels, sortReceptionReports } from '../services/reportPriority.js';
import { filterMunicipalReports, municipalStatusLabel } from '../services/municipalConsole.js';
import { isSecondaryReport } from '../services/municipalDecisions.js';
import { buildDuplicateMap } from '../services/duplicateDetection.js';
import DuplicateBadge from '../components/DuplicateBadge.jsx';
import { consolidateReports } from '../services/consolidationService.js';
import ConsolidationModal from '../components/ConsolidationModal.jsx';
import ConfirmIncidentForm from '../components/ConfirmIncidentForm.jsx';
import IncidentMap from '../components/IncidentMap.jsx';
import MunicipalIncidentMap from '../components/MunicipalIncidentMap.jsx';
import MunicipalConsoleFilters from '../components/MunicipalConsoleFilters.jsx';
import { subscribeToReportChanges } from '../services/reportNotifications.js';
import { ENABLE_FOLLOWED_REPORTS_SECTION, getCitizenStatusInfo, uiCopy } from '../constants/uiCopy.js';

const severityStyle = { Leve: 'mild', Moderado: 'moderate', Grave: 'serious', Crítico: 'critical' };
const severityIcons = { Leve: '●', Moderado: '▲', Grave: '◆', Crítico: '■' };

function formatDateTime(value) {
  if (!value) return uiCopy.common.unavailable;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? uiCopy.common.unavailable : date.toLocaleString('es-CR');
}

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
  const [deferredReports, setDeferredReports] = useState(null);
  const [ticketQuery, setTicketQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [municipalQuery, setMunicipalQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTicket, setSavingTicket] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [consolidating, setConsolidating] = useState(false);
  const [busyConsolidation, setBusyConsolidation] = useState(false);
  const [consolidationError, setConsolidationError] = useState('');
  const [reporterId] = useState(() => { try { return getCurrentReporterId(); } catch { return null; } });
  const refreshSequence = useRef(0);
  const interactionBusyRef = useRef(false);
  useEffect(() => {
    interactionBusyRef.current = Boolean(
      reception && (selectedTicket || selectedTickets.length > 0 || consolidating || savingTicket),
    );
  }, [reception, selectedTicket, selectedTickets.length, consolidating, savingTicket]);

  const duplicateMap = useMemo(
    () => (reception ? buildDuplicateMap(reports) : {}),
    [reception, reports],
  );
  const trackingMap = useMemo(() => resolveReportsListTracking(reports), [reports]);
  useEffect(() => {
    let active = true;
    async function refresh(isInitial = false) {
      const requestSequence = ++refreshSequence.current;
      try {
        const result = await getReports();
        if (active && requestSequence === refreshSequence.current) {
          if (!isInitial && interactionBusyRef.current) {
            setDeferredReports(result);
          } else {
            setReports(result);
            setDeferredReports(null);
          }
          setError('');
        }
      } catch (failure) {
        if (active && requestSequence === refreshSequence.current) setError(failure.message);
      } finally {
        if (active && requestSequence === refreshSequence.current) setLoading(false);
      }
    }
    void refresh(true);
    const onFocusRefresh = () => { void refresh(false); };
    window.addEventListener('focus', onFocusRefresh);
    const unsubscribe = subscribeToReportChanges(() => { void refresh(false); });
    // The reception list responds to confirmations and reprioritization within <= 3 seconds.
    const interval = setInterval(() => { void refresh(false); }, reception ? 3000 : 15000);
    return () => {
      active = false;
      refreshSequence.current += 1;
      window.removeEventListener('focus', onFocusRefresh);
      unsubscribe();
      clearInterval(interval);
    };
  }, [reception]);

  function applyDeferredUpdates() {
    if (!deferredReports) return;
    setReports(deferredReports);
    setDeferredReports(null);
  }

  async function changeSeverity(ticket, severity) {
    if (savingTicket) return;
    setSavingTicket(ticket); setError(''); setMessage('');
    try {
      const updated = await setReportSeverity(ticket, severity);
      setReports((previous) => previous.map((report) => report.ticket === ticket ? updated : report));
      setDeferredReports(null);
      setMessage(uiCopy.reportsPage.reorderedQueueNotice);
    } catch (failure) { setError(failure.message); }
    finally { setSavingTicket(''); }
  }

  async function markResolved(ticket) {
    if (savingTicket || !window.confirm(uiCopy.reportsPage.markResolvedConfirm)) return;
    setSavingTicket(ticket); setError(''); setMessage('');
    try {
      const updated = await resolveIncident(ticket);
      setReports((previous) => previous.map((report) => report.ticket === ticket ? updated : report));
      setDeferredReports(null);
      setMessage(uiCopy.reportsPage.resolvedCaseNotice);
    } catch (failure) { setError(failure.message); }
    finally { setSavingTicket(''); }
  }

  function toggleSelection(ticket) {
    setConsolidationError('');
    setMessage('');
    setSelectedTickets((current) => current.includes(ticket)
      ? current.filter((item) => item !== ticket)
      : [...current, ticket]);
  }

  async function handleConfirmConsolidation(payload) {
    if (busyConsolidation) return;
    setBusyConsolidation(true);
    setConsolidationError('');
    setMessage('');
    try {
      const result = await consolidateReports(payload);
      const updatedList = await getReports();
      setReports(updatedList);
      setDeferredReports(null);
      setSelectedTickets([]);
      setConsolidating(false);
      setMessage(`Consolidación completada en el caso maestro ${result.masterReport.ticket} (${result.secondaryReports.length} reportes secundarios enlazados).`);
    } catch (failure) {
      setConsolidationError(failure.message);
    } finally {
      setBusyConsolidation(false);
    }
  }

  const ownReports = useMemo(
    () => (reception ? reports : filterOwnReports(reports, reporterId)),
    [reception, reports, reporterId],
  );
  const orderedReports = useMemo(() => reception ? sortReceptionReports(reports.map((report) => {
    const tracking = trackingMap[report.ticket];
    return tracking?.isConsolidatedSecondary && !tracking.masterUnavailable
      ? { ...report, status: tracking.effectiveStatus }
      : report;
  })) : ownReports, [reception, reports, ownReports, trackingMap]);
  const statuses = useMemo(() => [...new Set(reports.map((report) =>
    municipalStatusLabel(report, trackingMap)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  [reports, trackingMap]);
  const visibleReports = useMemo(() => {
    if (reception) return filterMunicipalReports(orderedReports, {
      category: categoryFilter,
      status: statusFilter,
      query: municipalQuery,
      trackingByTicket: trackingMap,
    });
    const query = ticketQuery.trim().toLowerCase();
    return query ? orderedReports.filter((item) => item.ticket.toLowerCase().includes(query)) : orderedReports;
  }, [orderedReports, reception, ticketQuery, categoryFilter, statusFilter, municipalQuery, trackingMap]);
  const selectedReports = useMemo(
    () => visibleReports.filter((report) => selectedTickets.includes(report.ticket)
      && !isSecondaryReport(report) && isActiveReport(report)),
    [visibleReports, selectedTickets],
  );
  const selectedReport = reception
    ? visibleReports.find((report) => report.ticket === selectedTicket)
    : reports.find((report) => report.ticket === selectedTicket);
  useEffect(() => {
    if (!reception || !selectedTicket) return;
    document.getElementById(`report-${selectedTicket}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [reception, selectedTicket]);
  const confirmedByMe = (report) => Boolean(reporterId && report.confirmations?.some((item) => item.reporterId === reporterId));
  const subscriptions = reception ? [] : reports.filter(confirmedByMe);
  const resolvedNotifications = subscriptions.filter((report) => !trackingMap[report.ticket]?.masterUnavailable
    && !isActiveReport({ ...report, status: trackingMap[report.ticket]?.effectiveStatus ?? report.status }));

  function updateMunicipalFilter(setter, value) {
    setter(value);
    setSelectedTickets([]);
    setSelectedTicket(null);
    setConsolidating(false);
  }

  function renderReportCard(report, isFirstCard = false) {
    const info = priorityInfo(report);
    const duplicateInfo = reception ? duplicateMap[report.ticket] : null;
    const isDuplicate = Boolean(duplicateInfo?.isSuspectedDuplicate);
    const isSecondary = isSecondaryReport(report);
    const isMaster = Array.isArray(report.secondaryTickets) && report.secondaryTickets.length > 0;
    const isChecked = selectedReports.some((selected) => selected.ticket === report.ticket);
    const tracking = trackingMap[report.ticket];
    const isConsolidated = Boolean(tracking?.isConsolidatedSecondary);
    const effectiveStatus = reception || tracking?.isConsolidatedSecondary
      ? municipalStatusLabel(report, trackingMap)
      : report.status ?? uiCopy.common.statusUnavailable;
    const citizenStatus = getCitizenStatusInfo(effectiveStatus, tracking?.effectiveDecision ?? report.municipalDecision);
    const eventLabel = isSecondary && !tracking?.masterUnavailable
      ? 'Actualización del expediente maestro'
      : isSecondary
        ? 'Actualización del ticket original'
        : report.receptionEvent || 'Actualización del reporte';
    const eventAt = isSecondary && !tracking?.masterUnavailable
      ? tracking.effectiveUpdatedAt
      : report.updatedAt;
    const isSelected = reception && selectedReport?.ticket === report.ticket && selectedTicket === report.ticket;
    const detailUrl = reception ? `/recepcion/${encodeURIComponent(report.ticket)}` : `/reportes/${report.ticket}`;
    const trackingLabel = isFirstCard ? uiCopy.common.trackingNumberFirstMention : uiCopy.common.trackingNumberLabel;

    return <li id={`report-${report.ticket}`} key={report.ticket} aria-current={isSelected ? 'true' : undefined}
      className={`report-card ${isSelected ? 'report-card-selected' : ''} ${isDuplicate ? 'report-card-duplicate' : ''} ${isMaster ? 'report-card-master' : ''} ${isSecondary ? 'report-card-secondary' : ''} ${isConsolidated && !reception ? 'report-card-joint' : ''}`}>
      <div className="report-card-header">
        {reception && <label className="report-select-checkbox">
          <input type="checkbox" checked={isChecked} disabled={isSecondary || !isActiveReport(report) || busyConsolidation}
            onChange={() => toggleSelection(report.ticket)}
            aria-label={`Seleccionar reporte ${report.ticket} para consolidar`} />
          <span>{uiCopy.municipal.selectForConsolidation}</span>
        </label>}
        <div className="report-card-title-group">
          <span className="report-card-tracking-label">{trackingLabel}: </span>
          <Link to={detailUrl}>{report.ticket}</Link>
        </div>
        {isMaster && <span className="consolidation-status-badge master-badge">
          Caso maestro ({report.secondaryTickets.length} {report.secondaryTickets.length === 1 ? 'unificado' : 'unificados'})
        </span>}
        {isSecondary && <span className="consolidation-status-badge secondary-badge">Consolidado en {report.masterTicket || report.consolidation?.masterTicket || 'expediente no disponible'}</span>}
        {isConsolidated && !reception && <span className="joint-attention-badge">{uiCopy.jointAttention.badge} ({tracking.masterTicket})</span>}
        {isDuplicate && <DuplicateBadge match={duplicateInfo.primaryMatch} count={duplicateInfo.matches.length} />}
      </div>
      <p className="report-card-primary-meta">
        <strong>{report.category || uiCopy.common.unclassifiedCategory}</strong> · <span>{effectiveStatus}</span>
        {!reception && citizenStatus.citizenExplanation && (
          <span className="status-explanation-inline"> — {citizenStatus.citizenExplanation}</span>
        )}
      </p>
      {!reception && citizenStatus.dismissalReason && (
        <p className="dismissal-reason-inline" role="status">{citizenStatus.dismissalReason}</p>
      )}
      {isConsolidated && tracking.masterUnavailable
        ? <p className="error-message" role="alert">{tracking.masterUnavailableReason} No se pudo determinar el estado vigente del maestro.</p>
        : isConsolidated && !reception && <p className="joint-attention-card-note" role="status">
          {uiCopy.jointAttention.citizenLead} (Estado: <strong>{tracking.effectiveStatus}</strong>)
        </p>}
      <p className="report-card-date">{formatDateTime(report.createdAt)}</p>
      {endorsementCount(report) > 0 && <p>Vecinos que respaldan el reporte: <strong>{endorsementCount(report)}</strong></p>}
      <div className="report-card-footer-actions">
        <Link className="text-link" to={detailUrl}>
          {reception ? uiCopy.reportsPage.openMunicipalCaseAction : uiCopy.reportsPage.openDetailAction}
        </Link>
      </div>
      {reception && <>
        <p role="status">{eventLabel} · {formatDateTime(eventAt)}</p>
        <div className="severity-panel">
          <span className={`severity-pill severity-${severityStyle[report.severity] || 'none'}`}>
            <span aria-hidden="true">{severityIcons[report.severity] || '○'}</span>{' '}
            <span>{report.severity ? `Severidad: ${report.severity}` : uiCopy.municipal.noSeverityBadge}</span>
          </span>
          <span>{uiCopy.municipal.priorityIndicator(info.score, info.supporters)}</span>
          <label>{uiCopy.municipal.severityLabel}
            <select aria-label={`Severidad técnica del reporte ${report.ticket}`} value={report.severity || ''}
              disabled={Boolean(savingTicket) || !isActiveReport(report) || isSecondary}
              onChange={(event) => { void changeSeverity(report.ticket, event.target.value); }}>
              <option value="">{uiCopy.municipal.unratedSeverity}</option>
              {severityLevels.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          {isActiveReport(report) && !isSecondary && <button type="button" className="secondary" disabled={Boolean(savingTicket)}
            onClick={() => { void markResolved(report.ticket); }}>{uiCopy.reportsPage.markResolvedAction}</button>}
        </div>
      </>}
    </li>;
  }

  return <section>
    <h1>{reception ? uiCopy.reportsPage.municipalTitle : uiCopy.reportsPage.citizenTitle}</h1>
    {!reception && reports.length > 0 && <label className="ticket-search-box">
      {uiCopy.reportsPage.searchLabel}
      <input type="search" placeholder={uiCopy.reportsPage.searchPlaceholder} value={ticketQuery}
        onChange={(event) => setTicketQuery(event.target.value)} />
    </label>}
    {loading && <p role="status">{uiCopy.reportsPage.loading}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {consolidationError && <p className="error-message" role="alert">{consolidationError}</p>}

    {reception && deferredReports && (
      <div className="realtime-updates-banner" role="status" aria-live="polite">
        <span>{uiCopy.reportsPage.realtimeUpdatesBanner(1)}</span>
        <button type="button" className="secondary" onClick={applyDeferredUpdates}>
          {uiCopy.reportsPage.applyRealtimeUpdatesAction}
        </button>
      </div>
    )}

    {reception && !loading && reports.length > 0 && <>
      <MunicipalConsoleFilters category={categoryFilter} status={statusFilter} query={municipalQuery}
        statuses={statuses} onCategoryChange={(value) => updateMunicipalFilter(setCategoryFilter, value)}
        onStatusChange={(value) => updateMunicipalFilter(setStatusFilter, value)}
        onQueryChange={(value) => updateMunicipalFilter(setMunicipalQuery, value)} />
      <MunicipalIncidentMap reports={visibleReports} trackingByTicket={trackingMap}
        selectedTicket={visibleReports.some((report) => report.ticket === selectedTicket) ? selectedTicket : null}
        onSelect={(ticket) => { setSelectedTicket(ticket); setMessage(''); }} />
      {!visibleReports.length && <p role="status">{uiCopy.municipal.emptyFiltered}</p>}
    </>}

    {!loading && !error && !reports.length && <p>{uiCopy.reportsPage.emptyAll}</p>}

    {!reception && !loading && reports.length > 0 && (
      <>
        {resolvedNotifications.length > 0 && <section className="resolution-notices" aria-label={uiCopy.reportsPage.resolutionNoticesHeading} role="status">
          <h2>{uiCopy.reportsPage.resolutionNoticesHeading}</h2>
          <ul>{resolvedNotifications.map((report) => <li key={report.ticket}>
            El incidente <Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link> fue {(trackingMap[report.ticket]?.effectiveStatus ?? report.status ?? 'cerrado').toLowerCase()} el {formatDateTime(report.resolvedAt || trackingMap[report.ticket]?.effectiveUpdatedAt || report.updatedAt)}.
          </li>)}</ul>
        </section>}

        <section className="citizen-reports-section" aria-labelledby="my-reports-heading">
          <h2 id="my-reports-heading">{uiCopy.reportsPage.myReportsHeading}</h2>
          <p className="section-lead">{uiCopy.reportsPage.myReportsLead}</p>
          {!ownReports.length && <p role="status">{uiCopy.reportsPage.myReportsEmpty}</p>}
          {ownReports.length > 0 && !visibleReports.length && (
            <p role="status">{uiCopy.reportsPage.emptySearch}</p>
          )}
          <ul className="report-list">
            {visibleReports.map((report, index) => renderReportCard(report, index === 0))}
          </ul>
        </section>

        {ENABLE_FOLLOWED_REPORTS_SECTION && subscriptions.length > 0 && (
          <section className="citizen-reports-section followed-reports-section" aria-labelledby="followed-reports-heading">
            <h2 id="followed-reports-heading">{uiCopy.reportsPage.followedReportsHeading}</h2>
            <p className="section-lead">{uiCopy.reportsPage.followedReportsLead}</p>
            <ul className="report-list">
              {subscriptions.map((report) => renderReportCard(report, false))}
            </ul>
          </section>
        )}

        <section className="citizen-reports-section community-map-section" aria-labelledby="community-problems-heading">
          <h2 id="community-problems-heading">{uiCopy.reportsPage.communityHeading}</h2>
          <p className="section-lead">{uiCopy.reportsPage.communityLead}</p>
          <IncidentMap reports={reports} trackingByTicket={trackingMap}
            onSelect={(ticket) => { setSelectedTicket(ticket); setMessage(''); }} />
          {selectedReport && <div className="selected-incident">
            <p><strong>{selectedReport.ticket}</strong> · {selectedReport.category || uiCopy.common.unclassifiedCategory} · {municipalStatusLabel(selectedReport, trackingMap)}</p>
            {trackingMap[selectedReport.ticket]?.masterUnavailable
              ? <p className="error-message" role="alert">No se pudo determinar el estado vigente del expediente maestro.</p>
              : null}
            {confirmedByMe(selectedReport)
              ? <p role="status">{uiCopy.endorsement.alreadyConfirmedNotice}</p>
              : selectedReport.reporterId && selectedReport.reporterId === reporterId
                ? <p role="status">{uiCopy.endorsement.ownReportNotice}</p>
                : !trackingMap[selectedReport.ticket]?.masterUnavailable
                  && isActiveReport({ ...selectedReport, status: trackingMap[selectedReport.ticket]?.effectiveStatus ?? selectedReport.status })
                  ? <ConfirmIncidentForm key={selectedReport.ticket} ticket={selectedReport.ticket}
                    onConfirmed={(updated) => {
                      setReports((previous) => previous.map((report) => report.ticket === updated.ticket ? updated : report));
                      setSelectedTicket(null);
                      setMessage(uiCopy.endorsement.savedBanner);
                    }} onCancel={() => setSelectedTicket(null)} />
                  : <p role="status">{uiCopy.endorsement.closedReportNotice}</p>}
            <Link to={`/reportes/${selectedReport.ticket}`}>{uiCopy.reportsPage.openDetailAction}</Link>
          </div>}
        </section>
      </>
    )}

    {reception && visibleReports.filter((report) => !isSecondaryReport(report) && isActiveReport(report)).length >= 2 && <div className="consolidation-toolbar" role="region" aria-label="Herramientas de consolidación de reportes">
      <p className="consolidation-toolbar-status">
        {selectedReports.length === 0
          ? uiCopy.municipal.consolidationToolbarHint
          : uiCopy.municipal.consolidationSelectedCount(selectedReports.length)}
      </p>
      <div className="consolidation-toolbar-actions">
        <button type="button" disabled={selectedReports.length < 2 || busyConsolidation}
          onClick={() => { setConsolidationError(''); setConsolidating(true); }}>
          {uiCopy.municipal.consolidateAction}
        </button>
        {selectedReports.length > 0 && <button type="button" className="secondary" disabled={busyConsolidation}
          onClick={() => { setSelectedTickets([]); setConsolidating(false); setConsolidationError(''); }}>
          {uiCopy.municipal.clearSelectionAction}
        </button>}
      </div>
    </div>}
    {reception && consolidating && selectedReports.length >= 2 && <ConsolidationModal
      selectedReports={selectedReports}
      busy={busyConsolidation}
      error={consolidationError}
      onConfirm={(payload) => { void handleConfirmConsolidation(payload); }}
      onCancel={() => { setConsolidating(false); setConsolidationError(''); }}
    />}
    {reception && (
      <ul className="report-list">
        {visibleReports.map((report, index) => renderReportCard(report, index === 0))}
      </ul>
    )}
    <Link className="button-link" to="/">{uiCopy.reportsPage.createNewReportAction}</Link>
  </section>;
}
