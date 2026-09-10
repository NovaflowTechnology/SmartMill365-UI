import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import "dotenv/config";

import db, { dbQuery } from "../config/db.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is required for the role API check");
}

const request = async (method, path, token, body) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { text };
  }

  return { response, payload };
};

const closeDatabase = () =>
  new Promise((resolve) => {
    db.end(() => resolve());
  });

let templateId = null;

try {
  const organizations = await dbQuery(
    "SELECT id, name FROM organizations ORDER BY id LIMIT 1"
  );

  assert.ok(
    organizations.length,
    "At least one organization is required for the role API check"
  );

  const organization = organizations[0];
  const tokenFor = (role) =>
    jwt.sign(
      {
        id: 0,
        role,
        org_id: organization.id,
        org_name: organization.name,
      },
      secret,
      { expiresIn: "5m" }
    );

  const editorToken = tokenFor("editor");
  const viewerToken = tokenFor("viewer");
  const adminToken = tokenFor("admin");
  const templateName = `__role_api_check_${Date.now()}`;
  const initialLayout = {
    rows: 3,
    cols: 4,
    items: [],
  };

  const insertResult = await dbQuery(
    `
    INSERT INTO templates (name, layout, org_id, created_by)
    VALUES (?, ?, ?, NULL)
    `,
    [templateName, JSON.stringify(initialLayout), organization.id]
  );

  templateId = insertResult.insertId;

  await dbQuery(
    `
    INSERT INTO org_templates (org_id, template_id)
    VALUES (?, ?)
    `,
    [organization.id, templateId]
  );

  const editorLayout = {
    ...initialLayout,
    items: [
      {
        id: "role-check-widget",
        type: "stat",
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        label: "Editor layout check",
      },
    ],
  };

  const successfulUpdate = await request(
    "PATCH",
    `/templates/${templateId}/layout`,
    editorToken,
    { layout: editorLayout }
  );
  assert.equal(successfulUpdate.response.status, 200);

  const storedRows = await dbQuery(
    "SELECT name, layout FROM templates WHERE id = ?",
    [templateId]
  );
  const storedLayout =
    typeof storedRows[0].layout === "string"
      ? JSON.parse(storedRows[0].layout)
      : storedRows[0].layout;

  assert.equal(storedRows[0].name, templateName);
  assert.equal(storedLayout.items[0].id, "role-check-widget");

  const gridChange = await request(
    "PATCH",
    `/templates/${templateId}/layout`,
    editorToken,
    { layout: { ...editorLayout, rows: 4 } }
  );
  assert.equal(gridChange.response.status, 403);

  const metadataChange = await request(
    "PATCH",
    `/templates/${templateId}/layout`,
    editorToken,
    { name: "Changed", layout: editorLayout }
  );
  assert.equal(metadataChange.response.status, 400);

  const deniedSource = await request(
    "PATCH",
    `/templates/${templateId}/layout`,
    editorToken,
    {
      layout: {
        ...editorLayout,
        items: [
          {
            source: {
              bucket: "__not_permitted__",
              measurement: "__not_permitted__",
              tagKey: "id",
              tagValue: "__not_permitted__",
              field: "value",
            },
          },
        ],
      },
    }
  );
  assert.equal(deniedSource.response.status, 403);

  const broadEditorUpdate = await request(
    "PUT",
    `/templates/${templateId}`,
    editorToken,
    { name: "Changed", layout: editorLayout }
  );
  assert.equal(broadEditorUpdate.response.status, 403);

  const adminEditorRoute = await request(
    "PATCH",
    `/templates/${templateId}/layout`,
    adminToken,
    { layout: editorLayout }
  );
  assert.equal(adminEditorRoute.response.status, 403);

  const viewerTemplates = await request(
    "GET",
    "/templates",
    viewerToken
  );
  assert.equal(viewerTemplates.response.status, 200);
  assert.ok(
    viewerTemplates.payload.some(
      (template) => Number(template.id) === Number(templateId)
    )
  );

  const viewerDevices = await request(
    "GET",
    "/influx/allowed-devices",
    viewerToken
  );
  assert.equal(viewerDevices.response.status, 200);
  assert.ok(
    viewerDevices.payload.every(
      (device) => Number(device.org_id) === Number(organization.id)
    )
  );

  const viewerWrite = await request(
    "PATCH",
    `/templates/${templateId}/layout`,
    viewerToken,
    { layout: editorLayout }
  );
  assert.equal(viewerWrite.response.status, 403);

  console.log("PASS: editor layout update is narrowly authorized");
  console.log("PASS: editor metadata, grid and source restrictions are enforced");
  console.log("PASS: viewer template and device reads are organization-scoped");
  console.log("PASS: viewer template writes are rejected");
} finally {
  if (templateId) {
    await dbQuery("DELETE FROM org_templates WHERE template_id = ?", [
      templateId,
    ]);
    await dbQuery("DELETE FROM templates WHERE id = ?", [templateId]);
  }

  const leftovers = await dbQuery(
    "SELECT COUNT(*) AS count FROM templates WHERE name LIKE ?",
    ["__role_api_check_%"]
  );
  assert.equal(Number(leftovers[0].count), 0);
  console.log("PASS: temporary API test data was removed");

  await closeDatabase();
}
