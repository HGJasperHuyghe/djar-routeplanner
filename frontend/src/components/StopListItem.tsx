import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Stop } from '../types';
import { geocodeAddress } from '../lib/api';
import { ApiError } from '../types';
import { formatDistanceKm, formatDuration } from '../lib/format';

interface StopListItemProps {
  stop: Stop;
  visitOrder: number | null;
  isDepot: boolean;
  draggable: boolean;
  legDistanceMeters?: number;
  legDurationSeconds?: number;
  onRemove: (id: string) => void;
  onSetDepot: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Stop>) => void;
}

export function StopListItem({
  stop,
  visitOrder,
  isDepot,
  draggable,
  legDistanceMeters,
  legDurationSeconds,
  onRemove,
  onSetDepot,
  onUpdate,
}: StopListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !draggable,
  });
  const [fixing, setFixing] = useState(false);
  const [fixAddress, setFixAddress] = useState(stop.label);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixLoading, setFixLoading] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleFixSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fixAddress.trim()) return;
    setFixLoading(true);
    setFixError(null);
    try {
      const res = await geocodeAddress(fixAddress.trim());
      if (res.matches.length === 0) {
        setFixError('Still no match found. Try a different address.');
        return;
      }
      const top = res.matches[0];
      onUpdate(stop.id, { label: top.label, lat: top.lat, lon: top.lon, geocodeFailed: false });
      setFixing(false);
    } catch (err) {
      setFixError(err instanceof ApiError ? err.message : 'Failed to geocode this address.');
    } finally {
      setFixLoading(false);
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`djar-card flex flex-col gap-2 p-3 ${isDepot ? 'border border-deep-teal/30' : ''}`}
    >
      <div className="flex items-center gap-3">
        {draggable && (
          <button
            type="button"
            className="shrink-0 cursor-grab touch-none px-1 text-outline hover:text-on-surface active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        )}

        {visitOrder != null && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-deep-teal/10 text-label-sm font-heading text-deep-teal">
            {visitOrder}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md text-on-surface">{stop.label}</p>
          {stop.geocodeFailed && <span className="djar-chip-error mt-1 inline-block">Not geocoded</span>}
          {(legDistanceMeters != null || legDurationSeconds != null) && (
            <p className="text-label-sm text-on-surface-variant">
              {legDistanceMeters != null && formatDistanceKm(legDistanceMeters)}
              {legDistanceMeters != null && legDurationSeconds != null && ' · '}
              {legDurationSeconds != null && formatDuration(legDurationSeconds)} to next
            </p>
          )}
        </div>

        {isDepot && <span className="djar-chip-orange shrink-0">Depot</span>}

        <div className="flex shrink-0 items-center gap-1">
          {!isDepot && (
            <button
              type="button"
              onClick={() => onSetDepot(stop.id)}
              className="text-label-sm font-heading uppercase tracking-wide text-deep-teal hover:underline"
              title="Set as depot / fixed start"
            >
              Set depot
            </button>
          )}
          {stop.geocodeFailed && (
            <button
              type="button"
              onClick={() => setFixing((v) => !v)}
              className="text-label-sm font-heading uppercase tracking-wide text-secondary hover:underline"
            >
              Fix
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(stop.id)}
            className="text-label-sm font-heading uppercase tracking-wide text-error hover:underline"
          >
            Remove
          </button>
        </div>
      </div>

      {fixing && (
        <form onSubmit={handleFixSubmit} className="flex items-center gap-2 border-t border-outline-variant pt-2">
          <input
            type="text"
            className="djar-input"
            value={fixAddress}
            onChange={(e) => setFixAddress(e.target.value)}
            placeholder="Corrected address"
          />
          <button type="submit" className="djar-btn-primary shrink-0" disabled={fixLoading}>
            {fixLoading ? 'Checking…' : 'Retry'}
          </button>
        </form>
      )}
      {fixError && <p className="text-label-sm text-error">{fixError}</p>}
    </li>
  );
}
