import assert from "node:assert/strict";
import test, { after } from "node:test";

import db from "../config/db.js";
import { fetchTemplateSourceGroup } from "../services/influxService.js";

after(() =>
  new Promise((resolve) => {
    db.end(() => resolve());
  })
);

const group = {
  bucket: "SmartMill365",
  measurement: "PSTR_bar",
  tagKey: "id",
  tagValue: "sterilizer-1",
  mappings: [{ dataKey: "pressure", field: "pressure" }],
};

test("latest-value refresh skips the historical InfluxDB query", async () => {
  const queries = [];
  const queryApi = {
    collectRows: async (query) => {
      queries.push(query);
      return [{ _field: "pressure", _value: 42, _time: "2026-09-09T00:00:00Z" }];
    },
  };

  const result = await fetchTemplateSourceGroup({
    queryApi,
    group,
    historyRangeFlux: "|> range(start: -15m)",
    aggregateEvery: "1m",
    includeHistory: false,
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0], /\|> last\(\)/);
  assert.deepEqual(result.historyRows, []);
  assert.equal(result.liveRows.length, 1);
});

test("full refresh retrieves latest and historical values", async () => {
  const queries = [];
  const queryApi = {
    collectRows: async (query) => {
      queries.push(query);
      return [];
    },
  };

  await fetchTemplateSourceGroup({
    queryApi,
    group,
    historyRangeFlux: "|> range(start: -15m)",
    aggregateEvery: "1m",
  });

  assert.equal(queries.length, 2);
  assert.ok(queries.some((query) => query.includes("|> last()")));
  assert.ok(queries.some((query) => query.includes("|> aggregateWindow(")));
});
