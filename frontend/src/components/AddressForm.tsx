import { useState } from 'react';
import { geocodeAddress } from '../lib/api';
import { ApiError } from '../types';
import type { GeocodeMatch, Stop } from '../types';
import { generateId } from '../lib/format';
import { ErrorBanner } from './ErrorBanner';

interface AddressFormProps {
  onAdd: (stop: Stop) => void;
}

export function AddressForm({ onAdd }: AddressFormProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<GeocodeMatch[] | null>(null);
  const [query, setQuery] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setMatches(null);
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

  function addMatch(match: GeocodeMatch) {
    onAdd({ id: generateId(), label: match.label, lat: match.lat, lon: match.lon });
    setAddress('');
    setMatches(null);
    setQuery('');
  }

  return (
    <div className="djar-card p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="address-input" className="djar-label mb-1 block">
            Add a stop
          </label>
          <input
            id="address-input"
            type="text"
            className="djar-input"
            placeholder="e.g. Kalverstraat 1, Amsterdam"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
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
