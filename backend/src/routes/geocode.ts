import { Router } from "express";
import { AppError } from "../types/errors";
import { geocodeRequestSchema } from "../validation";
import { geocodeAddress } from "../services/geocodeService";

export const geocodeRouter = Router();

geocodeRouter.post("/geocode", async (req, res, next) => {
  try {
    const parsed = geocodeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        400,
        "INVALID_ADDRESS",
        "address is required and must be a non-empty string"
      );
    }

    const { address } = parsed.data;
    const matches = await geocodeAddress(address);

    res.status(200).json({
      query: address,
      matches,
    });
  } catch (err) {
    next(err);
  }
});
