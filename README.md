![Alt Text](public/frontier.png) 

# Frontier Atlas
Human knowledge in your fingertips

Dear scientists, the world needs you badly.

### How to run

1. get the data with 
   python3 arxiv_oai_dashboard.py sync --db data/arxiv.db --checkpoint data/checkpoint.json --history data/history.ndjson --raw-dir data/raw --metadata-prefix arXiv --target-records 3018227 --timeout 300 --max-retries 8 --user-agent "frontier-atlas/0.1 (mailto:you@example.com)"

2. clean the data abstracts and more with the go multithread (build and run if necessary)
   go mod tidy
   go build -o deabstractor.exe .
   run the binary over the arxiv.db file from the original
   .\deabstractor.exe -src arxiv.db -dst arxiv-search.db -workers 32 -batch 250000
   
3. then compress it into duckdb zstd parquet files, either with multiple shards as
	 python .\make_eight_shards.py (outputs a folder)
	or a single shard as:
	python .\make_single_shard.py (outputs a parquet file)

4. then put the dataset on /public/datasets of the nextjs app.
   
5. on the nextjs app, run `yarn install` to install the app
6. then put the duckdb wasm files at the public if not already there 
   node .\scripts\copy-duckdb-assets.mjs

7. finally build the dataset manifest using `node scripts/build-dataset-manifest.mjs arxiv_shards_8_search` - replace the last part with the real name of your dataset
8. in duckdb-test-client.tsx, make sure to also change the variable of the dataset name to the dataset in use with `const DATASET_ID = "arxiv_shards_8_search";`

9. Clone, install `yarn install` and run the nextjs app `yarn dev` and go to http://localhost:4040/duckdb-test

---

Go further than ever before.