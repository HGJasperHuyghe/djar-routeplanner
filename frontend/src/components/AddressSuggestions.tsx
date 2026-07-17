import type { GeocodeMatch } from '../types';

interface AddressSuggestionsProps {
  suggestions: GeocodeMatch[];
  loading: boolean;
  highlighted: number;
  onSelect: (match: GeocodeMatch) => void;
}

/** Dropdown suggestion list shared by any input that offers live address autocomplete. */
export function AddressSuggestions({ suggestions, loading, highlighted, onSelect }: AddressSuggestionsProps) {
  if (suggestions.length === 0 && !loading) return null;

  return (
    <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded border border-outline-variant bg-pure-white shadow-overlay">
      {loading && suggestions.length === 0 && (
        <li className="px-3 py-2 text-body-md text-on-surface-variant">Searching…</li>
      )}
      {suggestions.map((m, i) => (
        <li key={`${m.lat}-${m.lon}-${i}`}>
          <button
            type="button"
            className={`w-full truncate px-3 py-2 text-left text-body-md hover:bg-deep-teal/10 ${
              i === highlighted ? 'bg-deep-teal/10' : ''
            }`}
            // Prevent the input's blur (which would close this dropdown) from firing before the click registers.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(m)}
          >
            {m.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
