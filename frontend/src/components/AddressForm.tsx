import { useState } from 'react';
import { geocodeAddress } from '../lib/api';
import { ApiError } from '../types';
import type { GeocodeMatch, Stop } from '../types';
import { generateId } from '../lib/format';
import { ErrorBanner } from './ErrorBanner';
import { AddressSuggestions } from './AddressSuggestions';
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete';

interface AddressFormProps {
  onAdd: (stop: Stop) => void;
}

export function AddressForm({ onAdd }: AddressFormProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<GeocodeMatch[] | null>(null);
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const { suggestions, loading: suggestLoading, clear: clearSuggestions } = useAddressAutocomplete(
    suggestionsOpen ? address : '',
  );

  function addMatch(match: GeocodeMatch) {
    onAdd({ id: generateId(), label: match.label, lat: match.lat, lon: match.lon });
    setAddress('');
    setMatches(null);
    setQuery('');
    setSuggestionsOpen(false);
    setHighlighted(-1);
    clearSuggestions();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    // If a suggestion is highlighted (arrow-keyed) when Enter is pressed, use it directly.
    if (suggestionsOpen && highlighted >= 0 && suggestions[highlighted]) {
      addMatch(suggestions[highlighted]);
      return;
    }

    setLoading(true);
    setError(null);
    setMatches(null);
    setSuggestionsOpen(false);
    try {
      const res = await geocodeAddress(address.trim());
      if (res.matches.length === 0) {
        setError(`No matches found for "${res.query}". Try a more specific address.`);
      } else if (res.matches.length === 1) {
        addMatch(res.matches[0]);
      } else {
        setMatches(res.matches);
        setQuery(res.query);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to geocode this address.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Escape') {
      setSuggestionsOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div className="djar-card p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label htmlFor="address-input" className="djar-label mb-1 block">
            Add a stop
          </label>
          <input
            id="address-input"
            type="text"
            className="djar-input"
            placeholder="e.g. Kalverstraat 1, Amsterdam"
            value={address}
            autoComplete="off"
            onChange={(e) => {
              setAddress(e.target.value);
              setSuggestionsOpen(true);
              setHighlighted(-1);
              setMatches(null);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
          />
          {suggestionsOpen && (
            <AddressSuggestions
              suggestions={suggestions}
              loading={suggestLoading}
              highlighted={highlighted}
              onSelect={addMatch}
            />
          )}
        </div>
        <button type="submit" className="djar-btn-primary" disabled={loading || !address.trim()}>
          {loading ? 'Geocoding…' : 'Add stop'}
        </button>
      </form>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {matches && matches.length > 1 && (
        <div className="mt-3 rounded border border-outline-variant bg-surface-container-low p-3">
          <p className="djar-label mb-2">Multiple matches for “{query}” — pick one</p>
          <ul className="flex flex-col gap-1">
            {matches.map((m, i) => (
              <li key={`${m.lat}-${m.lon}-${i}`}>
                <button
                  type="button"
                  onClick={() => addMatch(m)}
                  className="w-full rounded px-3 py-2 text-left text-body-md hover:bg-deep-teal/10"
                >
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
