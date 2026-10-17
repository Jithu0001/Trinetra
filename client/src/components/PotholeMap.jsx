import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapsLink } from '../lib/adminApi';

const COLORS = { HIGH: '#ef4444', MEDIUM: '#f97316', LOW: '#22c55e' };

export default function PotholeMap({ items, className = '' }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current).setView([20.59, 78.96], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    // the container may still be settling into its flex layout
    const t = setTimeout(() => map.current && map.current.invalidateSize(), 200);
    const onResize = () => map.current && map.current.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); map.current.remove(); };
  }, []);

  useEffect(() => {
    layer.current.clearLayers();
    const pts = [];
    items.forEach((p) => {
      const [lng, lat] = p.location.coordinates;
      pts.push([lat, lng]);
      const color = COLORS[p.severity];
      const html = `<div class="pm-pop"><b style="color:${color}">${p.severity}</b> <span>score ${p.score}</span>
        <div>Reports: ${p.reports}</div>
        <img src="${p.imageUrl}" alt="pothole" />
        <a href="${mapsLink(lat, lng)}" target="_blank" rel="noreferrer">Navigate in Google Maps</a></div>`;
      if (p.severity === 'HIGH') L.circleMarker([lat, lng], { radius: 17, stroke: false, fillColor: color, fillOpacity: 0.22, interactive: false }).addTo(layer.current);
      L.circleMarker([lat, lng], { radius: 9, color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 0.95 })
        .bindPopup(html).addTo(layer.current);
    });
    if (pts.length) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [items]);

  return <div ref={el} className={`admin-map ${className}`} />;
}
