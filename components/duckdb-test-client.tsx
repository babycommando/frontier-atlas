import { useEffect, useState } from "react";
import {
  ensureSearchIndex,
  getDuckDb,
  loadDatasetManifest,
  registerDataset,
  toSqlFileList,
  type DatasetManifest,
} from "../lib/duckdb";

type AnyRow = Record<string, unknown>;

const DATASET_ID = "arxiv_shards_8_search";

export default function DuckdbTestClient() {
  const [status, setStatus] = useState("booting");
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<DatasetManifest | null>(null);
  const [dbReady, setDbReady] = useState(false);

  const [columns, setColumns] = useState<string[]>([]);

  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AnyRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let conn: any = null;

      try {
        setStatus(`loading ${DATASET_ID}`);

        const manifest = await loadDatasetManifest(DATASET_ID);
        const db = await getDuckDb();

        await registerDataset(db, manifest);

        setStatus("building search index");
        await ensureSearchIndex(db, manifest);

        conn = await db.connect();

        const files = toSqlFileList(manifest.files.map((f) => f.name));
        const schema = await conn.query(`
          DESCRIBE SELECT * FROM read_parquet([${files}])
        `);

        const discoveredColumns = schema
          .toArray()
          .map((row: any) => String(row.column_name));

        if (cancelled) return;

        setManifest(manifest);
        setColumns(discoveredColumns);
        setDbReady(true);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("failed");
      } finally {
        if (conn) {
          await conn.close();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runSearch() {
    const term = searchText.trim();

    if (!term) {
      setSearchError("Type something to search");
      setSearchResults([]);
      return;
    }

    if (!manifest || !dbReady) {
      setSearchError("Database is still loading");
      return;
    }

    let conn: any = null;

    try {
      setSearchLoading(true);
      setSearchError(null);

      const db = await getDuckDb();
      conn = await db.connect();

      const files = toSqlFileList(manifest.files.map((f) => f.name));
      const query = escapeSql(term);

      const result = await conn.query(`
        WITH ranked AS (
          SELECT
            id,
            fts_main_docs_search.match_bm25(
              id,
              '${query}'
            ) AS score
          FROM docs_search
        )
        SELECT p.*
        FROM read_parquet([${files}]) AS p
        INNER JOIN ranked r
          ON p.id = r.id
        WHERE r.score IS NOT NULL
        ORDER BY r.score DESC, p.updated_at DESC
        LIMIT 30
      `);

      setSearchResults(
        result.toArray().map((row: any) => normalizeDuckRow(row)),
      );
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (conn) {
        await conn.close();
      }
      setSearchLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#f5f5f5",
        padding: 24,
        fontFamily: "Inter, Arial, sans-serif",
      }}>
      <h1 style={{ marginBottom: 12 }}>DuckDB FTS test</h1>
      <p style={{ marginBottom: 8 }}>Dataset: {DATASET_ID}</p>
      <p style={{ marginBottom: 16 }}>Status: {status}</p>

      {error ? (
        <pre style={{ whiteSpace: "pre-wrap", color: "#ff8a8a" }}>{error}</pre>
      ) : null}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Detected columns</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(columns, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Full text search</h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !searchLoading) {
                void runSearch();
              }
            }}
            placeholder="Search title, abstract, authors, categories"
            style={{
              width: 520,
              maxWidth: "100%",
              background: "#101010",
              color: "#f5f5f5",
              border: "1px solid #2a2a2a",
              borderRadius: 10,
              padding: "12px 14px",
              outline: "none",
            }}
          />

          <button
            onClick={() => void runSearch()}
            disabled={searchLoading || !dbReady}
            style={{
              background: searchLoading || !dbReady ? "#222" : "#f5f5f5",
              color: searchLoading || !dbReady ? "#777" : "#050505",
              border: "none",
              borderRadius: 10,
              padding: "12px 16px",
              cursor: searchLoading || !dbReady ? "default" : "pointer",
              fontWeight: 600,
            }}>
            {searchLoading ? "Searching..." : "Search"}
          </button>
        </div>

        {searchError ? (
          <pre style={{ whiteSpace: "pre-wrap", color: "#ff8a8a" }}>
            {searchError}
          </pre>
        ) : null}

        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(searchResults, null, 2)}
        </pre>
      </section>
    </main>
  );
}

function normalizeDuckRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    out[key] = normalizeValue(value);
  }

  return out;
}

function normalizeValue(value: unknown): unknown {
  if (value == null) return null;

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeValue(v);
    }
    return out;
  }

  return value;
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}
