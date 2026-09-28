import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCanvasFitZoom,
} from "../src/utils/processCanvasFit.js";

test("fits a large process topology inside a compact viewport", () => {
  const zoom = calculateCanvasFitZoom({
    bounds: { width: 1800, height: 1000 },
    viewportWidth: 900,
    viewportHeight: 460,
  });

  assert.equal(zoom, 0.404);
});
test("clamps fit zoom for extremely large or small topologies", () => {
  assert.equal(
    calculateCanvasFitZoom({
      bounds: { width: 5000, height: 4000 },
      viewportWidth: 500,
      viewportHeight: 300,
    }),
    0.3
  );

  assert.equal(
    calculateCanvasFitZoom({
      bounds: { width: 100, height: 100 },
      viewportWidth: 1200,
      viewportHeight: 800,
    }),
    1.35
  );
});
