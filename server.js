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

    const {
      id,
      org_id,
    } = req.user;

    db.query(
      `
      INSERT INTO templates
      (name, layout, org_id, created_by)
      VALUES (?, ?, ?, ?)
      `,
      [
        name,
        JSON.stringify(layout),
        org_id,
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


// GET ALL TEMPLATES
app.get("/templates", auth(), (req, res) => {

  const {
    role,
    org_id,
  } = req.user;


  //SUPERADMIN → ALL
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
  }


  // ORG USERS → ASSIGNED ONLY
  else {

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

// GET DEFAULT TEMPLATE
app.get(
  "/default-template",
  auth(),
  (req, res) => {
    const { role, org_id } = req.user;

    // Helper: safely parse template layout
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

    // SUPERADMIN: get latest template overall
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

    // ORG USER: get latest assigned template
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

          return res
            .status(500)
            .json({
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

    // CHECK DUPLICATE FIRST
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
          console.error("❌ Create organization error:", err);

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
  auth(["superadmin"]),
  (req, res) => {
    db.query(
      `
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
      GROUP BY o.id, o.name
      ORDER BY o.id DESC
      `,
      (err, results) => {
        if (err) {
          console.error("❌ Fetch organizations error:", err);

          return res.status(500).json({
            error: "Failed to fetch organizations",
          });
        }

        res.json(results);
      }
    );
  }
);


// DELETE TEMPLATE
app.delete(
  "/templates/:id",
  auth(["admin", "superadmin"]),

  (req, res) => {

    db.query(
      "DELETE FROM templates WHERE id = ?",
      [req.params.id],

      (err) => {

        if (err) {
          return res.status(500).send(err);
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

    const {
      name,
      layout,
    } = req.body;

    db.query(
      `
      UPDATE templates
      SET name = ?, layout = ?
      WHERE id = ?
      `,
      [
        name,
        JSON.stringify(layout),
        req.params.id,
      ],

      (err) => {

        if (err) {
          console.error(err);
          return res.status(500).send(err);
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

    const decoded = jwt.verify(
      token,
      SECRET
    );

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

  const queryApi =
    influxDB.getQueryApi(org);

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

    const data =
      await fetchInfluxData();

    const payload =
      JSON.stringify(data);

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