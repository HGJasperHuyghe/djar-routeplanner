import { useEffect, useRef, useState } from 'react';
import { geocodeAddress } from '../lib/api';
import type { GeocodeMatch } from '../types';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 450;

/**
 * Debounced address suggestions for a live input, backed by the same
 * /api/geocode endpoint used on submit. Debounced (rather than firing per
 * keystroke) to keep request volume reasonable against the free geocoding
 * service. Stale responses (superseded by a newer query before they return)
 * are discarded.
 */
export function useAddressAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<GeocodeMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      requestIdRef.current++;
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await geocodeAddress(trimmed);
        if (requestIdRef.current === requestId) setSuggestions(res.matches);
      } catch {
        if (requestIdRef.current === requestId) setSuggestions([]);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function clear() {
    requestIdRef.current++; // invalidate any in-flight/pending request
    setSuggestions([]);
    setLoading(false);
  }

  return { suggestions, loading, clear };
}
