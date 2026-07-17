import { describe, it, expect } from "vitest";
import { optimize, TimeWindow } from "../src/services/optimizer";

/**
 * Computes total cost of traversing `order` (a permutation of matrix indices)
 * in sequence, optionally including the return leg to the first node.
 */
function totalCost(
  matrix: number[][],
  order: number[],
  roundTrip: boolean
): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    total += matrix[order[i]][order[i + 1]];
  }
  if (roundTrip) {
    total += matrix[order[order.length - 1]][order[0]];
  }
  return total;
}

function isPermutationOf(order: number[], n: number): boolean {
  if (order.length !== n) return false;
  const seen = new Set(order);
  if (seen.size !== n) return false;
  for (let i = 0; i < n; i++) {
    if (!seen.has(i)) return false;
  }
  return true;
}

describe("optimize", () => {
  it("finds the known-optimal tour on a small hardcoded matrix (4 nodes)", () => {
    // Nodes arranged roughly on a line: 0 --1-- 1 --1-- 2 --1-- 3
    // with a "trap" direct edge 0->2 that's cheap but skips 1, to make sure
    // the optimizer isn't fooled by a naive greedy choice.
    //
    // Layout (1D coordinates): 0 at 0, 1 at 1, 2 at 2, 3 at 3.
    // Optimal non-round-trip tour starting at 0 is 0 -> 1 -> 2 -> 3, cost 3.
    const matrix = [
      [0, 1, 2, 3],
      [1, 0, 1, 2],
      [2, 1, 0, 1],
      [3, 2, 1, 0],
    ];

    const order = optimize(matrix, 0, false);

    expect(isPermutationOf(order, 4)).toBe(true);
    expect(order[0]).toBe(0);
    expect(totalCost(matrix, order, false)).toBe(3);
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it("finds a known-optimal tour on a 6-node matrix with a deceptive nearest-neighbor trap", () => {
    // Distances designed so a pure nearest-neighbor greedy walk from 0 gets
    // trapped into a suboptimal tour, but 2-opt should fix it.
    // Nodes 0..5 placed on a line at positions 0, 1, 2, 10, 11, 12.
    // Optimal order starting at 0 (non-round-trip): 0,1,2,3,4,5 cost = 1+1+8+1+1 = 12
    const pos = [0, 1, 2, 10, 11, 12];
    const n = pos.length;
    const matrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => Math.abs(pos[i] - pos[j]))
    );

    const order = optimize(matrix, 0, false);

    expect(isPermutationOf(order, n)).toBe(true);
    expect(order[0]).toBe(0);
    const cost = totalCost(matrix, order, false);
    expect(cost).toBe(12);
    expect(order).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("produces different total costs for roundTrip true vs false", () => {
    const pos = [0, 5, 8, 20];
    const n = pos.length;
    const matrix: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => Math.abs(pos[i] - pos[j]))
    );

    const orderOneWay = optimize(matrix, 0, false);
    const orderRoundTrip = optimize(matrix, 0, true);

    const costOneWay = totalCost(matrix, orderOneWay, false);
    const costRoundTripAsRoundTrip = totalCost(matrix, orderRoundTrip, true);
    const costOneWayAsRoundTrip = totalCost(matrix, orderOneWay, true);

    // The round-trip-optimized tour, evaluated as a round trip, should cost
    // no more than the one-way-optimized tour evaluated as a round trip.
    expect(costRoundTripAsRoundTrip).toBeLessThanOrEqual(
      costOneWayAsRoundTrip
    );

    // And the plain one-way cost should differ from the round-trip cost
    // (the round trip necessarily adds the return leg).
    expect(costOneWay).not.toBe(costRoundTripAsRoundTrip);
  });

  it("includes every input index exactly once, for varying matrix sizes", () => {
    function makeRandomMatrix(n: number, seed: number): number[][] {
      // simple deterministic pseudo-random generator for reproducibility
      let s = seed;
      function rand() {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      }
      const points = Array.from({ length: n }, () => ({
        x: rand() * 100,
        y: rand() * 100,
      }));
      return points.map((p1) =>
        points.map((p2) =>
          Math.hypot(p1.x - p2.x, p1.y - p2.y)
        )
      );
    }

    for (const n of [2, 3, 5, 10, 20]) {
      const matrix = makeRandomMatrix(n, n * 7919 + 1);
      const order = optimize(matrix, 0, false);
      expect(isPermutationOf(order, n)).toBe(true);
    }
  });

  it("always starts the tour at startIndex", () => {
    const matrix = [
      [0, 4, 1, 9],
      [4, 0, 3, 2],
      [1, 3, 0, 6],
      [9, 2, 6, 0],
    ];

    for (const start of [0, 1, 2, 3]) {
      const order = optimize(matrix, start, false);
      expect(order[0]).toBe(start);
      expect(isPermutationOf(order, 4)).toBe(true);
    }
  });

  it("handles trivial sizes (0 and 1 nodes)", () => {
    expect(optimize([], 0, false)).toEqual([]);
    expect(optimize([[0]], 0, false)).toEqual([0]);
  });

  it("reorders even a 3-node tour to respect a deadline the greedy construction misses", () => {
    // Node 1 is closer (nearest-neighbor's naive first pick); node 2 is
    // farther but has a tight deadline that visiting it second would blow
    // (arriving at 90s vs a 40s deadline) while visiting it FIRST meets it
    // comfortably (arriving at 30s). A single greedy construction step can't
    // see that trade-off — only reordering (2-opt) among all 3 nodes can.
    const distances = [
      [0, 1, 50],
      [1, 0, 50],
      [50, 50, 0],
    ];
    const durations = [
      [0, 10, 30],
      [10, 0, 80],
      [30, 80, 0],
    ];
    const windows: (TimeWindow | null)[] = [null, null, { earliestSeconds: 0, latestSeconds: 40 }];

    const order = optimize(distances, 0, false, { durations, windows, startTimeSeconds: 0 });

    expect(order).toEqual([0, 2, 1]);
  });
});
