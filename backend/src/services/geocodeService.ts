import { AppError } from "../types/errors";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "djar-routeplanner/0.1 (contact: none - dev project)";

// Nominatim's usage policy requires at most 1 request/second per client.
const MIN_REQUEST_INTERVAL_MS = 1100;

export interface GeocodeMatch {
  label: string;
  lat: number;
  lon: number;
}

// --- Simple in-memory cache, keyed by normalized address string ---------

const cache = new Map<string, GeocodeMatch[]>();

function normalize(address: string): string {
  return address.trim().toLowerCase();
}

// --- Simple in-memory outbound request queue/throttle --------------------
// Ensures we never fire more than ~1 request/second at Nominatim, regardless
// of how many concurrent /api/geocode calls come in.

let queueTail: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

function throttledSlot<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const now = Date.now();
    const wait = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - now);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();
    return fn();
  });

  // Advance the queue tail regardless of success/failure so one failed
  // request doesn't stall the whole queue; swallow errors here since the
  // real result/error is returned via `run` to the caller.
  queueTail = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

/**
 * Resolves a free-text address into up to 5 candidate matches via Nominatim,
 * best first. Results are cached in-memory by normalized address so repeated
 * lookups don't re-hit the upstream service. Outbound requests are throttled
 * to at most ~1/sec to comply with Nominatim's usage policy.
 */
export async function geocodeAddress(address: string): Promise<GeocodeMatch[]> {
  const key = normalize(address);

  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const matches = await throttledSlot(() => fetchFromNominatim(address));

  cache.set(key, matches);
  return matches;
}

async function fetchFromNominatim(address: string): Promise<GeocodeMatch[]> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      `Failed to reach Nominatim: ${(err as Error).message}`
    );
  }

  if (!response.ok) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      `Nominatim responded with status ${response.status}`
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Nominatim returned an unparsable response"
    );
  }

  if (!Array.isArray(body)) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Nominatim returned an unexpected response shape"
    );
  }

  return body.slice(0, 5).map((item: any) => ({
    label: String(item.display_name),
    lat: Number(item.lat),
    lon: Number(item.lon),
  }));
}
