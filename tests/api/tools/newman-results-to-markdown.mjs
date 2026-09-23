import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const secretKeyPattern = /password|token|authorization|secret/i;
const sensitiveValuePattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

function decodeStream(stream) {
  if (!stream) return "";
  if (typeof stream === "string") return stream;
  if (stream.type === "Buffer" && Array.isArray(stream.data)) {
    return Buffer.from(stream.data).toString("utf8");
  }
  return "";
}

function redact(value, key = "") {
  if (secretKeyPattern.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redact(entryValue, entryKey),
      ]),
    );
  }
  if (typeof value === "string") {
    return value.replace(sensitiveValuePattern, "Bearer [REDACTED]");
  }
  return value;
}

function sanitizeText(raw, maxLength = 700) {
  if (!raw) return "None";
  let value;
  try {
    value = JSON.stringify(redact(JSON.parse(raw)), null, 2);
  } catch {
    value = raw.replace(sensitiveValuePattern, "Bearer [REDACTED]");
  }
  return value.length > maxLength
    ? `${value.slice(0, maxLength)} ... [truncated]`
    : value;
}

function markdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function urlString(url) {
  if (!url) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;
  const protocol = url.protocol ? `${url.protocol}://` : "";
  const host = Array.isArray(url.host) ? url.host.join(".") : url.host || "";
  const pathName = Array.isArray(url.path) ? `/${url.path.join("/")}` : "";
  const query = Array.isArray(url.query)
    ? url.query
        .filter((entry) => !entry.disabled)
        .map((entry) => `${entry.key}=${entry.value ?? ""}`)
        .join("&")
    : "";
  return `${protocol}${host}${pathName}${query ? `?${query}` : ""}`;
}

function descriptionText(description) {
  if (typeof description === "string") return description;
  return description?.content || "";
}

function expectedDetails(execution) {
  const description = descriptionText(
    execution.item?.description ?? execution.item?.request?.description,
  );
  const status = description.match(/Expected status:\s*([^\r\n]+)/i)?.[1] ||
    "See collection assertion";
  const response = description.match(/Expected response:\s*([^\r\n]+)/i)?.[1] ||
    "See collection description";
  return { status, response };
}

function requestBody(execution) {
  const body = execution.request?.body;
  if (!body) return "None";
  if (typeof body === "string") return body;
  if (body.raw) return body.raw;
  return JSON.stringify(body);
}

function statusCode(execution) {
  return execution.response?.code ?? "No response";
}

function assertionFailures(execution) {
  return (execution.assertions || [])
    .filter((assertion) => assertion.error)
    .map((assertion) => assertion.assertion || assertion.error.message || "Assertion failed");
}

export async function writeApiReport(resultPath, outputPath) {
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  const executions = result.run?.executions || [];
  const rows = executions.map((execution) => {
    const name = execution.item?.name || "Unnamed request";
    const id = name.match(/^(API\d+[A-Z]?)/)?.[1] || "API--";
    const failures = assertionFailures(execution);
    const requestError = execution.requestError?.message;
    const passed = !requestError && failures.length === 0;
    const expected = expectedDetails(execution);
    const rawUrl = urlString(execution.request?.url);
    const endpoint = rawUrl.replace(/^https?:\/\/[^/]+/i, "{{baseUrl}}");
    const actualResponse = sanitizeText(decodeStream(execution.response?.stream));
    const detail = passed
      ? actualResponse
      : `${actualResponse}\n${[requestError, ...failures].filter(Boolean).join("; ")}`;

    return {
      id,
      description: name.replace(/^API\d+\s+/, ""),
      method: execution.request?.method || "",
      endpoint,
      request: sanitizeText(requestBody(execution), 450),
      expected: `${expected.status}; ${expected.response}`,
      actual: detail,
      status: statusCode(execution),
      result: passed ? "Pass" : "Fail",
    };
  });

  const passed = rows.filter((row) => row.result === "Pass").length;
  const failed = rows.length - passed;
  const timestamp = result.run?.timings?.completed
    ? new Date(result.run.timings.completed).toISOString()
    : new Date().toISOString();

  const lines = [
    "# Automated Backend API Test Results",
    "",
    `- **Execution time:** ${timestamp}`,
    `- **Collection:** ${result.collection?.info?.name || result.collection?.name || "NovaFlow backend API"}`,
    `- **Requests executed:** ${rows.length}`,
    `- **Passed:** ${passed}`,
    `- **Failed:** ${failed}`,
    `- **Overall result:** ${failed === 0 && rows.length > 0 ? "Pass" : "Fail"}`,
    "",
    "> This report is generated from the actual Newman run. Passwords, JWTs and authorization headers are redacted, and long responses are shortened for safe inclusion in Chapter 7.",
    "",
    "| Test ID | Description | HTTP method | Endpoint URL | Request body | Expected response | Actual response | Status code | Pass/Fail |",
    "|---|---|---|---|---|---|---|---:|---|",
    ...rows.map((row) =>
      [
        row.id,
        row.description,
        row.method,
        `\`${row.endpoint}\``,
        `\`${row.request}\``,
        row.expected,
        `\`${row.actual}\``,
        row.status,
        row.result,
      ]
        .map(markdownCell)
        .join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |"),
    ),
    "",
    "## Evidence Note",
    "",
    "Retain the Newman terminal summary and selected Postman/Newman screenshots as visual evidence. This generated table supplies the method, URL, request, expected outcome, actual outcome, status code and result for every executed request.",
    "",
  ];

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, lines.join("\n"), "utf8");
  return { total: rows.length, passed, failed, outputPath };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const [resultPath, outputPath] = process.argv.slice(2);
  if (!resultPath || !outputPath) {
    console.error("Usage: node newman-results-to-markdown.mjs <newman-result.json> <report.md>");
    process.exitCode = 2;
  } else {
    const summary = await writeApiReport(path.resolve(resultPath), path.resolve(outputPath));
    console.log(`Wrote ${summary.outputPath} (${summary.passed}/${summary.total} passed)`);
  }
}
