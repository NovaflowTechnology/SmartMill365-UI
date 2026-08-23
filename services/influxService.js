import { dbQuery } from "../config/db.js";
import { escapeFluxString, isValidFluxColumnName } from "../utils/helpers.js";

const TRANSIENT_INFLUX_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const TRANSIENT_INFLUX_STATUS_CODES = new Set([
  429,
  502,
  503,
  504,
]);

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

export const isTransientInfluxError = (
  error
) => {
  if (!error) {
    return false;
  }

  const code =
    error?.code ||
    error?.cause?.code ||
    "";

  if (
    TRANSIENT_INFLUX_ERROR_CODES.has(
      code
    )
  ) {
    return true;
  }

  const statusCode =
    Number(
      error?.statusCode ||
      error?.status ||
      error?.response?.status
    );

  if (
    TRANSIENT_INFLUX_STATUS_CODES.has(
      statusCode
    )
  ) {
    return true;
  }

  const name =
    String(
      error?.name || ""
    ).toLowerCase();

  const message =
    String(
      error?.message || ""
    ).toLowerCase();

  return (
    name.includes("timeout") ||
    name.includes("requesttimedout") ||
    name.includes("abort") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("connection reset")
  );
};

export const collectRowsWithRetry =
  async ({
    queryApi,
    fluxQuery,
    label = "Influx query",
    maxAttempts = 2,
    retryDelayMs = 700,
  }) => {
    let lastError;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt += 1
    ) {
      try {
        return await queryApi.collectRows(
          fluxQuery
        );
      } catch (error) {
        lastError = error;

        const transient =
          isTransientInfluxError(
            error
          );

        const hasRetry =
          transient &&
          attempt < maxAttempts;

        if (!hasRetry) {
          throw error;
        }

        console.warn(
          `⚠️ ${label} temporarily failed (${attempt}/${maxAttempts}). Retrying in ${retryDelayMs}ms...`,
          error?.code ||
            error?.cause?.code ||
            error?.name ||
            error?.message
        );

        await sleep(
          retryDelayMs
        );
      }
    }

    throw lastError;
  };



// =====================================
// SMARTMILL LOGICAL DEVICE GROUPING
// =====================================
//
// SECURITY MODEL:
// Organization access remains measurement-specific:
//
//   org_id + bucket + measurement + tag key + device ID
//
// These groups only improve the Device Management UX. Selecting one
// logical device expands into multiple measurement-level permission rows.
//
export const SMARTMILL_LOGICAL_DEVICE_GROUPS = [
  {
    key: "sterilizer",
    label: "Sterilizer",
    prefixes: ["PSTR_"],
  },
  {
    key: "oil-room",
    label: "Oil Room",
    prefixes: [
      "PSTK_",
      "POilRoom_",
      "POil_Room_",
    ],
  },
  {
    key: "oil-separator",
    label: "Oil Separator",
    prefixes: [
      "POilSeperator_",
      "EOilSeperator_",
      "EOilRoom_",
    ],
  },
  {
    key: "efb-station",
    label: "EFB Station",
    prefixes: ["PEFB_"],
  },
  {
    key: "decanter",
    label: "Decanter",
    prefixes: [
      "PDecanter_",
      "EDecanter_",
    ],
  },
  {
    key: "digester-station",
    label: "Digester Station",
    prefixes: ["PDIG_"],
  },
  {
    key: "boiler",
    label: "Boiler",
    exact: ["PBLR"],
    prefixes: ["PBLR_"],
  },
  {
    key: "turbine",
    label: "Turbine",
    exact: [
      "ETRB_genset",
      "EDPM_TRB",
    ],
  },
  {
    key: "genset",
    label: "Genset",
    exact: [
      "ETRB_turbine",
      "EDPM_GEN",
      "EDPM_GEN1",
      "EDPM_GEN2",
    ],
  },
  {
    key: "b1-dpm",
    label: "B1 DPM",
    exact: ["EDPM_B1"],
  },
];

export const getSmartMillLogicalDeviceGroup = (
  measurement
) => {
  const raw =
    String(measurement || "").trim();

  const lower =
    raw.toLowerCase();

  const matched =
    SMARTMILL_LOGICAL_DEVICE_GROUPS.find(
      (group) => {
        const exactMatch =
          (group.exact || []).some(
            (value) =>
              String(value).toLowerCase() ===
              lower
          );

        const prefixMatch =
          (group.prefixes || []).some(
            (prefix) =>
              lower.startsWith(
                String(prefix).toLowerCase()
              )
          );

        return (
          exactMatch ||
          prefixMatch
        );
      }
    );

  return (
    matched || {
      key: "other",
      label: "Other",
      exact: [],
      prefixes: [],
    }
  );
};

export const getLogicalDeviceKey = ({
  deviceType,
  bucketName,
  tagKey = "id",
  tagValue,
}) =>
  [
    deviceType,
    bucketName,
    tagKey,
    tagValue,
  ]
    .map((value) =>
      String(value || "")
    )
    .join("::");

// Discover the ACTUAL measurement + device-ID relationships in InfluxDB.
// This intentionally does not infer that every ID belongs to every
// measurement in the same equipment family.
export const discoverSmartMillLogicalDevices = async ({
  queryApi,
  bucketName,
  tagKey = "id",
}) => {
  if (!bucketName) {
    throw new Error(
      "Influx bucket is required"
    );
  }

  if (
    !isValidFluxColumnName(
      tagKey
    )
  ) {
    throw new Error(
      "Invalid Influx tag key"
    );
  }

  const fluxQuery = `
    from(bucket: "${escapeFluxString(bucketName)}")
      |> range(start: -365d)
      |> filter(fn: (r) =>
        exists r["${escapeFluxString(tagKey)}"]
      )
      |> keep(
        columns: [
          "_measurement",
          "${escapeFluxString(tagKey)}",
          "_time"
        ]
      )
      |> group(
        columns: [
          "_measurement",
          "${escapeFluxString(tagKey)}"
        ]
      )
      |> limit(n: 1)
      |> keep(
        columns: [
          "_measurement",
          "${escapeFluxString(tagKey)}"
        ]
      )
      |> group()
  `;

  const rows =
    await collectRowsWithRetry({
      queryApi,
      fluxQuery,
      label:
        "Logical device discovery",
    });

  const logicalMap =
    new Map();

  rows.forEach((row) => {
    const measurement =
      String(
        row?._measurement || ""
      ).trim();

    const tagValue =
      String(
        row?.[tagKey] || ""
      ).trim();

    if (
      !measurement ||
      !tagValue
    ) {
      return;
    }

    const group =
      getSmartMillLogicalDeviceGroup(
        measurement
      );

    const key =
      getLogicalDeviceKey({
        deviceType:
          group.key,
        bucketName,
        tagKey,
        tagValue,
      });

    if (
      !logicalMap.has(key)
    ) {
      logicalMap.set(
        key,
        {
          key,
          device_type:
            group.key,
          device_type_label:
            group.label,
          bucket_name:
            bucketName,
          tag_key:
            tagKey,
          tag_value:
            tagValue,
          measurement_names:
            new Set(),
        }
      );
    }

    logicalMap
      .get(key)
      .measurement_names.add(
        measurement
      );
  });

  return [
    ...logicalMap.values(),
  ]
    .map((device) => ({
      ...device,
      measurement_names:
        [
          ...device
            .measurement_names,
        ].sort(),
      measurement_count:
        device
          .measurement_names
          .size,
    }))
    .sort((a, b) => {
      const typeCompare =
        a.device_type_label.localeCompare(
          b.device_type_label
        );

      if (typeCompare) {
        return typeCompare;
      }

      return a.tag_value.localeCompare(
        b.tag_value,
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );
    });
};

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

  const rows =
    await collectRowsWithRetry({
      queryApi,
      fluxQuery,
      label:
        `Sankey ${measurementName}/${channel}`,
    });

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
      collectRowsWithRetry({
        queryApi,
        fluxQuery:
          liveFluxQuery,
        label:
          `Live ${group.measurement}`,
      }),

      collectRowsWithRetry({
        queryApi,
        fluxQuery:
          historyFluxQuery,
        label:
          `History ${group.measurement}`,
      }),
    ]);

  return {
    group,
    liveRows,
    historyRows,
  };
};
