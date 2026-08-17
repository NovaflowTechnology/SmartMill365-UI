import express from "express";
import db from "../config/db.js";
import auth from "../middleware/auth.js";
const router = express.Router();

// =====================================
// ORGANIZATION / ASSIGNMENT ROUTES
// =====================================

// GET TEMPLATE ASSIGNMENTS
router.get(
  "/template-assignments",
  auth(["superadmin"]),
  (req, res) => {
    db.query(
      `
      SELECT
        ot.template_id,
        ot.org_id,
        o.name AS org_name,
        t.name AS template_name
      FROM org_templates ot
      JOIN organizations o
        ON ot.org_id = o.id
      JOIN templates t
        ON ot.template_id = t.id
      ORDER BY t.id DESC, o.name ASC
      `,
      (err, results) => {
        if (err) {
          return res.status(500).json({
            error:
              "Failed to fetch template assignments",
          });
        }

        return res.json(results);
      }
    );
  }
);

// ASSIGN TEMPLATE
router.post(
  "/assign-template",
  auth(["superadmin"]),
  (req, res) => {
    const { org_id, template_id } = req.body;

    if (!org_id || !template_id) {
      return res.status(400).json({
        error: "Organization and template are required",
      });
    }

    db.query(
      `
      SELECT id
      FROM org_templates
      WHERE org_id = ?
        AND template_id = ?
      `,
      [org_id, template_id],
      (checkErr, rows) => {
        if (checkErr) {
          return res.status(500).json({
            error: "Failed to check assignment",
          });
        }

        if (rows.length) {
          return res.status(409).json({
            error:
              "This template is already assigned to this organization",
          });
        }

        db.query(
          `
          INSERT INTO org_templates
          (org_id, template_id)
          VALUES (?, ?)
          `,
          [org_id, template_id],
          (insertErr) => {
            if (insertErr) {
              return res.status(500).json({
                error: "Failed to assign template",
              });
            }

            return res.json({
              success: true,
              message: "Template assigned",
            });
          }
        );
      }
    );
  }
);

// REMOVE TEMPLATE ASSIGNMENT
router.delete(
  "/template-assignments",
  auth(["superadmin"]),
  (req, res) => {
    const { org_id, template_id } = req.body;

    if (!org_id || !template_id) {
      return res.status(400).json({
        error: "Organization and template are required",
      });
    }

    db.query(
      `
      DELETE FROM org_templates
      WHERE org_id = ?
        AND template_id = ?
      `,
      [org_id, template_id],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            error: "Failed to remove assignment",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            error: "Assignment not found",
          });
        }

        return res.json({
          success: true,
          message: "Assignment removed",
        });
      }
    );
  }
);

// CREATE ORGANIZATION
router.post(
  "/organizations",
  auth(["superadmin"]),
  (req, res) => {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Organization name is required",
      });
    }

    db.query(
      `
      INSERT INTO organizations (name)
      VALUES (?)
      `,
      [name.trim()],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            error: "Failed to create organization",
          });
        }

        return res.json({
          success: true,
          message: "Organization created",
          organization: {
            id: result.insertId,
            name: name.trim(),
          },
        });
      }
    );
  }
);

// GET ORGANIZATIONS
router.get(
  "/organizations",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const { role, org_id } = req.user;

    let sql = `
      SELECT
        o.id,
        o.name,
        COUNT(ot.template_id) AS assigned_template_count,
        GROUP_CONCAT(
          t.name SEPARATOR ', '
        ) AS assigned_templates
      FROM organizations o
      LEFT JOIN org_templates ot
        ON o.id = ot.org_id
      LEFT JOIN templates t
        ON ot.template_id = t.id
    `;

    const params = [];

    if (role === "admin") {
      sql += `
        WHERE o.id = ?
      `;

      params.push(org_id);
    }

    sql += `
      GROUP BY o.id, o.name
      ORDER BY o.id DESC
    `;

    db.query(sql, params, (err, results) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to fetch organizations",
        });
      }

      return res.json(results);
    });
  }
);

// UPDATE ORGANIZATION
router.put(
  "/organizations/:id",
  auth(["superadmin"]),
  (req, res) => {
    const { name } = req.body;
    const organizationId = req.params.id;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Organization name is required",
      });
    }

    db.query(
      `
      UPDATE organizations
      SET name = ?
      WHERE id = ?
      `,
      [name.trim(), organizationId],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            error: "Failed to update organization",
          });
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            error: "Organization not found",
          });
        }

        return res.json({
          success: true,
          message: "Organization updated",
        });
      }
    );
  }
);

// DELETE ORGANIZATION
router.delete(
  "/organizations/:id",
  auth(["superadmin"]),
  (req, res) => {
    const organizationId = req.params.id;

    db.beginTransaction((txErr) => {
      if (txErr) {
        return res.status(500).json({
          error: "Failed to start transaction",
        });
      }

      db.query(
        `
        SELECT id
        FROM templates
        WHERE org_id = ?
        `,
        [organizationId],
        (templateFindErr, templates) => {
          if (templateFindErr) {
            return db.rollback(() => {
              return res.status(500).json({
                error:
                  "Failed to find organization templates",
              });
            });
          }

          const templateIds = templates.map(
            (template) => template.id
          );

          const clearFavorites = (callback) => {
            if (!templateIds.length) {
              callback();
              return;
            }

            db.query(
              `
              UPDATE users
              SET favorite_template_id = NULL
              WHERE favorite_template_id IN (?)
              `,
              [templateIds],
              callback
            );
          };

          clearFavorites((favoriteErr) => {
            if (favoriteErr) {
              return db.rollback(() => {
                return res.status(500).json({
                  error:
                    "Failed to clear user template favourites",
                });
              });
            }

            db.query(
              `
              DELETE FROM org_templates
              WHERE org_id = ?
              `,
              [organizationId],
              (assignmentErr) => {
                if (assignmentErr) {
                  return db.rollback(() => {
                    return res.status(500).json({
                      error:
                        "Failed to remove organization template assignments",
                    });
                  });
                }

                db.query(
                  `
                  UPDATE users
                  SET org_id = NULL
                  WHERE org_id = ?
                  `,
                  [organizationId],
                  (userErr) => {
                    if (userErr) {
                      return db.rollback(() => {
                        return res.status(500).json({
                          error:
                            "Failed to unlink users from organization",
                        });
                      });
                    }

                    db.query(
                      `
                      DELETE FROM templates
                      WHERE org_id = ?
                      `,
                      [organizationId],
                      (templateErr) => {
                        if (templateErr) {
                          return db.rollback(() => {
                            return res.status(500).json({
                              error:
                                "Failed to delete organization templates",
                            });
                          });
                        }

                        db.query(
                          `
                          DELETE FROM organizations
                          WHERE id = ?
                          `,
                          [organizationId],
                          (deleteErr, result) => {
                            if (deleteErr) {
                              return db.rollback(() => {
                                return res.status(500).json({
                                  error:
                                    "Failed to delete organization",
                                });
                              });
                            }

                            if (!result.affectedRows) {
                              return db.rollback(() => {
                                return res.status(404).json({
                                  error:
                                    "Organization not found",
                                });
                              });
                            }

                            db.commit((commitErr) => {
                              if (commitErr) {
                                return db.rollback(() => {
                                  return res.status(500).json({
                                    error:
                                      "Failed to complete organization deletion",
                                  });
                                });
                              }

                              return res.json({
                                success: true,
                                message:
                                  "Organization deleted successfully",
                              });
                            });
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          });
        }
      );
    });
  }
);

export default router;
