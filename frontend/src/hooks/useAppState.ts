import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { OptimizeResponse, SharedAppState, Stop } from '../types';
import { ApiError } from '../types';
import { optimizeRoute } from '../lib/api';
import { decodeStateFromHash, encodeStateToHash } from '../lib/share';

interface State {
  stops: Stop[];
  depotId: string | null;
  route: OptimizeResponse | null;
  roundTrip: boolean;
  startTime: string;
}

type Action =
  | { type: 'ADD_STOP'; stop: Stop }
  | { type: 'ADD_STOPS'; stops: Stop[] }
  | { type: 'REMOVE_STOP'; id: string }
  | { type: 'UPDATE_STOP'; id: string; patch: Partial<Stop> }
  | { type: 'SET_DEPOT'; id: string | null }
  | { type: 'REORDER_NON_DEPOT'; orderedIds: string[] }
  | { type: 'SET_ROUTE'; route: OptimizeResponse | null }
  | { type: 'SET_ROUND_TRIP'; roundTrip: boolean }
  | { type: 'SET_START_TIME'; startTime: string }
  | { type: 'HYDRATE'; state: State };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_STOP':
      return { ...state, stops: [...state.stops, action.stop], route: null };
    case 'ADD_STOPS':
      return { ...state, stops: [...state.stops, ...action.stops], route: null };
    case 'REMOVE_STOP': {
      const stops = state.stops.filter((s) => s.id !== action.id);
      const depotId = state.depotId === action.id ? null : state.depotId;
      return { ...state, stops, depotId, route: null };
    }
    case 'UPDATE_STOP':
      return {
        ...state,
        stops: state.stops.map((s) => (s.id === action.id ? { ...s, ...action.patch } : s)),
        route: null,
      };
    case 'SET_DEPOT':
      return { ...state, depotId: action.id, route: null };
    case 'REORDER_NON_DEPOT': {
      const depot = state.stops.find((s) => s.id === state.depotId);
      const byId = new Map(state.stops.map((s) => [s.id, s]));
      const reordered = action.orderedIds.map((id) => byId.get(id)).filter((s): s is Stop => Boolean(s));
      const stops = depot ? [depot, ...reordered] : reordered;
      return { ...state, stops };
    }
    case 'SET_ROUTE':
      return { ...state, route: action.route };
    case 'SET_ROUND_TRIP':
      return { ...state, roundTrip: action.roundTrip, route: null };
    case 'SET_START_TIME':
      return { ...state, startTime: action.startTime, route: null };
    case 'HYDRATE':
      return action.state;
    default:
      return state;
  }
}

const initialState: State = {
  stops: [],
  depotId: null,
  route: null,
  roundTrip: false,
  startTime: '08:00',
};

/**
 * DJAR's own address, pre-filled as the default depot for a fresh session so
 * the user doesn't have to type it every time. Coordinates are geocoded
 * ahead of time (not looked up on every load) — Nominatim doesn't have the
 * exact unit "15B" indexed, so this resolves to "15C" in the same
 * industrial park, a few dozen meters off; still labeled with the real
 * address, and like any stop it can be corrected via "Fix" or removed.
 */
const DEFAULT_DEPOT_STOP: Stop = {
  id: 'djar-depot-default',
  label: 'DJAR — Industriepark-Drongen 15B, 9031 Drongen, België',
  lat: 51.042834,
  lon: 3.5946704,
};

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);
  const hydratedFromUrl = useRef(false);

  // Hydrate from URL hash on first mount (shareable link); otherwise seed a
  // fresh session with DJAR's own address as the default depot.
  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;
    const shared = decodeStateFromHash(window.location.hash);
    if (shared) {
      dispatch({
        type: 'HYDRATE',
        state: {
          stops: shared.stops,
          depotId: shared.depotId,
          route: shared.route,
          roundTrip: false,
          startTime: shared.startTime ?? '08:00',
        },
      });
    } else {
      dispatch({
        type: 'HYDRATE',
        state: { ...initialState, stops: [DEFAULT_DEPOT_STOP], depotId: DEFAULT_DEPOT_STOP.id },
      });
    }
  }, []);

  // Keep the URL hash in sync with current state so the page is always "shareable" as-is.
  useEffect(() => {
    if (state.stops.length === 0) {
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
      return;
    }
    const shared: SharedAppState = {
      v: 1,
      stops: state.stops,
      depotId: state.depotId,
      route: state.route,
      startTime: state.startTime,
    };
    const hash = encodeStateToHash(shared);
    const newUrl = `${window.location.pathname}${window.location.search}#${hash}`;
    history.replaceState(null, '', newUrl);
  }, [state.stops, state.depotId, state.route, state.startTime]);

  const orderedNonDepotIds = state.stops.filter((s) => s.id !== state.depotId).map((s) => s.id);

  const runOptimize = useCallback(
    async (opts: { lockOrder: boolean }) => {
      if (state.stops.length < 2) {
        setOptimizeError('Add at least two stops before optimizing.');
        return;
      }
      setOptimizing(true);
      setOptimizeError(null);
      try {
        const stopsPayload = state.stops.map(({ id, label, lat, lon, deliveryTime }) => ({
          id,
          label,
          lat,
          lon,
          deliveryTime,
        }));
        const result = await optimizeRoute({
          stops: stopsPayload,
          startStopId: state.depotId ?? undefined,
          roundTrip: state.roundTrip,
          lockOrder: opts.lockOrder,
          startTime: state.startTime,
        });
        dispatch({ type: 'SET_ROUTE', route: result });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Something went wrong while optimizing the route.';
        setOptimizeError(message);
      } finally {
        setOptimizing(false);
      }
    },
    [state.stops, state.depotId, state.roundTrip, state.startTime],
  );

  const addStop = useCallback((stop: Stop) => dispatch({ type: 'ADD_STOP', stop }), []);
  const addStops = useCallback((stops: Stop[]) => dispatch({ type: 'ADD_STOPS', stops }), []);
  const removeStop = useCallback((id: string) => dispatch({ type: 'REMOVE_STOP', id }), []);
  const updateStop = useCallback((id: string, patch: Partial<Stop>) => dispatch({ type: 'UPDATE_STOP', id, patch }), []);
  const setDepot = useCallback((id: string | null) => dispatch({ type: 'SET_DEPOT', id }), []);
  const setRoundTrip = useCallback((roundTrip: boolean) => dispatch({ type: 'SET_ROUND_TRIP', roundTrip }), []);
  const setStartTime = useCallback((startTime: string) => dispatch({ type: 'SET_START_TIME', startTime }), []);

  const reorderNonDepot = useCallback(
    (orderedIds: string[]) => {
      dispatch({ type: 'REORDER_NON_DEPOT', orderedIds });
    },
    [],
  );

  /**
   * Apply a manual drag-reorder and immediately re-evaluate real distance/time/geometry
   * for that exact order via lockOrder: true (does not re-run the optimizer).
   * Computes the resulting stop array directly rather than reading it back from state,
   * since the reducer dispatch above hasn't flushed to `state` yet within this closure.
   */
  const reorderAndReoptimize = useCallback(
    async (orderedNonDepotIds: string[]) => {
      const depot = state.stops.find((s) => s.id === state.depotId);
      const byId = new Map(state.stops.map((s) => [s.id, s]));
      const reordered = orderedNonDepotIds.map((id) => byId.get(id)).filter((s): s is Stop => Boolean(s));
      const newStops = depot ? [depot, ...reordered] : reordered;

      dispatch({ type: 'REORDER_NON_DEPOT', orderedIds: orderedNonDepotIds });

      if (newStops.length < 2) return;

      setOptimizing(true);
      setOptimizeError(null);
      try {
        const stopsPayload = newStops.map(({ id, label, lat, lon, deliveryTime }) => ({
          id,
          label,
          lat,
          lon,
          deliveryTime,
        }));
        const result = await optimizeRoute({
          stops: stopsPayload,
          startStopId: state.depotId ?? undefined,
          roundTrip: state.roundTrip,
          lockOrder: true,
          startTime: state.startTime,
        });
        dispatch({ type: 'SET_ROUTE', route: result });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Something went wrong while evaluating the new order.';
        setOptimizeError(message);
      } finally {
        setOptimizing(false);
      }
    },
    [state.stops, state.depotId, state.roundTrip, state.startTime],
  );

  return {
    stops: state.stops,
    depotId: state.depotId,
    route: state.route,
    roundTrip: state.roundTrip,
    startTime: state.startTime,
    orderedNonDepotIds,
    optimizing,
    optimizeError,
    setOptimizeError,
    addStop,
    addStops,
    removeStop,
    updateStop,
    setDepot,
    setRoundTrip,
    setStartTime,
    reorderNonDepot,
    reorderAndReoptimize,
    runOptimize,
  };
}

export type AppState = ReturnType<typeof useAppState>;
