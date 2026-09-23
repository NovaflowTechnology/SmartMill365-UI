import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(
  here,
  "../novaflow-all-api.postman_collection.json",
);

const jsonHeader = {
  key: "Content-Type",
  value: "application/json",
  type: "text",
};

function script(source) {
  return {
    type: "text/javascript",
    packages: {},
    exec: source.trim().split("\n"),
  };
}

function testScript(expectedStatuses, extra = "") {
  const label = expectedStatuses.join(" or ");

  return script(`
pm.test("Status code is ${label}", () => {
  pm.expect(pm.response.code).to.be.oneOf(${JSON.stringify(expectedStatuses)});
});

pm.test("Response is JSON", () => {
  const contentType = pm.response.headers.get("Content-Type") || "";
  pm.expect(contentType.toLowerCase()).to.include("application/json");
  pm.expect(() => pm.response.json()).not.to.throw();
});

${extra}
  `);
}

function requestItem({
  id,
  title,
  method,
  endpoint,
  token,
  body,
  rawBody,
  statuses = [200],
  expected,
  extraTests = "",
}) {
  const headers = [];
  if (token) {
    headers.push({
      key: "Authorization",
      value: `Bearer {{${token}}}`,
      type: "text",
    });
  }
  if (body !== undefined || rawBody !== undefined) headers.push(jsonHeader);

  return {
    name: `${id} ${method} ${endpoint} - ${title}`,
    description: [
      `Expected status: ${statuses.join(" or ")}`,
      `Expected response: ${expected}`,
    ].join("\n"),
    request: {
      method,
      header: headers,
      ...(body === undefined && rawBody === undefined
        ? {}
        : {
            body: {
              mode: "raw",
              raw: rawBody ?? JSON.stringify(body, null, 2),
              options: { raw: { language: "json" } },
            },
          }),
      url: `{{baseUrl}}${endpoint}`,
    },
    event: [
      {
        listen: "test",
        script: testScript(statuses, extraTests),
      },
    ],
  };
}

function loginItem(id, role, tokenVariable) {
  const usernameVariable = `${role}Username`;
  const passwordVariable = `${role}Password`;

  return requestItem({
    id,
    title: `Authenticate ${role}`,
    method: "POST",
    endpoint: "/login",
    body: {
      username: `{{${usernameVariable}}}`,
      password: `{{${passwordVariable}}}`,
    },
    expected: "A JSON object containing a non-empty JWT and the authenticated user.",
    extraTests: `
const body = pm.response.json();
pm.test("JWT is returned", () => {
  pm.expect(body.token).to.be.a("string").and.not.empty;
});
pm.test("Authenticated account has the ${role} role", () => {
  pm.expect(body.user?.role ?? body.role).to.eql("${role}");
});
if (body.token) pm.environment.set("${tokenVariable}", body.token);

const returnedOrgId = body.user?.org_id ?? body.org_id;
if (!pm.environment.get("orgId") && returnedOrgId) {
  pm.environment.set("orgId", String(returnedOrgId));
}
    `,
  });
}

const firstValue = `
function firstValue(value, keys = []) {
  if (Array.isArray(value)) return value[0];
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key][0];
  }
  return undefined;
}
`;

const collection = {
  info: {
    _postman_id: randomUUID(),
    name: "NovaFlow Configurable Dashboard - Complete Backend API",
    description:
      "Generated full-route regression collection. Run only against a disposable test database and non-production InfluxDB configuration because the suite creates, changes and deletes records.",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  event: [
    {
      listen: "prerequest",
      script: script(`
if (!pm.environment.get("runId")) {
  const random = Math.random().toString(36).slice(2, 8);
  pm.environment.set("runId", Date.now() + "-" + random);
}
      `),
    },
  ],
  item: [
    {
      name: "01 - Health and Authentication",
      item: [
        requestItem({
          id: "API01",
          title: "Backend health check",
          method: "GET",
          endpoint: "/health",
          expected: "The backend reports a healthy JSON response.",
          extraTests: `
const body = pm.response.json();
pm.test("Health response confirms availability", () => {
  pm.expect(body.ok ?? body.success).to.eql(true);
});`,
        }),
        loginItem("API02", "superadmin", "superadminToken"),
        loginItem("API03", "admin", "adminToken"),
        loginItem("API04", "editor", "editorToken"),
        loginItem("API05", "viewer", "viewerToken"),
        requestItem({
          id: "API06",
          title: "Reject invalid credentials safely",
          method: "POST",
          endpoint: "/login",
          body: {
            username: "{{viewerUsername}}",
            password: "definitely-wrong-password",
          },
          statuses: [401],
          expected: "The generic error 'Invalid username or password' with no account disclosure.",
          extraTests: `
const body = pm.response.json();
pm.test("Login error is generic", () => {
  pm.expect(body.error).to.eql("Invalid username or password");
});
pm.test("No internal details are exposed", () => {
  pm.expect(pm.response.text()).not.to.match(/ER_[A-Z_]+|SELECT\\s|stack/i);
});`,
        }),
        requestItem({
          id: "API07",
          title: "Reject a protected request without a token",
          method: "GET",
          endpoint: "/templates",
          statuses: [403],
          expected: "A JSON authentication error and no protected template data.",
        }),
      ],
    },
    {
      name: "02 - Organizations and Users",
      item: [
        requestItem({
          id: "API08",
          title: "Create a temporary organization",
          method: "POST",
          endpoint: "/organizations",
          token: "superadminToken",
          body: { name: "API Test Organization {{runId}}" },
          expected: "The created organization identifier and a success message.",
          extraTests: `
const body = pm.response.json();
const id = body.organization?.id ?? body.organizationId ?? body.id;
pm.test("Organization ID is returned", () => pm.expect(id).to.exist);
if (id) pm.environment.set("tempOrgId", String(id));`,
        }),
        requestItem({
          id: "API09",
          title: "List organizations",
          method: "GET",
          endpoint: "/organizations",
          token: "superadminToken",
          expected: "A JSON array containing organizations available to the caller.",
          extraTests: `
const body = pm.response.json();
pm.test("Organizations are returned as an array", () => pm.expect(body).to.be.an("array"));`,
        }),
        requestItem({
          id: "API10",
          title: "Rename the temporary organization",
          method: "PUT",
          endpoint: "/organizations/{{tempOrgId}}",
          token: "superadminToken",
          body: { name: "API Test Organization Updated {{runId}}" },
          expected: "A success response confirming the organization update.",
        }),
        requestItem({
          id: "API11",
          title: "Create a temporary user",
          method: "POST",
          endpoint: "/users",
          token: "superadminToken",
          body: {
            username: "api_test_user_{{runId}}",
            password: "{{generatedUserPassword}}",
            role: "editor",
            org_id: "{{tempOrgId}}",
          },
          expected: "A success response containing the new user ID.",
          extraTests: `
const body = pm.response.json();
pm.test("User ID is returned", () => pm.expect(body.userId).to.exist);
if (body.userId) pm.environment.set("tempUserId", String(body.userId));`,
        }),
        requestItem({
          id: "API12",
          title: "List users",
          method: "GET",
          endpoint: "/users",
          token: "superadminToken",
          expected: "A JSON array of user records without plaintext passwords.",
          extraTests: `
const body = pm.response.json();
pm.test("Users are returned as an array", () => pm.expect(body).to.be.an("array"));
pm.test("Passwords are not returned", () => pm.expect(JSON.stringify(body)).not.to.match(/\"password\"/i));`,
        }),
        requestItem({
          id: "API12A",
          title: "Authenticate the temporary editor",
          method: "POST",
          endpoint: "/login",
          body: {
            username: "api_test_user_{{runId}}",
            password: "{{generatedUserPassword}}",
          },
          expected: "A JWT for the temporary organization-scoped Editor account.",
          extraTests: `
const body = pm.response.json();
pm.test("Temporary Editor JWT is returned", () => {
  pm.expect(body.token).to.be.a("string").and.not.empty;
});
if (body.token) pm.environment.set("tempEditorToken", body.token);`,
        }),
        requestItem({
          id: "API13",
          title: "Update the temporary user's role",
          method: "PUT",
          endpoint: "/users/{{tempUserId}}/role",
          token: "superadminToken",
          body: { role: "viewer", org_id: "{{tempOrgId}}" },
          expected: "A success response confirming the temporary user's Viewer role.",
        }),
        requestItem({
          id: "API13A",
          title: "Authenticate the temporary viewer",
          method: "POST",
          endpoint: "/login",
          body: {
            username: "api_test_user_{{runId}}",
            password: "{{generatedUserPassword}}",
          },
          expected: "A JWT for the temporary organization-scoped Viewer account.",
          extraTests: `
const body = pm.response.json();
pm.test("Temporary Viewer JWT is returned", () => {
  pm.expect(body.token).to.be.a("string").and.not.empty;
});
if (body.token) pm.environment.set("tempViewerToken", body.token);`,
        }),
      ],
    },
    {
      name: "03 - Templates and Role Boundaries",
      item: [
        requestItem({
          id: "API14",
          title: "Create a dashboard template",
          method: "POST",
          endpoint: "/templates",
          token: "superadminToken",
          body: {
            name: "API Test Template {{runId}}",
            org_id: "{{tempOrgId}}",
            layout: { cols: 2, rows: 2, items: [] },
          },
          expected: "A success response containing the new template ID.",
          extraTests: `
const body = pm.response.json();
pm.test("Template ID is returned", () => pm.expect(body.templateId).to.exist);
if (body.templateId) pm.environment.set("templateId", String(body.templateId));`,
        }),
        requestItem({
          id: "API15",
          title: "List accessible templates",
          method: "GET",
          endpoint: "/templates",
          token: "adminToken",
          expected: "A JSON array filtered to templates accessible to the administrator.",
          extraTests: `
const body = pm.response.json();
pm.test("Templates are returned as an array", () => pm.expect(body).to.be.an("array"));`,
        }),
        requestItem({
          id: "API16",
          title: "Update template metadata and layout",
          method: "PUT",
          endpoint: "/templates/{{templateId}}",
          token: "superadminToken",
          body: {
            name: "API Test Template Updated {{runId}}",
            layout: { cols: 2, rows: 2, items: [] },
          },
          expected: "A success response confirming the complete template update.",
        }),
        requestItem({
          id: "API17",
          title: "Assign the template to an organization",
          method: "POST",
          endpoint: "/assign-template",
          token: "superadminToken",
          body: { org_id: "{{tempOrgId}}", template_id: "{{templateId}}" },
          expected: "A success response confirming the organization-template assignment.",
        }),
        requestItem({
          id: "API18",
          title: "List template assignments",
          method: "GET",
          endpoint: "/template-assignments",
          token: "superadminToken",
          expected: "A JSON array containing template assignment records.",
          extraTests: `
const body = pm.response.json();
pm.test("Assignments are returned as an array", () => pm.expect(body).to.be.an("array"));`,
        }),
        requestItem({
          id: "API19",
          title: "Allow an editor to update layout only",
          method: "PATCH",
          endpoint: "/templates/{{templateId}}/layout",
          token: "tempEditorToken",
          body: { layout: { cols: 2, rows: 2, items: [] } },
          expected: "A success response confirming an organization-scoped layout update.",
        }),
        requestItem({
          id: "API20",
          title: "Set the viewer's favourite template",
          method: "PUT",
          endpoint: "/users/favorite-template",
          token: "tempViewerToken",
          body: { template_id: "{{templateId}}" },
          expected: "A success response confirming the favourite template selection.",
        }),
        requestItem({
          id: "API21",
          title: "Retrieve the viewer's default template",
          method: "GET",
          endpoint: "/default-template",
          token: "tempViewerToken",
          expected: "The selected or organization-default template with parsed layout JSON.",
        }),
        requestItem({
          id: "API22",
          title: "Prevent an editor from changing template ownership or name",
          method: "PUT",
          endpoint: "/templates/{{templateId}}",
          token: "tempEditorToken",
          body: {
            name: "Unauthorized rename",
            layout: { cols: 2, rows: 2, items: [] },
          },
          statuses: [403],
          expected: "A JSON authorization error; the template remains unchanged.",
        }),
        requestItem({
          id: "API23",
          title: "Prevent a viewer from changing template layout",
          method: "PATCH",
          endpoint: "/templates/{{templateId}}/layout",
          token: "tempViewerToken",
          body: { layout: { cols: 2, rows: 2, items: [] } },
          statuses: [403],
          expected: "A JSON authorization error; the layout remains unchanged.",
        }),
      ],
    },
    {
      name: "04 - Process Flows",
      item: [
        requestItem({
          id: "API24",
          title: "Create a process flow",
          method: "POST",
          endpoint: "/process-flows",
          token: "tempEditorToken",
          body: {
            name: "API Test Process Flow {{runId}}",
            description: "Temporary automated API test flow",
            topology: { nodes: [], connections: [], dataSources: {} },
          },
          statuses: [201],
          expected: "The newly created process flow, including its ID and topology.",
          extraTests: `
const body = pm.response.json();
const id = body.id ?? body.processFlow?.id ?? body.flow?.id;
pm.test("Process-flow ID is returned", () => pm.expect(id).to.exist);
if (id) pm.environment.set("flowId", String(id));`,
        }),
        requestItem({
          id: "API25",
          title: "List accessible process flows",
          method: "GET",
          endpoint: "/process-flows",
          token: "tempViewerToken",
          expected: "A JSON array filtered to the viewer's organization.",
          extraTests: `
const body = pm.response.json();
pm.test("Process flows are returned as an array", () => pm.expect(body).to.be.an("array"));`,
        }),
        requestItem({
          id: "API26",
          title: "Retrieve one process flow",
          method: "GET",
          endpoint: "/process-flows/{{flowId}}",
          token: "tempViewerToken",
          expected: "The requested organization-scoped process flow.",
        }),
        requestItem({
          id: "API27",
          title: "Update a process flow",
          method: "PUT",
          endpoint: "/process-flows/{{flowId}}",
          token: "tempEditorToken",
          body: {
            name: "API Test Process Flow Updated {{runId}}",
            description: "Updated by the automated API suite",
            topology: { nodes: [], connections: [], dataSources: {} },
          },
          expected: "The updated process flow with its persisted topology.",
        }),
        requestItem({
          id: "API28",
          title: "Prevent a viewer from creating process flows",
          method: "POST",
          endpoint: "/process-flows",
          token: "tempViewerToken",
          body: {
            name: "Unauthorized process flow",
            topology: { nodes: [], connections: [] },
          },
          statuses: [403],
          expected: "A JSON authorization error and no new process-flow record.",
        }),
      ],
    },
    {
      name: "05 - InfluxDB Metadata and Device Permissions",
      item: [
        requestItem({
          id: "API29",
          title: "List InfluxDB buckets",
          method: "GET",
          endpoint: "/influx/buckets",
          token: "superadminToken",
          expected: "A JSON bucket list from the configured InfluxDB service.",
          extraTests: `${firstValue}
const body = pm.response.json();
const value = firstValue(body, ["buckets", "data"]);
const bucket = typeof value === "string" ? value : value?.name ?? value?.bucket;
pm.test("At least one bucket is available", () => pm.expect(bucket).to.exist);
if (!pm.environment.get("bucket") && bucket) pm.environment.set("bucket", String(bucket));`,
        }),
        requestItem({
          id: "API31",
          title: "List InfluxDB measurements",
          method: "GET",
          endpoint: "/influx/measurements?bucket={{bucket}}",
          token: "superadminToken",
          expected: "A JSON measurement list for the selected bucket.",
          extraTests: `${firstValue}
const body = pm.response.json();
const value = firstValue(body, ["measurements", "data"]);
const measurement = typeof value === "string" ? value : value?.name ?? value?.measurement;
pm.test("At least one measurement is available", () => pm.expect(measurement).to.exist);
if (!pm.environment.get("measurement") && measurement) pm.environment.set("measurement", String(measurement));`,
        }),
        requestItem({
          id: "API33",
          title: "List identifiers for one measurement",
          method: "GET",
          endpoint: "/influx/ids?bucket={{bucket}}&measurement={{measurement}}&tagKey={{tagKey}}",
          token: "superadminToken",
          expected: "A JSON identifier list filtered by bucket and measurement.",
        }),
        requestItem({
          id: "API34",
          title: "Assign one device source to an organization",
          method: "POST",
          endpoint: "/organization-influx-devices",
          token: "superadminToken",
          body: {
            org_id: "{{tempOrgId}}",
            bucket_name: "{{bucket}}",
            measurement_name: "{{measurement}}",
            tag_key: "{{tagKey}}",
            tag_value: "{{deviceId}}",
            device_name: "API Test Device {{runId}}",
          },
          statuses: [201],
          expected: "A success response containing the permission assignment ID.",
          extraTests: `
const body = pm.response.json();
pm.test("Device assignment ID is returned", () => pm.expect(body.deviceId).to.exist);
if (body.deviceId) pm.environment.set("deviceAssignmentId", String(body.deviceId));`,
        }),
        requestItem({
          id: "API35",
          title: "List organization device assignments",
          method: "GET",
          endpoint: "/organization-influx-devices",
          token: "superadminToken",
          expected: "A JSON array containing organization-to-device permission rows.",
          extraTests: `
const body = pm.response.json();
pm.test("Device assignments are returned as an array", () => pm.expect(body).to.be.an("array"));`,
        }),
        requestItem({
          id: "API36",
          title: "List devices permitted for the viewer",
          method: "GET",
          endpoint: "/influx/allowed-devices",
          token: "tempViewerToken",
          expected: "Only device sources permitted for the viewer's organization.",
          extraTests: `
const body = pm.response.json();
pm.test("Allowed devices are returned as an array", () => pm.expect(body).to.be.an("array"));`,
        }),
        requestItem({
          id: "API37",
          title: "List permitted channels",
          method: "GET",
          endpoint: "/influx/channels?bucket={{bucket}}&measurement={{measurement}}&tagKey={{tagKey}}&tagValue={{deviceId}}",
          token: "tempViewerToken",
          expected: "A JSON channel list for an organization-permitted data source.",
          extraTests: `${firstValue}
const body = pm.response.json();
const value = firstValue(body, ["channels", "fields", "data"]);
const channel = typeof value === "string" ? value : value?.name ?? value?.field ?? value?.channel;
pm.test("At least one channel is available", () => pm.expect(channel).to.exist);
if (!pm.environment.get("channel") && channel) pm.environment.set("channel", String(channel));`,
        }),
      ],
    },
    {
      name: "06 - Dashboard Data",
      item: [
        requestItem({
          id: "API43",
          title: "Retrieve dashboard live data",
          method: "POST",
          endpoint: "/template-live-data",
          token: "tempViewerToken",
          body: {
            dataSources: {
              apiTestValue: {
                bucket: "{{bucket}}",
                measurement: "{{measurement}}",
                tagKey: "{{tagKey}}",
                tagValue: "{{deviceId}}",
                field: "{{channel}}",
              },
            },
            historyWindow: "15m",
            includeHistory: false,
            items: [
              {
                id: "api-test-widget",
                type: "number",
                dataKey: "apiTestValue",
              },
            ],
          },
          expected: "Latest permitted industrial measurement data for the requested widget source.",
        }),
      ],
    },
    {
      name: "07 - Cleanup",
      item: [
        requestItem({
          id: "API38",
          title: "Remove one device permission",
          method: "DELETE",
          endpoint: "/organization-influx-devices/{{deviceAssignmentId}}",
          token: "superadminToken",
          expected: "A success response confirming removal of the permission row.",
        }),
        requestItem({
          id: "API41",
          title: "Create a device permission for bulk removal",
          method: "POST",
          endpoint: "/organization-influx-devices",
          token: "superadminToken",
          body: {
            org_id: "{{tempOrgId}}",
            bucket_name: "{{bucket}}",
            measurement_name: "{{measurement}}",
            tag_key: "{{tagKey}}",
            tag_value: "{{deviceId}}",
            device_name: "API Cleanup Device {{runId}}",
          },
          statuses: [201],
          expected: "A temporary permission assignment ID for the bulk-removal test.",
          extraTests: `
const body = pm.response.json();
pm.test("Cleanup assignment ID is returned", () => pm.expect(body.deviceId).to.exist);
if (body.deviceId) pm.environment.set("deviceAssignmentId", String(body.deviceId));`,
        }),
        requestItem({
          id: "API42",
          title: "Remove a device permission in bulk",
          method: "POST",
          endpoint: "/organization-influx-devices/bulk-remove",
          token: "superadminToken",
          body: { assignment_ids: ["{{deviceAssignmentId}}"] },
          expected: "A success response confirming that the temporary permission row was removed.",
          extraTests: `
const body = pm.response.json();
pm.test("One cleanup assignment is removed", () => pm.expect(body.removed).to.eql(1));`,
        }),
        requestItem({
          id: "API44",
          title: "Remove the template assignment",
          method: "DELETE",
          endpoint: "/template-assignments",
          token: "superadminToken",
          body: { org_id: "{{tempOrgId}}", template_id: "{{templateId}}" },
          expected: "A success response confirming assignment removal.",
        }),
        requestItem({
          id: "API45",
          title: "Delete the temporary template",
          method: "DELETE",
          endpoint: "/templates/{{templateId}}",
          token: "superadminToken",
          expected: "A success response confirming template deletion.",
        }),
        requestItem({
          id: "API46",
          title: "Delete the temporary process flow",
          method: "DELETE",
          endpoint: "/process-flows/{{flowId}}",
          token: "tempEditorToken",
          expected: "A success response confirming process-flow deletion.",
        }),
        requestItem({
          id: "API47",
          title: "Delete the temporary organization and unlink its user",
          method: "DELETE",
          endpoint: "/organizations/{{tempOrgId}}",
          token: "superadminToken",
          expected: "A success response confirming deletion of the temporary organization; its user is retained with no organization because no user-delete API is exposed.",
        }),
      ],
    },
  ],
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
console.log(`Generated ${outputPath}`);
