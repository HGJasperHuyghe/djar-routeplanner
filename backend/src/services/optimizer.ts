/**
 * Pure, IO-free route optimizer.
 *
 * Given a square distance/cost matrix and a starting index, produces a
 * visiting order (a permutation of the row/column indices) that attempts to
 * minimize total travel cost. No network or filesystem access — this module
 * can be unit tested in complete isolation.
 *
 * Algorithm:
 *   1. Nearest-neighbor construction starting from `startIndex`.
 *   2. 2-opt local search improvement over the resulting tour.
 *
 * If `roundTrip` is true, the cost of returning from the last stop back to
 * `startIndex` is included when comparing tour costs (both during 2-opt and
 * for any external cost evaluation), so the optimizer will tend to produce
 * tours that are cheaper to close into a loop.
 *
 * Optionally, per-stop time windows can be supplied (see `TimeWindowOptions`).
 * When present, both the initial construction and the 2-opt improvement
 * score tours by travel cost plus a heavy penalty for arriving after a
 * stop's window closes, so the optimizer prefers tours that respect the
 * given hours over ones that are merely shorter.
 */

export interface TimeWindow {
  /** Seconds since midnight before which arrival just means waiting. */
  earliestSeconds: number;
  /** Seconds since midnight after which arrival counts as late. */
  latestSeconds: number;
}

export interface TimeWindowOptions {
  /** durations[i][j] = travel time in seconds from node i to node j. */
  durations: number[][];
  /** One entry per node; null means "no time constraint at this stop". */
  windows: (TimeWindow | null)[];
  /** Seconds since midnight the route departs. Default 0 (midnight). */
  startTimeSeconds?: number;
}

/** Big enough that any feasible tour beats any tour with avoidable lateness. */
const LATENESS_PENALTY_PER_SECOND = 50;

/**
 * Builds an initial tour using the nearest-neighbor heuristic.
 */
function nearestNeighborTour(
  matrix: number[][],
  startIndex: number
): number[] {
  const n = matrix.length;
  const visited = new Array<boolean>(n).fill(false);
  const tour: number[] = [startIndex];
  visited[startIndex] = true;

  let current = startIndex;
  for (let step = 1; step < n; step++) {
    let best = -1;
    let bestCost = Infinity;
    for (let candidate = 0; candidate < n; candidate++) {
      if (visited[candidate]) continue;
      const cost = matrix[current][candidate];
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
    }
    // best should always be found since n - step candidates remain
    visited[best] = true;
    tour.push(best);
    current = best;
  }

  return tour;
}

/**
 * Nearest-neighbor construction that accounts for time windows: at each step,
 * the next stop is chosen by travel cost plus a lateness penalty computed
 * from the running clock, rather than by travel cost alone.
 */
function nearestNeighborTourTimeAware(
  matrix: number[][],
  durations: number[][],
  startIndex: number,
  windows: (TimeWindow | null)[],
  startTimeSeconds: number
): number[] {
  const n = matrix.length;
  const visited = new Array<boolean>(n).fill(false);
  const tour: number[] = [startIndex];
  visited[startIndex] = true;

  let current = startIndex;
  let time = startTimeSeconds;
  const startWindow = windows[startIndex];
  if (startWindow && time < startWindow.earliestSeconds) time = startWindow.earliestSeconds;

  for (let step = 1; step < n; step++) {
    let best = -1;
    let bestScore = Infinity;
    let bestArrival = 0;

    for (let candidate = 0; candidate < n; candidate++) {
      if (visited[candidate]) continue;
      let arrival = time + durations[current][candidate];
      const window = windows[candidate];
      let lateness = 0;
      if (window) {
        if (arrival < window.earliestSeconds) arrival = window.earliestSeconds;
        if (arrival > window.latestSeconds) lateness = arrival - window.latestSeconds;
      }
      const score = matrix[current][candidate] + lateness * LATENESS_PENALTY_PER_SECOND;
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
        bestArrival = arrival;
      }
    }

    visited[best] = true;
    tour.push(best);
    current = best;
    time = bestArrival;
  }

  return tour;
}

/**
 * Total cost of traversing `tour` in order, optionally including the cost of
 * returning to the first node (round trip).
 */
function tourCost(
  matrix: number[][],
  tour: number[],
  roundTrip: boolean
): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    total += matrix[tour[i]][tour[i + 1]];
  }
  if (roundTrip && tour.length > 1) {
    total += matrix[tour[tour.length - 1]][tour[0]];
  }
  return total;
}

/**
 * Total lateness (seconds arrival falls after a stop's window, summed over
 * every stop that has one) of traversing `tour` starting at `startTimeSeconds`.
 */
function tourLateness(
  durations: number[][],
  tour: number[],
  windows: (TimeWindow | null)[],
  startTimeSeconds: number
): number {
  let time = startTimeSeconds;
  let lateness = 0;
  const startWindow = windows[tour[0]];
  if (startWindow && time < startWindow.earliestSeconds) time = startWindow.earliestSeconds;

  for (let i = 1; i < tour.length; i++) {
    time += durations[tour[i - 1]][tour[i]];
    const window = windows[tour[i]];
    if (window) {
      if (time < window.earliestSeconds) time = window.earliestSeconds;
      if (time > window.latestSeconds) lateness += time - window.latestSeconds;
    }
  }
  return lateness;
}

/**
 * 2-opt local search: repeatedly try reversing segments [i, j] of the tour
 * and keep the reversal if it reduces total cost (as computed by `costFn`).
 * Stops when a full pass yields no improvement, or when `maxIterations` full
 * passes have been made (safety cap for pathological inputs).
 *
 * The tour's first element (the start) is kept fixed in place so the tour
 * still begins at `startIndex`; reversals only occur within indices [1, n-1].
 */
function twoOptImprove(
  costFn: (tour: number[]) => number,
  initialTour: number[],
  maxIterations = 200
): number[] {
  const n = initialTour.length;
  let tour = initialTour.slice();
  if (n < 3) {
    // With a fixed start and at most one other node, there's only one
    // possible tour — nothing to reorder. With exactly 3 nodes (start + 2)
    // there IS a real choice (swap the two non-start stops), which matters
    // once a cost function can prefer one order over the other for reasons
    // other than raw distance (e.g. a deadline the greedy construction's
    // one-step-ahead scoring can miss) — so that case must still run below.
    return tour;
  }

  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const newTour = tour.slice(0, i).concat(
          tour.slice(i, j + 1).reverse(),
          tour.slice(j + 1)
        );

        const currentCost = costFn(tour);
        const newCost = costFn(newTour);

        if (newCost < currentCost - 1e-9) {
          tour = newTour;
          improved = true;
        }
      }
    }
  }

  return tour;
}

/**
 * Computes a visiting order over the nodes [0, matrix.length) that
 * approximately minimizes total travel cost, starting from `startIndex`.
 *
 * @param matrix square cost matrix, matrix[i][j] = cost from node i to node j
 * @param startIndex index of the node the tour must start from
 * @param roundTrip if true, the cost of returning to startIndex is factored
 *                  into the optimization (the tour is optimized as a loop)
 * @param timeWindowOptions if any stop has a time window, the optimizer
 *                  prioritizes arriving within stops' windows over raw
 *                  distance (see module docs)
 * @returns array of indices into `matrix`, a permutation of
 *          [0, matrix.length), starting with `startIndex`
 */
export function optimize(
  matrix: number[][],
  startIndex: number,
  roundTrip: boolean,
  timeWindowOptions?: TimeWindowOptions
): number[] {
  const n = matrix.length;

  if (n === 0) return [];
  if (n === 1) return [0];

  if (startIndex < 0 || startIndex >= n) {
    throw new RangeError(
      `startIndex ${startIndex} out of bounds for matrix of size ${n}`
    );
  }

  const hasWindows = Boolean(timeWindowOptions?.windows.some((w) => w !== null));

  if (hasWindows && timeWindowOptions) {
    const { durations, windows } = timeWindowOptions;
    const startTimeSeconds = timeWindowOptions.startTimeSeconds ?? 0;

    const initialTour = nearestNeighborTourTimeAware(
      matrix,
      durations,
      startIndex,
      windows,
      startTimeSeconds
    );
    const costFn = (tour: number[]) =>
      tourCost(matrix, tour, roundTrip) +
      tourLateness(durations, tour, windows, startTimeSeconds) * LATENESS_PENALTY_PER_SECOND;

    return twoOptImprove(costFn, initialTour);
  }

  const initialTour = nearestNeighborTour(matrix, startIndex);
  const costFn = (tour: number[]) => tourCost(matrix, tour, roundTrip);
  return twoOptImprove(costFn, initialTour);
}
