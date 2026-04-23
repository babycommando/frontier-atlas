import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const shardRoot = path.join(root, "public", "arxiv_shards_v5");
const outFile = path.join(shardRoot, "manifest.json");

const shards = [];

walk(shardRoot);

shards.sort((a, b) => {
  if ((a.year ?? 0) !== (b.year ?? 0)) return (a.year ?? 0) - (b.year ?? 0);
  if ((a.month ?? 0) !== (b.month ?? 0)) return (a.month ?? 0) - (b.month ?? 0);
  return a.name.localeCompare(b.name);
});

fs.writeFileSync(
  outFile,
  JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      shards,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${shards.length} shard entries to ${outFile}`);

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

    const rel = path.relative(shardRoot, full).replace(/\\/g, "/");
    const year = matchNumber(rel, /year=(\d{4})/);
    const month = matchNumber(rel, /month=(\d{1,2})/);

    shards.push({
      name: `arxiv_shards_v5/${rel}`,
      url: `/arxiv_shards_v5/${rel}`,
      year,
      month,
    });
  }
}

function matchNumber(input, regex) {
  const match = input.match(regex);
  return match ? Number(match[1]) : null;
}
