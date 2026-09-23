import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const routesDirectory = path.join(root, "routes");
const collectionPath = path.join(
  root,
  "tests/api/novaflow-all-api.postman_collection.json",
);
const reportPath = path.join(root, "reports/api/API-COVERAGE.md");
const routePattern = /\b(?:router|app)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;

const normalizePath = (value) => {
  const raw = String(value || "")
    .replace(/^\{\{baseUrl\}\}/, "")
    .split("?")[0];

  return (raw || "/")
    .replace(/\{\{[^}]+\}\}/g, ":param")
    .replace(/:[A-Za-z0-9_]+/g, ":param")
    .replace(/\/{2,}/g, "/");
};

const routeKey = (method, routePath) =>
  `${String(method).toUpperCase()} ${normalizePath(routePath)}`;

const collectImplementedRoutes = async () => {
  const routeFiles = (await readdir(routesDirectory))
    .filter((name) => name.endsWith(".js"))
    .map((name) => path.join(routesDirectory, name));
  const files = [...routeFiles, path.join(root, "server.js")];
  const routes = new Map();

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");

    for (const match of source.matchAll(routePattern)) {
      const key = routeKey(match[1], match[2]);
      const current = routes.get(key) || [];
      current.push(path.relative(root, filePath).replace(/\\/g, "/"));
      routes.set(key, current);
    }
  }

  return routes;
};

const collectCollectionRoutes = (collection) => {
  const routes = new Map();

  const visit = (items = []) => {
    for (const item of items) {
      if (Array.isArray(item.item)) {
        visit(item.item);
      }

      if (!item.request) continue;

      const url =
        typeof item.request.url === "string"
          ? item.request.url
          : item.request.url?.raw || "";
      const key = routeKey(item.request.method, url);
      const current = routes.get(key) || [];
      current.push(item.name || "Unnamed test");
      routes.set(key, current);
    }
  };

  visit(collection.item);
  return routes;
};

const markdownList = (items, emptyMessage) =>
  items.length
    ? items.map((item) => `- \`${item}\``)
    : [`- ${emptyMessage}`];

const implemented = await collectImplementedRoutes();
const collection = JSON.parse(await readFile(collectionPath, "utf8"));
const covered = collectCollectionRoutes(collection);
const implementedKeys = [...implemented.keys()].sort();
const coveredKeys = [...covered.keys()].sort();
const missing = implementedKeys.filter((key) => !covered.has(key));
const stale = coveredKeys.filter((key) => !implemented.has(key));

const lines = [
  "# Backend API Coverage Audit",
  "",
  `- **Generated:** ${new Date().toISOString()}`,
  `- **Implemented routes:** ${implementedKeys.length}`,
  `- **Routes covered by the Postman collection:** ${implementedKeys.length - missing.length}`,
  `- **Missing collection coverage:** ${missing.length}`,
  `- **Stale collection routes:** ${stale.length}`,
  `- **Coverage result:** ${missing.length === 0 && stale.length === 0 ? "Pass" : "Fail"}`,
  "",
  "## Implemented Routes",
  "",
  ...implementedKeys.map((key) => {
    const testCount = covered.get(key)?.length || 0;
    const sourceFiles = [...new Set(implemented.get(key))].join(", ");
    return `- \`${key}\` - ${testCount} collection test(s); ${sourceFiles}`;
  }),
  "",
  "## Missing Coverage",
  "",
  ...markdownList(missing, "None."),
  "",
  "## Stale Collection Routes",
  "",
  ...markdownList(stale, "None."),
  "",
];

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, lines.join("\n"), "utf8");

console.log(
  `API coverage: ${implementedKeys.length - missing.length}/${implementedKeys.length} implemented routes covered.`,
);
console.log(`Coverage report: ${reportPath}`);

if (missing.length || stale.length) {
  process.exitCode = 1;
}
