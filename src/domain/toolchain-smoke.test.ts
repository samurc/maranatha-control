import { describe, expect } from "vitest";
import { test } from "@fast-check/vitest";
import fc from "fast-check";

/**
 * Smoke test only: proves the Vitest + fast-check (@fast-check/vitest)
 * toolchain is wired correctly end to end. Not one of the design's
 * numbered Correctness Properties. Safe to remove once real domain
 * property tests exist.
 */
describe("toolchain smoke test", () => {
  test.prop([fc.integer(), fc.integer()])(
    "addition is commutative",
    (a, b) => {
      expect(a + b).toBe(b + a);
    }
  );
});
