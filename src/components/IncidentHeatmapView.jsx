import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categories } from '../services/reportRepository.js';
import {
  HEATMAP_INTENSITY_LEVELS,
  buildIncidentHeatmap,
} from '../services/incidentHeatmap.js';
import './IncidentHeatmapView.css';

export default function IncidentHeatmapView({
  reports = [],
  initialCategory = '',
  fromDate = '',
  toDate = '',
}) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const rendererRef = useRef(null);

  const heatmap = useMemo(
    () =>
      buildIncidentHeatmap(reports, {
        category: selectedCategory,
        fromDate,
        toDate,
      }),
    [reports, selectedCategory, fromDate, toDate],
  );

  useEffect(() => {
    const renderer = L.canvas({ padding: 0.5 });
    const map = L.map(mapContainerRef.current, { preferCanvas: true }).setView(
      [9.94, -84.08],
      11,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    rendererRef.current = renderer;
    mapRef.current = map;
    layerGroupRef.current = L.featureGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = layerGroupRef.current;
    const map = mapRef.current;
    const renderer = rendererRef.current;
    if (!group || !map || !renderer) return;

    group.clearLayers();

    for (const cell of heatmap.cells) {
      const zoneRect = L.rectangle(cell.bounds, {
        renderer,
        color: cell.level.strokeColor,
        weight: 2,
        fillColor: cell.level.fillColor,
        fillOpacity: cell.level.fillOpacity,
      }).addTo(group);

      const coreMarker = L.circleMarker([cell.center.lat, cell.center.lng], {
        renderer,
        radius: 10 + Math.round(cell.intensityRatio * 14),
        color: cell.level.strokeColor,
        weight: 2,
        fillColor: cell.level.fillColor,
        fillOpacity: Math.min(0.92, cell.level.fillOpacity + 0.14),
      }).addTo(group);

      const buildPopupNode = () => {
        const popup = L.DomUtil.create('div', 'heatmap-zone-popup');
        const heading = L.DomUtil.create('strong', '', popup);
        heading.textContent = cell.level.label;

        const countText = L.DomUtil.create('p', '', popup);
        countText.textContent = `${cell.count} ${
          cell.count === 1 ? 'reporte acumulado' : 'reportes acumulados'
        }${
          cell.historicalClosedCount > 0
            ? ` (${cell.historicalClosedCount} ya atendidos o resueltos)`
            : ''
        }`;

        const breakdownEntries = Object.entries(cell.byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, qty]) => `${cat}: ${qty}`)
          .join(' · ');
        const breakdownText = L.DomUtil.create('p', '', popup);
        breakdownText.textContent = breakdownEntries;

        const coordsText = L.DomUtil.create('p', '', popup);
        coordsText.textContent = `Referencia centro: ${cell.center.lat.toFixed(5)}, ${cell.center.lng.toFixed(5)}`;
        return popup;
      };

      zoneRect.bindPopup(buildPopupNode);
      coreMarker.bindPopup(buildPopupNode);
    }

    if (heatmap.cells.length > 0) {
      map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 15 });
    }
  }, [heatmap]);

  const criticalOrHighZones = heatmap.cells.filter(
    (cell) => cell.level.key === 'critical' || cell.level.key === 'high',
  ).length;

  return (
    <section className="heatmap-panel" aria-labelledby="heatmap-section-title">
      <h2 id="heatmap-section-title">Mapa de calor de reincidencia de incidentes</h2>

      <div className="heatmap-controls" role="region" aria-label="Filtros del mapa de calor">
        <label htmlFor="heatmap-category-filter">
          Filtrar puntos críticos por categoría
          <select
            id="heatmap-category-filter"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        {/* TODO: agregar controles y comparación entre periodos cuando se integre HU-30 */}
        {selectedCategory && (
          <button
            type="button"
            className="secondary"
            onClick={() => setSelectedCategory('')}
          >
            Mostrar todas las categorías
          </button>
        )}
      </div>

      {heatmap.mappedReportsCount === 0 ? (
        <div className="heatmap-empty-state" role="status">
          <p>
            {selectedCategory
              ? `No hay puntos georreferenciados registrados para la categoría «${selectedCategory}».`
              : 'Aún no hay reportes georreferenciados disponibles para resaltar zonas de concentración.'}
          </p>
          {heatmap.excludedInvalidCoordsCount > 0 && (
            <p>
              Se contabilizaron aparte {heatmap.excludedInvalidCoordsCount}{' '}
              {heatmap.excludedInvalidCoordsCount === 1
                ? 'reporte sin coordenadas válidas.'
                : 'reportes sin coordenadas válidas.'}
            </p>
          )}
        </div>
      ) : (
        <p className="heatmap-summary" role="status">
          Mostrando <strong>{heatmap.mappedReportsCount}</strong>{' '}
          {heatmap.mappedReportsCount === 1 ? 'reporte georreferenciado' : 'reportes georreferenciados'}{' '}
          agrupados en <strong>{heatmap.cells.length}</strong>{' '}
          {heatmap.cells.length === 1 ? 'zona de concentración' : 'zonas de concentración'}
          {selectedCategory ? ` para «${selectedCategory}»` : ''} (máximo por zona:{' '}
          <strong>{heatmap.maxCellCount}</strong>
          {criticalOrHighZones > 0
            ? `; zonas de concentración alta o crítica: ${criticalOrHighZones}`
            : ''}
          ).
          {heatmap.excludedInvalidCoordsCount > 0
            ? ` ${heatmap.excludedInvalidCoordsCount} ${
                heatmap.excludedInvalidCoordsCount === 1
                  ? 'reporte sin coordenadas válidas se excluyó del mapa.'
                  : 'reportes sin coordenadas válidas se excluyeron del mapa.'
              }`
            : ''}
        </p>
      )}

      <div
        ref={mapContainerRef}
        className="location-map heatmap-map"
        role="region"
        aria-label="Mapa de calor de zonas con concentración de reportes"
      />

      <div className="heatmap-legend" aria-label="Leyenda de niveles de concentración">
        <h3>Escala de concentración</h3>
        <ul className="heatmap-legend-list">
          {HEATMAP_INTENSITY_LEVELS.map((level) => (
            <li key={level.key} className="heatmap-legend-item">
              <span
                className="heatmap-legend-swatch"
                style={{
                  backgroundColor: level.fillColor,
                  borderColor: level.strokeColor,
                }}
                aria-hidden="true"
              />
              <span>{level.label}</span>
            </li>
          ))}
        </ul>
        <p className="heatmap-legend-note">
          Selecciona cualquier celda resaltada en el mapa para consultar la cantidad exacta de reportes acumulados y su desglose por categoría.
        </p>
      </div>
    </section>
  );
}
