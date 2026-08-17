import express from "express";
import { dbQuery } from "../config/db.js";
import auth from "../middleware/auth.js";
import { isValidFluxColumnName } from "../utils/helpers.js";
const router = express.Router();

// =====================================
// ORGANIZATION INFLUX DEVICE ROUTES
// =====================================

// Returns devices assigned to the signed-in organization.
// Superadmins can see all device assignments, optionally filtered by org_id.
router.get(
  "/influx/allowed-devices",
  auth(["superadmin", "admin"]),
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

      if (role === "admin") {
        if (!org_id) {
          return res.status(403).json({
            error: "Admin has no organization assigned",
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
