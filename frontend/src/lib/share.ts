import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { SharedAppState } from '../types';

/** Encode full app state into a URL hash fragment string (without the leading '#'). */
export function encodeStateToHash(state: SharedAppState): string {
  const json = JSON.stringify(state);
  return compressToEncodedURIComponent(json);
}

/** Decode a URL hash fragment (with or without leading '#') back into app state, or null if invalid/absent. */
export function decodeStateFromHash(hash: string): SharedAppState | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    const json = decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const parsed = JSON.parse(json) as SharedAppState;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.stops)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Build a full shareable URL (current origin + path) carrying the state in the hash. */
export function buildShareUrl(state: SharedAppState): string {
  const hash = encodeStateToHash(state);
  const url = new URL(window.location.href);
  url.hash = hash;
  return url.toString();
}
