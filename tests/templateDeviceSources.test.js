import assert from "node:assert/strict";
import test from "node:test";

import {
  extractTemplateDeviceSources,
  findUnauthorizedTemplateDeviceSources,
  getTemplateGridDimensions,
} from "../utils/templateDeviceSources.js";

const allowedSource = {
  bucket: "SmartMill365",
  measurement: "PSTR_bar",
  tagKey: "id",
  tagValue: "sterilizer-1",
};

test("extracts and deduplicates data sources nested in complex widgets", () => {
  const layout = {
    rows: 3,
    cols: 4,
    dataSources: {
      pressure: {
        ...allowedSource,
        field: "pressure",
      },
    },
    items: [
      {
        type: "sankey",
        sankeyConfig: {
          links: [
            {
              dataSource: {
                ...allowedSource,
                field: "flowrate",
              },
            },
          ],
        },
      },
    ],
  };

  assert.deepEqual(extractTemplateDeviceSources(layout), [allowedSource]);
});

test("reports a nested source that is not in the organization allow-list", () => {
  const deniedSource = {
    bucket: "SmartMill365",
    measurement: "TEMP_C",
    tagKey: "id",
    tagValue: "sterilizer-2",
  };

  const layout = {
    rows: 3,
    cols: 4,
    items: [
      {
        processEquipmentConfig: {
          metric: {
            source: {
              ...deniedSource,
              channel: "temperature",
            },
          },
        },
      },
    ],
  };

  assert.deepEqual(
    findUnauthorizedTemplateDeviceSources(layout, [allowedSource]),
    [deniedSource]
  );
});

test("accepts only sources present in the organization allow-list", () => {
  const layout = {
    rows: 3,
    cols: 4,
    influx: {
      ...allowedSource,
      field: "pressure",
    },
  };

  assert.deepEqual(
    findUnauthorizedTemplateDeviceSources(layout, [allowedSource]),
    []
  );
});

test("reads stored grid dimensions with implementation defaults", () => {
  assert.deepEqual(getTemplateGridDimensions('{"rows":6,"cols":8}'), {
    rows: 6,
    cols: 8,
  });
  assert.deepEqual(getTemplateGridDimensions({}), {
    rows: 3,
    cols: 4,
  });
});
