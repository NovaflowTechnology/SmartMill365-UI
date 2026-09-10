import express from "express";
import db, { dbQuery } from "../config/db.js";
import auth from "../middleware/auth.js";
import { parseTemplateLayout } from "../utils/helpers.js";
import {
  findUnauthorizedTemplateDeviceSources,
  getTemplateGridDimensions,
} from "../utils/templateDeviceSources.js";
const router = express.Router();

// =====================================
// TEMPLATE ROUTES
// =====================================

// CREATE TEMPLATE
router.post(
  "/templates",
  auth(["admin", "superadmin"]),
  (req, res) => {
    const { name, layout } = req.body;

    const { id, org_id, role } = req.user;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Template name is required",
      });
    }

    const templateOrgId =
      role === "superadmin"
        ? req.body.org_id || org_id || null
        : org_id;

    db.query(
      `
      INSERT INTO templates
      (name, layout, org_id, created_by)
      VALUES (?, ?, ?, ?)
      `,
      [
        name.trim(),
        JSON.stringify(layout || {}),
        templateOrgId,
        id,
      ],
      (err, result) => {
        if (err) {
          console.error("❌ Create template error:", err);

          return res.status(500).json({
            error: "Failed to create template",
          });
        }

        const templateId = result.insertId;

        // Admin-created templates must also be recorded in org_templates.
        // The non-superadmin template list reads from this assignment table.
        if (role === "admin" && org_id) {
          db.query(
            `
            INSERT INTO org_templates
            (org_id, template_id)
            VALUES (?, ?)
            `,
            [org_id, templateId],
            (assignErr) => {
              if (assignErr) {
                console.error(
                  "❌ Auto-assign template error:",
                  assignErr
                );

                // Avoid leaving an unusable template behind when assignment fails.
                db.query(
                  `
                  DELETE FROM templates
                  WHERE id = ?
                  `,
                  [templateId],
                  () => {}
                );

                return res.status(500).json({
                  error:
                    "Template was created but could not be assigned to your organization",
                });
              }

              return res.json({
                success: true,
                message:
                  "Template created and assigned to your organization",
                templateId,
              });
            }
          );

          return;
        }

        return res.json({
          success: true,
          message: "Template created",
          templateId,
        });
      }
    );
  }
);

// GET ALL TEMPLATES
router.get("/templates", auth(), (req, res) => {
  const { role, org_id } = req.user;

  if (role === "superadmin") {
    db.query(
      `
      SELECT *
      FROM templates
      ORDER BY id DESC
      `,
      (err, results) => {
        if (err) {
          console.error(
            "❌ Fetch templates error:",
            err
          );

          return res.status(500).json({
            error: "Failed to fetch templates",
          });
        }

        return res.json(
          results.map(parseTemplateLayout)
        );
      }
    );

    return;
  }

  db.query(
    `
    SELECT t.*
    FROM templates t
    JOIN org_templates ot
      ON t.id = ot.template_id
    WHERE ot.org_id = ?
    ORDER BY t.id DESC
    `,
    [org_id],
    (err, results) => {
      if (err) {
        console.error(
          "❌ Fetch assigned templates error:",
          err
        );

        return res.status(500).json({
          error: "Failed to fetch templates",
        });
      }

      return res.json(
        results.map(parseTemplateLayout)
      );
    }
  );
});

// Editors may change only the widget layout of an assigned template. Template
// identity, ownership, grid dimensions, deletion and assignment remain admin
// operations handled by their existing routes.
router.patch(
  "/templates/:id/layout",
  auth(["editor"]),
  async (req, res) => {
    const templateId = Number(req.params.id);
    const { org_id: orgId } = req.user;
    const bodyKeys = Object.keys(req.body || {});
    const layout = req.body?.layout;

    if (!Number.isInteger(templateId) || templateId <= 0) {
      return res.status(400).json({
        error: "A valid template ID is required",
      });
    }

    if (!orgId) {
      return res.status(403).json({
        error: "Editor has no organization assigned",
      });
    }

    if (
      bodyKeys.length !== 1 ||
      bodyKeys[0] !== "layout" ||
      !layout ||
      typeof layout !== "object" ||
      Array.isArray(layout)
    ) {
      return res.status(400).json({
        error: "This operation accepts only a template layout",
      });
    }

    try {
      const templates = await dbQuery(
        `
        SELECT t.id, t.layout
        FROM templates t
        INNER JOIN org_templates ot
          ON ot.template_id = t.id
        WHERE t.id = ?
          AND ot.org_id = ?
        LIMIT 1
        `,
        [templateId, orgId]
      );

      if (!templates.length) {
        return res.status(403).json({
          error: "Template not found or not assigned to your organization",
        });
      }

      const currentGrid = getTemplateGridDimensions(templates[0].layout);
      const requestedRows =
        layout.rows === undefined ? currentGrid.rows : Number(layout.rows);
      const requestedCols =
        layout.cols === undefined ? currentGrid.cols : Number(layout.cols);

      if (
        requestedRows !== currentGrid.rows ||
        requestedCols !== currentGrid.cols
      ) {
        return res.status(403).json({
          error: "Editors cannot change template grid dimensions",
        });
      }

      const allowedRows = await dbQuery(
        `
        SELECT
          bucket_name,
          measurement_name,
          tag_key,
          tag_value
        FROM organization_influx_devices
        WHERE org_id = ?
        `,
        [orgId]
      );

      const unauthorizedSources = findUnauthorizedTemplateDeviceSources(
        layout,
        allowedRows.map((source) => ({
          bucket: String(source.bucket_name || "").trim(),
          measurement: String(source.measurement_name || "").trim(),
          tagKey: String(source.tag_key || "id").trim() || "id",
          tagValue: String(source.tag_value || "").trim(),
        }))
      );

      if (unauthorizedSources.length) {
        return res.status(403).json({
          error:
            "The layout contains a data source that is not permitted for your organization",
        });
      }

      const editorLayout = {
        ...layout,
        rows: currentGrid.rows,
        cols: currentGrid.cols,
      };

      await dbQuery(
        `
        UPDATE templates
        SET layout = ?
        WHERE id = ?
          AND EXISTS (
            SELECT 1
            FROM org_templates ot
            WHERE ot.template_id = templates.id
              AND ot.org_id = ?
          )
        `,
        [JSON.stringify(editorLayout), templateId, orgId]
      );

      return res.json({
        success: true,
        message: "Template layout updated",
      });
    } catch (err) {
      console.error("Editor template layout update error:", err);

      return res.status(500).json({
        error: "Failed to update template layout",
      });
    }
  }
);

// UPDATE TEMPLATE
router.put(
  "/templates/:id",
  auth(["admin", "superadmin"]),
  (req, res) => {
    const { name, layout } = req.body;
    const { role, org_id } = req.user;
    const templateId = req.params.id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Template name is required",
      });
    }

    let sql = `
      UPDATE templates
      SET name = ?, layout = ?
      WHERE id = ?
    `;

    const params = [
      name.trim(),
      JSON.stringify(layout || {}),
      templateId,
    ];

    if (role === "admin") {
      sql += `
        AND org_id = ?
      `;

      params.push(org_id);
    }

    db.query(
      sql,
      params,
      (err, result) => {
        if (err) {
          console.error(
            "❌ Update template error:",
            err
          );

          return res.status(500).json({
            error: "Failed to update template",
          });
        }

        if (result.affectedRows === 0) {
          return res.status(403).json({
            error:
              "Template not found or not allowed",
          });
        }

        return res.json({
          success: true,
          message: "Template updated",
        });
      }
    );
  }
);

// DELETE TEMPLATE
router.delete(
  "/templates/:id",
  auth(["admin", "superadmin"]),
  async (req, res) => {
    const templateId = req.params.id;
    const { role, org_id } = req.user;

    try {
      let checkSql = `
        SELECT id
        FROM templates
        WHERE id = ?
      `;

      const checkParams = [templateId];

      if (role === "admin") {
        checkSql += `
          AND org_id = ?
        `;

        checkParams.push(org_id);
      }

      const templates = await dbQuery(
        checkSql,
        checkParams
      );

      if (!templates.length) {
        return res.status(403).json({
          error:
            "Template not found or not allowed",
        });
      }

      db.beginTransaction(async (txErr) => {
        if (txErr) {
          console.error(
            "❌ Start template deletion transaction error:",
            txErr
          );

          return res.status(500).json({
            error: "Failed to start transaction",
          });
        }

        try {
          await dbQuery(
            `
            DELETE FROM org_templates
            WHERE template_id = ?
            `,
            [templateId]
          );

          await dbQuery(
            `
            UPDATE users
            SET favorite_template_id = NULL
            WHERE favorite_template_id = ?
            `,
            [templateId]
          );

          const result = await dbQuery(
            `
            DELETE FROM templates
            WHERE id = ?
            `,
            [templateId]
          );

          if (result.affectedRows === 0) {
            return db.rollback(() => {
              return res.status(404).json({
                error: "Template not found",
              });
            });
          }

          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => {
                console.error(
                  "❌ Template delete commit error:",
                  commitErr
                );

                return res.status(500).json({
                  error:
                    "Failed to complete template deletion",
                });
              });
            }

            return res.json({
              success: true,
              message:
                "Template deleted successfully",
            });
          });
        } catch (err) {
          return db.rollback(() => {
            console.error(
              "❌ Template delete transaction error:",
              err
            );

            return res.status(500).json({
              error: "Failed to delete template",
            });
          });
        }
      });
    } catch (err) {
      console.error(
        "❌ Template ownership check error:",
        err
      );

      return res.status(500).json({
        error: "Failed to check template",
      });
    }
  }
);

// =====================================
// FAVOURITE TEMPLATE
// =====================================
router.put(
  "/users/favorite-template",
  auth(),
  (req, res) => {
    const { template_id } = req.body;

    const {
      id: userId,
      role,
      org_id,
    } = req.user;

    if (!template_id) {
      return res.status(400).json({
        error: "Template ID is required",
      });
    }

    const updateFavorite = () => {
      db.query(
        `
        UPDATE users
        SET favorite_template_id = ?
        WHERE id = ?
        `,
        [template_id, userId],
        (err, result) => {
          if (err) {
            console.error(
              "❌ Update favorite template error:",
              err
            );

            return res.status(500).json({
              error:
                "Failed to update favorite template",
            });
          }

          if (!result.affectedRows) {
            return res.status(404).json({
              error: "User not found",
            });
          }

          return res.json({
            success: true,
            message:
              "Favorite template updated successfully",
          });
        }
      );
    };

    if (role === "superadmin") {
      db.query(
        `
        SELECT id
        FROM templates
        WHERE id = ?
        `,
        [template_id],
        (err, rows) => {
          if (err) {
            return res.status(500).json({
              error: "Failed to check template",
            });
          }

          if (!rows.length) {
            return res.status(404).json({
              error: "Template not found",
            });
          }

          updateFavorite();
        }
      );

      return;
    }

    if (!org_id) {
      return res.status(403).json({
        error: "User has no organization assigned",
      });
    }

    db.query(
      `
      SELECT t.id
      FROM templates t
      JOIN org_templates ot
        ON t.id = ot.template_id
      WHERE t.id = ?
        AND ot.org_id = ?
      `,
      [template_id, org_id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({
            error:
              "Failed to check assigned template",
          });
        }

        if (!rows.length) {
          return res.status(403).json({
            error:
              "You can only favorite templates assigned to your organization",
          });
        }

        updateFavorite();
      }
    );
  }
);

// =====================================
// DEFAULT TEMPLATE
// =====================================
router.get(
  "/default-template",
  auth(),
  (req, res) => {
    const { id, role, org_id } = req.user;

    const favoriteSql =
      role === "superadmin"
        ? `
          SELECT t.*
          FROM users u
          JOIN templates t
            ON u.favorite_template_id = t.id
          WHERE u.id = ?
          LIMIT 1
        `
        : `
          SELECT t.*
          FROM users u
          JOIN templates t
            ON u.favorite_template_id = t.id
          JOIN org_templates ot
            ON t.id = ot.template_id
          WHERE u.id = ?
            AND ot.org_id = ?
          LIMIT 1
        `;

    const favoriteParams =
      role === "superadmin"
        ? [id]
        : [id, org_id];

    db.query(
      favoriteSql,
      favoriteParams,
      (favErr, favResults) => {
        if (favErr) {
          console.error(
            "❌ Favorite template error:",
            favErr
          );

          return res.status(500).json({
            error:
              "Failed to fetch favorite template",
          });
        }

        if (favResults.length) {
          return res.json(
            parseTemplateLayout(favResults[0])
          );
        }

        if (role === "superadmin") {
          db.query(
            `
            SELECT *
            FROM templates
            ORDER BY id DESC
            LIMIT 1
            `,
            (err, results) => {
              if (err) {
                return res.status(500).json({
                  error:
                    "Failed to fetch default template",
                });
              }

              if (!results.length) {
                return res.json(null);
              }

              return res.json(
                parseTemplateLayout(results[0])
              );
            }
          );

          return;
        }

        if (!org_id) {
          return res.json(null);
        }

        db.query(
          `
          SELECT t.*
          FROM org_templates ot
          JOIN templates t
            ON ot.template_id = t.id
          WHERE ot.org_id = ?
          ORDER BY t.id DESC
          LIMIT 1
          `,
          [org_id],
          (err, results) => {
            if (err) {
              return res.status(500).json({
                error:
                  "Failed to fetch default template",
              });
            }

            if (!results.length) {
              return res.json(null);
            }

            return res.json(
              parseTemplateLayout(results[0])
            );
          }
        );
      }
    );
  }
);

export default router;
