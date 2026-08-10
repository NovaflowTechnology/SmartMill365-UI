import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mysql from "mysql2";
import { InfluxDB } from "@influxdata/influxdb-client";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 5000;
const SECRET = process.env.JWT_SECRET;

// =====================================
// MYSQL CONNECTION
// =====================================
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

const dbQuery = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results);
    });
  });

// =====================================
// AUTH MIDDLEWARE
// =====================================
const auth = (roles = []) => {
  return (req, res, next) => {
    const rawAuthorization =
      req.headers.authorization;

    const token = rawAuthorization?.startsWith(
      "Bearer "
    )
      ? rawAuthorization.replace("Bearer ", "")
      : rawAuthorization;

    if (!token) {
      return res.status(403).json({
        error: "No authentication token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, SECRET);

      if (
        roles.length > 0 &&
        !roles.includes(decoded.role)
      ) {
        return res.status(403).json({
          error: "You do not have permission for this action",
        });
      }

      req.user = decoded;

      next();
    } catch (err) {
      console.error("❌ Authentication error:", err);

      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
  };
};

// =====================================
// HELPERS
// =====================================
const parseTemplateLayout = (template) => {
  if (!template) return null;

  try {
    return {
      ...template,
      layout:
        typeof template.layout === "string"
          ? JSON.parse(template.layout)
          : template.layout || {},
    };
  } catch (err) {
    console.error(
      "❌ Template layout parse error:",
      err
    );

    return {
      ...template,
      layout: {},
    };
  }
};

const escapeFluxString = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');

const isValidFluxColumnName = (value) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(
    String(value || "")
  );

const toNumericValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : value;
};


// Supports dashboard windows such as -30d, -6mo and -5y.
// The start time is calculated in JavaScript and sent to Flux as ISO time,
// avoiding duration parsing limitations for month/year periods.
// Tracks whether the latest Influx source timestamps are advancing between
// dashboard requests. This is process memory only and resets when Node restarts.
const liveFetchMonitor = new Map();

const parseRelativeHistoryWindow = (value) => {
  let requested = String(value || "15m").trim();

  // Template Designer stores values such as "15m" while older
  // dashboard code may still send "-15m". Accept both formats.
  if (!requested.startsWith("-")) {
    requested = `-${requested}`;
  }

  const match = requested.match(
    /^-(\d+)(m|h|d|w|mo|y)$/
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const end = new Date();
  const start = new Date(end);

  switch (unit) {
    case "m":
      start.setMinutes(start.getMinutes() - amount);
      break;
    case "h":
      start.setHours(start.getHours() - amount);
      break;
    case "d":
      start.setDate(start.getDate() - amount);
      break;
    case "w":
      start.setDate(start.getDate() - amount * 7);
      break;
    case "mo":
      start.setMonth(start.getMonth() - amount);
      break;
    case "y":
      start.setFullYear(start.getFullYear() - amount);
      break;
    default:
      return null;
  }

  return {
    requested,
    start,
    end,
    durationMs:
      end.getTime() - start.getTime(),
  };
};

// =====================================
// ORGANIZATION INFLUX DEVICE ACCESS
// =====================================
const canAccessInfluxDevice = async ({
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
const fetchLatestSankeyOutputValue = async ({
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

const fetchSankeyRuntimeValues = async ({
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

// =====================================
// LOGIN
// =====================================
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

// =====================================
// TEMPLATE ROUTES
// =====================================

// CREATE TEMPLATE
app.post(
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
app.get("/templates", auth(), (req, res) => {
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

// UPDATE TEMPLATE
app.put(
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
app.delete(
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
app.get(
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

// =====================================
// USER MANAGEMENT
// =====================================

// CREATE USER
app.post(
  "/users",
  auth(["superadmin", "admin"]),
  async (req, res) => {
    const { username, password, role, org_id } =
      req.body;

    if (!username?.trim()) {
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

    const finalOrgId =
      req.user.role === "admin"
        ? req.user.org_id
        : org_id || null;

    if (
      req.user.role === "admin" &&
      !finalOrgId
    ) {
      return res.status(403).json({
        error: "Admin has no organization assigned",
      });
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
        VALUES (?, ?, ?, ?)
        `,
        [
          username.trim(),
          hashedPassword,
          role,
          finalOrgId,
        ],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(400).json({
                error: "Username already exists",
              });
            }

            console.error(
              "❌ Create user error:",
              err
            );

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
      return res.status(500).json({
        error: "Failed to hash password",
      });
    }
  }
);

// GET USERS
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

    db.query(sql, params, (err, results) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to fetch users",
        });
      }

      return res.json(results);
    });
  }
);

// UPDATE USER ROLE
app.put(
  "/users/:id/role",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const userId = req.params.id;
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

    const finalOrgId =
      req.user.role === "admin"
        ? req.user.org_id
        : org_id || null;

    if (
      req.user.role === "admin" &&
      !finalOrgId
    ) {
      return res.status(403).json({
        error: "Admin has no organization assigned",
      });
    }

    const updateUser = () => {
      db.query(
        `
        UPDATE users
        SET role = ?, org_id = ?
        WHERE id = ?
          AND role != 'superadmin'
        `,
        [role, finalOrgId, userId],
        (err, result) => {
          if (err) {
            return res.status(500).json({
              error: "Failed to update user role",
            });
          }

          if (!result.affectedRows) {
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
    };

    if (req.user.role === "superadmin") {
      updateUser();
      return;
    }

    db.query(
      `
      SELECT id, role, org_id
      FROM users
      WHERE id = ?
      `,
      [userId],
      (err, users) => {
        if (err) {
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

        updateUser();
      }
    );
  }
);

// =====================================
// ORGANIZATION / ASSIGNMENT ROUTES
// =====================================

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
app.post(
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
app.put(
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
app.delete(
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

// =====================================
// INFLUXDB
// =====================================
const influxDB = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});

const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;

const missingInfluxSettings = [
  ["INFLUX_URL", process.env.INFLUX_URL],
  ["INFLUX_TOKEN", process.env.INFLUX_TOKEN],
  ["INFLUX_ORG", org],
  ["INFLUX_BUCKET", bucket],
]
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

if (missingInfluxSettings.length > 0) {
  console.warn(
    "⚠️ Missing InfluxDB environment settings:",
    missingInfluxSettings.join(", ")
  );
}

// =====================================
// GET ALL INFLUX BUCKETS (SUPERADMIN)
//
// GET /influx/buckets
// Uses the InfluxDB HTTP API because schema.* Flux functions cannot
// enumerate buckets. This is used by Device Management when registering
// a device for an organization.
// =====================================
app.get(
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
// ORGANIZATION INFLUX DEVICE ROUTES
// =====================================

// Returns devices assigned to the signed-in organization.
// Superadmins can see all device assignments, optionally filtered by org_id.
app.get(
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
app.get(
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

app.post(
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

app.delete(
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

// =====================================
// GET ALL MEASUREMENTS
//
// GET /influx/measurements?bucket=Mill
// =====================================
app.get(
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
app.get(
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
app.get(
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

// =====================================
// FETCH TEMPLATE-SPECIFIC LIVE DATA
//
// POST /template-live-data
//
// Legacy format (still supported):
// {
//   influx: {
//     bucket: "SmartMill365",
//     measurement: "PBLR",
//     tagKey: "id",
//     tagValue: "SAMYSK_POM_250048"
//   },
//   channelMap: {
//     steam_pressure: "steam_pressure",
//     steamFlow: "steamFlow"
//   },
//   historyWindow: "15m"
// }
//
// New multi-measurement format:
// {
//   dataSources: {
//     sterilizerPressure: {
//       bucket: "SmartMill365",
//       measurement: "PSTR_bar",
//       tagKey: "id",
//       tagValue: "SAMYSK_POM_250036",
//       field: "stp1"
//     },
//     sterilizerMode: {
//       bucket: "SmartMill365",
//       measurement: "PSTR_aom_status",
//       tagKey: "id",
//       tagValue: "SAMYSK_POM_250036",
//       field: "stp1"
//     }
//   },
//   historyWindow: "15m"
// }
//
// Exact calendar range is also supported:
// {
//   startTime: "2026-06-01T00:00:00.000Z",
//   endTime: "2026-06-22T23:59:59.999Z"
// }
// =====================================

const getAggregateEvery = (durationMs) => {
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

const normalizeTemplateDataSources = ({
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

const groupTemplateDataSources = (dataSources) => {
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

const validateTemplateSourceGroup = (group) => {
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

const fetchTemplateSourceGroup = async ({
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

app.post(
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

// =====================================
// SERVER
// =====================================
app.listen(PORT, () => {
  console.log(
    `✅ Server running on http://localhost:${PORT}`
  );

  if (missingInfluxSettings.length === 0) {
    console.log(
      `✅ InfluxDB configured: ${process.env.INFLUX_URL} | org=${org} | bucket=${bucket}`
    );
  }
});
