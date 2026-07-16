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
 */

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
 * 2-opt local search: repeatedly try reversing segments [i, j] of the tour
 * and keep the reversal if it reduces total cost. Stops when a full pass
 * yields no improvement, or when `maxIterations` full passes have been made
 * (safety cap for pathological inputs).
 *
 * The tour's first element (the start) is kept fixed in place so the tour
 * still begins at `startIndex`; reversals only occur within indices [1, n-1]
 * when the tour is not a round trip is irrelevant here (2-opt reversal is
 * valid regardless), but we always keep position 0 anchored as the start.
 */
function twoOptImprove(
  matrix: number[][],
  initialTour: number[],
  roundTrip: boolean,
  maxIterations = 200
): number[] {
  const n = initialTour.length;
  let tour = initialTour.slice();
  if (n < 4) {
    // 2-opt needs at least 4 nodes to have a meaningful non-trivial swap;
    // fewer than that, the nearest-neighbor tour is already optimal.
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

        const currentCost = tourCost(matrix, tour, roundTrip);
        const newCost = tourCost(matrix, newTour, roundTrip);

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
 * @returns array of indices into `matrix`, a permutation of
 *          [0, matrix.length), starting with `startIndex`
 */
export function optimize(
  matrix: number[][],
  startIndex: number,
  roundTrip: boolean
): number[] {
  const n = matrix.length;

  if (n === 0) return [];
  if (n === 1) return [0];

  if (startIndex < 0 || startIndex >= n) {
    throw new RangeError(
      `startIndex ${startIndex} out of bounds for matrix of size ${n}`
    );
  }

  const initialTour = nearestNeighborTour(matrix, startIndex);
  const improvedTour = twoOptImprove(matrix, initialTour, roundTrip);

  return improvedTour;
}
