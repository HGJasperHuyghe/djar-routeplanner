import { z } from "zod";

export const geocodeRequestSchema = z.object({
  address: z
    .string({
      required_error: "address is required",
      invalid_type_error: "address must be a string",
    })
    .trim()
    .min(1, "address must not be empty"),
});

export type GeocodeRequest = z.infer<typeof geocodeRequestSchema>;

const hhmmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be in HH:mm 24h format")
  .optional();

export const stopSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  lat: z.number(),
  lon: z.number(),
  deliveryTime: hhmmSchema,
});

export const routeOptimizeRequestSchema = z.object({
  stops: z.array(stopSchema),
  startStopId: z.string().min(1).optional(),
  roundTrip: z.boolean().optional().default(false),
  lockOrder: z.boolean().optional().default(false),
  startTime: hhmmSchema,
});

export type RouteOptimizeRequest = z.infer<typeof routeOptimizeRequestSchema>;
