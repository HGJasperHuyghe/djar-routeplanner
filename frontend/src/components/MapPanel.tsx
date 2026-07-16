import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { OptimizeResponse, Stop } from '../types';
import type { RefObject } from 'react';

function numberedIcon(n: number, isDepot: boolean, failed: boolean) {
  const bg = failed ? '#ba1a1a' : isDepot ? '#E6855B' : '#004244';
  return L.divIcon({
    className: 'djar-marker',
    html: `<div style="
      background:${bg};
      color:#fff;
      width:28px;height:28px;border-radius:9999px;
      display:flex;align-items:center;justify-content:center;
      font-family:Montserrat, sans-serif; font-weight:700; font-size:12px;
      box-shadow:0 2px 6px rgba(0,0,0,0.25);
      border:2px solid #fff;
    ">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
  }, [points, map]);
  return null;
}

interface MapPanelProps {
  stops: Stop[];
  route: OptimizeResponse | null;
  depotId?: string | null;
  mapContainerRef?: RefObject<HTMLDivElement>;
}

export function MapPanel({ stops, route, depotId, mapContainerRef }: MapPanelProps) {
  const validStops = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));

  const visitOrder = new Map<string, number>();
  if (route) route.order.forEach((id, idx) => visitOrder.set(id, idx + 1));

  const points: [number, number][] = validStops.map((s) => [s.lat, s.lon]);

  const polyline: [number, number][] = useMemo(() => {
    if (!route?.geometry) return [];
    return route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  }, [route]);

  const internalRef = useRef<HTMLDivElement>(null!);
  const containerRef = mapContainerRef ?? internalRef;

  return (
    <div ref={containerRef} className="djar-card overflow-hidden" style={{ height: '480px' }}>
      <MapContainer center={[52.37, 4.9]} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validStops.map((stop, i) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lon]}
            icon={numberedIcon(visitOrder.get(stop.id) ?? i + 1, stop.id === depotId, Boolean(stop.geocodeFailed))}
          />
        ))}
        {polyline.length > 1 && <Polyline positions={polyline} pathOptions={{ color: '#005B5E', weight: 4, opacity: 0.85 }} />}
        <FitBounds points={polyline.length > 1 ? polyline : points} />
      </MapContainer>
    </div>
  );
}
