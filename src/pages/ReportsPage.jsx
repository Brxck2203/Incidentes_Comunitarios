import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../services/reportRepository.js';

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try { const result = await getReports(); if (active) { setReports(result); setError(''); } }
      catch (failure) { if (active) setError(failure.message); }
      finally { if (active) setLoading(false); }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    const interval = reception ? setInterval(refresh, 5000) : null;
    return () => { active = false; window.removeEventListener('focus', refresh); clearInterval(interval); };
  }, [reception]);
  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}
    <ul className="report-list">{reports.map((report) => <li key={report.ticket} className="report-card">
      <Link to={`/reportes/${report.ticket}`}>{report.ticket}</Link>
      <p>{report.category || 'Sin clasificar'} · {report.status}</p>
      <p>{new Date(report.createdAt).toLocaleString('es-CR')}</p>
      {reception && <p role="status">{report.receptionEvent} · {new Date(report.updatedAt).toLocaleString('es-CR')}</p>}
    </li>)}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
