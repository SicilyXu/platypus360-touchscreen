const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const distDir = path.join(packageRoot, "node_modules", "react-zoom-pan-pinch", "dist");
const jsFiles = ["index.esm.js", "index.cjs.js"];
const mapFiles = ["index.esm.js.map", "index.cjs.js.map"];

if (!fs.existsSync(distDir)) {
  process.exit(0);
}

for (const file of jsFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) continue;

  const source = fs.readFileSync(filePath, "utf8");
  const updated = source.replace(/\r?\n\/\/# sourceMappingURL=.*$/m, "");
  if (updated !== source) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
}

for (const file of mapFiles) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) continue;

  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // Removing the broken map is optional once the JS file no longer references it.
  }
}

