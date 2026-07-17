import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GeocodeMatch, Stop } from '../types';
import { geocodeAddress } from '../lib/api';
import { ApiError } from '../types';
import { formatDistanceKm, formatDuration } from '../lib/format';
import { AddressSuggestions } from './AddressSuggestions';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';

interface StopListItemProps {
  stop: Stop;
  visitOrder: number | null;
  isDepot: boolean;
  draggable: boolean;
  legDistanceMeters?: number;
  legDurationSeconds?: number;
  arrivalTime?: string;
  lateSeconds?: number;
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
  arrivalTime,
  lateSeconds,
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
  const [fixSuggestionsOpen, setFixSuggestionsOpen] = useState(false);
  const [fixHighlighted, setFixHighlighted] = useState(-1);

  const { suggestions: fixSuggestions, loading: fixSuggestLoading, clear: clearFixSuggestions } =
    useAddressAutocomplete(fixSuggestionsOpen ? fixAddress : '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function applyFix(match: GeocodeMatch) {
    onUpdate(stop.id, { label: match.label, lat: match.lat, lon: match.lon, geocodeFailed: false });
    setFixing(false);
    setFixSuggestionsOpen(false);
    setFixHighlighted(-1);
    clearFixSuggestions();
  }

  async function handleFixSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fixAddress.trim()) return;

    if (fixSuggestionsOpen && fixHighlighted >= 0 && fixSuggestions[fixHighlighted]) {
      applyFix(fixSuggestions[fixHighlighted]);
      return;
    }

    setFixLoading(true);
    setFixError(null);
    setFixSuggestionsOpen(false);
    try {
      const res = await geocodeAddress(fixAddress.trim());
      if (res.matches.length === 0) {
        setFixError('Still no match found. Try a different address.');
        return;
      }
      applyFix(res.matches[0]);
    } catch (err) {
      setFixError(err instanceof ApiError ? err.message : 'Failed to geocode this address.');
    } finally {
      setFixLoading(false);
    }
  }

  function handleFixKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!fixSuggestionsOpen || fixSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFixHighlighted((h) => (h + 1) % fixSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFixHighlighted((h) => (h <= 0 ? fixSuggestions.length - 1 : h - 1));
    } else if (e.key === 'Escape') {
      setFixSuggestionsOpen(false);
      setFixHighlighted(-1);
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
          {arrivalTime && (
            <p className={`text-label-sm ${lateSeconds ? 'text-error' : 'text-on-surface-variant'}`}>
              Arrives {arrivalTime}
              {lateSeconds ? ` (${Math.round(lateSeconds / 60)} min after delivery time)` : ''}
            </p>
          )}
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

      <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant pt-2">
        <label className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span className="djar-label">Deliver by</span>
          <input
            type="time"
            className="djar-input w-auto py-1"
            value={stop.deliveryTime ?? ''}
            onChange={(e) => onUpdate(stop.id, { deliveryTime: e.target.value || undefined })}
          />
        </label>
        {stop.deliveryTime && (
          <button
            type="button"
            onClick={() => onUpdate(stop.id, { deliveryTime: undefined })}
            className="text-label-sm font-heading uppercase tracking-wide text-error hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {fixing && (
        <form onSubmit={handleFixSubmit} className="flex items-center gap-2 border-t border-outline-variant pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              className="djar-input"
              value={fixAddress}
              autoComplete="off"
              onChange={(e) => {
                setFixAddress(e.target.value);
                setFixSuggestionsOpen(true);
                setFixHighlighted(-1);
              }}
              onKeyDown={handleFixKeyDown}
              onFocus={() => setFixSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setFixSuggestionsOpen(false), 150)}
              placeholder="Corrected address"
            />
            {fixSuggestionsOpen && (
              <AddressSuggestions
                suggestions={fixSuggestions}
                loading={fixSuggestLoading}
                highlighted={fixHighlighted}
                onSelect={applyFix}
              />
            )}
          </div>
          <button type="submit" className="djar-btn-primary shrink-0" disabled={fixLoading}>
            {fixLoading ? 'Checking…' : 'Retry'}
          </button>
        </form>
      )}
      {fixError && <p className="text-label-sm text-error">{fixError}</p>}
    </li>
  );
}
