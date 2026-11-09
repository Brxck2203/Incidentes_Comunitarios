import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LocationMap({ position, onChange, editable = false }) {
  const container = useRef(null);
  const marker = useRef(null);
  const map = useRef(null);
  const initial = useRef(position);
  const change = useRef(onChange);
  const [failed, setFailed] = useState(false);
  useEffect(() => { change.current = onChange; }, [onChange]);
  useEffect(() => {
    const point = [initial.current.lat, initial.current.lng];
    const instance = L.map(container.current).setView(point, 17);
    map.current = instance;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(instance);
    tiles.on('tileerror', () => setFailed(true));
    const pin = L.marker(point, {
      draggable: editable, title: 'Ubicación del incidente',
      icon: L.divIcon({ className: 'incident-pin', html: '<span aria-hidden="true">●</span>', iconSize: [32, 32], iconAnchor: [16, 16] }),
    }).addTo(instance);
    marker.current = pin;
    pin.on('dragend', () => {
      const next = pin.getLatLng();
      change.current?.({ lat: next.lat, lng: next.lng, accuracy: null, source: 'manual', measuredAt: new Date().toISOString() });
    });
    return () => { instance.remove(); map.current = null; marker.current = null; };
  }, [editable]);
  useEffect(() => {
    const point = [position.lat, position.lng];
    marker.current?.setLatLng(point);
    map.current?.panTo(point);
  }, [position.lat, position.lng]);
  return <>
    <div ref={container} className="location-map" role="region" aria-label="Mapa de ubicación del incidente" />
    {failed && <p role="alert">No se pudo cargar parte del mapa. Revisa tu conexión; las coordenadas siguen disponibles.</p>}
    {editable && <p>Arrastra el marcador para ajustar el punto del incidente.</p>}
  </>;
}
