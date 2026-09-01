import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");
const extensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const nativeDialogCall = /\b(?:window\s*\.\s*)?(alert|confirm|prompt)\s*\(/g;
const violations = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;

    // feedback.js intentionally installs guards around the native APIs.
    if (fullPath.endsWith(path.join("src", "utils", "feedback.js"))) continue;

    const source = fs.readFileSync(fullPath, "utf8");
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      // Assignments such as window.alert = (...) => ... are guards, not calls.
      if (/window\s*\.\s*(alert|confirm|prompt)\s*=/.test(line)) return;

      nativeDialogCall.lastIndex = 0;
      let match;
      while ((match = nativeDialogCall.exec(line))) {
        violations.push({
          file: path.relative(process.cwd(), fullPath),
          line: index + 1,
          dialog: match[1],
          source: line.trim(),
        });
      }
    });
  }
};

walk(root);

if (violations.length) {
  console.error("Native browser dialogs found. Replace them with notify() / confirmAction():\n");
  for (const item of violations) {
    console.error(`${item.file}:${item.line}  ${item.dialog}()  ${item.source}`);
  }
  process.exit(1);
}

console.log("✓ No native alert(), confirm(), or prompt() calls found in src.");
