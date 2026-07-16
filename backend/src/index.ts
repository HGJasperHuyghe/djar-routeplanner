import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import { healthRouter } from "./routes/health";
import { geocodeRouter } from "./routes/geocode";
import { routeOptimizeRouter } from "./routes/routeOptimize";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Permissive CORS: this is a dev-time proxy setup so the frontend's Vite dev
// server (a different port) can call this API. In production, everything is
// served from a single origin so CORS restrictions don't matter much either
// way.
app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", geocodeRouter);
app.use("/api", routeOptimizeRouter);

// --- Production static serving --------------------------------------------
// If a built frontend exists at ../frontend/dist, serve it and fall back to
// its index.html for any non-/api GET route (SPA client-side routing).
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const frontendIndexHtml = path.join(frontendDistPath, "index.html");

if (fs.existsSync(frontendIndexHtml)) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(frontendIndexHtml);
  });
}

// 404 handler for unmatched /api routes (and non-API routes when no built
// frontend is present, e.g. in local dev where the frontend runs separately
// via Vite).
app.use(notFoundHandler);

// Centralized error handler — must be registered last.
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`djar-routeplanner backend listening on 0.0.0.0:${PORT}`);
});

export default app;
