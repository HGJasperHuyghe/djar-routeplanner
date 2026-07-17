// Shared frontend types, mirroring docs/API_CONTRACT.md exactly.

export interface Stop {
  /** Locally generated id (not sent as meaningful data, just used as a key/reference). */
  id: string;
  label: string;
  lat: number;
  lon: number;
  /** Client-side only: true if geocoding failed for this row (CSV import) and needs manual fixing. */
  geocodeFailed?: boolean;
  /** Optional pickup/delivery window at this stop, "HH:mm" 24h format. */
  timeWindowStart?: string;
  timeWindowEnd?: string;
}

export interface GeocodeMatch {
  label: string;
  lat: number;
  lon: number;
}

export interface GeocodeResponse {
  query: string;
  matches: GeocodeMatch[];
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  distanceMeters: number;
  durationSeconds: number;
  /** Estimated arrival at `toId`, "HH:mm", present only when a route start time was given. */
  arrivalTime?: string;
  /** Seconds arrival at `toId` falls after that stop's time window, if it has one and is missed. */
  lateSeconds?: number;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [lon, lat] pairs
}

export interface OptimizeResponse {
  order: string[];
  legs: RouteLeg[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  geometry: RouteGeometry;
}

export interface OptimizeRequest {
  stops: {
    id: string;
    label: string;
    lat: number;
    lon: number;
    timeWindowStart?: string;
    timeWindowEnd?: string;
  }[];
  startStopId?: string;
  roundTrip?: boolean;
  lockOrder?: boolean;
  /** Route departure time, "HH:mm" 24h format. Used to evaluate/optimize against stop time windows. */
  startTime?: string;
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
  };
}

/** Thrown by the api lib whenever a call fails, carrying the contract's error.message. */
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

/** Full serializable app state used for the shareable-link feature. */
export interface SharedAppState {
  v: 1;
  stops: Stop[];
  depotId: string | null;
  route: OptimizeResponse | null;
  /** Route departure time, "HH:mm". Optional so links shared before this field existed still decode. */
  startTime?: string;
}
