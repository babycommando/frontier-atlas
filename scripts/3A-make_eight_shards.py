import os
import shutil
import duckdb

DB_PATH = "arxiv-search.db"
OUT_DIR = "arxiv_shards_8_search"

THREADS = os.cpu_count() or 8
ROW_GROUP_SIZE = 100_000
COMPRESSION_LEVEL = 19

SHARDS = [
    ("shard_01_1986_2006.parquet", "1986-01-01", "2007-01-01"),
    ("shard_02_2007_2012.parquet", "2007-01-01", "2013-01-01"),
    ("shard_03_2013_2016.parquet", "2013-01-01", "2017-01-01"),
    ("shard_04_2017_2019.parquet", "2017-01-01", "2020-01-01"),
    ("shard_05_2020_2021.parquet", "2020-01-01", "2022-01-01"),
    ("shard_06_2022_2023.parquet", "2022-01-01", "2024-01-01"),
    ("shard_07_2024.parquet",      "2024-01-01", "2025-01-01"),
    ("shard_08_2025_2026.parquet", "2025-01-01", "2027-01-01"),
]

SELECT_SQL = """
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
  AND TRY_CAST(published AS DATE) >= DATE '{start_date}'
  AND TRY_CAST(published AS DATE) < DATE '{end_date}'
ORDER BY primary_category, published_at, id
"""

COUNT_SQL = """
SELECT COUNT(*)
FROM source.records
WHERE TRY_CAST(published AS DATE) IS NOT NULL
  AND TRY_CAST(published AS DATE) >= DATE '{start_date}'
  AND TRY_CAST(published AS DATE) < DATE '{end_date}'
"""

def main():
    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)
    os.makedirs(OUT_DIR, exist_ok=True)

    con = duckdb.connect()
    con.execute("PRAGMA enable_progress_bar")
    con.execute(f"PRAGMA threads={THREADS}")
    con.execute("INSTALL sqlite; LOAD sqlite;")
    con.execute(f"ATTACH '{DB_PATH}' AS source (TYPE sqlite);")

    print(f"Using {THREADS} DuckDB threads")
    print(f"Source DB: {DB_PATH}")
    print(f"Output dir: {OUT_DIR}")
    print()

    total_rows = con.execute("""
        SELECT COUNT(*)
        FROM source.records
        WHERE TRY_CAST(published AS DATE) IS NOT NULL
    """).fetchone()[0]

    print(f"Total exportable rows: {total_rows:,}")
    print()

    total_written = 0

    for index, (filename, start_date, end_date) in enumerate(SHARDS, start=1):
        out_path = os.path.join(OUT_DIR, filename)

        rows = con.execute(
            COUNT_SQL.format(start_date=start_date, end_date=end_date)
        ).fetchone()[0]

        print(f"[{index}/8] Writing {filename}")
        print(f"    rows: {rows:,}")

        con.execute(f"""
            COPY (
                {SELECT_SQL.format(start_date=start_date, end_date=end_date)}
            ) TO '{out_path}' (
                FORMAT 'parquet',
                COMPRESSION 'zstd',
                COMPRESSION_LEVEL {COMPRESSION_LEVEL},
                ROW_GROUP_SIZE {ROW_GROUP_SIZE}
            )
        """)

        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        total_written += rows

        print(f"    size: {size_mb:.2f} MB")
        print()

    print("Done.")
    print(f"total written rows: {total_written:,}")

if __name__ == "__main__":
    main()
