import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResponsiveDashboardLayout,
  getOccupiedDashboardRows,
  getResponsiveColumnCount,
} from "../src/utils/responsiveDashboardLayout.js";

const areasOverlap = (left, right) =>
  left.x < right.x + right.w &&
  left.x + left.w > right.x &&
  left.y < right.y + right.h &&
  left.y + left.h > right.y;

test("keeps saved dashboard coordinates when all columns fit", () => {
  const items = [
    { id: "trend", x: 0, y: 0, w: 1, h: 1 },
    { id: "process", x: 1, y: 0, w: 3, h: 2 },
  ];

  assert.deepEqual(buildResponsiveDashboardLayout(items, 4, 4), items);
  assert.notEqual(buildResponsiveDashboardLayout(items, 4, 4), items);
});

test("packs widgets without overlap when fewer columns fit", () => {
  const items = [
    { id: "a", x: 0, y: 0, w: 2, h: 1 },
    { id: "b", x: 2, y: 0, w: 2, h: 2 },
    { id: "c", x: 0, y: 1, w: 3, h: 1 },
    { id: "d", x: 3, y: 2, w: 1, h: 1 },
  ];

  const result = buildResponsiveDashboardLayout(items, 4, 3);

  assert.equal(result.length, items.length);
  result.forEach((item) => {
    assert.ok(item.x >= 0);
    assert.ok(item.x + item.w <= 3);
    assert.ok(item.w >= 1);
    assert.ok(item.h >= 1);
  });

  result.forEach((item, index) => {
    result.slice(index + 1).forEach((other) => {
      assert.equal(areasOverlap(item, other), false);
    });
  });
});

test("selects a responsive column count from available width", () => {
  assert.equal(
    getResponsiveColumnCount({ availableWidth: 948, savedColumns: 4 }),
    4
  );
  assert.equal(
    getResponsiveColumnCount({ availableWidth: 760, savedColumns: 4 }),
    3
  );
  assert.equal(
    getResponsiveColumnCount({ availableWidth: 420, savedColumns: 8 }),
    1
  );
});

test("reports the final occupied row after responsive packing", () => {
  assert.equal(
    getOccupiedDashboardRows([
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 0, y: 1, w: 2, h: 3 },
    ]),
    4
  );
  assert.equal(getOccupiedDashboardRows([]), 1);
});
