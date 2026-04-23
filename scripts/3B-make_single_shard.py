import os
import duckdb

DB_PATH = "arxiv-search.db"
OUT_FILE = "arxiv_single_search.parquet"

THREADS = os.cpu_count() or 8
ROW_GROUP_SIZE = 100_000
COMPRESSION_LEVEL = 19

SQL = f"""
COPY (
    SELECT
        id,
        title,
        abstract,
        authors_text,
        categories_text,
        primary_category,
        TRY_CAST(published AS DATE) AS published_at,
        COALESCE(TRY_CAST(updated AS DATE), TRY_CAST(published AS DATE)) AS updated_at
    FROM source.records
    WHERE TRY_CAST(published AS DATE) IS NOT NULL
    ORDER BY primary_category, published_at, id
) TO '{OUT_FILE}' (
    FORMAT 'parquet',
    COMPRESSION 'zstd',
    COMPRESSION_LEVEL {COMPRESSION_LEVEL},
    ROW_GROUP_SIZE {ROW_GROUP_SIZE}
)
"""

def main():
    if os.path.exists(OUT_FILE):
        os.remove(OUT_FILE)

    con = duckdb.connect()
    con.execute("PRAGMA enable_progress_bar")
    con.execute(f"PRAGMA threads={THREADS}")
    con.execute("INSTALL sqlite; LOAD sqlite;")
    con.execute(f"ATTACH '{DB_PATH}' AS source (TYPE sqlite);")

    print(f"Using {THREADS} DuckDB threads")
    print(f"Source DB: {DB_PATH}")
    print(f"Output file: {OUT_FILE}")
    print()

    con.execute(SQL)

    rows = con.execute("""
        SELECT COUNT(*)
        FROM source.records
        WHERE TRY_CAST(published AS DATE) IS NOT NULL
    """).fetchone()[0]

    size_mb = os.path.getsize(OUT_FILE) / (1024 * 1024)

    print("Done.")
    print(f"rows: {rows:,}")
    print(f"size: {size_mb:.2f} MB")

if __name__ == "__main__":
    main()
