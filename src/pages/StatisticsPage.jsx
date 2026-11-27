import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import IncidentHeatmapView from '../components/IncidentHeatmapView.jsx';
import { getReports } from '../services/reportRepository.js';
import { subscribeToReportChanges } from '../services/reportNotifications.js';

// TODO: reemplazar este contenedor mínimo e integrar la pestaña/vista dentro del tablero cuando se integre HU-27
// TODO: restringir el acceso a perfiles municipales autorizados cuando se integre HU-34
export default function StatisticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [heatmapActive, setHeatmapActive] = useState(
    () => searchParams.get('vista') === 'mapa-calor',
  );
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshSequence = useRef(0);

  useEffect(() => {
    let active = true;
    async function loadReports() {
      const currentSequence = ++refreshSequence.current;
      try {
        const list = await getReports();
        if (active && currentSequence === refreshSequence.current) {
          setReports(list);
          setError('');
        }
      } catch (failure) {
        if (active && currentSequence === refreshSequence.current) {
          setError(
            failure instanceof Error
              ? failure.message
              : 'No se pudieron consultar los reportes registrados.',
          );
        }
      } finally {
        if (active && currentSequence === refreshSequence.current) {
          setLoading(false);
        }
      }
    }

    void loadReports();
    window.addEventListener('focus', loadReports);
    const unsubscribe = subscribeToReportChanges(loadReports);

    return () => {
      active = false;
      refreshSequence.current += 1;
      window.removeEventListener('focus', loadReports);
      unsubscribe();
    };
  }, []);

  function toggleHeatmapView() {
    setHeatmapActive((previous) => {
      const next = !previous;
      const nextParams = new URLSearchParams(searchParams);
      if (next) {
        nextParams.set('vista', 'mapa-calor');
      } else {
        nextParams.delete('vista');
      }
      setSearchParams(nextParams, { replace: true });
      return next;
    });
  }

  return (
    <section>
      <h1>Estadísticas municipales</h1>
      <div className="statistics-header-panel">
        <p>
          Analiza la distribución territorial y la reincidencia histórica de los incidentes reportados en el cantón para orientar las labores de mantenimiento preventivo.
        </p>
        <div className="statistics-header-actions">
          <button
            type="button"
            aria-pressed={heatmapActive}
            onClick={toggleHeatmapView}
          >
            {heatmapActive ? 'Ocultar mapa de calor' : 'Activar mapa de calor'}
          </button>
        </div>
      </div>

      {loading && <p role="status">Cargando registros estadísticos…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}

      {!loading && !error && heatmapActive && (
        <IncidentHeatmapView reports={reports} />
      )}
    </section>
  );
}
