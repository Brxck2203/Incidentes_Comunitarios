import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentReporterId, getReports, resolveIncident, setReportSeverity } from '../services/reportRepository.js';
import { endorsementCount, isActiveReport, priorityInfo, severityLevels, sortReceptionReports } from '../services/reportPriority.js';
import { buildDuplicateMap } from '../services/duplicateDetection.js';
import DuplicateBadge from '../components/DuplicateBadge.jsx';
import { consolidateReports } from '../services/consolidationService.js';
import ConsolidationModal from '../components/ConsolidationModal.jsx';
import ConfirmIncidentForm from '../components/ConfirmIncidentForm.jsx';
import IncidentMap from '../components/IncidentMap.jsx';
import { subscribeToReportChanges } from '../services/reportNotifications.js';

const severityStyle = { Leve: 'mild', Moderado: 'moderate', Grave: 'serious', Crítico: 'critical' };

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
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
  const duplicateMap = useMemo(
    () => (reception ? buildDuplicateMap(reports) : {}),
    [reception, reports],
  );
  const selectedReports = useMemo(
    () => reports.filter((report) => selectedTickets.includes(report.ticket) && !report.masterTicket),
    [reports, selectedTickets],
  );
  useEffect(() => {
    let active = true;
    async function refresh() {
      try { const result = await getReports(); if (active) { setReports(result); setError(''); } }
      catch (failure) { if (active) setError(failure.message); }
      finally { if (active) setLoading(false); }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    const unsubscribe = subscribeToReportChanges(refresh);
    // The reception list responds to confirmations and reprioritization within <= 3 seconds.
    const interval = setInterval(refresh, reception ? 3000 : 15000);
    return () => { active = false; window.removeEventListener('focus', refresh); unsubscribe(); clearInterval(interval); };
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

  const visibleReports = reception ? sortReceptionReports(reports) : reports;
  const selectedReport = reports.find((report) => report.ticket === selectedTicket);
  const confirmedByMe = (report) => Boolean(reporterId && report.confirmations?.some((item) => item.reporterId === reporterId));
  const subscriptions = reception ? [] : reports.filter(confirmedByMe);
  const resolvedNotifications = subscriptions.filter((report) => !isActiveReport(report));

  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {consolidationError && <p className="error-message" role="alert">{consolidationError}</p>}

    {!reception && !loading && reports.length > 0 && <>
      <h2>Incidentes abiertos en el mapa</h2>
      <p>Selecciona un marcador y utiliza «Confirmar incidente» para respaldar un reporte existente.</p>
      <IncidentMap reports={reports} onSelect={(ticket) => { setSelectedTicket(ticket); setMessage(''); }} />
      {selectedReport && <div className="selected-incident">
        <p><strong>{selectedReport.ticket}</strong> · {selectedReport.category || 'Sin clasificar'} · {selectedReport.status}</p>
        {confirmedByMe(selectedReport)
          ? <p role="status">Ya confirmaste este incidente y estás suscrito a su resolución.</p>
          : selectedReport.reporterId && selectedReport.reporterId === reporterId
            ? <p role="status">Este reporte se registró desde tu navegador. No puedes respaldar tu propio reporte.</p>
            : <ConfirmIncidentForm key={selectedReport.ticket} ticket={selectedReport.ticket}
                onConfirmed={(updated) => {
                  setReports((previous) => previous.map((report) => report.ticket === updated.ticket ? updated : report));
                  setSelectedTicket(null);
                  setMessage('Confirmación guardada. Recibirás un aviso aquí cuando el incidente se resuelva.');
                }} onCancel={() => setSelectedTicket(null)} />}
        <Link to={`/reportes/${selectedReport.ticket}`}>Ver detalle del reporte</Link>
      </div>}
      {subscriptions.length > 0 && <section aria-label="Reportes que sigo">
        <h2>Reportes que sigo</h2>
        <ul>{subscriptions.map((report) => <li key={report.ticket}><Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link> · {report.status}</li>)}</ul>
      </section>}
      {resolvedNotifications.length > 0 && <section className="resolution-notices" aria-label="Notificaciones de resolución" role="status">
        <h2>Notificaciones de resolución</h2>
        <ul>{resolvedNotifications.map((report) => <li key={report.ticket}>
          El incidente <Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link> fue {report.status.toLowerCase()} el {new Date(report.resolvedAt || report.updatedAt).toLocaleString('es-CR')}.
        </li>)}</ul>
      </section>}
    </>}

    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}
    {reception && reports.length >= 2 && <div className="consolidation-toolbar" role="region" aria-label="Herramientas de consolidación de reportes">
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
      const isSecondary = Boolean(report.masterTicket);
      const isMaster = Array.isArray(report.secondaryTickets) && report.secondaryTickets.length > 0;
      const isChecked = selectedTickets.includes(report.ticket);
      return <li key={report.ticket} className={`report-card ${isDuplicate ? 'report-card-duplicate' : ''} ${isMaster ? 'report-card-master' : ''} ${isSecondary ? 'report-card-secondary' : ''}`}>
        <div className="report-card-header">
          {reception && <label className="report-select-checkbox">
            <input type="checkbox" checked={isChecked} disabled={isSecondary || busyConsolidation}
              onChange={() => toggleSelection(report.ticket)}
              aria-label={`Seleccionar reporte ${report.ticket} para consolidar`} />
            <span>Seleccionar</span>
          </label>}
          <Link to={`/reportes/${report.ticket}`} state={reception ? { fromReception: true } : undefined}>{report.ticket}</Link>
          {isMaster && <span className="consolidation-status-badge master-badge">
            Caso maestro ({report.secondaryTickets.length} {report.secondaryTickets.length === 1 ? 'unificado' : 'unificados'})
          </span>}
          {isSecondary && <span className="consolidation-status-badge secondary-badge">Consolidado en {report.masterTicket}</span>}
          {isDuplicate && <DuplicateBadge match={duplicateInfo.primaryMatch} count={duplicateInfo.matches.length} />}
        </div>
        <p>{report.category || 'Sin clasificar'} · {report.status}</p>
        <p>{new Date(report.createdAt).toLocaleString('es-CR')}</p>
        {endorsementCount(report) > 0 && <p>Vecinos que confirman el incidente: <strong>{endorsementCount(report)}</strong></p>}
        {reception && <>
          <p role="status">{report.receptionEvent} · {new Date(report.updatedAt).toLocaleString('es-CR')}</p>
          <div className="severity-panel">
            <span className={`severity-pill severity-${severityStyle[report.severity] || 'none'}`}>{report.severity || 'Sin severidad'}</span>
            <span>Indicador de prioridad: <strong>{info.score}</strong> · Respaldos: {info.supporters}</span>
            <label>Severidad técnica
              <select aria-label={`Severidad técnica del reporte ${report.ticket}`} value={report.severity || ''}
                disabled={Boolean(savingTicket) || !isActiveReport(report)}
                onChange={(event) => { void changeSeverity(report.ticket, event.target.value); }}>
                <option value="">Sin evaluar</option>
                {severityLevels.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            {isActiveReport(report) && <button type="button" className="secondary" disabled={Boolean(savingTicket)}
              onClick={() => { void markResolved(report.ticket); }}>Marcar resuelto</button>}
          </div>
        </>}
      </li>;
    })}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
