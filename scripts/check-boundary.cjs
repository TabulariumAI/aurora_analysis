const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "src");
const forbidden = [
  /document_web/,
  /domains[\\/]/,
  /\b(EventBus|EVENTS|WorkerHelper|window|globalThis|localStorage|ENV)\b/,
  /\bdocument\s*(?:\.|\[)/,
  /=\s*document\b/,
  /\(\s*document\s*[,)]/,
  /\btypeof\s+document\b/,
  /API\./,
];

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : files(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const failures = [];
for (const file of files(root)) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      failures.push(`${path.relative(process.cwd(), file)} matches ${pattern}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
