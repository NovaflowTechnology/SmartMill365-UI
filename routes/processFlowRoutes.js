import express from "express";
import { dbQuery } from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

const WRITE_ROLES = [
  "superadmin",
  "admin",
  "editor",
];

const parseTopology = (value) => {
  if (!value) {
    return {
      nodes: [],
      connections: [],
      mode: "hybrid",
      dataSources: {},
    };
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {
      nodes: [],
      connections: [],
      mode: "hybrid",
      dataSources: {},
    };
  }
};

const normalizeFlowRow = (row) => ({
  ...row,
  topology: parseTopology(row.topology),
});

const resolveFlowOrgId = (req) => {
  const { role, org_id } = req.user;

  if (role === "superadmin") {
    return req.body?.org_id || org_id || null;
  }

  return org_id || null;
};

const getFlowForUser = async (id, user) => {
  const { role, org_id } = user;

  if (role === "superadmin") {
    const rows = await dbQuery(
      `
      SELECT pf.*, o.name AS organization_name
      FROM process_flows pf
      LEFT JOIN organizations o
        ON o.id = pf.org_id
      WHERE pf.id = ?
      LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  }

  const rows = await dbQuery(
    `
    SELECT pf.*, o.name AS organization_name
    FROM process_flows pf
    LEFT JOIN organizations o
      ON o.id = pf.org_id
    WHERE pf.id = ?
      AND pf.org_id = ?
    LIMIT 1
    `,
    [id, org_id]
  );

  return rows[0] || null;
};

// =====================================
// PROCESS FLOW LIST
// =====================================
router.get(
  "/process-flows",
  auth(),
  async (req, res) => {
    try {
      const { role, org_id } = req.user;

      const rows =
        role === "superadmin"
          ? await dbQuery(
              `
              SELECT
                pf.*,
                o.name AS organization_name
              FROM process_flows pf
              LEFT JOIN organizations o
                ON o.id = pf.org_id
              ORDER BY pf.updated_at DESC, pf.id DESC
              `
            )
          : await dbQuery(
              `
              SELECT
                pf.*,
                o.name AS organization_name
              FROM process_flows pf
              LEFT JOIN organizations o
                ON o.id = pf.org_id
              WHERE pf.org_id = ?
              ORDER BY pf.updated_at DESC, pf.id DESC
              `,
              [org_id]
            );

      return res.json(
        rows.map(normalizeFlowRow)
      );
    } catch (error) {
      console.error(
        "❌ Fetch process flows error:",
        error
      );

      return res.status(500).json({
        error: "Failed to fetch process flows",
      });
    }
  }
);

// =====================================
// GET ONE PROCESS FLOW
// =====================================
router.get(
  "/process-flows/:id",
  auth(),
  async (req, res) => {
    try {
      const flow = await getFlowForUser(
        req.params.id,
        req.user
      );

      if (!flow) {
        return res.status(404).json({
          error:
            "Process flow not found or unavailable",
        });
      }

      return res.json(
        normalizeFlowRow(flow)
      );
    } catch (error) {
      console.error(
        "❌ Fetch process flow error:",
        error
      );

      return res.status(500).json({
        error: "Failed to fetch process flow",
      });
    }
  }
);

// =====================================
// CREATE PROCESS FLOW
// =====================================
router.post(
  "/process-flows",
  auth(WRITE_ROLES),
  async (req, res) => {
    try {
      const {
        name,
        description = "",
        topology = {},
      } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({
          error: "Process flow name is required",
        });
      }

      const orgId = resolveFlowOrgId(req);

      if (!orgId) {
        return res.status(400).json({
          error:
            "An organization is required for this process flow",
        });
      }

      const result = await dbQuery(
        `
        INSERT INTO process_flows
        (
          name,
          description,
          topology,
          org_id,
          created_by
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          String(name).trim(),
          String(description || "").trim(),
          JSON.stringify(topology || {}),
          orgId,
          req.user.id,
        ]
      );

      const flow = await getFlowForUser(
        result.insertId,
        req.user
      );

      return res.status(201).json(
        normalizeFlowRow(flow)
      );
    } catch (error) {
      console.error(
        "❌ Create process flow error:",
        error
      );

      return res.status(500).json({
        error: "Failed to create process flow",
      });
    }
  }
);

// =====================================
// UPDATE PROCESS FLOW
// =====================================
router.put(
  "/process-flows/:id",
  auth(WRITE_ROLES),
  async (req, res) => {
    try {
      const existing = await getFlowForUser(
        req.params.id,
        req.user
      );

      if (!existing) {
        return res.status(404).json({
          error:
            "Process flow not found or unavailable",
        });
      }

      const nextName =
        req.body?.name !== undefined
          ? String(req.body.name).trim()
          : existing.name;

      if (!nextName) {
        return res.status(400).json({
          error: "Process flow name is required",
        });
      }

      const nextDescription =
        req.body?.description !== undefined
          ? String(
              req.body.description || ""
            ).trim()
          : existing.description || "";

      const nextTopology =
        req.body?.topology !== undefined
          ? req.body.topology || {}
          : parseTopology(existing.topology);

      await dbQuery(
        `
        UPDATE process_flows
        SET
          name = ?,
          description = ?,
          topology = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [
          nextName,
          nextDescription,
          JSON.stringify(nextTopology),
          req.params.id,
        ]
      );

      const updated = await getFlowForUser(
        req.params.id,
        req.user
      );

      return res.json(
        normalizeFlowRow(updated)
      );
    } catch (error) {
      console.error(
        "❌ Update process flow error:",
        error
      );

      return res.status(500).json({
        error: "Failed to update process flow",
      });
    }
  }
);

// =====================================
// DELETE PROCESS FLOW
// =====================================
router.delete(
  "/process-flows/:id",
  auth(WRITE_ROLES),
  async (req, res) => {
    try {
      const existing = await getFlowForUser(
        req.params.id,
        req.user
      );

      if (!existing) {
        return res.status(404).json({
          error:
            "Process flow not found or unavailable",
        });
      }

      await dbQuery(
        `
        DELETE FROM process_flows
        WHERE id = ?
        `,
        [req.params.id]
      );

      return res.json({
        success: true,
        message:
          "Process flow deleted successfully",
      });
    } catch (error) {
      console.error(
        "❌ Delete process flow error:",
        error
      );

      return res.status(500).json({
        error: "Failed to delete process flow",
      });
    }
  }
);

export default router;
