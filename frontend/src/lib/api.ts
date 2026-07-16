import { ApiError, type ApiErrorShape, type GeocodeResponse, type OptimizeRequest, type OptimizeResponse } from '../types';

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError('UNKNOWN', `Unexpected response from server (status ${res.status}).`);
  }

  if (!res.ok) {
    const shape = body as Partial<ApiErrorShape>;
    const code = shape?.error?.code ?? 'UNKNOWN';
    const message = shape?.error?.message ?? `Request failed with status ${res.status}.`;
    throw new ApiError(code, message);
  }

  return body as T;
}

/**
 * Resolve a free-text address into candidate coordinates.
 * POST /api/geocode -> { query, matches: [{ label, lat, lon }] }
 */
export async function geocodeAddress(address: string): Promise<GeocodeResponse> {
  let res: Response;
  try {
    res = await fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }
  return parseJsonOrThrow<GeocodeResponse>(res);
}

/**
 * Compute (or evaluate, if lockOrder) a visiting order for the given stops.
 * POST /api/route/optimize
 */
export async function optimizeRoute(request: OptimizeRequest): Promise<OptimizeResponse> {
  let res: Response;
  try {
    res = await fetch('/api/route/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }
  return parseJsonOrThrow<OptimizeResponse>(res);
}
