import express from "express";
import "dotenv/config";
import auth from "../middleware/auth.js";
import { influxDB, org, bucket, influxTimeout } from "../config/influx.js";
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
} from "../services/influxService.js";
const router = express.Router();

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

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Token ${process.env.INFLUX_TOKEN}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(influxTimeout),
      });

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
      console.error("❌ Fetch Influx buckets error:", err);

      return res.status(500).json({
        error: "Failed to fetch InfluxDB buckets",
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
          start: -365d
        )
      `;

      const rows =
        await queryApi.collectRows(fluxQuery);

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

      return res.status(500).json({
        error:
          "Failed to fetch InfluxDB measurements",
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
          start: -365d
        )
      `;

      const rows =
        await queryApi.collectRows(fluxQuery);

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

      return res.status(500).json({
        error: "Failed to fetch InfluxDB IDs",
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
  auth(["superadmin", "admin"]),
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

    // Organization admins may only discover fields for a device
    // explicitly assigned to their own organization.
    if (req.user.role === "admin") {
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
          start: -365d
        )
      `;

      const rows =
        await queryApi.collectRows(fluxQuery);

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

      return res.status(500).json({
        error:
          "Failed to fetch InfluxDB channels",
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
    } = req.body;

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
      for (const group of groups) {
        const allowed =
          await canAccessInfluxDevice({
            user: req.user,
            bucketName: group.bucket,
            measurementName:
              group.measurement,
            tagKey: group.tagKey,
            tagValue: group.tagValue,
          });

        if (!allowed) {
          return res.status(403).json({
            error:
              "You do not have permission to access one or more Influx devices",
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

      const groupResults =
        await Promise.all(
          groups.map((group) =>
            fetchTemplateSourceGroup({
              queryApi,
              group,
              historyRangeFlux,
              aggregateEvery,
            })
          )
        );

      const sankeyValues =
        await fetchSankeyRuntimeValues({
          queryApi,
          user: req.user,
          items,
        });

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

      return res.status(500).json({
        error:
          "Failed to fetch template live data",
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
