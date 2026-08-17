import { dbQuery } from "../config/db.js";
import { escapeFluxString, isValidFluxColumnName } from "../utils/helpers.js";

// =====================================
// ORGANIZATION INFLUX DEVICE ACCESS
// =====================================
export const canAccessInfluxDevice = async ({
  user,
  bucketName,
  measurementName,
  tagKey,
  tagValue,
}) => {
  if (user?.role === "superadmin") {
    return true;
  }

  if (
    !user?.org_id ||
    !bucketName ||
    !measurementName ||
    !tagKey ||
    !tagValue
  ) {
    return false;
  }

  const rows = await dbQuery(
    `
    SELECT id
    FROM organization_influx_devices
    WHERE org_id = ?
      AND bucket_name = ?
      AND measurement_name = ?
      AND tag_key = ?
      AND tag_value = ?
    LIMIT 1
    `,
    [
      user.org_id,
      bucketName,
      measurementName,
      tagKey,
      tagValue,
    ]
  );

  return rows.length > 0;
};

// =====================================
// SANKEY ACTUAL DATA HELPERS
// =====================================
export const fetchLatestSankeyOutputValue = async ({
  queryApi,
  user,
  bucketName,
  measurementName,
  tagKey = "id",
  tagValue,
  channel,
}) => {
  if (
    !bucketName ||
    !measurementName ||
    !tagKey ||
    !tagValue ||
    !channel
  ) {
    return {
      value: null,
      timestamp: null,
      error: "Missing Sankey data source configuration",
    };
  }

  if (!isValidFluxColumnName(tagKey)) {
    return {
      value: null,
      timestamp: null,
      error: "Invalid Sankey tag key",
    };
  }

  const allowed = await canAccessInfluxDevice({
    user,
    bucketName,
    measurementName,
    tagKey,
    tagValue,
  });

  if (!allowed) {
    return {
      value: null,
      timestamp: null,
      error: "No permission for this Sankey data source",
    };
  }

  const fluxQuery = `
    from(bucket: "${escapeFluxString(bucketName)}")
      |> range(start: -24h)
      |> filter(fn: (r) =>
        r._measurement == "${escapeFluxString(measurementName)}"
      )
      |> filter(fn: (r) =>
        r["${escapeFluxString(tagKey)}"] == "${escapeFluxString(tagValue)}"
      )
      |> filter(fn: (r) =>
        r["_field"] == "${escapeFluxString(channel)}"
      )
      |> last()
      |> keep(columns: ["_time", "_field", "_value"])
  `;

  const rows = await queryApi.collectRows(fluxQuery);

  if (!rows.length) {
    return {
      value: null,
      timestamp: null,
      error: "No Sankey data found in the last 24 hours",
    };
  }

  const row = rows[0];
  const numericValue = Number(row._value);

  return {
    value: Number.isFinite(numericValue)
      ? numericValue
      : null,
    timestamp: row._time || null,
    error: null,
  };
};

export const fetchSankeyRuntimeValues = async ({
  queryApi,
  user,
  items = [],
}) => {
  const sankeyValues = {};

  const sankeyItems = Array.isArray(items)
    ? items.filter((item) => item?.type === "sankey")
    : [];

  for (const item of sankeyItems) {
    const outputs = Array.isArray(item?.sankeyConfig?.outputs)
      ? item.sankeyConfig.outputs
      : [];

    sankeyValues[item.id] = {};

    for (const output of outputs) {
      const dataSource = output?.dataSource || {};

      const bucketName = dataSource.bucket;
      const measurementName = dataSource.measurement;
      const tagKey = dataSource.tagKey || "id";
      const tagValue =
        dataSource.tagValue ||
        dataSource.id ||
        "";
      const channel = dataSource.channel;

      try {
        const result = await fetchLatestSankeyOutputValue({
          queryApi,
          user,
          bucketName,
          measurementName,
          tagKey,
          tagValue,
          channel,
        });

        sankeyValues[item.id][output.id] = {
          value: result.value,
          timestamp: result.timestamp,
          error: result.error,
          source: {
            bucket: bucketName,
            measurement: measurementName,
            tagKey,
            tagValue,
            channel,
          },
        };
      } catch (err) {
        console.error("❌ Sankey output fetch error:", err);

        sankeyValues[item.id][output.id] = {
          value: null,
          timestamp: null,
          error:
            err.message ||
            "Failed to fetch Sankey output value",
          source: {
            bucket: bucketName,
            measurement: measurementName,
            tagKey,
            tagValue,
            channel,
          },
        };
      }
    }
  }

  return sankeyValues;
};


export const getAggregateEvery = (durationMs) => {
  if (durationMs <= 6 * 60 * 60 * 1000) {
    return "1m";
  }

  if (durationMs <= 2 * 24 * 60 * 60 * 1000) {
    return "5m";
  }

  if (durationMs <= 7 * 24 * 60 * 60 * 1000) {
    return "30m";
  }

  if (durationMs <= 30 * 24 * 60 * 60 * 1000) {
    return "2h";
  }

  if (durationMs <= 90 * 24 * 60 * 60 * 1000) {
    return "6h";
  }

  if (durationMs <= 365 * 24 * 60 * 60 * 1000) {
    return "1d";
  }

  return "7d";
};

export const normalizeTemplateDataSources = ({
  influx,
  channelMap,
  dataSources,
}) => {
  const normalized = {};

  // Preferred format: each dashboard key owns its complete Influx source.
  if (
    dataSources &&
    typeof dataSources === "object" &&
    !Array.isArray(dataSources)
  ) {
    Object.entries(dataSources).forEach(
      ([dataKey, source]) => {
        if (
          !dataKey ||
          !source ||
          typeof source !== "object"
        ) {
          return;
        }

        const selectedBucket =
          source.bucket ||
          influx?.bucket ||
          bucket ||
          "";

        const measurement =
          source.measurement || "";

        const tagKey =
          source.tagKey ||
          influx?.tagKey ||
          "id";

        const tagValue =
          source.tagValue ||
          source.id ||
          influx?.tagValue ||
          influx?.id ||
          "";

        const field =
          source.field ||
          source.channel ||
          "";

        if (
          selectedBucket &&
          measurement &&
          tagKey &&
          tagValue &&
          field
        ) {
          normalized[dataKey] = {
            bucket: selectedBucket,
            measurement,
            tagKey,
            tagValue,
            field,
          };
        }
      }
    );
  }

  if (Object.keys(normalized).length > 0) {
    return normalized;
  }

  // Backward compatibility for existing templates:
  // one Influx source + a dashboard-key-to-field map.
  const selectedBucket =
    influx?.bucket || bucket || "";

  const measurement =
    String(
      influx?.measurement || ""
    ).trim();

  const tagKey =
    influx?.tagKey || "id";

  const tagValue =
    influx?.tagValue ||
    influx?.id ||
    "";

  if (
    !channelMap ||
    typeof channelMap !== "object" ||
    Array.isArray(channelMap)
  ) {
    return normalized;
  }

  Object.entries(channelMap).forEach(
    ([dataKey, field]) => {
      if (
        dataKey &&
        typeof field === "string" &&
        field.trim() &&
        selectedBucket &&
        measurement &&
        tagKey &&
        tagValue
      ) {
        normalized[dataKey] = {
          bucket: selectedBucket,
          measurement,
          tagKey,
          tagValue,
          field: field.trim(),
        };
      }
    }
  );

  return normalized;
};

export const groupTemplateDataSources = (dataSources) => {
  const groups = new Map();

  Object.entries(dataSources).forEach(
    ([dataKey, source]) => {
      const groupKey = [
        source.bucket,
        source.measurement,
        source.tagKey,
        source.tagValue,
      ].join("|");

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          groupKey,
          bucket: source.bucket,
          measurement: source.measurement,
          tagKey: source.tagKey,
          tagValue: source.tagValue,
          mappings: [],
        });
      }

      groups.get(groupKey).mappings.push({
        dataKey,
        field: source.field,
      });
    }
  );

  return [...groups.values()];
};

export const validateTemplateSourceGroup = (group) => {
  if (!group.bucket) {
    return "Influx bucket is required";
  }

  if (!group.measurement) {
    return "Influx measurement is required";
  }

  if (!group.tagValue) {
    return "Influx device ID is required";
  }

  if (!isValidFluxColumnName(group.tagKey)) {
    return "Invalid Influx tag key";
  }

  if (!group.mappings.length) {
    return "At least one Influx field is required";
  }

  return null;
};

export const fetchTemplateSourceGroup = async ({
  queryApi,
  group,
  historyRangeFlux,
  aggregateEvery,
}) => {
  const uniqueFields = [
    ...new Set(
      group.mappings
        .map((mapping) => mapping.field)
        .filter(Boolean)
    ),
  ];

  const fieldFilter = uniqueFields
    .map(
      (field) =>
        `r["_field"] == "${escapeFluxString(field)}"`
    )
    .join(" or ");

  const baseFilter = `
    |> filter(fn: (r) =>
      r._measurement == "${escapeFluxString(group.measurement)}"
    )
    |> filter(fn: (r) =>
      r["${escapeFluxString(group.tagKey)}"] == "${escapeFluxString(group.tagValue)}"
    )
    |> filter(fn: (r) => ${fieldFilter})
  `;

  const liveFluxQuery = `
    from(bucket: "${escapeFluxString(group.bucket)}")
      |> range(start: -24h)
      ${baseFilter}
      |> group(columns: ["_field"])
      |> last()
      |> keep(columns: ["_time", "_field", "_value"])
      |> sort(columns: ["_time"], desc: true)
  `;

  const historyFluxQuery = `
    from(bucket: "${escapeFluxString(group.bucket)}")
      ${historyRangeFlux}
      ${baseFilter}
      |> aggregateWindow(
        every: ${aggregateEvery},
        fn: last,
        createEmpty: false
      )
      |> pivot(
        rowKey: ["_time"],
        columnKey: ["_field"],
        valueColumn: "_value"
      )
      |> sort(columns: ["_time"])
  `;

  const [liveRows, historyRows] =
    await Promise.all([
      queryApi.collectRows(liveFluxQuery),
      queryApi.collectRows(historyFluxQuery),
    ]);

  return {
    group,
    liveRows,
    historyRows,
  };
};
