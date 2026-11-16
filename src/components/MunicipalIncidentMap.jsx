import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { categories } from '../services/reportRepository.js';
import { hasValidCoordinates, municipalStatusLabel } from '../services/municipalConsole.js';
import { severityLevels } from '../services/reportPriority.js';

const categoryAbbreviations = {
  'Baches': 'BA',
  'Basura clandestina': 'BC',
  'Ramas/arbolado': 'RA',
  'Aceras dañadas': 'AD',
};
const categoryClasses = {
  'Baches': 'potholes',
  'Basura clandestina': 'illegal-waste',
  'Ramas/arbolado': 'tree',
  'Aceras dañadas': 'sidewalk',
};

function severityNumber(severity) {
  const index = severityLevels.indexOf(severity);
  return index < 0 ? 0 : index + 1;
}

export default function MunicipalIncidentMap({ reports, trackingByTicket = {}, selectedTicket, onSelect }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markerLayer = useRef(null);
  const markerByTicket = useRef(new Map());
  const selectRef = useRef(onSelect);
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const hasInitialView = useRef(false);
  const mappedReports = useMemo(() => reports.filter((report) => hasValidCoordinates(report.position)), [reports]);
  const mapDataRef = useRef({ mappedReports, trackingByTicket, selectedTicket });
  useEffect(() => {
    mapDataRef.current = { mappedReports, trackingByTicket, selectedTicket };
  }, [mappedReports, trackingByTicket, selectedTicket]);
  const mapSignature = JSON.stringify(mappedReports.map((report) => [
    report.ticket, report.position.lat, report.position.lng, report.category,
    municipalStatusLabel(report, trackingByTicket),
    report.description, report.severity,
  ]));

  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    const map = L.map(container.current).setView([9.94, -84.08], 10);
    mapRef.current = map;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    markerLayer.current = L.featureGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      markerLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const group = markerLayer.current;
    if (!group) return;
    const mapData = mapDataRef.current;
    group.clearLayers();
    markerByTicket.current.clear();
    for (const report of mapData.mappedReports) {
      const categoryKey = categoryClasses[report.category] || 'other';
      const categoryLabel = report.category || 'Sin clasificar';
      const severity = report.severity || 'Sin severidad';
      const effectiveStatus = municipalStatusLabel(report, mapData.trackingByTicket);
      const marker = L.marker([report.position.lat, report.position.lng], {
        title: `Reporte ${report.ticket}, ${categoryLabel}, ${severity}, ${effectiveStatus}`,
        alt: `Reporte ${report.ticket}: ${categoryLabel}, severidad ${severity}`,
        icon: L.divIcon({
          className: `municipal-pin municipal-pin-${categoryKey} municipal-pin-severity-${severityNumber(report.severity)}`,
          html: `<span><b>${categoryAbbreviations[report.category] || '?'}</b><small>${severityNumber(report.severity)}</small></span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
      }).addTo(group);
      markerByTicket.current.set(report.ticket, marker);
      marker.on('click', () => selectRef.current?.(report.ticket));

      const popup = L.DomUtil.create('div', 'municipal-incident-popup');
      const heading = L.DomUtil.create('strong', '', popup);
      heading.textContent = `${categoryLabel} · ${severity}`;
      const ticket = L.DomUtil.create('p', '', popup);
      ticket.textContent = report.ticket;
      const state = L.DomUtil.create('p', '', popup);
      state.textContent = effectiveStatus || 'Estado no disponible';
      const summary = L.DomUtil.create('p', '', popup);
      summary.textContent = report.description || 'Sin descripción adicional.';
      const openButton = L.DomUtil.create('button', '', popup);
      openButton.type = 'button';
      openButton.textContent = 'Abrir expediente';
      openButton.addEventListener('click', () => {
        navigateRef.current(`/recepcion/${encodeURIComponent(report.ticket)}`);
      });
      marker.bindPopup(popup);
    }
    if (!hasInitialView.current && group.getLayers().length) {
      mapRef.current.fitBounds(group.getBounds().pad(0.1), { maxZoom: 15 });
      hasInitialView.current = true;
    }
  }, [mapSignature]);
  useEffect(() => {
    markerByTicket.current.forEach((marker, ticket) => {
      marker.getElement()?.classList.toggle('municipal-pin-selected', ticket === selectedTicket);
    });
  }, [mapSignature, selectedTicket]);

  return <div className="municipal-map-section">
    <div ref={container} className="location-map municipal-map" role="region" aria-label="Mapa municipal de reportes filtrados" />
    <div className="municipal-map-summary" role="status">
      {mappedReports.length} {mappedReports.length === 1 ? 'reporte con ubicación visible' : 'reportes con ubicación visible'} en el mapa.
      {mappedReports.length < reports.length
        ? ` ${reports.length - mappedReports.length} ${reports.length - mappedReports.length === 1 ? 'reporte permanece' : 'reportes permanecen'} en la lista sin ubicación válida.`
        : ''}
    </div>
    <div className="municipal-map-legend" aria-label="Leyenda del mapa">
      <h3>Leyenda</h3>
      <p>Las letras identifican la categoría; el número indica severidad: 0 sin clasificar, 1 leve, 2 moderada, 3 grave, 4 crítica.</p>
      <ul>{categories.map((category) => <li key={category}>
        <span className={`municipal-legend-pin municipal-pin-${categoryClasses[category]}`} aria-hidden="true">
          {categoryAbbreviations[category]}
        </span>
        {category}
      </li>)}
        <li><span className="municipal-legend-pin municipal-pin-other" aria-hidden="true">?</span>Sin clasificar</li>
      </ul>
      <p>El estado vigente se muestra al abrir el marcador.</p>
    </div>
  </div>;
}
