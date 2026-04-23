package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	_ "modernc.org/sqlite"
)

type Record struct {
	ID              string
	Title           string
	Abstract        string
	AuthorsJSON     string
	CategoriesJSON  string
	PrimaryCategory string
	Published       string
	Updated         string

	AuthorsText    string
	CategoriesText string
}

type Author struct {
	Name      string `json:"name"`
	Keyname   string `json:"keyname"`
	Forenames string `json:"forenames"`
}

func main() {
	var (
		srcPath   string
		dstPath   string
		workers   int
		batchSize int
	)

	flag.StringVar(&srcPath, "src", "arxiv.db", "source sqlite db")
	flag.StringVar(&dstPath, "dst", "arxiv-search.db", "destination sqlite db")
	flag.IntVar(&workers, "workers", runtime.NumCPU()*2, "number of workers")
	flag.IntVar(&batchSize, "batch", 10000, "insert batch size")
	flag.Parse()

	start := time.Now()

	src, err := sql.Open("sqlite", srcPath)
	must(err)
	defer src.Close()

	dst, err := sql.Open("sqlite", dstPath)
	must(err)
	defer dst.Close()

	src.SetMaxOpenConns(1)
	dst.SetMaxOpenConns(1)

	mustExec(dst, `PRAGMA journal_mode = OFF`)
	mustExec(dst, `PRAGMA synchronous = OFF`)
	mustExec(dst, `PRAGMA temp_store = MEMORY`)
	mustExec(dst, `PRAGMA locking_mode = EXCLUSIVE`)
	mustExec(dst, `PRAGMA cache_size = -200000`)
	mustExec(dst, `PRAGMA foreign_keys = OFF`)

	mustExec(dst, `
		CREATE TABLE records (
			id TEXT PRIMARY KEY,
			title TEXT,
			abstract TEXT,
			authors_text TEXT,
			categories_text TEXT,
			primary_category TEXT,
			published TEXT,
			updated TEXT
		);
	`)

	var total int64
	must(src.QueryRow(`SELECT COUNT(*) FROM records`).Scan(&total))

	log.Printf("rows=%d workers=%d batch=%d", total, workers, batchSize)

	rows, err := src.Query(`
		SELECT
			id,
			title,
			abstract,
			authors_json,
			categories_json,
			primary_category,
			published,
			updated
		FROM records
	`)
	must(err)
	defer rows.Close()

	jobs := make(chan Record, workers*16)
	out := make(chan Record, workers*16)

	var wg sync.WaitGroup
	var processed uint64

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			for r := range jobs {
				r.Abstract = deabstract(r.Abstract)
				r.AuthorsText = compactAuthors(r.AuthorsJSON)
				r.CategoriesText = compactCategories(r.CategoriesJSON)
				out <- r
			}
		}()
	}

	writerErr := make(chan error, 1)
	go func() {
		writerErr <- writeRows(dst, out, batchSize, &processed)
	}()

	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			done := atomic.LoadUint64(&processed)
			pct := float64(done) * 100 / float64(total)
			log.Printf("processed=%d/%d %.2f%% elapsed=%s", done, total, pct, time.Since(start).Round(time.Second))

			if done >= uint64(total) {
				return
			}
		}
	}()

	for rows.Next() {
		var id any
		var title any
		var abstract any
		var authorsJSON any
		var categoriesJSON any
		var primaryCategory any
		var published any
		var updated any

		must(rows.Scan(
			&id,
			&title,
			&abstract,
			&authorsJSON,
			&categoriesJSON,
			&primaryCategory,
			&published,
			&updated,
		))

		jobs <- Record{
			ID:              toString(id),
			Title:           toString(title),
			Abstract:        toString(abstract),
			AuthorsJSON:     toString(authorsJSON),
			CategoriesJSON:  toString(categoriesJSON),
			PrimaryCategory: toString(primaryCategory),
			Published:       toString(published),
			Updated:         toString(updated),
		}
	}
	must(rows.Err())

	close(jobs)
	wg.Wait()
	close(out)

	must(<-writerErr)

	mustExec(dst, `CREATE INDEX idx_records_primary_category ON records(primary_category)`)
	mustExec(dst, `CREATE INDEX idx_records_published ON records(published)`)
	mustExec(dst, `CREATE INDEX idx_records_updated ON records(updated)`)
	mustExec(dst, `ANALYZE`)
	mustExec(dst, `VACUUM`)

	log.Printf("done in %s", time.Since(start).Round(time.Millisecond))
}

func deabstract(s string) string {
	s = squashSpaces(s)
	if s == "" {
		return ""
	}

	dots := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '.' {
			dots++
			if dots == 2 {
				return strings.TrimSpace(s[:i+1])
			}
		}
	}

	return s
}

func compactAuthors(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	var authors []Author
	if err := json.Unmarshal([]byte(raw), &authors); err != nil {
		return squashSpaces(raw)
	}

	names := make([]string, 0, len(authors))

	for _, a := range authors {
		name := squashSpaces(a.Name)
		if name == "" {
			name = squashSpaces(strings.TrimSpace(a.Forenames + " " + a.Keyname))
		}
		if name != "" {
			names = append(names, name)
		}
	}

	return strings.Join(names, " | ")
}

func compactCategories(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	var categories []string
	if err := json.Unmarshal([]byte(raw), &categories); err != nil {
		return squashSpaces(raw)
	}

	out := make([]string, 0, len(categories))
	for _, c := range categories {
		c = squashSpaces(c)
		if c != "" {
			out = append(out, c)
		}
	}

	return strings.Join(out, " | ")
}

func squashSpaces(s string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(s)), " ")
}

func toString(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		return x
	case []byte:
		return string(x)
	default:
		return fmt.Sprint(x)
	}
}

func writeRows(db *sql.DB, in <-chan Record, batchSize int, processed *uint64) error {
	insertSQL := `
		INSERT INTO records (
			id, title, abstract, authors_text, categories_text,
			primary_category, published, updated
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	tx, err := db.Begin()
	if err != nil {
		return err
	}

	stmt, err := tx.Prepare(insertSQL)
	if err != nil {
		_ = tx.Rollback()
		return err
	}

	pending := 0

	flush := func() error {
		if err := stmt.Close(); err != nil {
			_ = tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}

		tx, err = db.Begin()
		if err != nil {
			return err
		}

		stmt, err = tx.Prepare(insertSQL)
		if err != nil {
			_ = tx.Rollback()
			return err
		}

		pending = 0
		return nil
	}

	for r := range in {
		_, err := stmt.Exec(
			r.ID,
			r.Title,
			r.Abstract,
			r.AuthorsText,
			r.CategoriesText,
			r.PrimaryCategory,
			r.Published,
			r.Updated,
		)
		if err != nil {
			_ = stmt.Close()
			_ = tx.Rollback()
			return err
		}

		pending++
		atomic.AddUint64(processed, 1)

		if pending >= batchSize {
			if err := flush(); err != nil {
				return err
			}
		}
	}

	if err := stmt.Close(); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func mustExec(db *sql.DB, sqlText string) {
	_, err := db.Exec(sqlText)
	must(err)
}
