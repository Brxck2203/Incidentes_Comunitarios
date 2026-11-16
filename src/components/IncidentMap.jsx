import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { isActiveReport } from '../services/reportEndorsements.js';

// Citizen-facing map; native popup buttons provide a direct path to confirming an existing report.
export default function IncidentMap({ reports, onSelect }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markerLayer = useRef(null);
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; }, [onSelect]);
  const mapSignature = JSON.stringify(reports.map((report) => [report.ticket, report.position?.lat, report.position?.lng, report.category, report.status]));
  useEffect(() => {
    const instance = L.map(container.current).setView([9.94, -84.08], 10);
    mapRef.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(instance);
    markerLayer.current = L.featureGroup().addTo(instance);
    return () => { instance.remove(); mapRef.current = null; markerLayer.current = null; };
  }, []);
  useEffect(() => {
    const group = markerLayer.current;
    if (!group) return;
    group.clearLayers();
    const active = reports.filter((report) => isActiveReport(report) && report.position
      && Number.isFinite(report.position.lat) && Number.isFinite(report.position.lng));
    for (const report of active) {
      const marker = L.marker([report.position.lat, report.position.lng], {
        title: `Reporte ${report.ticket}`,
        icon: L.divIcon({ className: 'incident-pin', html: '<span aria-hidden="true">●</span>', iconSize: [32, 32], iconAnchor: [16, 16] }),
      }).addTo(group);
      const popup = L.DomUtil.create('div', 'incident-popup');
      const text = L.DomUtil.create('p', '', popup);
      text.textContent = `${report.category || 'Sin clasificar'} · ${report.status}`;
      const code = L.DomUtil.create('p', '', popup);
      code.textContent = report.ticket;
      const button = L.DomUtil.create('button', '', popup);
      button.type = 'button';
      button.textContent = 'Confirmar incidente';
      button.addEventListener('click', () => { select.current?.(report.ticket); marker.closePopup(); });
      marker.bindPopup(popup);
    }
    if (group.getLayers().length) mapRef.current.fitBounds(group.getBounds().pad(0.1), { maxZoom: 15 });
  // Preserve open popups and map zoom when polling returns the same incidents.
  }, [mapSignature]);
  return <div ref={container} className="location-map" role="region" aria-label="Mapa de incidentes abiertos" />;
}
