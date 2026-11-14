import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../services/reportRepository.js';
import { resolveReportsListTracking } from '../services/consolidatedTracking.js';

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
  const [ticketQuery, setTicketQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const trackingMap = useMemo(() => resolveReportsListTracking(reports), [reports]);
  const visibleReports = useMemo(() => {
    const query = ticketQuery.trim().toLowerCase();
    if (!query) return reports;
    return reports.filter((item) => item.ticket.toLowerCase().includes(query));
  }, [reports, ticketQuery]);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try { const result = await getReports(); if (active) { setReports(result); setError(''); } }
      catch (failure) { if (active) setError(failure.message); }
      finally { if (active) setLoading(false); }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    const interval = reception ? setInterval(refresh, 3000) : null;
    return () => { active = false; window.removeEventListener('focus', refresh); clearInterval(interval); };
  }, [reception]);
  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {!reception && reports.length > 0 && (
      <label className="ticket-search-box">
        Consultar por número de ticket
        <input
          type="search"
          placeholder="Ejemplo: RC-..."
          value={ticketQuery}
          onChange={(event) => setTicketQuery(event.target.value)}
        />
      </label>
    )}
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}
    {!loading && !error && reports.length > 0 && !visibleReports.length && (
      <p role="status">No se encontró ningún reporte que coincida con el ticket ingresado.</p>
    )}
    <ul className="report-list">{visibleReports.map((report) => {
      const tracking = trackingMap[report.ticket];
      const isConsolidated = Boolean(tracking?.isConsolidatedSecondary);
      const effectiveStatus = tracking?.effectiveStatus ?? report.status;
      return <li key={report.ticket} className={`report-card ${isConsolidated ? 'report-card-joint' : ''}`}>
        <div className="report-card-header-row">
          <Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link>
          {isConsolidated && (
            <span className="joint-attention-badge">
              Atención conjunta ({tracking.masterTicket})
            </span>
          )}
        </div>
        <p>{report.category || 'Sin clasificar'} · {effectiveStatus}</p>
        {isConsolidated && (
          <p className="joint-attention-card-note" role="status">
            Integrado al expediente maestro <strong>{tracking.masterTicket}</strong> · Avance sincronizado
          </p>
        )}
        <p>{new Date(report.createdAt).toLocaleString('es-CR')}</p>
        {reception && <p role="status">{report.receptionEvent} · {new Date(report.updatedAt).toLocaleString('es-CR')}</p>}
      </li>;
    })}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
