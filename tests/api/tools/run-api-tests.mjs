import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeApiReport } from "./newman-results-to-markdown.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const environmentTemplatePath = path.join(
  root,
  "tests/api/postman-local-environment.json",
);
const localEnvironmentPath = path.join(
  root,
  "tests/api/postman-local-environment.local.json",
);
const collectionPath = path.join(
  root,
  "tests/api/novaflow-all-api.postman_collection.json",
);
const reportsRoot = path.join(root, "reports");
const reportsDirectory = path.join(reportsRoot, "api");
const reportPath = path.join(reportsDirectory, "API-TEST-RESULTS.md");
const generatorPath = path.join(root, "tests/api/tools/generate-postman-collection.mjs");
const coverageAuditorPath = path.join(root, "tests/api/tools/audit-api-coverage.mjs");
const newmanPath = path.join(root, "node_modules/newman/bin/newman.js");

const osEnvironmentMap = {
  baseUrl: "API_TEST_BASE_URL",
  superadminUsername: "API_TEST_SUPERADMIN_USERNAME",
  superadminPassword: "API_TEST_SUPERADMIN_PASSWORD",
  adminUsername: "API_TEST_ADMIN_USERNAME",
  adminPassword: "API_TEST_ADMIN_PASSWORD",
  editorUsername: "API_TEST_EDITOR_USERNAME",
  editorPassword: "API_TEST_EDITOR_PASSWORD",
  viewerUsername: "API_TEST_VIEWER_USERNAME",
  viewerPassword: "API_TEST_VIEWER_PASSWORD",
};

function fail(message) {
  console.error(message);
  process.exitCode = 2;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function valueMap(environment) {
  return new Map((environment.values || []).map((entry) => [entry.key, entry]));
}

async function removeGeneratedUser(username) {
  let database;
  try {
    const databaseModule = await import("../../../config/db.js");
    database = databaseModule.default;
    const result = await databaseModule.dbQuery(
      "DELETE FROM users WHERE username = ?",
      [username],
    );
    console.log(`Removed ${Number(result.affectedRows || 0)} generated API test user(s).`);
  } catch (error) {
    console.warn(`Could not remove generated API test user: ${error.message}`);
  } finally {
    if (database) {
      await new Promise((resolve) => database.end(() => resolve()));
    }
  }
}

function openReportsFolder() {
  if (
    process.platform !== "win32" ||
    process.env.CI === "true" ||
    process.env.API_TEST_OPEN_REPORTS === "false"
  ) {
    return;
  }

  try {
    const explorer = spawn("explorer.exe", [reportsRoot], {
      detached: true,
      stdio: "ignore",
    });
    explorer.once("error", (error) => {
      console.warn(`Could not open the reports folder: ${error.message}`);
    });
    explorer.unref();
  } catch (error) {
    console.warn(`Could not open the reports folder: ${error.message}`);
  }
}

async function main() {
  await mkdir(reportsDirectory, { recursive: true });

  const generator = spawnSync(process.execPath, [generatorPath], {
    cwd: root,
    stdio: "inherit",
  });
  if (generator.status !== 0) {
    process.exitCode = generator.status || 2;
    return;
  }

  const coverageAudit = spawnSync(process.execPath, [coverageAuditorPath], {
    cwd: root,
    stdio: "inherit",
  });
  if (coverageAudit.status !== 0) {
    process.exitCode = coverageAudit.status || 2;
    openReportsFolder();
    return;
  }

  if (!(await fileExists(newmanPath))) {
    fail("Newman is not installed. Run npm install before npm run test:api.");
    openReportsFolder();
    return;
  }

  const sourcePath = (await fileExists(localEnvironmentPath))
    ? localEnvironmentPath
    : environmentTemplatePath;
  const environment = JSON.parse(await readFile(sourcePath, "utf8"));
  const values = valueMap(environment);

  for (const [postmanKey, osKey] of Object.entries(osEnvironmentMap)) {
    if (process.env[osKey]) {
      const existing = values.get(postmanKey);
      if (existing) existing.value = process.env[osKey];
    }
  }

  const required = [
    "baseUrl",
    "superadminUsername",
    "superadminPassword",
    "adminUsername",
    "adminPassword",
    "editorUsername",
    "editorPassword",
    "viewerUsername",
    "viewerPassword",
  ];
  const missing = required.filter((key) => !String(values.get(key)?.value || "").trim());
  if (missing.length) {
    if (!(await fileExists(localEnvironmentPath))) {
      await copyFile(environmentTemplatePath, localEnvironmentPath);
    }
    fail(
      [
        `Missing API test values: ${missing.join(", ")}.`,
        `Fill ${localEnvironmentPath} or set the API_TEST_* environment variables, then run npm run test:api again.`,
        "Use only disposable test accounts and a disposable test database.",
      ].join("\n"),
    );
    return;
  }

  const baseUrl = new URL(values.get("baseUrl").value);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
    baseUrl.hostname,
  );
  if (!isLocalHost && process.env.API_TEST_ALLOW_REMOTE !== "true") {
    fail(
      "Refusing to run destructive API tests against a remote host. Set API_TEST_ALLOW_REMOTE=true only for an approved disposable test environment.",
    );
    return;
  }

  const runId = `${Date.now()}-${randomUUID().slice(0, 6)}`;
  const runIdEntry = values.get("runId");
  if (runIdEntry) {
    runIdEntry.value = runId;
  } else {
    environment.values.push({
      key: "runId",
      value: runId,
      type: "default",
      enabled: true,
    });
  }
  const generatedUsername = `api_test_user_${runId}`;

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "novaflow-api-test-"));
  const runtimeEnvironmentPath = path.join(temporaryDirectory, "environment.json");
  const rawResultPath = path.join(temporaryDirectory, "newman-result.json");

  try {
    await writeFile(runtimeEnvironmentPath, JSON.stringify(environment), "utf8");

    const result = spawnSync(
      process.execPath,
      [
        newmanPath,
        "run",
        collectionPath,
        "-e",
        runtimeEnvironmentPath,
        "--reporters",
        "cli,json",
        "--reporter-json-export",
        rawResultPath,
        "--color",
        "on",
      ],
      { cwd: root, stdio: "inherit" },
    );

    if (await fileExists(rawResultPath)) {
      const summary = await writeApiReport(rawResultPath, reportPath);
      console.log(
        `Sanitized report: ${reportPath} (${summary.passed}/${summary.total} passed)`,
      );
    }

    await removeGeneratedUser(generatedUsername);

    openReportsFolder();

    process.exitCode = result.status ?? 1;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
