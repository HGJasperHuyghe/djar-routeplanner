# API Contract (frozen)

This contract is frozen for the duration of the parallel build. `backend-agent`
implements it exactly as written; `frontend-agent` builds against it without
needing the backend to run. Neither agent edits this file — if something needs
to change, note it in your final report instead of editing here.

Base path: `/api`. All bodies are JSON. All error responses use:

```json
{ "error": { "code": "STRING_CODE", "message": "human readable" } }
```

## GET /api/health
```json
Response 200: { "status": "ok" }
```

## POST /api/geocode
Resolves a free-text address into candidate coordinates via Nominatim.

Request:
```json
{ "address": "Kalverstraat 1, Amsterdam" }
```

Response 200:
```json
{
  "query": "Kalverstraat 1, Amsterdam",
  "matches": [
    { "label": "Kalverstraat 1, 1012 NX Amsterdam, Netherlands", "lat": 52.3731, "lon": 4.8926 }
  ]
}
```
- Up to 5 candidates in `matches`, best first. Empty array (not an error) if nothing found.
- `400 { error: { code: "INVALID_ADDRESS" } }` if `address` missing/empty.
- `502 { error: { code: "UPSTREAM_UNAVAILABLE" } }` if Nominatim is unreachable/times out.
- Server enforces its own throttle (>=1 req/sec to Nominatim) and sends a
  custom `User-Agent` — the frontend does not need to throttle its own calls
  to this endpoint, but should show a loading state per request since a batch
  CSV import will naturally take multiple seconds for many rows.

## POST /api/route/optimize
Given a set of stops, returns a visiting order that minimizes total travel
distance, using OSRM's distance/time matrix plus a nearest-neighbor + 2-opt
heuristic — or, if `lockOrder` is true, evaluates the stops in the exact order
given (used after a manual drag-reorder) instead of re-optimizing.

Request:
```json
{
  "stops": [
    { "id": "s1", "label": "Depot", "lat": 52.37, "lon": 4.89 },
    { "id": "s2", "label": "Stop A", "lat": 52.36, "lon": 4.90, "timeWindowStart": "09:00", "timeWindowEnd": "11:00" },
    { "id": "s3", "label": "Stop B", "lat": 52.35, "lon": 4.88 }
  ],
  "startStopId": "s1",
  "roundTrip": false,
  "lockOrder": false,
  "startTime": "08:00"
}
```
- `startStopId` optional, defaults to `stops[0].id`. Ignored when `lockOrder: true`
  (the given `stops` array order is used as-is).
- `roundTrip` optional, defaults to `false` — if `true`, the cost of returning
  to the start is included in optimization and in the totals/geometry.
- `lockOrder` optional, defaults to `false`.
- `timeWindowStart`/`timeWindowEnd` optional per stop, `"HH:mm"` 24h format —
  the hours during which that stop can be visited (e.g. a pickup window).
  When any stop has one, the optimizer (unless `lockOrder: true`) prefers
  tours that arrive within every stop's window over ones that are merely
  shorter, re-deriving the best order to fit the given hours.
- `startTime` optional, `"HH:mm"` 24h format — when the route departs. Used
  together with time windows to decide arrival feasibility, and to compute
  each leg's `arrivalTime` in the response.

Response 200:
```json
{
  "order": ["s1", "s3", "s2"],
  "legs": [
    { "fromId": "s1", "toId": "s3", "distanceMeters": 1820, "durationSeconds": 340, "arrivalTime": "08:06" },
    { "fromId": "s3", "toId": "s2", "distanceMeters": 950,  "durationSeconds": 180, "arrivalTime": "09:09" }
  ],
  "totalDistanceMeters": 2770,
  "totalDurationSeconds": 520,
  "geometry": {
    "type": "LineString",
    "coordinates": [[4.89, 52.37], [4.885, 52.365], [4.88, 52.35], [4.90, 52.36]]
  }
}
```
- `order` is the list of stop ids in visiting order (always includes every
  input stop id exactly once).
- `geometry` is the real road-following polyline from OSRM `/route` over the
  final order (not a straight-line join of the matrix result), in GeoJSON
  `LineString` form, `[lon, lat]` pairs.
- `legs[].arrivalTime` (`"HH:mm"`) is present only when the request included
  `startTime`. `legs[].lateSeconds` is present only when the leg's `toId` has
  a time window and the computed arrival falls after it closes.
- `400 { error: { code: "NOT_ENOUGH_STOPS" } }` if fewer than 2 stops.
- `502 { error: { code: "UPSTREAM_UNAVAILABLE" } }` if OSRM is unreachable/errors.
