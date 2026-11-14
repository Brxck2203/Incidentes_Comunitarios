import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../services/reportRepository.js';
import { buildDuplicateMap } from '../services/duplicateDetection.js';
import DuplicateBadge from '../components/DuplicateBadge.jsx';

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // TODO: reemplazar o integrar en consola municipal cuando se integre HU-11
  const duplicateMap = useMemo(
    () => (reception ? buildDuplicateMap(reports) : {}),
    [reception, reports],
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
    const interval = reception ? setInterval(refresh, 3000) : null;
    return () => { active = false; window.removeEventListener('focus', refresh); clearInterval(interval); };
  }, [reception]);
  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}
    <ul className="report-list">{reports.map((report) => {
      const duplicateInfo = reception ? duplicateMap[report.ticket] : null;
      const isDuplicate = Boolean(duplicateInfo?.isSuspectedDuplicate);
      return <li key={report.ticket} className={`report-card ${isDuplicate ? 'report-card-duplicate' : ''}`}>
        <div className="report-card-header">
          <Link to={`/reportes/${report.ticket}`} state={reception ? { fromReception: true } : undefined}>{report.ticket}</Link>
          {isDuplicate && <DuplicateBadge match={duplicateInfo.primaryMatch} count={duplicateInfo.matches.length} />}
        </div>
        <p>{report.category || 'Sin clasificar'} · {report.status}</p>
        <p>{new Date(report.createdAt).toLocaleString('es-CR')}</p>
        {reception && <p role="status">{report.receptionEvent} · {new Date(report.updatedAt).toLocaleString('es-CR')}</p>}
      </li>;
    })}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
