import express from "express";
import { dbQuery } from "../config/db.js";
import {
  influxDB,
  org,
} from "../config/influx.js";
import auth from "../middleware/auth.js";
import {
  escapeFluxString,
  isValidFluxColumnName,
} from "../utils/helpers.js";
import {
  discoverSmartMillLogicalDevices,
  getLogicalDeviceKey,
  collectRowsWithRetry,
} from "../services/influxService.js";

const router = express.Router();

// =====================================
// ORGANIZATION INFLUX DEVICE ROUTES
// =====================================

// Returns devices assigned to the signed-in organization.
// Superadmins can see all device assignments, optionally filtered by org_id.
router.get(
  "/influx/allowed-devices",
  auth(["superadmin", "admin", "editor", "viewer"]),
  async (req, res) => {
    try {
      const { role, org_id } = req.user;
      const requestedOrgId = req.query.org_id;

      let sql = `
        SELECT
          d.id,
          d.org_id,
          o.name AS org_name,
          d.bucket_name,
          d.measurement_name,
          d.tag_key,
          d.tag_value,
          d.device_name,
          d.created_at
        FROM organization_influx_devices d
        JOIN organizations o
          ON d.org_id = o.id
      `;

      const params = [];

      if (role !== "superadmin") {
        if (!org_id) {
          return res.status(403).json({
            error: "User has no organization assigned",
          });
        }

        sql += `
          WHERE d.org_id = ?
        `;
        params.push(org_id);
      } else if (requestedOrgId) {
        sql += `
          WHERE d.org_id = ?
        `;
        params.push(requestedOrgId);
      }

      sql += `
        ORDER BY
          o.name ASC,
          d.device_name ASC,
          d.measurement_name ASC,
          d.tag_value ASC
      `;

      const devices = await dbQuery(sql, params);

      return res.json(devices);
    } catch (err) {
      console.error("❌ Fetch allowed Influx devices error:", err);

      return res.status(500).json({
        error: "Failed to fetch allowed Influx devices",
      });
    }
  }
);

// Superadmin device-assignment management.
router.get(
  "/organization-influx-devices",
  auth(["superadmin"]),
  async (req, res) => {
    try {
      const { org_id: requestedOrgId } = req.query;

      let sql = `
        SELECT
          d.id,
          d.org_id,
          o.name AS org_name,
          d.bucket_name,
          d.measurement_name,
          d.tag_key,
          d.tag_value,
          d.device_name,
          d.created_at
        FROM organization_influx_devices d
        JOIN organizations o
          ON d.org_id = o.id
      `;

      const params = [];

      if (requestedOrgId) {
        sql += `
          WHERE d.org_id = ?
        `;
        params.push(requestedOrgId);
      }

      sql += `
        ORDER BY
          o.name ASC,
          d.device_name ASC,
          d.measurement_name ASC,
          d.tag_value ASC
      `;

      return res.json(await dbQuery(sql, params));
    } catch (err) {
      console.error("❌ Fetch organization Influx devices error:", err);

      return res.status(500).json({
        error: "Failed to fetch organization Influx devices",
      });
    }
  }
);


// =====================================
// BULK DEVICE-ID ASSIGNMENT
// =====================================
//
// Device Management selects IDs directly from InfluxDB, not from
// measurement-group cards. The server resolves every real measurement that
// belongs to each selected Device ID and creates the existing measurement-
// level permission rows internally so the runtime permission model remains
// backward compatible.
//
// POST /organization-influx-devices/bulk-device-ids
// {
//   org_id,
//   bucket_name,
//   tag_key: "id",
//   device_ids: ["SAMYSK_POM_250048", ...]
// }
// =====================================
router.post(
  "/organization-influx-devices/bulk-device-ids",
  auth(["superadmin"]),
  async (req, res) => {
    const orgId = req.body?.org_id;
    const bucketName = String(
      req.body?.bucket_name || ""
    ).trim();
    const tagKey = String(
      req.body?.tag_key || "id"
    ).trim();
    const deviceIds = [
      ...new Set(
        (
          Array.isArray(
            req.body?.device_ids
          )
            ? req.body.device_ids
            : []
        )
          .map((value) =>
            String(value || "").trim()
          )
          .filter(Boolean)
      ),
    ];

    if (
      !orgId ||
      !bucketName ||
      !deviceIds.length
    ) {
      return res.status(400).json({
        error:
          "org_id, bucket_name and at least one Device ID are required",
      });
    }

    if (
      !isValidFluxColumnName(
        tagKey
      )
    ) {
      return res.status(400).json({
        error: "Invalid Influx tag key",
      });
    }

    if (deviceIds.length > 200) {
      return res.status(400).json({
        error:
          "Too many Device IDs in one request",
      });
    }

    try {
      const organizations =
        await dbQuery(
          `
          SELECT id
          FROM organizations
          WHERE id = ?
          LIMIT 1
          `,
          [orgId]
        );

      if (!organizations.length) {
        return res.status(404).json({
          error: "Organization not found",
        });
      }

      const queryApi =
        influxDB.getQueryApi(org);

      const measurementCache =
        new Map();

      const getMeasurementsForDevice =
        async (deviceId) => {
          if (
            measurementCache.has(
              deviceId
            )
          ) {
            return measurementCache.get(
              deviceId
            );
          }

          // schema.measurements() can filter by tags, which gives us the
          // complete measurement list for this Device ID without exposing
          // measurement selection in Device Management.
          const fluxQuery = `
            import "influxdata/influxdb/schema"

            schema.measurements(
              bucket: "${escapeFluxString(bucketName)}",
              start: -365d,
              predicate: (r) =>
                r["${escapeFluxString(tagKey)}"] == "${escapeFluxString(deviceId)}"
            )
          `;

          const rows =
            await collectRowsWithRetry({
              queryApi,
              fluxQuery,
              label:
                `Influx measurements for Device ID ${deviceId}`,
            });

          const measurements = [
            ...new Set(
              rows
                .map((row) =>
                  row._value ||
                  row._measurement
                )
                .filter(Boolean)
                .map(String)
            ),
          ].sort();

          measurementCache.set(
            deviceId,
            measurements
          );

          return measurements;
        };

      let assigned = 0;
      let skipped = 0;
      const invalid = [];

      for (const deviceId of deviceIds) {
        let measurements = [];

        try {
          measurements =
            await getMeasurementsForDevice(
              deviceId
            );
        } catch (discoveryError) {
          invalid.push({
            tag_value: deviceId,
            reason:
              discoveryError?.message ||
              "Failed to discover measurements for this Device ID",
          });
          continue;
        }

        if (!measurements.length) {
          invalid.push({
            tag_value: deviceId,
            reason:
              "Device ID was not found in the selected Influx bucket",
          });
          continue;
        }

        for (
          const measurementName
          of measurements
        ) {
          const existing =
            await dbQuery(
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
                orgId,
                bucketName,
                measurementName,
                tagKey,
                deviceId,
              ]
            );

          if (existing.length) {
            skipped += 1;
            continue;
          }

          try {
            await dbQuery(
              `
              INSERT INTO organization_influx_devices
              (
                org_id,
                bucket_name,
                measurement_name,
                tag_key,
                tag_value,
                device_name
              )
              VALUES (?, ?, ?, ?, ?, ?)
              `,
              [
                orgId,
                bucketName,
                measurementName,
                tagKey,
                deviceId,
                deviceId,
              ]
            );

            assigned += 1;
          } catch (insertError) {
            if (
              insertError.code ===
              "ER_DUP_ENTRY"
            ) {
              skipped += 1;
              continue;
            }

            throw insertError;
          }
        }
      }

      return res.status(201).json({
        success: true,
        device_ids_requested:
          deviceIds.length,
        assigned,
        skipped,
        invalid,
        message:
          `${deviceIds.length} Device ID assignment request(s) processed`,
      });
    } catch (err) {
      console.error(
        "❌ Bulk Device ID assignment error:",
        err
      );

      return res.status(500).json({
        error:
          "Failed to assign Device IDs",
      });
    }
  }
);


// =====================================
// BULK LOGICAL DEVICE ASSIGNMENT
// =====================================
//
// The browser selects ONE logical equipment card.
// The server re-discovers the real measurement + device-ID relationships
// from InfluxDB and inserts the missing measurement-level permission rows.
//
// The client is therefore NOT trusted to supply measurement_names.
//
router.post(
  "/organization-influx-devices/bulk-logical",
  auth(["superadmin"]),
  async (req, res) => {
    const {
      org_id,
      devices,
    } = req.body;

    if (
      !org_id ||
      !Array.isArray(devices) ||
      devices.length === 0
    ) {
      return res.status(400).json({
        error:
          "org_id and at least one logical device are required",
      });
    }

    try {
      const organizations =
        await dbQuery(
          `
          SELECT id
          FROM organizations
          WHERE id = ?
          LIMIT 1
          `,
          [org_id]
        );

      if (
        !organizations.length
      ) {
        return res.status(404).json({
          error:
            "Organization not found",
        });
      }

      // Discover each bucket/tag-key combination only once.
      const discoveryCache =
        new Map();

      const getDiscovery = async ({
        bucketName,
        tagKey,
      }) => {
        const cacheKey =
          `${bucketName}::${tagKey}`;

        if (
          discoveryCache.has(
            cacheKey
          )
        ) {
          return discoveryCache.get(
            cacheKey
          );
        }

        const queryApi =
          influxDB.getQueryApi(
            org
          );

        const discovered =
          await discoverSmartMillLogicalDevices({
            queryApi,
            bucketName,
            tagKey,
          });

        discoveryCache.set(
          cacheKey,
          discovered
        );

        return discovered;
      };

      let assigned = 0;
      let skipped = 0;
      const invalid = [];

      for (
        const requestedDevice
        of devices
      ) {
        const bucketName =
          String(
            requestedDevice
              ?.bucket_name || ""
          ).trim();

        const tagKey =
          String(
            requestedDevice
              ?.tag_key || "id"
          ).trim();

        const tagValue =
          String(
            requestedDevice
              ?.tag_value || ""
          ).trim();

        const deviceType =
          String(
            requestedDevice
              ?.device_type || ""
          ).trim();

        if (
          !bucketName ||
          !tagValue ||
          !deviceType ||
          !isValidFluxColumnName(
            tagKey
          )
        ) {
          invalid.push({
            device_type:
              deviceType || null,
            tag_value:
              tagValue || null,
            reason:
              "Invalid logical device identity",
          });

          continue;
        }

        const discovered =
          await getDiscovery({
            bucketName,
            tagKey,
          });

        const requestedKey =
          getLogicalDeviceKey({
            deviceType,
            bucketName,
            tagKey,
            tagValue,
          });

        const actual =
          discovered.find(
            (device) =>
              device.key ===
              requestedKey
          );

        if (!actual) {
          invalid.push({
            device_type:
              deviceType,
            tag_value:
              tagValue,
            reason:
              "Logical device was not found in InfluxDB",
          });

          continue;
        }

        const deviceName =
          String(
            requestedDevice
              ?.device_name || ""
          ).trim() ||
          `${actual.device_type_label} · ${actual.tag_value}`;

        for (
          const measurementName
          of actual.measurement_names
        ) {
          const existing =
            await dbQuery(
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
                org_id,
                bucketName,
                measurementName,
                tagKey,
                tagValue,
              ]
            );

          if (
            existing.length
          ) {
            skipped += 1;
            continue;
          }

          try {
            await dbQuery(
              `
              INSERT INTO organization_influx_devices
              (
                org_id,
                bucket_name,
                measurement_name,
                tag_key,
                tag_value,
                device_name
              )
              VALUES (?, ?, ?, ?, ?, ?)
              `,
              [
                org_id,
                bucketName,
                measurementName,
                tagKey,
                tagValue,
                deviceName,
              ]
            );

            assigned += 1;
          } catch (
            insertError
          ) {
            if (
              insertError.code ===
              "ER_DUP_ENTRY"
            ) {
              skipped += 1;
              continue;
            }

            throw insertError;
          }
        }
      }

      return res.status(201).json({
        success: true,
        assigned,
        skipped,
        invalid,
        message:
          `${assigned} measurement permission row(s) assigned`,
      });
    } catch (err) {
      console.error(
        "❌ Bulk logical device assignment error:",
        err
      );

      return res.status(500).json({
        error:
          "Failed to assign logical devices",
      });
    }
  }
);

// Remove the underlying measurement-level permission rows that make up
// one or more logical-device cards.
router.post(
  "/organization-influx-devices/bulk-remove",
  auth(["superadmin"]),
  async (req, res) => {
    const assignmentIds = [
      ...new Set(
        (
          Array.isArray(
            req.body
              ?.assignment_ids
          )
            ? req.body
                .assignment_ids
            : []
        )
          .map((value) =>
            Number(value)
          )
          .filter(
            (value) =>
              Number.isInteger(
                value
              ) &&
              value > 0
          )
      ),
    ];

    if (
      !assignmentIds.length
    ) {
      return res.status(400).json({
        error:
          "At least one assignment ID is required",
      });
    }

    if (
      assignmentIds.length >
      500
    ) {
      return res.status(400).json({
        error:
          "Too many assignments in one request",
      });
    }

    try {
      let removed = 0;

      for (
        const assignmentId
        of assignmentIds
      ) {
        const result =
          await dbQuery(
            `
            DELETE FROM organization_influx_devices
            WHERE id = ?
            `,
            [assignmentId]
          );

        removed +=
          Number(
            result
              ?.affectedRows || 0
          );
      }

      return res.json({
        success: true,
        removed,
      });
    } catch (err) {
      console.error(
        "❌ Bulk logical device removal error:",
        err
      );

      return res.status(500).json({
        error:
          "Failed to remove logical device assignments",
      });
    }
  }
);

router.post(
  "/organization-influx-devices",
  auth(["superadmin"]),
  async (req, res) => {
    const {
      org_id,
      bucket_name,
      measurement_name,
      tag_key = "id",
      tag_value,
      device_name,
    } = req.body;

    if (
      !org_id ||
      !bucket_name?.trim() ||
      !measurement_name?.trim() ||
      !tag_key?.trim() ||
      !tag_value?.trim()
    ) {
      return res.status(400).json({
        error:
          "org_id, bucket_name, measurement_name, tag_key and tag_value are required",
      });
    }

    if (!isValidFluxColumnName(tag_key.trim())) {
      return res.status(400).json({
        error: "Invalid Influx tag key",
      });
    }

    try {
      const organizations = await dbQuery(
        `
        SELECT id
        FROM organizations
        WHERE id = ?
        LIMIT 1
        `,
        [org_id]
      );

      if (!organizations.length) {
        return res.status(404).json({
          error: "Organization not found",
        });
      }

      const result = await dbQuery(
        `
        INSERT INTO organization_influx_devices
        (
          org_id,
          bucket_name,
          measurement_name,
          tag_key,
          tag_value,
          device_name
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          org_id,
          bucket_name.trim(),
          measurement_name.trim(),
          tag_key.trim(),
          tag_value.trim(),
          device_name?.trim() || null,
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Influx device assigned to organization",
        deviceId: result.insertId,
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error:
            "This Influx device is already assigned to this organization",
        });
      }

      console.error("❌ Create organization Influx device error:", err);

      return res.status(500).json({
        error: "Failed to assign Influx device",
      });
    }
  }
);

router.delete(
  "/organization-influx-devices/:id",
  auth(["superadmin"]),
  async (req, res) => {
    try {
      const result = await dbQuery(
        `
        DELETE FROM organization_influx_devices
        WHERE id = ?
        `,
        [req.params.id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({
          error: "Influx device assignment not found",
        });
      }

      return res.json({
        success: true,
        message: "Influx device assignment removed",
      });
    } catch (err) {
      console.error("❌ Delete organization Influx device error:", err);

      return res.status(500).json({
        error: "Failed to remove Influx device assignment",
      });
    }
  }
);

export default router;
