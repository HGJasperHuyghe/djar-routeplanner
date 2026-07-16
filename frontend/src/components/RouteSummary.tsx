import type { OptimizeResponse, Stop } from '../types';
import { formatDistanceKm, formatDuration } from '../lib/format';

interface RouteSummaryProps {
  route: OptimizeResponse | null;
  stops: Stop[];
}

export function RouteSummary({ route, stops }: RouteSummaryProps) {
  if (!route) {
    return (
      <div className="djar-card p-4 text-body-md text-on-surface-variant">
        Optimize the route to see total distance, time, and a per-leg breakdown.
      </div>
    );
  }

  const byId = new Map(stops.map((s) => [s.id, s]));

  return (
    <div className="djar-card p-4">
      <h3 className="text-headline-md mb-3">Route summary</h3>
      <div className="mb-4 flex gap-3">
        <div className="djar-chip">Distance: {formatDistanceKm(route.totalDistanceMeters)}</div>
        <div className="djar-chip">Time: {formatDuration(route.totalDurationSeconds)}</div>
        <div className="djar-chip">{route.order.length} stops</div>
      </div>

      <p className="djar-label mb-2">Per-leg breakdown</p>
      <ul className="flex flex-col gap-1">
        {route.legs.map((leg, i) => {
          const from = byId.get(leg.fromId);
          const to = byId.get(leg.toId);
          return (
            <li key={i} className="flex items-center justify-between gap-3 rounded px-2 py-1.5 odd:bg-surface-container-low">
              <span className="min-w-0 flex-1 truncate text-body-md">
                {from?.label ?? leg.fromId} → {to?.label ?? leg.toId}
              </span>
              <span className="shrink-0 text-label-sm text-on-surface-variant">
                {formatDistanceKm(leg.distanceMeters)} · {formatDuration(leg.durationSeconds)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
