import * as duckdb from "@duckdb/duckdb-wasm";

export type DatasetFile = {
  name: string;
  url: string;
};

export type DatasetManifest = {
  id: string;
  version: number;
  generatedAt: string;
  files: DatasetFile[];
};

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export function getDuckDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const bundles: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: "/duckdb/duckdb-mvp.wasm",
          mainWorker: "/duckdb/duckdb-browser-mvp.worker.js",
        },
        eh: {
          mainModule: "/duckdb/duckdb-eh.wasm",
          mainWorker: "/duckdb/duckdb-browser-eh.worker.js",
        },
      };

      const bundle = await duckdb.selectBundle(bundles);
      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);

      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      return db;
    })();
  }

  return dbPromise;
}

export async function loadDatasetManifest(
  datasetId: string,
): Promise<DatasetManifest> {
  const res = await fetch(`/datasets/${datasetId}/manifest.json`);

  if (!res.ok) {
    throw new Error(`Failed to load manifest for ${datasetId}`);
  }

  return res.json();
}

export async function registerDataset(
  db: duckdb.AsyncDuckDB,
  manifest: DatasetManifest,
) {
  for (const file of manifest.files) {
    await db.registerFileURL(
      file.name,
      file.url,
      duckdb.DuckDBDataProtocol.HTTP,
      false,
    );
  }
}

export function toSqlFileList(paths: string[]) {
  return paths.map((p) => `'${p.replaceAll("'", "''")}'`).join(", ");
}
