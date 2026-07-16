import { AppError } from "../types/errors";

const OSRM_BASE_URL = "https://router.project-osrm.org";

export interface LonLat {
  lon: number;
  lat: number;
}

export interface DistanceMatrix {
  distances: number[][];
  durations: number[][];
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResult {
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

function formatCoordinates(coords: LonLat[]): string {
  return coords.map((c) => `${c.lon},${c.lat}`).join(";");
}

async function fetchJson(url: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      `Failed to reach OSRM: ${(err as Error).message}`
    );
  }

  if (!response.ok) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      `OSRM responded with status ${response.status}`
    );
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "OSRM returned an unparsable response"
    );
  }

  if (body?.code && body.code !== "Ok") {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      `OSRM error: ${body.code}${body.message ? ` - ${body.message}` : ""}`
    );
  }

  return body;
}

/**
 * Fetches a distance + duration matrix for the given stops (in the order
 * provided) from OSRM's /table service. matrix[i][j] is the driving
 * distance/duration from stop i to stop j.
 */
export async function getDistanceMatrix(
  coords: LonLat[]
): Promise<DistanceMatrix> {
  const coordString = formatCoordinates(coords);
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coordString}?annotations=distance,duration`;

  const body = await fetchJson(url);

  if (!Array.isArray(body.distances) || !Array.isArray(body.durations)) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "OSRM /table response missing distances/durations"
    );
  }

  return {
    distances: body.distances,
    durations: body.durations,
  };
}

/**
 * Fetches the real road-following route (geometry + per-leg + total
 * distance/duration) from OSRM's /route service, for stops given in final
 * visiting order.
 */
export async function getRoute(coords: LonLat[]): Promise<RouteResult> {
  const coordString = formatCoordinates(coords);
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  const body = await fetchJson(url);

  const route = body?.routes?.[0];
  if (!route) {
    throw new AppError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "OSRM /route response missing routes"
    );
  }

  const legs: RouteLeg[] = (route.legs ?? []).map((leg: any) => ({
    distanceMeters: leg.distance,
    durationSeconds: leg.duration,
  }));

  return {
    geometry: {
      type: "LineString",
      coordinates: route.geometry.coordinates,
    },
    legs,
    totalDistanceMeters: route.distance,
    totalDurationSeconds: route.duration,
  };
}
