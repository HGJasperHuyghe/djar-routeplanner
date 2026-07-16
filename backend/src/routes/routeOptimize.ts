import { Router } from "express";
import { AppError } from "../types/errors";
import { routeOptimizeRequestSchema } from "../validation";
import { optimize } from "../services/optimizer";
import { getDistanceMatrix, getRoute, LonLat } from "../services/osrmService";

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

    const { stops, startStopId, roundTrip, lockOrder } = parsed.data;

    if (stops.length < 2) {
      throw new AppError(
        400,
        "NOT_ENOUGH_STOPS",
        "At least 2 stops are required to plan a route"
      );
    }

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

      order = optimize(matrix.distances, startIndex, roundTrip);
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

    const legs = route.legs.map((leg, i) => ({
      fromId: legIds[i],
      toId: legIds[i + 1],
      distanceMeters: leg.distanceMeters,
      durationSeconds: leg.durationSeconds,
    }));

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
