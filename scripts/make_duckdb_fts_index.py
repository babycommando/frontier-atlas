import os
import duckdb

SRC_SQLITE = "arxiv-search.db"
OUT_DB = "public/search/arxiv-search.duckdb"

def main():
    os.makedirs(os.path.dirname(OUT_DB), exist_ok=True)

    if os.path.exists(OUT_DB):
        os.remove(OUT_DB)

    con = duckdb.connect(OUT_DB)

    con.execute("INSTALL sqlite;")
    con.execute("LOAD sqlite;")

    con.execute("INSTALL fts;")
    con.execute("LOAD fts;")

    con.execute(f"ATTACH '{SRC_SQLITE}' AS src (TYPE sqlite);")

    con.execute("""
        CREATE TABLE docs AS
        SELECT
            id,
            COALESCE(title, '') AS title,
            COALESCE(abstract, '') AS abstract,
            COALESCE(authors_text, '') AS authors_text,
            COALESCE(categories_text, '') AS categories_text,
            COALESCE(primary_category, '') AS primary_category,
            TRY_CAST(published AS DATE) AS published_at,
            COALESCE(
                TRY_CAST(updated AS DATE),
                TRY_CAST(published AS DATE)
            ) AS updated_at
        FROM src.records
        WHERE TRY_CAST(published AS DATE) IS NOT NULL
    """)

    con.execute("""
        PRAGMA create_fts_index(
            'docs',
            'id',
            'title',
            'abstract',
            'authors_text',
            'categories_text',
            overwrite = 1
        )
    """)

    con.execute("CHECKPOINT")
    con.close()

    print(f"done: {OUT_DB}")

if __name__ == "__main__":
    main()
