import { Router } from "express";
import { AppError } from "../types/errors";
import { routeOptimizeRequestSchema } from "../validation";
import { optimize, TimeWindow } from "../services/optimizer";
import { getDistanceMatrix, getRoute, LonLat } from "../services/osrmService";
import { parseHHMM, formatHHMM } from "../utils/time";

export const routeOptimizeRouter = Router();

routeOptimizeRouter.post("/route/optimize", async (req, res, next) => {
  try {
    const parsed = routeOptimizeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        parsed.error.errors.map((e) => e.message).join("; ")
      );
    }

    const { stops, startStopId, roundTrip, lockOrder, startTime } = parsed.data;

    if (stops.length < 2) {
      throw new AppError(
        400,
        "NOT_ENOUGH_STOPS",
        "At least 2 stops are required to plan a route"
      );
    }

    const windowByStopId = new Map<string, TimeWindow | null>(
      stops.map((s) => {
        if (!s.timeWindowStart && !s.timeWindowEnd) return [s.id, null];
        return [
          s.id,
          {
            earliestSeconds: parseHHMM(s.timeWindowStart) ?? 0,
            latestSeconds: parseHHMM(s.timeWindowEnd) ?? 24 * 3600,
          },
        ];
      })
    );
    const startTimeSeconds = parseHHMM(startTime) ?? 0;

    // `order` holds the visiting sequence as indices into `stops`.
    let order: number[];

    if (lockOrder) {
      // Evaluate the stops in the exact order given; startStopId is ignored.
      order = stops.map((_, i) => i);
    } else {
      const startIndex = startStopId
        ? stops.findIndex((s) => s.id === startStopId)
        : 0;

      if (startIndex === -1) {
        throw new AppError(
          400,
          "INVALID_START_STOP",
          `startStopId "${startStopId}" does not match any provided stop`
        );
      }

      const coords: LonLat[] = stops.map((s) => ({ lon: s.lon, lat: s.lat }));
      const matrix = await getDistanceMatrix(coords);

      order = optimize(matrix.distances, startIndex, roundTrip, {
        durations: matrix.durations,
        windows: stops.map((s) => windowByStopId.get(s.id) ?? null),
        startTimeSeconds,
      });
    }

    const orderedCoords: LonLat[] = order.map((i) => ({
      lon: stops[i].lon,
      lat: stops[i].lat,
    }));

    if (roundTrip) {
      // Append the start coordinate again so OSRM's /route response includes
      // the return leg's geometry, per-leg distance/duration, and totals.
      orderedCoords.push(orderedCoords[0]);
    }

    const route = await getRoute(orderedCoords);

    const orderIds = order.map((i) => stops[i].id);
    const legIds = roundTrip ? [...orderIds, orderIds[0]] : orderIds;

    // Only surface clock times when the client actually gave a departure
    // time — otherwise an absolute "00:45"-style ETA anchored to midnight
    // would be meaningless.
    const showEta = parseHHMM(startTime) !== undefined;
    let clock = startTimeSeconds;
    const startWindow = windowByStopId.get(legIds[0]);
    if (startWindow && clock < startWindow.earliestSeconds) clock = startWindow.earliestSeconds;

    const legs = route.legs.map((leg, i) => {
      clock += leg.durationSeconds;
      const window = windowByStopId.get(legIds[i + 1]);
      let lateSeconds: number | undefined;
      if (window) {
        if (clock < window.earliestSeconds) clock = window.earliestSeconds;
        if (clock > window.latestSeconds) lateSeconds = clock - window.latestSeconds;
      }
      return {
        fromId: legIds[i],
        toId: legIds[i + 1],
        distanceMeters: leg.distanceMeters,
        durationSeconds: leg.durationSeconds,
        ...(showEta ? { arrivalTime: formatHHMM(clock) } : {}),
        ...(lateSeconds != null ? { lateSeconds } : {}),
      };
    });

    res.status(200).json({
      order: orderIds,
      legs,
      totalDistanceMeters: route.totalDistanceMeters,
      totalDurationSeconds: route.totalDurationSeconds,
      geometry: route.geometry,
    });
  } catch (err) {
    next(err);
  }
});
