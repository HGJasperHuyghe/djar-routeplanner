# DJAR Routeplanner

Web app for delivery/route planning: enter stops (manually or via CSV), get the
shortest route between them, see it on a map with total distance/time, and
export it as PDF / Google Maps link / CSV. No login, no server-side storage —
everything lives in the browser, with an optional shareable link. 

--

I made this simple app working for djar (www.djar.fit)

## Stack
- `frontend/` — React + Vite + TypeScript, Tailwind (DJAR design tokens), Leaflet map
- `backend/` — Node + Express + TypeScript, geocoding (Nominatim) + routing/optimization (OSRM) proxy
- See `docs/API_CONTRACT.md` for the API shape and `docs/DESIGN.md` for the design tokens.

## Development

```
npm install --prefix backend
npm install --prefix frontend
npm run dev
```

This starts the backend on port 3001 and the frontend dev server (Vite) with
an API proxy to it.

## Production / Render

```
npm run build
```

Builds the frontend and backend; the backend serves the built frontend
(`frontend/dist`) alongside the `/api` routes on a single port
(`process.env.PORT`). See `render.yaml` for the Render deploy blueprint.
