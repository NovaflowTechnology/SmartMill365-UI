import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mysql from "mysql2";
import { InfluxDB } from "@influxdata/influxdb-client";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;
const SECRET = process.env.JWT_SECRET;

// MYSQL CONNECTION
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err);
    return;
  }

  console.log("✅ MySQL Connected");
});

// RBAC AUTH MIDDLEWARE
const auth = (roles = []) => {
  return (req, res, next) => {
    const token = req.headers.authorization;

    if (!token) {
      return res.sendStatus(403);
    }

    try {
      const decoded = jwt.verify(token, SECRET);

      if (
        roles.length &&
        !roles.includes(decoded.role)
      ) {
        return res.sendStatus(403);
      }

      req.user = decoded;

      next();
    } catch (err) {
      console.error(err);

      return res.sendStatus(401);
    }
  };
};

// LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    `
    SELECT 
      users.*,
      organizations.name AS org_name
    FROM users
    LEFT JOIN organizations
      ON users.org_id = organizations.id
    WHERE users.username = ?
    `,
    [username],
    async (err, results) => {
      if (err) {
        console.error("❌ Login query error:", err);

        return res.status(500).json({
          error: "Database error",
        });
      }

      if (!results.length) {
        return res.status(401).json({
          error: "User not found",
        });
      }

      const user = results[0];

      const match = await bcrypt.compare(
        password,
        user.password
      );

      if (!match) {
        return res.status(401).json({
          error: "Wrong password",
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          org_id: user.org_id || null,
          org_name: user.org_name || null,
          favorite_template_id:
            user.favorite_template_id || null,
        },
        SECRET,
        {
          expiresIn: "1d",
        }
      );

      return res.json({
        token,
        role: user.role,
        org_id: user.org_id || null,
        org_name: user.org_name || null,
        favorite_template_id:
          user.favorite_template_id || null,
      });
    }
  );
});

// CREATE TEMPLATE
app.post(
  "/templates",
  auth(["admin", "superadmin"]),
  (req, res) => {
    const { name, layout } = req.body;

    const { id, org_id, role } = req.user;

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
        name,
        JSON.stringify(layout),
        templateOrgId,
        id,
      ],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send(err);
        }

        res.send("Template created");
      }
    );
  }
);

// CREATE USER
app.post(
  "/users",
  auth(["superadmin", "admin"]),
  async (req, res) => {
    const { username, password, role, org_id } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        error: "Username is required",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const allowedRoles =
      req.user.role === "superadmin"
        ? ["admin", "editor", "viewer"]
        : ["editor", "viewer"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error:
          req.user.role === "admin"
            ? "Admin can only create editor or viewer users"
            : "Invalid role",
      });
    }

    let finalOrgId = org_id || null;

    if (req.user.role === "admin") {
      if (!req.user.org_id) {
        return res.status(403).json({
          error: "Admin has no organization assigned",
        });
      }

      finalOrgId = req.user.org_id;
    }

    try {
      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      db.query(
        `
        INSERT INTO users
          (username, password, role, org_id)
        VALUES
          (?, ?, ?, ?)
        `,
        [
          username.trim(),
          hashedPassword,
          role,
          finalOrgId,
        ],
        (err, result) => {
          if (err) {
            console.error("❌ Create user error:", err);

            if (err.code === "ER_DUP_ENTRY") {
              return res.status(400).json({
                error: "Username already exists",
              });
            }

            return res.status(500).json({
              error: "Failed to create user",
            });
          }

          return res.json({
            success: true,
            message: "User created successfully",
            userId: result.insertId,
          });
        }
      );
    } catch (err) {
      console.error("❌ Hash password error:", err);

      return res.status(500).json({
        error: "Failed to hash password",
      });
    }
  }
);

// GET ALL TEMPLATES
app.get("/templates", auth(), (req, res) => {
  const { role, org_id } = req.user;

  if (role === "superadmin") {
    db.query(
      "SELECT * FROM templates",
      (err, results) => {
        if (err) {
          return res.status(500).send(err);
        }

        const parsed = results.map((t) => ({
          ...t,
          layout:
            typeof t.layout === "string"
              ? JSON.parse(t.layout)
              : t.layout || {},
        }));

        res.json(parsed);
      }
    );
  } else {
    db.query(
      `
      SELECT t.*
      FROM templates t
      JOIN org_templates ot
        ON t.id = ot.template_id
      WHERE ot.org_id = ?
      `,
      [org_id],
      (err, results) => {
        if (err) {
          return res.status(500).send(err);
        }

        const parsed = results.map((t) => ({
          ...t,
          layout:
            typeof t.layout === "string"
              ? JSON.parse(t.layout)
              : t.layout || {},
        }));

        res.json(parsed);
      }
    );
  }
});

// SET FAVORITE TEMPLATE FOR CURRENT USER
app.put(
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

    const updateFavoriteTemplate = () => {
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

          if (result.affectedRows === 0) {
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

    // Superadmin can favourite any existing template
    if (role === "superadmin") {
      db.query(
        `
        SELECT id
        FROM templates
        WHERE id = ?
        `,
        [template_id],
        (err, results) => {
          if (err) {
            console.error(
              "❌ Check template error:",
              err
            );

            return res.status(500).json({
              error: "Failed to check template",
            });
          }

          if (!results.length) {
            return res.status(404).json({
              error: "Template not found",
            });
          }

          updateFavoriteTemplate();
        }
      );

      return;
    }

    if (!org_id) {
      return res.status(403).json({
        error: "User has no organization assigned",
      });
    }

    // Org users can only favourite templates assigned to their org
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
      (err, results) => {
        if (err) {
          console.error(
            "❌ Check assigned template error:",
            err
          );

          return res.status(500).json({
            error:
              "Failed to check assigned template",
          });
        }

        if (!results.length) {
          return res.status(403).json({
            error:
              "You can only favorite templates assigned to your organization",
          });
        }

        updateFavoriteTemplate();
      }
    );
  }
);

// GET DEFAULT TEMPLATE
app.get(
  "/default-template",
  auth(),
  (req, res) => {
    const { id, role, org_id } = req.user;

    const parseTemplate = (template) => {
      if (!template) return null;

      try {
        template.layout =
          typeof template.layout === "string"
            ? JSON.parse(template.layout)
            : template.layout || {};
      } catch (err) {
        console.error(
          "❌ Layout parse error:",
          err
        );

        template.layout = {};
      }

      return template;
    };

    // 1. Try user favourite template first
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

        if (favResults.length > 0) {
          const template =
            parseTemplate(favResults[0]);

          console.log(
            "⭐ Returning favorite template:",
            template?.name
          );

          return res.json(template);
        }

        // 2. Superadmin fallback: latest template
        if (role === "superadmin") {
          console.log(
            "👑 SUPERADMIN FETCHING LATEST DEFAULT TEMPLATE"
          );

          db.query(
            `
            SELECT *
            FROM templates
            ORDER BY id DESC
            LIMIT 1
            `,
            (err, results) => {
              if (err) {
                console.error(
                  "❌ Default template error:",
                  err
                );

                return res.status(500).json({
                  error:
                    "Failed to fetch default template",
                });
              }

              if (!results.length) {
                console.log(
                  "⚠️ No templates found"
                );

                return res.json(null);
              }

              const template =
                parseTemplate(results[0]);

              console.log(
                "✅ Returning latest template:",
                template?.name
              );

              return res.json(template);
            }
          );

          return;
        }

        // 3. Org user fallback: latest assigned template
        if (!org_id) {
          console.log(
            "⚠️ User has no organization"
          );

          return res.json(null);
        }

        console.log(
          "🏢 ORG USER FETCHING LATEST ASSIGNED TEMPLATE:",
          org_id
        );

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
              console.error(
                "❌ Org default template error:",
                err
              );

              return res.status(500).json({
                error:
                  "Failed to fetch default template",
              });
            }

            if (!results.length) {
              console.log(
                "⚠️ No assigned template found for org:",
                org_id
              );

              return res.json(null);
            }

            const template =
              parseTemplate(results[0]);

            console.log(
              "✅ Returning latest assigned template:",
              template?.name
            );

            return res.json(template);
          }
        );
      }
    );
  }
);

// GET TEMPLATE ASSIGNMENTS
app.get(
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
          console.error(
            "❌ Assignment fetch error:",
            err
          );

          return res.status(500).json({
            error:
              "Failed to fetch template assignments",
          });
        }

        res.json(results);
      }
    );
  }
);

// ASSIGN TEMPLATE
app.post(
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
      SELECT *
      FROM org_templates
      WHERE org_id = ?
        AND template_id = ?
      `,
      [org_id, template_id],
      (checkErr, results) => {
        if (checkErr) {
          console.error(
            "❌ Duplicate check error:",
            checkErr
          );

          return res.status(500).json({
            error: "Failed to check assignment",
          });
        }

        if (results.length > 0) {
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
              console.error(
                "❌ Assign template error:",
                insertErr
              );

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
app.delete(
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
          console.error(
            "❌ Remove assignment error:",
            err
          );

          return res.status(500).json({
            error: "Failed to remove assignment",
          });
        }

        if (result.affectedRows === 0) {
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
app.post(
  "/organizations",
  auth(["superadmin"]),
  (req, res) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
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
          console.error(
            "❌ Create organization error:",
            err
          );

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

// GET ORGANIZATIONS WITH TEMPLATE DETAILS
app.get(
  "/organizations",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const { role, org_id } = req.user;

    let sql = `
      SELECT 
        o.id,
        o.name,
        COUNT(ot.template_id) AS assigned_template_count,
        GROUP_CONCAT(t.name SEPARATOR ', ') AS assigned_templates
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

    db.query(
      sql,
      params,
      (err, results) => {
        if (err) {
          console.error(
            "❌ Fetch organizations error:",
            err
          );

          return res.status(500).json({
            error: "Failed to fetch organizations",
          });
        }

        res.json(results);
      }
    );
  }
);

// UPDATE ORGANIZATION
app.put(
  "/organizations/:id",
  auth(["superadmin"]),
  (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
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
      [name.trim(), id],
      (err, result) => {
        if (err) {
          console.error(
            "❌ Update organization error:",
            err
          );

          return res.status(500).json({
            error: "Failed to update organization",
          });
        }

        if (result.affectedRows === 0) {
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
app.delete(
  "/organizations/:id",
  auth(["superadmin"]),
  (req, res) => {
    const { id } = req.params;

    db.beginTransaction((txErr) => {
      if (txErr) {
        console.error(
          "❌ Transaction start error:",
          txErr
        );

        return res.status(500).json({
          error: "Failed to start transaction",
        });
      }

      db.query(
        `
        DELETE FROM org_templates
        WHERE org_id = ?
        `,
        [id],
        (err) => {
          if (err) {
            return db.rollback(() => {
              console.error(
                "❌ Delete org template assignments error:",
                err
              );

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
            [id],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error(
                    "❌ Unlink users error:",
                    err
                  );

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
                [id],
                (err) => {
                  if (err) {
                    return db.rollback(() => {
                      console.error(
                        "❌ Delete org templates error:",
                        err
                      );

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
                    [id],
                    (err, result) => {
                      if (err) {
                        return db.rollback(() => {
                          console.error(
                            "❌ Delete organization error:",
                            err
                          );

                          return res.status(500).json({
                            error:
                              "Failed to delete organization",
                          });
                        });
                      }

                      if (result.affectedRows === 0) {
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
                            console.error(
                              "❌ Commit error:",
                              commitErr
                            );

                            return res.status(500).json({
                              error:
                                "Failed to commit organization deletion",
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

// GET USERS FOR AUTHORIZATION MANAGEMENT
app.get(
  "/users",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const { role, org_id } = req.user;

    let sql = `
      SELECT 
        u.id,
        u.username,
        u.role,
        u.org_id,
        o.name AS org_name,
        u.created_at,
        u.favorite_template_id,
        ft.name AS favorite_template_name
      FROM users u
      LEFT JOIN organizations o
        ON u.org_id = o.id
      LEFT JOIN templates ft
        ON u.favorite_template_id = ft.id
    `;

    const params = [];

    if (role === "admin") {
      sql += `
        WHERE u.org_id = ?
          AND u.role != 'superadmin'
      `;

      params.push(org_id);
    }

    sql += `
      ORDER BY u.id ASC
    `;

    db.query(
      sql,
      params,
      (err, results) => {
        if (err) {
          console.error(
            "❌ Fetch users error:",
            err
          );

          return res.status(500).json({
            error: "Failed to fetch users",
          });
        }

        return res.json(results);
      }
    );
  }
);

// UPDATE USER ROLE / AUTHORIZE USER
app.put(
  "/users/:id/role",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const { id } = req.params;
    const { role, org_id } = req.body;

    const allowedRoles =
      req.user.role === "superadmin"
        ? ["admin", "editor", "viewer"]
        : ["editor", "viewer"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error:
          req.user.role === "admin"
            ? "Admin can only assign editor or viewer role"
            : "Invalid role",
      });
    }

    let finalOrgId = org_id || null;

    if (req.user.role === "admin") {
      if (!req.user.org_id) {
        return res.status(403).json({
          error: "Admin has no organization assigned",
        });
      }

      finalOrgId = req.user.org_id;

      db.query(
        `
        SELECT id, role, org_id
        FROM users
        WHERE id = ?
        `,
        [id],
        (checkErr, users) => {
          if (checkErr) {
            console.error(
              "❌ Check user error:",
              checkErr
            );

            return res.status(500).json({
              error: "Failed to check user",
            });
          }

          if (!users.length) {
            return res.status(404).json({
              error: "User not found",
            });
          }

          const targetUser = users[0];

          if (
            targetUser.role === "superadmin" ||
            Number(targetUser.org_id) !==
              Number(req.user.org_id)
          ) {
            return res.status(403).json({
              error:
                "You can only manage users in your organization",
            });
          }

          db.query(
            `
            UPDATE users
            SET role = ?, org_id = ?
            WHERE id = ?
              AND role != 'superadmin'
            `,
            [role, finalOrgId, id],
            (err, result) => {
              if (err) {
                console.error(
                  "❌ Update user role error:",
                  err
                );

                return res.status(500).json({
                  error: "Failed to update user role",
                });
              }

              if (result.affectedRows === 0) {
                return res.status(404).json({
                  error:
                    "User not found or cannot update superadmin",
                });
              }

              return res.json({
                success: true,
                message: "User role updated",
              });
            }
          );
        }
      );

      return;
    }

    db.query(
      `
      UPDATE users
      SET role = ?, org_id = ?
      WHERE id = ?
        AND role != 'superadmin'
      `,
      [role, finalOrgId, id],
      (err, result) => {
        if (err) {
          console.error(
            "❌ Update user role error:",
            err
          );

          return res.status(500).json({
            error: "Failed to update user role",
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error:
              "User not found or cannot update superadmin",
          });
        }

        return res.json({
          success: true,
          message: "User role updated",
        });
      }
    );
  }
);

// DELETE TEMPLATE
app.delete(
  "/templates/:id",
  auth(["admin", "superadmin"]),
  (req, res) => {
    const { role, org_id } = req.user;

    let sql = `
      DELETE FROM templates
      WHERE id = ?
    `;

    const params = [req.params.id];

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
          return res.status(500).send(err);
        }

        if (result.affectedRows === 0) {
          return res.status(403).json({
            error:
              "Template not found or not allowed",
          });
        }

        res.send("Deleted");
      }
    );
  }
);

// UPDATE TEMPLATE
app.put(
  "/templates/:id",
  auth(["admin", "superadmin"]),
  (req, res) => {
    const { name, layout } = req.body;

    const { role, org_id } = req.user;

    let sql = `
      UPDATE templates
      SET name = ?, layout = ?
      WHERE id = ?
    `;

    const params = [
      name,
      JSON.stringify(layout),
      req.params.id,
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
          console.error(err);
          return res.status(500).send(err);
        }

        if (result.affectedRows === 0) {
          return res.status(403).json({
            error:
              "Template not found or not allowed",
          });
        }

        res.send("Updated");
      }
    );
  }
);

// INFLUXDB SETUP
const influxDB = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});

const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

// CHANNEL MAPPING
const fieldMap = {
  ch1: "steamPressure",
  ch2: "steamFlowrate",
  ch3: "steamOutletTemp",
  ch4: "inletDraft",
  ch5: "outletDraft",
  ch6: "furnaceDraft",
  ch8: "waterInletTemp",
  ch9: "waterFlowrate",
  ch10: "waterDrumLevel",
  ch11: "vgPressure",
  ch12: "vgInletTemp",
  ch13: "vgOutletTemp",
};

// SERVER
const server = app.listen(PORT, () => {
  console.log(
    `✅ Server running on http://localhost:${PORT}`
  );
});

// WEBSOCKET
const wss = new WebSocketServer({
  server,
});

// WS AUTH
wss.on("connection", (ws, req) => {
  const token = new URL(
    req.url,
    "http://localhost"
  ).searchParams.get("token");

  if (!token) {
    console.log("❌ WS rejected");
    ws.close();
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    ws.user = decoded;

    console.log(
      `🔌 ${decoded.role} connected`
    );
  } catch {
    console.log("❌ WS invalid token");

    ws.close();
  }
});

// FETCH LIVE DATA
async function fetchInfluxData() {
  const queryApi = influxDB.getQueryApi(org);

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -1m)
      |> filter(fn: (r) =>
        r._measurement == "PBLR"
      )
      |> last()
      |> pivot(
        rowKey: ["_time"],
        columnKey: ["_field"],
        valueColumn: "_value"
      )
  `;

  try {
    const rows =
      await queryApi.collectRows(fluxQuery);

    if (!rows.length) {
      console.log(
        "⚠️ No InfluxDB data"
      );

      return {};
    }

    const row = rows[0];

    const result = {};

    Object.entries(fieldMap).forEach(
      ([channel, key]) => {
        result[key] = row[channel];
      }
    );

    return result;
  } catch (err) {
    console.error(
      "❌ Influx Error:",
      err
    );

    return {};
  }
}

// STREAM LIVE DATA
setInterval(async () => {
  try {
    const data = await fetchInfluxData();

    const payload = JSON.stringify(data);

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  } catch (err) {
    console.error(
      "❌ WS Error:",
      err
    );
  }
}, 2000);