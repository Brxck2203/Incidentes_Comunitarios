import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentReporterId, getReports, resolveIncident, setReportSeverity } from '../services/reportRepository.js';
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
import { administrativeNotices } from '../services/administrativeNotices.js';

const severityStyle = { Leve: 'mild', Moderado: 'moderate', Grave: 'serious', Crítico: 'critical' };

function formatDateTime(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'No disponible' : date.toLocaleString('es-CR');
}

export default function ReportsPage({ reception = false }) {
  const location = useLocation();
  const accessDeniedReason = !reception ? location.state?.accessDeniedReason || '' : '';
  const [reports, setReports] = useState([]);
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
  const duplicateMap = useMemo(
    () => (reception ? buildDuplicateMap(reports) : {}),
    [reception, reports],
  );
  const trackingMap = useMemo(() => resolveReportsListTracking(reports), [reports]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const requestSequence = ++refreshSequence.current;
      try {
        const result = await getReports();
        if (active && requestSequence === refreshSequence.current) { setReports(result); setError(''); }
      } catch (failure) {
        if (active && requestSequence === refreshSequence.current) setError(failure.message);
      } finally {
        if (active && requestSequence === refreshSequence.current) setLoading(false);
      }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    const unsubscribe = subscribeToReportChanges(refresh);
    // The reception list responds to confirmations and reprioritization within <= 3 seconds.
    const interval = setInterval(refresh, reception ? 3000 : 15000);
    return () => {
      active = false;
      refreshSequence.current += 1;
      window.removeEventListener('focus', refresh);
      unsubscribe();
      clearInterval(interval);
    };
  }, [reception]);

  async function changeSeverity(ticket, severity) {
    if (savingTicket) return;
    setSavingTicket(ticket); setError(''); setMessage('');
    try {
      const updated = await setReportSeverity(ticket, severity);
      setReports((previous) => previous.map((report) => report.ticket === ticket ? updated : report));
      setMessage('Severidad actualizada y cola de atención reordenada.');
    } catch (failure) { setError(failure.message); }
    finally { setSavingTicket(''); }
  }

  async function markResolved(ticket) {
    if (savingTicket || !window.confirm('¿Marcar este incidente como resuelto? Se notificará a los vecinos suscritos en este navegador.')) return;
    setSavingTicket(ticket); setError(''); setMessage('');
    try {
      const updated = await resolveIncident(ticket);
      setReports((previous) => previous.map((report) => report.ticket === ticket ? updated : report));
      setMessage('Incidente resuelto. Los vecinos suscritos verán el aviso en Mis reportes.');
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
      setSelectedTickets([]);
      setConsolidating(false);
      setMessage(`Consolidación completada en el caso maestro ${result.masterReport.ticket} (${result.secondaryReports.length} reportes secundarios enlazados).`);
    } catch (failure) {
      setConsolidationError(failure.message);
    } finally {
      setBusyConsolidation(false);
    }
  }

  const orderedReports = useMemo(() => reception ? sortReceptionReports(reports.map((report) => {
    const tracking = trackingMap[report.ticket];
    return tracking?.isConsolidatedSecondary && !tracking.masterUnavailable
      ? { ...report, status: tracking.effectiveStatus }
      : report;
  })) : reports, [reception, reports, trackingMap]);
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
  const selectedReport = visibleReports.find((report) => report.ticket === selectedTicket);
  useEffect(() => {
    if (!reception || !selectedTicket) return;
    document.getElementById(`report-${selectedTicket}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [reception, selectedTicket]);
  const confirmedByMe = (report) => Boolean(reporterId && report.confirmations?.some((item) => item.reporterId === reporterId));
  const subscriptions = reception ? [] : reports.filter(confirmedByMe);
  const adminNotices = reception ? [] : reports.flatMap(report => administrativeNotices(report, reporterId));
  const resolvedNotifications = subscriptions.filter((report) => !trackingMap[report.ticket]?.masterUnavailable
    && !isActiveReport({ ...report, status: trackingMap[report.ticket]?.effectiveStatus ?? report.status }));

  function updateMunicipalFilter(setter, value) {
    setter(value);
    setSelectedTickets([]);
    setSelectedTicket(null);
    setConsolidating(false);
  }

  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {accessDeniedReason && <p className="error-message" role="alert">{accessDeniedReason}</p>}
    {!reception && reports.length > 0 && <label className="ticket-search-box">
      Consultar por número de ticket
      <input type="search" placeholder="Ejemplo: RC-..." value={ticketQuery}
        onChange={(event) => setTicketQuery(event.target.value)} />
    </label>}
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {consolidationError && <p className="error-message" role="alert">{consolidationError}</p>}

    {reception && !loading && reports.length > 0 && <>
      <MunicipalConsoleFilters category={categoryFilter} status={statusFilter} query={municipalQuery}
        statuses={statuses} onCategoryChange={(value) => updateMunicipalFilter(setCategoryFilter, value)}
        onStatusChange={(value) => updateMunicipalFilter(setStatusFilter, value)}
        onQueryChange={(value) => updateMunicipalFilter(setMunicipalQuery, value)} />
      <MunicipalIncidentMap reports={visibleReports} trackingByTicket={trackingMap}
        selectedTicket={visibleReports.some((report) => report.ticket === selectedTicket) ? selectedTicket : null}
        onSelect={(ticket) => { setSelectedTicket(ticket); setMessage(''); }} />
      {!visibleReports.length && <p role="status">No hay reportes que coincidan con los filtros seleccionados.</p>}
    </>}

    {!reception && !loading && reports.length > 0 && <>
      <h2>Incidentes abiertos en el mapa</h2>
      <p>Selecciona un marcador y utiliza «Confirmar incidente» para respaldar un reporte existente.</p>
      <IncidentMap reports={reports} trackingByTicket={trackingMap}
        onSelect={(ticket) => { setSelectedTicket(ticket); setMessage(''); }} />
      {selectedReport && <div className="selected-incident">
        <p><strong>{selectedReport.ticket}</strong> · {selectedReport.category || 'Sin clasificar'} · {municipalStatusLabel(selectedReport, trackingMap)}</p>
        {trackingMap[selectedReport.ticket]?.masterUnavailable
          ? <p className="error-message" role="alert">No se pudo determinar el estado vigente del expediente maestro.</p>
          : null}
        {confirmedByMe(selectedReport)
          ? <p role="status">Ya confirmaste este incidente y estás suscrito a su resolución.</p>
          : selectedReport.reporterId && selectedReport.reporterId === reporterId
            ? <p role="status">Este reporte se registró desde tu navegador. No puedes respaldar tu propio reporte.</p>
            : !trackingMap[selectedReport.ticket]?.masterUnavailable
              && isActiveReport({ ...selectedReport, status: trackingMap[selectedReport.ticket]?.effectiveStatus ?? selectedReport.status })
              ? <ConfirmIncidentForm key={selectedReport.ticket} ticket={selectedReport.ticket}
                onConfirmed={(updated) => {
                  setReports((previous) => previous.map((report) => report.ticket === updated.ticket ? updated : report));
                  setSelectedTicket(null);
                  setMessage('Confirmación guardada. Recibirás un aviso aquí cuando el incidente se resuelva.');
                }} onCancel={() => setSelectedTicket(null)} />
              : <p role="status">Este incidente ya no acepta confirmaciones.</p>}
        <Link to={`/reportes/${selectedReport.ticket}`}>Ver detalle del reporte</Link>
      </div>}
      {subscriptions.length > 0 && <section aria-label="Reportes que sigo">
        <h2>Reportes que sigo</h2>
        <ul>{subscriptions.map((report) => <li key={report.ticket}><Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link> · {municipalStatusLabel(report, trackingMap)}</li>)}</ul>
      </section>}
      {adminNotices.length > 0 && <section aria-label="Avisos administrativos" className="resolution-notices" role="status">
        <h2>Avisos administrativos</h2>
        <ul>{adminNotices.map(notice => <li key={notice.id}>
          <strong>{notice.title}</strong> · {formatDateTime(notice.at)} · {notice.message}{' '}
          <Link to={notice.url}>Consultar expediente {notice.ticket}</Link>
        </li>)}</ul>
      </section>}
      {resolvedNotifications.length > 0 && <section className="resolution-notices" aria-label="Notificaciones de resolución" role="status">
        <h2>Notificaciones de resolución</h2>
        <ul>{resolvedNotifications.map((report) => <li key={report.ticket}>
          El incidente <Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link> fue {(trackingMap[report.ticket]?.effectiveStatus ?? report.status ?? 'cerrado').toLowerCase()} el {formatDateTime(report.resolvedAt || trackingMap[report.ticket]?.effectiveUpdatedAt || report.updatedAt)}.
        </li>)}</ul>
      </section>}
    </>}

    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}
    {!reception && !loading && !error && reports.length > 0 && !visibleReports.length && (
      <p role="status">No se encontró ningún reporte que coincida con el ticket ingresado.</p>
    )}
    {reception && visibleReports.filter((report) => !isSecondaryReport(report) && isActiveReport(report)).length >= 2 && <div className="consolidation-toolbar" role="region" aria-label="Herramientas de consolidación de reportes">
      <p className="consolidation-toolbar-status">
        {selectedReports.length === 0
          ? 'Selecciona dos o más reportes para agruparlos en un solo caso maestro.'
          : `${selectedReports.length} ${selectedReports.length === 1 ? 'reporte seleccionado' : 'reportes seleccionados'}.`}
      </p>
      <div className="consolidation-toolbar-actions">
        <button type="button" disabled={selectedReports.length < 2 || busyConsolidation}
          onClick={() => { setConsolidationError(''); setConsolidating(true); }}>
          Consolidar en reporte principal
        </button>
        {selectedReports.length > 0 && <button type="button" className="secondary" disabled={busyConsolidation}
          onClick={() => { setSelectedTickets([]); setConsolidating(false); setConsolidationError(''); }}>
          Limpiar selección
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
    <ul className="report-list">{visibleReports.map((report) => {
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
        : report.status ?? 'Estado no disponible';
      const eventLabel = isSecondary && !tracking?.masterUnavailable
        ? 'Actualización del expediente maestro'
        : isSecondary
          ? 'Actualización del ticket original'
          : report.receptionEvent || 'Actualización del reporte';
      const eventAt = isSecondary && !tracking?.masterUnavailable
        ? tracking.effectiveUpdatedAt
        : report.updatedAt;
      const isSelected = selectedReport?.ticket === report.ticket && selectedTicket === report.ticket;
      return <li id={`report-${report.ticket}`} key={report.ticket} aria-current={isSelected ? 'true' : undefined}
        className={`report-card ${isSelected ? 'report-card-selected' : ''} ${isDuplicate ? 'report-card-duplicate' : ''} ${isMaster ? 'report-card-master' : ''} ${isSecondary ? 'report-card-secondary' : ''} ${isConsolidated && !reception ? 'report-card-joint' : ''}`}>
        <div className="report-card-header">
          {reception && <label className="report-select-checkbox">
            <input type="checkbox" checked={isChecked} disabled={isSecondary || !isActiveReport(report) || busyConsolidation}
              onChange={() => toggleSelection(report.ticket)}
              aria-label={`Seleccionar reporte ${report.ticket} para consolidar`} />
            <span>Seleccionar</span>
          </label>}
          <Link to={reception ? `/recepcion/${encodeURIComponent(report.ticket)}` : `/reportes/${report.ticket}`}>{report.ticket}</Link>
          {isMaster && <span className="consolidation-status-badge master-badge">
            Caso maestro ({report.secondaryTickets.length} {report.secondaryTickets.length === 1 ? 'unificado' : 'unificados'})
          </span>}
          {isSecondary && <span className="consolidation-status-badge secondary-badge">Consolidado en {report.masterTicket || report.consolidation?.masterTicket || 'expediente no disponible'}</span>}
          {isConsolidated && !reception && <span className="joint-attention-badge">Atención conjunta ({tracking.masterTicket})</span>}
          {isDuplicate && <DuplicateBadge match={duplicateInfo.primaryMatch} count={duplicateInfo.matches.length} />}
        </div>
        <p>{report.category || 'Sin clasificar'} · {effectiveStatus}</p>
        {isConsolidated && tracking.masterUnavailable
          ? <p className="error-message" role="alert">{tracking.masterUnavailableReason} No se pudo determinar el estado vigente del maestro.</p>
          : isConsolidated && !reception && <p className="joint-attention-card-note" role="status">
            Avance del expediente maestro: <strong>{tracking.effectiveStatus}</strong>
          </p>}
        <p>{formatDateTime(report.createdAt)}</p>
        {endorsementCount(report) > 0 && <p>Vecinos que confirman el incidente: <strong>{endorsementCount(report)}</strong></p>}
        {reception && <>
          <p role="status">{eventLabel} · {formatDateTime(eventAt)}</p>
          <div className="severity-panel">
            <span className={`severity-pill severity-${severityStyle[report.severity] || 'none'}`}>{report.severity || 'Sin severidad'}</span>
            <span>Indicador de prioridad: <strong>{info.score}</strong> · Respaldos: {info.supporters}</span>
            <label>Severidad técnica
              <select aria-label={`Severidad técnica del reporte ${report.ticket}`} value={report.severity || ''}
                disabled={Boolean(savingTicket) || !isActiveReport(report) || isSecondary}
                onChange={(event) => { void changeSeverity(report.ticket, event.target.value); }}>
                <option value="">Sin evaluar</option>
                {severityLevels.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            {isActiveReport(report) && !isSecondary && <button type="button" className="secondary" disabled={Boolean(savingTicket)}
              onClick={() => { void markResolved(report.ticket); }}>Marcar resuelto</button>}
          </div>
        </>}
      </li>;
    })}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
