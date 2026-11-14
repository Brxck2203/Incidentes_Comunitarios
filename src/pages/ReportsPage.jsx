import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReports } from '../services/reportRepository.js';
import { consolidateReports } from '../services/consolidationService.js';
import ConsolidationModal from '../components/ConsolidationModal.jsx';

export default function ReportsPage({ reception = false }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [consolidating, setConsolidating] = useState(false);
  const [busyConsolidation, setBusyConsolidation] = useState(false);
  const [consolidationError, setConsolidationError] = useState('');

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

  const selectedReports = useMemo(
    () => reports.filter((item) => selectedTickets.includes(item.ticket) && !item.masterTicket),
    [reports, selectedTickets],
  );

  function toggleSelection(ticket) {
    setConsolidationError('');
    setMessage('');
    setSelectedTickets((current) =>
      current.includes(ticket)
        ? current.filter((item) => item !== ticket)
        : [...current, ticket],
    );
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
      setMessage(
        `Consolidación completada en el caso maestro ${result.masterReport.ticket} (${result.secondaryReports.length} reportes secundarios enlazados).`,
      );
    } catch (failure) {
      setConsolidationError(failure.message);
    } finally {
      setBusyConsolidation(false);
    }
  }

  return <section>
    <h1>{reception ? 'Recepción de reportes' : 'Mis reportes'}</h1>
    {loading && <p role="status">Cargando reportes…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="success-message" role="status">{message}</p>}
    {!loading && !error && !reports.length && <p>Aún no hay reportes registrados.</p>}

    {reception && reports.length >= 2 && (
      <div className="consolidation-toolbar" role="region" aria-label="Herramientas de consolidación de reportes">
        <p className="consolidation-toolbar-status">
          {selectedReports.length === 0
            ? 'Selecciona dos o más reportes para agruparlos en un solo caso maestro.'
            : `${selectedReports.length} ${selectedReports.length === 1 ? 'reporte seleccionado' : 'reportes seleccionados'}.`}
        </p>
        <div className="consolidation-toolbar-actions">
          <button
            type="button"
            disabled={selectedReports.length < 2 || busyConsolidation}
            onClick={() => { setConsolidationError(''); setConsolidating(true); }}
          >
            Consolidar en reporte principal
          </button>
          {selectedReports.length > 0 && (
            <button
              type="button"
              className="secondary"
              disabled={busyConsolidation}
              onClick={() => { setSelectedTickets([]); setConsolidating(false); setConsolidationError(''); }}
            >
              Limpiar selección
            </button>
          )}
        </div>
      </div>
    )}

    {reception && consolidating && selectedReports.length >= 2 && (
      <ConsolidationModal
        selectedReports={selectedReports}
        busy={busyConsolidation}
        error={consolidationError}
        onConfirm={(payload) => { void handleConfirmConsolidation(payload); }}
        onCancel={() => { setConsolidating(false); setConsolidationError(''); }}
      />
    )}

    <ul className="report-list">{reports.map((report) => {
      const isSecondary = Boolean(report.masterTicket);
      const isMaster = Array.isArray(report.secondaryTickets) && report.secondaryTickets.length > 0;
      const isChecked = selectedTickets.includes(report.ticket);
      return <li key={report.ticket} className={`report-card ${isMaster ? 'report-card-master' : ''} ${isSecondary ? 'report-card-secondary' : ''}`}>
        <div className="report-card-top">
          {reception && (
            <label className="report-select-checkbox">
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isSecondary || busyConsolidation}
                onChange={() => toggleSelection(report.ticket)}
                aria-label={`Seleccionar reporte ${report.ticket} para consolidar`}
              />
              <span>Seleccionar</span>
            </label>
          )}
          <Link to={`/reportes/${report.ticket}`} state={reception ? { fromReception: true } : undefined}>{report.ticket}</Link>
          {isMaster && (
            <span className="consolidation-status-badge master-badge">
              Caso maestro ({report.secondaryTickets.length} {report.secondaryTickets.length === 1 ? 'unificado' : 'unificados'})
            </span>
          )}
          {isSecondary && (
            <span className="consolidation-status-badge secondary-badge">
              Consolidado en {report.masterTicket}
            </span>
          )}
        </div>
        <p>{report.category || 'Sin clasificar'} · {report.status}</p>
        <p>{new Date(report.createdAt).toLocaleString('es-CR')}</p>
        {reception && <p role="status">{report.receptionEvent} · {new Date(report.updatedAt).toLocaleString('es-CR')}</p>}
      </li>;
    })}</ul>
    <Link className="button-link" to="/">Crear reporte</Link>
  </section>;
}
