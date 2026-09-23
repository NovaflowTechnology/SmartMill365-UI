import express from "express";
import "dotenv/config";
import auth from "../middleware/auth.js";
import {
  influxDB,
  org,
  bucket,
  influxTimeout,
  influxMetadataLookback,
} from "../config/influx.js";
import {
  escapeFluxString,
  isValidFluxColumnName,
  toNumericValue,
  parseRelativeHistoryWindow,
  liveFetchMonitor,
} from "../utils/helpers.js";
import {
  canAccessInfluxDevice,
  fetchSankeyRuntimeValues,
  getAggregateEvery,
  normalizeTemplateDataSources,
  groupTemplateDataSources,
  validateTemplateSourceGroup,
  fetchTemplateSourceGroup,
  collectRowsWithRetry,
  isTransientInfluxError,
} from "../services/influxService.js";
const router = express.Router();

const wait = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

const TRANSIENT_HTTP_STATUSES =
  new Set([
    429,
    502,
    503,
    504,
  ]);


const MAX_RUNTIME_LOGS = 250;
const RUNTIME_LOG_STREAM_TTL_MS =
  6 * 60 * 60 * 1000;

// Runtime event history for the Logs widget.
//
// This intentionally lives in memory because the current project does not
// have a separate event/alarm database yet. It survives normal dashboard
// polling, but resets when the Node server restarts.
const runtimeLogStreams = new Map();

const toFiniteNumberOrNull = (value) => {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric
    : null;
};

const formatRuntimeValue = (value) => {
  const numeric =
    toFiniteNumberOrNull(value);

  if (numeric === null) {
    return String(value ?? "—");
  }

  return Number.isInteger(numeric)
    ? String(numeric)
    : numeric.toLocaleString(
        undefined,
        {
          maximumFractionDigits: 3,
        }
      );
};

const getRuntimeUserKey = (user = {}) =>
  String(
    user.id ||
      user.userId ||
      user.sub ||
      user.email ||
      user.username ||
      "user"
  );

const getRuntimeLayoutKey = (
  items = []
) =>
  (Array.isArray(items) ? items : [])
    .map((item, index) =>
      String(
        item?.id ??
          `${item?.type || "widget"}:${item?.label || index}`
      )
    )
    .sort()
    .join("|") || "no-items";

const pruneRuntimeLogStreams = (
  nowMs = Date.now()
) => {
  for (const [
    key,
    stream,
  ] of runtimeLogStreams) {
    if (
      nowMs -
        (stream?.lastAccessAt || 0) >
      RUNTIME_LOG_STREAM_TTL_MS
    ) {
      runtimeLogStreams.delete(key);
    }
  }
};

const getRuntimeLogStream = (
  streamKey
) => {
  const nowMs = Date.now();

  pruneRuntimeLogStreams(nowMs);

  let stream =
    runtimeLogStreams.get(
      streamKey
    );

  if (!stream) {
    stream = {
      logs: [],
      states: new Map(),
      sequence: 0,
      lastAccessAt: nowMs,
    };

    runtimeLogStreams.set(
      streamKey,
      stream
    );
  }

  stream.lastAccessAt = nowMs;

  return stream;
};

const pushRuntimeLog = (
  stream,
  {
    timestamp,
    level = "info",
    source = "System",
    message,
    eventKey = "event",
  }
) => {
  if (!message) return;

  const safeTimestamp =
    timestamp &&
    !Number.isNaN(
      new Date(timestamp).getTime()
    )
      ? new Date(
          timestamp
        ).toISOString()
      : new Date().toISOString();

  stream.sequence += 1;

  stream.logs.push({
    id:
      `${eventKey}-${safeTimestamp}-${stream.sequence}`,
    timestamp:
      safeTimestamp,
    level,
    source,
    message,
  });

  if (
    stream.logs.length >
    MAX_RUNTIME_LOGS
  ) {
    stream.logs.splice(
      0,
      stream.logs.length -
        MAX_RUNTIME_LOGS
    );
  }
};

const addThresholdTarget = (
  targets,
  {
    dataKey,
    label,
    rangeConfig,
  }
) => {
  if (!dataKey || !rangeConfig) {
    return;
  }

  const warning =
    toFiniteNumberOrNull(
      rangeConfig.warning
    );

  const danger =
    toFiniteNumberOrNull(
      rangeConfig.danger
    );

  if (
    warning === null &&
    danger === null
  ) {
    return;
  }

  // Avoid duplicate events when the same data key appears in multiple
  // widgets. The first configured threshold definition wins.
  if (targets.has(dataKey)) {
    return;
  }

  targets.set(dataKey, {
    dataKey,
    label:
      String(
        label ||
          dataKey
      ),
    warning,
    danger,
    unit:
      String(
        rangeConfig.unit ||
          ""
      ).trim(),
  });
};

const collectThresholdTargets = (
  items = []
) => {
  const targets = new Map();

  for (const item of (
    Array.isArray(items)
      ? items
      : []
  )) {
    if (!item) continue;

    if (
      item.type ===
      "composite"
    ) {
      const parts = [
        item
          ?.compositeConfig
          ?.primaryConfig,
        item
          ?.compositeConfig
          ?.secondaryConfig,
      ];

      for (const part of parts) {
        if (!part) continue;

        const keys =
          Array.isArray(
            part.dataKeys
          ) &&
          part.dataKeys.length
            ? part.dataKeys
            : part.dataKey
            ? [
                part.dataKey,
              ]
            : [];

        for (const key of keys) {
          addThresholdTarget(
            targets,
            {
              dataKey: key,
              label:
                part.label ||
                item.label ||
                key,
              rangeConfig:
                part.rangeConfig,
            }
          );
        }
      }

      continue;
    }

    const keys =
      Array.isArray(
        item.dataKeys
      ) &&
      item.dataKeys.length
        ? item.dataKeys
        : item.dataKey
        ? [
            item.dataKey,
          ]
        : [];

    for (const key of keys) {
      addThresholdTarget(
        targets,
        {
          dataKey: key,
          label:
            item.label ||
            key,
          rangeConfig:
            item.rangeConfig,
        }
      );
    }
  }

  return [
    ...targets.values(),
  ];
};

const getThresholdState = ({
  value,
  warning,
  danger,
}) => {
  const numericValue =
    toFiniteNumberOrNull(
      value
    );

  if (
    numericValue === null
  ) {
    return "unknown";
  }

  if (
    danger !== null &&
    numericValue >= danger
  ) {
    return "danger";
  }

  if (
    warning !== null &&
    numericValue >= warning
  ) {
    return "warning";
  }

  return "normal";
};

const appendLiveStatusEvent = ({
  stream,
  liveStatus,
}) => {
  const missingSignature =
    Array.isArray(
      liveStatus?.missingFields
    )
      ? [
          ...liveStatus
            .missingFields,
        ]
          .sort()
          .join(",")
      : "";

  const signature =
    [
      liveStatus?.status ||
        "unknown",
      liveStatus?.message ||
        "",
      missingSignature,
    ].join("|");

  const previousSignature =
    stream.states.get(
      "live-status-signature"
    );

  if (
    previousSignature ===
    signature
  ) {
    return;
  }

  stream.states.set(
    "live-status-signature",
    signature
  );

  const status =
    liveStatus?.status ||
    "unknown";

  const timestamp =
    liveStatus
      ?.sourceTimestamp ||
    new Date().toISOString();

  if (
    previousSignature ===
      undefined &&
    status === "online"
  ) {
    pushRuntimeLog(
      stream,
      {
        timestamp,
        level: "info",
        source: "Monitoring",
        eventKey:
          "monitoring-started",
        message:
          "Live monitoring started and data is updating normally.",
      }
    );

    return;
  }

  if (status === "online") {
    pushRuntimeLog(
      stream,
      {
        timestamp,
        level: "success",
        source: "InfluxDB",
        eventKey:
          "connection-recovered",
        message:
          "Live data connection recovered and readings are updating normally.",
      }
    );

    return;
  }

  pushRuntimeLog(
    stream,
    {
      timestamp,
      level:
        status ===
          "warning"
          ? "warning"
          : "error",
      source: "InfluxDB",
      eventKey:
        `live-${status}`,
      message:
        liveStatus?.message ||
        "Live data status changed.",
    }
  );
};

const appendThresholdEvents = ({
  stream,
  items,
  data,
  fieldTimestamps,
  fallbackTimestamp,
}) => {
  const targets =
    collectThresholdTargets(
      items
    );

  for (const target of targets) {
    if (
      !Object.prototype.hasOwnProperty.call(
        data || {},
        target.dataKey
      )
    ) {
      continue;
    }

    const value =
      data[
        target.dataKey
      ];

    const currentState =
      getThresholdState({
        value,
        warning:
          target.warning,
        danger:
          target.danger,
      });

    if (
      currentState ===
      "unknown"
    ) {
      continue;
    }

    const stateKey =
      `threshold:${target.dataKey}`;

    const previousState =
      stream.states.get(
        stateKey
      );

    stream.states.set(
      stateKey,
      currentState
    );

    if (
      previousState ===
      currentState
    ) {
      continue;
    }

    const unitSuffix =
      target.unit
        ? ` ${target.unit}`
        : "";

    const valueText =
      `${formatRuntimeValue(
        value
      )}${unitSuffix}`;

    const timestamp =
      fieldTimestamps?.[
        target.dataKey
      ] ||
      fallbackTimestamp ||
      new Date().toISOString();

    // Do not create a "normal" message for every field on the very first poll.
    if (
      previousState ===
        undefined &&
      currentState ===
        "normal"
    ) {
      continue;
    }

    if (
      currentState ===
      "danger"
    ) {
      const thresholdText =
        target.danger !==
        null
          ? `${formatRuntimeValue(
              target.danger
            )}${unitSuffix}`
          : "configured danger level";

      pushRuntimeLog(
        stream,
        {
          timestamp,
          level: "error",
          source:
            target.label,
          eventKey:
            `danger-${target.dataKey}`,
          message:
            `${target.label} exceeded the danger threshold: ${valueText} (danger ${thresholdText}).`,
        }
      );

      continue;
    }

    if (
      currentState ===
      "warning"
    ) {
      const thresholdText =
        target.warning !==
        null
          ? `${formatRuntimeValue(
              target.warning
            )}${unitSuffix}`
          : "configured warning level";

      const fromDanger =
        previousState ===
        "danger";

      pushRuntimeLog(
        stream,
        {
          timestamp,
          level: "warning",
          source:
            target.label,
          eventKey:
            `warning-${target.dataKey}`,
          message:
            fromDanger
              ? `${target.label} dropped below the danger level but remains above warning: ${valueText}.`
              : `${target.label} exceeded the warning threshold: ${valueText} (warning ${thresholdText}).`,
        }
      );

      continue;
    }

    if (
      currentState ===
        "normal" &&
      previousState &&
      previousState !==
        "normal"
    ) {
      pushRuntimeLog(
        stream,
        {
          timestamp,
          level: "success",
          source:
            target.label,
          eventKey:
            `normal-${target.dataKey}`,
          message:
            `${target.label} returned to the normal range: ${valueText}.`,
        }
      );
    }
  }
};

const buildRuntimeLogs = ({
  req,
  monitorKey,
  items,
  data,
  liveStatus,
  fieldTimestamps,
  liveTimestamp,
}) => {
  const streamKey =
    [
      getRuntimeUserKey(
        req?.user
      ),
      monitorKey ||
        "monitor",
      getRuntimeLayoutKey(
        items
      ),
    ].join("||");

  const stream =
    getRuntimeLogStream(
      streamKey
    );

  appendLiveStatusEvent({
    stream,
    liveStatus,
  });

  appendThresholdEvents({
    stream,
    items,
    data,
    fieldTimestamps,
    fallbackTimestamp:
      liveStatus
        ?.sourceTimestamp ||
      (liveTimestamp
        ? new Date(
            liveTimestamp
          ).toISOString()
        : null),
  });

  // LogsWidget can sort either direction itself. Returning a fresh array
  // avoids exposing the mutable stream storage to the response object.
  return stream.logs.map(
    (log) => ({
      ...log,
    })
  );
};


/**
 * HTTP retry helper for the InfluxDB REST API.
 *
 * A new AbortSignal is created for every attempt because an aborted signal
 * cannot be reused.
 */
const fetchInfluxHttpWithRetry =
  async (
    endpoint,
    {
      maxAttempts = 2,
      retryDelayMs = 700,
    } = {}
  ) => {
    let lastError;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt += 1
    ) {
      try {
        const response =
          await fetch(
            endpoint,
            {
              headers: {
                Authorization:
                  `Token ${process.env.INFLUX_TOKEN}`,
                Accept:
                  "application/json",
              },
              signal:
                AbortSignal.timeout(
                  influxTimeout
                ),
            }
          );

        const shouldRetryStatus =
          TRANSIENT_HTTP_STATUSES.has(
            response.status
          ) &&
          attempt < maxAttempts;

        if (
          shouldRetryStatus
        ) {
          // Drain the body before retrying so the connection can be released.
          await response
            .arrayBuffer()
            .catch(() => null);

          console.warn(
            `⚠️ Influx HTTP ${response.status} (${attempt}/${maxAttempts}). Retrying in ${retryDelayMs}ms...`
          );

          await wait(
            retryDelayMs
          );

          continue;
        }

        return response;
      } catch (error) {
        lastError = error;

        const hasRetry =
          isTransientInfluxError(
            error
          ) &&
          attempt < maxAttempts;

        if (!hasRetry) {
          throw error;
        }

        console.warn(
          `⚠️ Influx HTTP request temporarily failed (${attempt}/${maxAttempts}). Retrying in ${retryDelayMs}ms...`,
          error?.code ||
            error?.cause?.code ||
            error?.name ||
            error?.message
        );

        await wait(
          retryDelayMs
        );
      }
    }

    throw lastError;
  };

// =====================================
// GET ALL INFLUX BUCKETS (SUPERADMIN)
//
// GET /influx/buckets
// Uses the InfluxDB HTTP API because schema.* Flux functions cannot
// enumerate buckets. This is used by Device Management when registering
// a device for an organization.
// =====================================
router.get(
  "/influx/buckets",
  auth(["superadmin"]),
  async (req, res) => {
    if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN) {
      return res.status(500).json({
        error: "InfluxDB connection settings are missing",
      });
    }

    try {
      const endpoint = new URL(
        "/api/v2/buckets",
        process.env.INFLUX_URL
      );

      if (org) {
        endpoint.searchParams.set("org", org);
      }

      const response =
        await fetchInfluxHttpWithRetry(
          endpoint
        );

      const payload = await response.json();

      if (!response.ok) {
        console.error("❌ Fetch Influx buckets error:", payload);

        return res.status(response.status).json({
          error:
            payload?.message ||
            "Failed to fetch InfluxDB buckets",
        });
      }

      const buckets = [
        ...new Set(
          (payload?.buckets || [])
            .map((item) => item?.name)
            .filter(Boolean)
        ),
      ].sort();

      return res.json({ buckets });
    } catch (err) {
      console.error(
        "❌ Fetch Influx buckets error:",
        err
      );

      // Bucket listing is metadata only. If the remote list endpoint has a
      // temporary network failure, keep Device Management usable with the
      // configured application bucket.
      if (bucket) {
        console.warn(
          `⚠️ Falling back to configured Influx bucket: ${bucket}`
        );

        return res.json({
          buckets: [bucket],
          fallback: true,
          warning:
            "InfluxDB bucket discovery temporarily unavailable. Using the configured bucket.",
        });
      }

      return res
        .status(
          isTransientInfluxError(
            err
          )
            ? 503
            : 500
        )
        .json({
          error:
            "Failed to fetch InfluxDB buckets",
          transient:
            isTransientInfluxError(
              err
            ),
        });
    }
  }
);


// =====================================
// GET ALL MEASUREMENTS
//
// GET /influx/measurements?bucket=Mill
// =====================================
router.get(
  "/influx/measurements",
  auth(["superadmin"]),
  async (req, res) => {
    const selectedBucket =
      req.query.bucket || bucket;

    if (!selectedBucket) {
      return res.status(400).json({
        error: "Bucket is required",
      });
    }

    try {
      const queryApi =
        influxDB.getQueryApi(org);

      const fluxQuery = `
        import "influxdata/influxdb/schema"

        schema.measurements(
          bucket: "${escapeFluxString(selectedBucket)}",
          start: ${influxMetadataLookback}
        )
      `;

      const rows =
        await collectRowsWithRetry({
          queryApi,
          fluxQuery,
          label:
            "Influx measurement discovery",
        });

      const measurements = [
        ...new Set(
          rows
            .map((row) => row._value)
            .filter(Boolean)
        ),
      ].sort();

      console.log(
        "📦 Available measurements:",
        measurements
      );

      return res.json({
        bucket: selectedBucket,
        measurements,
      });
    } catch (err) {
      console.error(
        "❌ Fetch measurements error:",
        err
      );

      const transient =
        isTransientInfluxError(
          err
        );

      return res
        .status(
          transient
            ? 503
            : 500
        )
        .json({
          error:
            transient
              ? "InfluxDB is temporarily unavailable"
              : "Failed to fetch InfluxDB measurements",
          transient,
        });
    }
  }
);

// =====================================
// GET IDS FOR ONE MEASUREMENT
//
// GET /influx/ids?bucket=SmartMill365&measurement=PSTR_bar
// Optional: &tagKey=id
// =====================================
router.get(
  "/influx/ids",
  auth(["superadmin"]),
  async (req, res) => {
    const selectedBucket =
      req.query.bucket || bucket;

    const measurement =
      String(req.query.measurement || "").trim();

    const tagKey =
      req.query.tagKey || "id";

    if (!selectedBucket || !measurement) {
      return res.status(400).json({
        error:
          "Bucket and measurement are required",
      });
    }

    if (!isValidFluxColumnName(tagKey)) {
      return res.status(400).json({
        error: "Invalid tag key",
      });
    }

    try {
      const queryApi =
        influxDB.getQueryApi(org);

      const fluxQuery = `
        import "influxdata/influxdb/schema"

        schema.tagValues(
          bucket: "${escapeFluxString(selectedBucket)}",
          tag: "${escapeFluxString(tagKey)}",
          predicate: (r) =>
            r._measurement == "${escapeFluxString(measurement)}",
          start: ${influxMetadataLookback}
        )
      `;

      const rows =
        await collectRowsWithRetry({
          queryApi,
          fluxQuery,
          label:
            "Influx device-ID discovery",
        });

      const ids = [
        ...new Set(
          rows
            .map((row) => row._value)
            .filter(Boolean)
        ),
      ].sort();

      return res.json({
        bucket: selectedBucket,
        measurement,
        tagKey,
        ids,
      });
    } catch (err) {
      console.error(
        "❌ Fetch Influx IDs error:",
        err
      );

      const transient =
        isTransientInfluxError(
          err
        );

      return res
        .status(
          transient
            ? 503
            : 500
        )
        .json({
          error:
            transient
              ? "InfluxDB is temporarily unavailable"
              : "Failed to fetch InfluxDB IDs",
          transient,
        });
    }
  }
);

// =====================================
// GET FIELD KEYS / CHANNELS
//
// GET /influx/channels?bucket=SmartMill365&measurement=PSTR_bar
// =====================================
router.get(
  "/influx/channels",
  auth(["superadmin", "admin", "editor", "viewer"]),
  async (req, res) => {
    const selectedBucket =
      req.query.bucket || bucket;

    const measurement =
      String(req.query.measurement || "").trim();

    const tagKey =
      req.query.tagKey || "id";

    const tagValue =
      req.query.tagValue || req.query.id;

    if (!selectedBucket || !measurement) {
      return res.status(400).json({
        error:
          "Bucket and measurement are required",
      });
    }

    if (!isValidFluxColumnName(tagKey)) {
      return res.status(400).json({
        error: "Invalid tag key",
      });
    }

    // Organization users may only discover fields for a device
    // explicitly assigned to their own organization.
    if (req.user.role !== "superadmin") {
      if (!tagValue) {
        return res.status(400).json({
          error:
            "tagValue (or id) is required for organization device mapping",
        });
      }

      try {
        const allowed = await canAccessInfluxDevice({
          user: req.user,
          bucketName: selectedBucket,
          measurementName: measurement,
          tagKey,
          tagValue,
        });

        if (!allowed) {
          return res.status(403).json({
            error:
              "You do not have permission to access this Influx device",
          });
        }
      } catch (err) {
        console.error(
          "❌ Influx device access check error:",
          err
        );

        return res.status(500).json({
          error: "Failed to verify Influx device access",
        });
      }
    }

    try {
      const queryApi =
        influxDB.getQueryApi(org);

      const devicePredicate = tagValue
        ? ` and r["${escapeFluxString(tagKey)}"] == "${escapeFluxString(tagValue)}"`
        : "";

      const fluxQuery = `
        import "influxdata/influxdb/schema"

        schema.fieldKeys(
          bucket: "${escapeFluxString(selectedBucket)}",
          predicate: (r) =>
            r._measurement == "${escapeFluxString(measurement)}"${devicePredicate},
          start: ${influxMetadataLookback}
        )
      `;

      const rows =
        await collectRowsWithRetry({
          queryApi,
          fluxQuery,
          label:
            "Influx channel discovery",
        });

      const channels = [
        ...new Set(
          rows
            .map((row) => row._value)
            .filter(Boolean)
        ),
      ].sort();

      return res.json({
        bucket: selectedBucket,
        measurement,
        tagKey,
        tagValue: tagValue || null,

        // `fields` is the preferred SmartMill 365 terminology.
        // `channels` is kept for existing frontend compatibility.
        fields: channels,
        channels,
      });
    } catch (err) {
      console.error(
        "❌ Fetch Influx channels error:",
        err
      );

      const transient =
        isTransientInfluxError(
          err
        );

      return res
        .status(
          transient
            ? 503
            : 500
        )
        .json({
          error:
            transient
              ? "InfluxDB is temporarily unavailable"
              : "Failed to fetch InfluxDB channels",
          transient,
        });
    }
  }
);


router.post(
  "/template-live-data",
  auth(),
  async (req, res) => {
    const {
      influx,
      channelMap,
      dataSources,
      historyWindow = "15m",
      startTime,
      endTime,
      items = [],
      includeHistory = true,
    } = req.body;

    const shouldIncludeHistory =
      includeHistory !== false;

    const normalizedSources =
      normalizeTemplateDataSources({
        influx,
        channelMap,
        dataSources,
      });

    const groups =
      groupTemplateDataSources(
        normalizedSources
      );

    if (!groups.length) {
      return res.status(400).json({
        error:
          "No valid Influx data sources were provided",
      });
    }

    for (const group of groups) {
      const validationError =
        validateTemplateSourceGroup(group);

      if (validationError) {
        return res.status(400).json({
          error: validationError,
          source: {
            bucket: group.bucket,
            measurement:
              group.measurement,
            tagKey: group.tagKey,
            tagValue: group.tagValue,
          },
        });
      }
    }

    // Verify the signed-in user can access every requested device source.
    try {
      const accessChecks =
        await Promise.all(
          groups.map(async (group) => ({
            group,
            allowed:
              await canAccessInfluxDevice({
                user: req.user,
                bucketName: group.bucket,
                measurementName:
                  group.measurement,
                tagKey: group.tagKey,
                tagValue: group.tagValue,
              }),
          }))
        );

      const deniedSource =
        accessChecks.find(
          ({ allowed }) => !allowed
        )?.group;

      if (deniedSource) {
        return res.status(403).json({
          error:
            "You do not have permission to access one or more Influx devices",
          source: {
            bucket: deniedSource.bucket,
            measurement:
              deniedSource.measurement,
            tagKey: deniedSource.tagKey,
            tagValue: deniedSource.tagValue,
          },
        });
      }
    } catch (err) {
      console.error(
        "❌ Template live data device access check error:",
        err
      );

      return res.status(500).json({
        error:
          "Failed to verify Influx device access",
      });
    }

    let historyRangeFlux;
    let rangeDurationMs;
    let rangeDescription;

    if (startTime && endTime) {
      const parsedStart =
        new Date(startTime);

      const parsedEnd =
        new Date(endTime);

      if (
        Number.isNaN(
          parsedStart.getTime()
        ) ||
        Number.isNaN(
          parsedEnd.getTime()
        ) ||
        parsedEnd <= parsedStart
      ) {
        return res.status(400).json({
          error:
            "Invalid startTime/endTime range",
        });
      }

      const safeStart =
        escapeFluxString(
          parsedStart.toISOString()
        );

      const safeEnd =
        escapeFluxString(
          parsedEnd.toISOString()
        );

      historyRangeFlux = `
        |> range(
          start: time(v: "${safeStart}"),
          stop: time(v: "${safeEnd}")
        )
      `;

      rangeDurationMs =
        parsedEnd.getTime() -
        parsedStart.getTime();

      rangeDescription =
        `${parsedStart.toISOString()} to ${parsedEnd.toISOString()}`;
    } else {
      const parsedRelativeRange =
        parseRelativeHistoryWindow(
          historyWindow
        ) ||
        parseRelativeHistoryWindow(
          "15m"
        );

      const safeStart =
        escapeFluxString(
          parsedRelativeRange
            .start
            .toISOString()
        );

      const safeEnd =
        escapeFluxString(
          parsedRelativeRange
            .end
            .toISOString()
        );

      rangeDurationMs =
        parsedRelativeRange.durationMs;

      rangeDescription =
        parsedRelativeRange.requested;

      historyRangeFlux = `
        |> range(
          start: time(v: "${safeStart}"),
          stop: time(v: "${safeEnd}")
        )
      `;
    }

    const aggregateEvery =
      getAggregateEvery(
        rangeDurationMs
      );

    try {
      const queryApi =
        influxDB.getQueryApi(org);

      const [groupResults, sankeyValues] =
        await Promise.all([
          Promise.all(
            groups.map((group) =>
              fetchTemplateSourceGroup({
                queryApi,
                group,
                historyRangeFlux,
                aggregateEvery,
                includeHistory:
                  shouldIncludeHistory,
              })
            )
          ),
          fetchSankeyRuntimeValues({
            queryApi,
            user: req.user,
            items,
          }),
        ]);

      const data = {};
      const fieldTimestamps = {};
      const missingFields = [];
      const returnedFields = [];
      const allLiveTimestamps = [];

      // History rows from separate measurements are merged by timestamp.
      const historyByTimestamp =
        new Map();

      groupResults.forEach(
        ({
          group,
          liveRows,
          historyRows,
        }) => {
          const latestByField =
            new Map();

          liveRows.forEach((row) => {
            const field =
              row?._field;

            const timestamp =
              new Date(
                row?._time
              ).getTime();

            if (
              !field ||
              !Number.isFinite(
                timestamp
              )
            ) {
              return;
            }

            const existing =
              latestByField.get(field);

            if (
              !existing ||
              timestamp >
                existing.timestamp
            ) {
              latestByField.set(
                field,
                {
                  timestamp,
                  value: row?._value,
                }
              );
            }
          });

          group.mappings.forEach(
            ({ dataKey, field }) => {
              const latest =
                latestByField.get(
                  field
                );

              if (!latest) {
                data[dataKey] = 0;
                missingFields.push(
                  dataKey
                );
                return;
              }

              data[dataKey] =
                toNumericValue(
                  latest.value
                );

              fieldTimestamps[
                dataKey
              ] = new Date(
                latest.timestamp
              ).toISOString();

              returnedFields.push(
                dataKey
              );

              allLiveTimestamps.push(
                latest.timestamp
              );
            }
          );

          historyRows.forEach(
            (row) => {
              const timestamp =
                new Date(
                  row?._time
                ).getTime();

              if (
                !Number.isFinite(
                  timestamp
                )
              ) {
                return;
              }

              const existing =
                historyByTimestamp.get(
                  timestamp
                ) || {
                  timestamp,
                  time:
                    new Date(
                      timestamp
                    ).toLocaleTimeString(),
                  date:
                    new Date(
                      timestamp
                    ).toLocaleDateString(),
                };

              group.mappings.forEach(
                ({
                  dataKey,
                  field,
                }) => {
                  if (
                    row[field] !==
                    undefined
                  ) {
                    existing[
                      dataKey
                    ] =
                      toNumericValue(
                        row[field]
                      );
                  }
                }
              );

              historyByTimestamp.set(
                timestamp,
                existing
              );
            }
          );
        }
      );

      const history = [
        ...historyByTimestamp.values(),
      ].sort(
        (a, b) =>
          a.timestamp - b.timestamp
      );

      const liveTimestamp =
        allLiveTimestamps.length
          ? Math.max(
              ...allLiveTimestamps
            )
          : null;

      const oldestLiveTimestamp =
        allLiveTimestamps.length
          ? Math.min(
              ...allLiveTimestamps
            )
          : null;

      const monitorKey = groups
        .map(
          (group) =>
            group.groupKey
        )
        .sort()
        .join("||");

      const previousMonitor =
        liveFetchMonitor.get(
          monitorKey
        );

      const nowMs = Date.now();

      const liveAgeMs =
        liveTimestamp
          ? nowMs - liveTimestamp
          : null;

      const sourceAdvanced =
        Boolean(
          liveTimestamp &&
            (!previousMonitor ||
              liveTimestamp >
                previousMonitor
                  .lastTimestamp)
        );

      const sameTimestampPolls =
        liveTimestamp
          ? sourceAdvanced
            ? 0
            : (
                previousMonitor
                  ?.sameTimestampPolls ||
                0
              ) + 1
          : 0;

      liveFetchMonitor.set(
        monitorKey,
        {
          lastTimestamp:
            liveTimestamp,
          sameTimestampPolls,
          lastCheckedAt: nowMs,
        }
      );

      const ageSeconds =
        liveAgeMs === null
          ? null
          : Math.max(
              0,
              Math.round(
                liveAgeMs / 1000
              )
            );

      let status = "online";
      let statusMessage =
        "Live data is updating normally.";

      if (!liveTimestamp) {
        status = "offline";
        statusMessage =
          "No InfluxDB readings were found in the last 24 hours.";
      } else if (
        ageSeconds > 60
      ) {
        status = "critical";
        statusMessage =
          "Data has not been updated for more than 60 seconds.";
      } else if (
        ageSeconds > 30
      ) {
        status = "warning";
        statusMessage =
          "Data may be delayed.";
      } else if (
        missingFields.length > 0
      ) {
        status = "warning";
        statusMessage =
          "Some configured sensor fields are missing.";
      }

      const liveStatus = {
        status,
        message: statusMessage,

        sourceTimestamp:
          liveTimestamp
            ? new Date(
                liveTimestamp
              ).toISOString()
            : null,

        oldestFieldTimestamp:
          oldestLiveTimestamp
            ? new Date(
                oldestLiveTimestamp
              ).toISOString()
            : null,

        ageSeconds,

        isFresh:
          liveAgeMs !== null &&
          liveAgeMs <= 30 * 1000,

        sourceAdvanced,
        sameTimestampPolls,

        returnedFields,
        returnedFieldCount:
          returnedFields.length,

        expectedFieldCount:
          Object.keys(
            normalizedSources
          ).length,

        missingFields,
        fieldTimestamps,

        historyNewest:
          history.at(-1)
            ? new Date(
                history.at(-1)
                  .timestamp
              ).toISOString()
            : null,
      };

      const logs =
        buildRuntimeLogs({
          req,
          monitorKey,
          items,
          data,
          liveStatus,
          fieldTimestamps,
          liveTimestamp,
        });

      console.log(
        "📊 SmartMill Influx fetch:",
        {
          sourceGroups:
            groups.length,
          requestedRange:
            rangeDescription,
          aggregateEvery,
          status:
            liveStatus.status,
          liveTimestamp:
            liveStatus
              .sourceTimestamp,
          liveAgeSeconds:
            liveStatus.ageSeconds,
          returnedFields:
            `${liveStatus.returnedFieldCount}/${liveStatus.expectedFieldCount}`,
          missingFields:
            liveStatus
              .missingFields,
          historyCount:
            history.length,
          sankeyItems:
            Object.keys(
              sankeyValues || {}
            ).length,
          logCount:
            logs.length,
        }
      );

      return res.json({
        timestamp:
          liveTimestamp
            ? new Date(
                liveTimestamp
              ).toISOString()
            : null,

        liveStatus,

        // New source-aware response.
        dataSources:
          normalizedSources,

        // Kept for older Dashboard code that expects one top-level
        // Influx source. It is populated only when all data comes
        // from one group.
        influx:
          groups.length === 1
            ? {
                bucket:
                  groups[0].bucket,
                measurement:
                  groups[0]
                    .measurement,
                tagKey:
                  groups[0].tagKey,
                tagValue:
                  groups[0].tagValue,
              }
            : null,

        range: {
          requested:
            rangeDescription,
          aggregateEvery,
        },

        data,
        history,
        sankeyValues,
        logs,

        message:
          liveTimestamp
            ? undefined
            : "No recent data found for the configured Influx source(s)",
      });
    } catch (err) {
      console.error(
        "❌ Template live data error:",
        err
      );

      const transient =
        isTransientInfluxError(
          err
        );

      return res
        .status(
          transient
            ? 503
            : 500
        )
        .json({
          error:
            transient
              ? "InfluxDB connection is temporarily unavailable"
              : "Failed to fetch template live data",
          transient,
          detail:
            process.env.NODE_ENV ===
            "development"
              ? err.message
              : undefined,
        });
    }
  }
);

export default router;
