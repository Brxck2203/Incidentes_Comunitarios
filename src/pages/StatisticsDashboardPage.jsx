import { useEffect, useMemo, useRef, useState } from 'react';
import { categories, getReports } from '../services/reportRepository.js';
import { subscribeToReportChanges } from '../services/reportNotifications.js';
import { computeMunicipalStatistics } from '../services/statisticsMetrics.js';
import '../components/StatisticsDashboard.css';

function statusBarColor(status) {
  const lower = String(status ?? '').toLocaleLowerCase();
  if (lower.includes('desestimado')) return '#991b1b';
  if (lower === 'atendido' || lower === 'resuelto' || lower.startsWith('cerrado')) {
    return '#166534';
  }
  if (lower === 'asignado' || lower === 'en atención') return '#b45309';
  return '#123f73';
}

function HorizontalSvgBar({ ratio, color, ariaLabel }) {
  const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
  const widthPercent = clamped > 0 ? Math.max(4, Math.round(clamped * 100)) : 0;

  return (
    <svg
      className="stats-bar-svg"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <rect x="0" y="0" width="100" height="12" rx="6" fill="#e2e8f0" />
      {widthPercent > 0 && (
        <rect
          x="0"
          y="0"
          width={widthPercent}
          height="12"
          rx="6"
          fill={color}
        />
      )}
    </svg>
  );
}

export default function StatisticsDashboardPage({
  renderHeaderActions = null,
  renderExtensionPanels = null,
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [category, setCategory] = useState('');
  const refreshSeq = useRef(0);

  useEffect(() => {
    let active = true;
    async function refreshReports() {
      const seq = ++refreshSeq.current;
      try {
        const list = await getReports();
        if (active && seq === refreshSeq.current) {
          setReports(list);
          setLoadError('');
        }
      } catch (failure) {
        if (active && seq === refreshSeq.current) {
          setLoadError(
            failure instanceof Error
              ? failure.message
              : 'No se pudieron consultar los reportes para estadísticas.',
          );
        }
      } finally {
        if (active && seq === refreshSeq.current) {
          setLoading(false);
        }
      }
    }

    void refreshReports();
    window.addEventListener('focus', refreshReports);
    const unsubscribe = subscribeToReportChanges(refreshReports);

    return () => {
      active = false;
      refreshSeq.current += 1;
      window.removeEventListener('focus', refreshReports);
      unsubscribe();
    };
  }, []);

  const computed = useMemo(() => {
    try {
      const stats = computeMunicipalStatistics(reports, {
        fromDate,
        toDate,
        category,
      });
      return { stats, filterError: '' };
    } catch (failure) {
      return {
        stats: null,
        filterError:
          failure instanceof Error ? failure.message : 'Filtros estadísticos inválidos.',
      };
    }
  }, [reports, fromDate, toDate, category]);

  const hasActiveFilters = Boolean(fromDate || toDate || category);

  function clearFilters() {
    setFromDate('');
    setToDate('');
    setCategory('');
  }

  return (
    <section>
      <div className="stats-page-header">
        <div>
          <h1>Tablero estadístico municipal</h1>
          <p className="lead">
            Consulta el volumen de incidentes por estado, los casos resueltos por categoría y el tiempo promedio de resolución de cada dependencia.
          </p>
        </div>
        {/* TODO: enchufar botón "Exportar reporte" (PDF/CSV) pasando computed.stats cuando se integre HU-28 */}
        {typeof renderHeaderActions === 'function' && computed.stats
          ? renderHeaderActions(computed.stats)
          : null}
      </div>

      <fieldset className="stats-filters-card">
        <legend>Filtrar periodo y categoría</legend>
        <div className="stats-filters-grid">
          <label htmlFor="stats-from-date">
            Fecha inicial
            <input
              id="stats-from-date"
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label htmlFor="stats-to-date">
            Fecha final
            <input
              id="stats-to-date"
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>

          <label htmlFor="stats-category">
            Categoría del incidente
            <select
              id="stats-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="stats-filter-actions">
            <button type="button" className="secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        )}
      </fieldset>

      {loading && <p role="status">Calculando métricas municipales…</p>}
      {loadError && <p className="error-message" role="alert">{loadError}</p>}
      {computed.filterError && (
        <p className="error-message" role="alert">
          {computed.filterError}
        </p>
      )}

      {!loading && !loadError && !computed.filterError && computed.stats && (
        <>
          <div className="stats-kpi-grid" role="region" aria-label="Indicadores generales">
            <div className="stats-kpi-card">
              <span className="stats-kpi-label">Total recibidos</span>
              <strong className="stats-kpi-value">
                {computed.stats.totals.totalIncidents}
              </strong>
            </div>
            <div className="stats-kpi-card">
              <span className="stats-kpi-label">En proceso</span>
              <strong className="stats-kpi-value">
                {computed.stats.totals.activeCount}
              </strong>
            </div>
            <div className="stats-kpi-card stats-kpi-card-resolved">
              <span className="stats-kpi-label">Atendidos / resueltos</span>
              <strong className="stats-kpi-value">
                {computed.stats.totals.resolvedCount}
              </strong>
            </div>
            <div className="stats-kpi-card stats-kpi-card-dismissed">
              <span className="stats-kpi-label">Desestimados</span>
              <strong className="stats-kpi-value">
                {computed.stats.totals.dismissedCount}
              </strong>
            </div>
            <div className="stats-kpi-card stats-kpi-card-wide">
              <span className="stats-kpi-label">
                Tiempo promedio general de resolución
              </span>
              <strong className="stats-kpi-value">
                {computed.stats.totals.overallAverageLabel}
              </strong>
            </div>
          </div>

          {computed.stats.totals.totalIncidents === 0 ? (
            <div className="stats-empty-box" role="status">
              <p>
                {hasActiveFilters
                  ? 'No hay incidentes registrados que coincidan con el rango de fechas o la categoría seleccionada.'
                  : 'Aún no hay incidentes registrados para mostrar métricas de atención.'}
              </p>
            </div>
          ) : (
            <div className="stats-charts-stack">
              <section
                className="stats-chart-panel"
                aria-labelledby="chart-by-status-title"
              >
                <h2 id="chart-by-status-title">Total de incidentes por estado</h2>
                <p className="stats-chart-subtitle">
                  Distribución actual de los {computed.stats.totals.totalIncidents} expedientes del periodo.
                </p>
                <ul className="stats-bar-list">
                  {computed.stats.byStatus.map((item) => (
                    <li key={item.status} className="stats-bar-item">
                      <div className="stats-bar-header">
                        <span className="stats-bar-title">{item.status}</span>
                        <span className="stats-bar-metric">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <HorizontalSvgBar
                        ratio={item.barRatio}
                        color={statusBarColor(item.status)}
                        ariaLabel={`${item.status}: ${item.count} incidentes (${item.percentage}%)`}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section
                className="stats-chart-panel"
                aria-labelledby="chart-by-dept-title"
              >
                <h2 id="chart-by-dept-title">
                  Tiempo promedio de resolución por dependencia
                </h2>
                <p className="stats-chart-subtitle">
                  Tiempo transcurrido desde el registro de la solicitud hasta su cierre técnico o resolución.
                </p>
                <ul className="stats-bar-list">
                  {computed.stats.byDepartment.map((dept) => (
                    <li key={dept.department} className="stats-bar-item">
                      <div className="stats-bar-header">
                        <span className="stats-bar-title">{dept.department}</span>
                        <span className="stats-bar-metric">
                          {dept.averageLabel} · {dept.resolvedCount}{' '}
                          {dept.resolvedCount === 1 ? 'resuelto' : 'resueltos'}
                        </span>
                      </div>
                      <HorizontalSvgBar
                        ratio={dept.barRatio}
                        color="#123f73"
                        ariaLabel={`${dept.department}: promedio ${dept.averageLabel} con ${dept.resolvedCount} casos resueltos`}
                      />
                    </li>
                  ))}
                </ul>

                {computed.stats.exclusions.totalExcludedFromAverage > 0 && (
                  <p className="stats-exclusion-note" role="status">
                    Nota: {computed.stats.exclusions.totalExcludedFromAverage}{' '}
                    {computed.stats.exclusions.totalExcludedFromAverage === 1
                      ? 'caso resuelto se excluyó'
                      : 'casos resueltos se excluyeron'}{' '}
                    del cálculo de tiempo promedio por carecer de dependencia asignada o fecha válida de cierre.
                  </p>
                )}
              </section>

              <section
                className="stats-chart-panel"
                aria-labelledby="chart-resolved-cat-title"
              >
                <h2 id="chart-resolved-cat-title">Casos resueltos por categoría</h2>
                <p className="stats-chart-subtitle">
                  Volumen de incidentes solucionados según el tipo de problema reportado.
                </p>
                <ul className="stats-bar-list">
                  {computed.stats.resolvedByCategory.map((catItem) => (
                    <li key={catItem.category} className="stats-bar-item">
                      <div className="stats-bar-header">
                        <span className="stats-bar-title">{catItem.category}</span>
                        <span className="stats-bar-metric">
                          {catItem.resolvedCount}{' '}
                          {catItem.resolvedCount === 1 ? 'resuelto' : 'resueltos'}
                        </span>
                      </div>
                      <HorizontalSvgBar
                        ratio={catItem.barRatio}
                        color="#166534"
                        ariaLabel={`${catItem.category}: ${catItem.resolvedCount} casos resueltos`}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {/* TODO: enchufar vista de mapa de calor (HU-29) y comparador de periodos (HU-30) */}
          {typeof renderExtensionPanels === 'function'
            ? renderExtensionPanels({ reports, filters: computed.stats.filters })
            : null}
        </>
      )}
    </section>
  );
}
