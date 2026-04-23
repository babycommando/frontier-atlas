// use this to generate manifest.json files for new datasets

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const datasetId = process.argv[2];

if (!datasetId) {
  throw new Error(
    "Usage: node scripts/build-dataset-manifest.mjs <dataset-id>",
  );
}

const datasetRoot = path.join(root, "public", "datasets", datasetId);
const outFile = path.join(datasetRoot, "manifest.json");

if (!fs.existsSync(datasetRoot)) {
  throw new Error(`Dataset folder not found: ${datasetRoot}`);
}

const files = [];
walk(datasetRoot);

files.sort((a, b) => a.url.localeCompare(b.url));

const manifest = {
  id: datasetId,
  version: 1,
  generatedAt: new Date().toISOString(),
  files,
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${files.length} files to ${outFile}`);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".parquet")) {
      continue;
    }

    const rel = path.relative(datasetRoot, full).replace(/\\/g, "/");

    files.push({
      name: `datasets/${datasetId}/${rel}`,
      url: `/datasets/${datasetId}/${rel}`,
    });
  }
}
