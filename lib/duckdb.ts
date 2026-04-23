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
let bootPromise: Promise<void> | null = null;

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

export async function ensureSearchIndex(
  db: duckdb.AsyncDuckDB,
  manifest: DatasetManifest,
) {
  if (!bootPromise) {
    bootPromise = (async () => {
      const conn = await db.connect();

      try {
        const files = toSqlFileList(manifest.files.map((f) => f.name));

        await conn.query(`LOAD fts`);

        await conn.query(`
          CREATE OR REPLACE TEMP TABLE docs_search AS
          SELECT
            id,
            COALESCE(title, '') AS title,
            COALESCE(abstract, '') AS abstract,
            COALESCE(authors_text, '') AS authors_text,
            COALESCE(categories_text, '') AS categories_text,
            COALESCE(updated_at, published_at) AS updated_at
          FROM read_parquet([${files}])
        `);

        await conn.query(`
          PRAGMA create_fts_index(
            'docs_search',
            'id',
            'title',
            'abstract',
            'authors_text',
            'categories_text',
            overwrite = 1
          )
        `);
      } finally {
        await conn.close();
      }
    })();
  }

  await bootPromise;
}
