import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentReporterId, getReports, setReportSeverity } from '../services/reportRepository.js';
import { endorsementCount, isActiveReport, priorityInfo, severityLevels, sortReceptionReports } from '../services/reportPriority.js';
import { subscribeToReportChanges } from '../services/reportNotifications.js';
import ConfirmIncidentForm from '../components/ConfirmIncidentForm.jsx';
import IncidentMap from '../components/IncidentMap.jsx';

const severityStyle = { Leve: 'mild', Moderado: 'moderate', Grave: 'serious', Crítico: 'critical' };

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingTicket, setSavingTicket] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reporterId] = useState(() => {
    try { return getCurrentReporterId(); } catch { return null; }
  });
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
    const interval = reception ? setInterval(refresh, 3000) : null;
    return () => {
      active = false;
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
  const visibleReports = reception ? sortReceptionReports(reports) : reports;
  const selectedReport = reports.find((report) => report.ticket === selectedTicket);
  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}
    {!reception && reports.length > 0 && <>
      <h2>Incidentes cercanos</h2>
      <IncidentMap reports={reports} onSelect={setSelectedTicket} />
      {selectedReport && isActiveReport(selectedReport)
        && selectedReport.reporterId !== reporterId
        && !selectedReport.confirmations?.some((confirmation) => confirmation.reporterId === reporterId) && (
        <ConfirmIncidentForm
          ticket={selectedReport.ticket}
          onConfirmed={(updated) => {
            setReports((current) => current.map((report) => report.ticket === updated.ticket ? updated : report));
            setSelectedTicket(null);
            setMessage('Confirmación registrada.');
          }}
          onCancel={() => setSelectedTicket(null)}
        />
      )}
    </>}
    <ul className="report-list">{visibleReports.map((report) => {
      const info = priorityInfo(report);
      return <li key={report.ticket} className="report-card">
        <Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link>
        <p>{report.category || 'Sin clasificar'} · {report.status}</p>
        <p>{new Date(report.createdAt).toLocaleString('es-CR')}</p>
        {endorsementCount(report) > 0 && <p>Respaldos ciudadanos: <strong>{endorsementCount(report)}</strong></p>}
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
          </div>
        </>}
      </li>;
    })}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
