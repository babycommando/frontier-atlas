#!/usr/bin/env python3

import argparse
import glob
import gzip
import hashlib
import json
import math
import os
import shutil
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import deque
from datetime import datetime

BASE_URL = "https://oaipmh.arxiv.org/oai"
DEFAULT_USER_AGENT = "frontier-atlas/0.1 (mailto:replace-me@example.com)"
DEFAULT_TARGET_RECORDS = 3018227

NS = {
    "oai": "http://www.openarchives.org/OAI/2.0/",
}


def utc_now():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def clean_text(value):
    if value is None:
        return None
    text = " ".join(value.split())
    return text or None


def local_name(tag):
    return tag.rsplit("}", 1)[-1]


def split_categories(value):
    if not value:
        return []
    return [part for part in value.split() if part]


def arxiv_id_from_oai_identifier(identifier):
    prefix = "oai:arXiv.org:"
    if identifier.startswith(prefix):
        return identifier[len(prefix):]
    return identifier


def abs_url_for(arxiv_id):
    return "https://arxiv.org/abs/{0}".format(arxiv_id)


def pdf_url_for(arxiv_id):
    return "https://arxiv.org/pdf/{0}.pdf".format(arxiv_id)


def normalize_oai_date(value):
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    if "T" in value:
        value = value.split("T", 1)[0]
    return value


def safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def format_int(value):
    return "{0:,}".format(int(value))


def format_float(value, digits=2):
    return ("{0:.%df}" % digits).format(float(value))


def format_bytes(num):
    if num is None:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    value = float(num)
    idx = 0
    while value >= 1024.0 and idx < len(units) - 1:
        value /= 1024.0
        idx += 1
    if idx == 0:
        return "{0} {1}".format(int(value), units[idx])
    return "{0:.2f} {1}".format(value, units[idx])


def format_duration(seconds):
    if seconds is None or math.isinf(seconds) or seconds < 0:
        return "unknown"
    seconds = int(round(seconds))
    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, secs = divmod(rem, 60)
    if days:
        return "{0}d {1}h {2}m {3}s".format(days, hours, minutes, secs)
    if hours:
        return "{0}h {1}m {2}s".format(hours, minutes, secs)
    if minutes:
        return "{0}m {1}s".format(minutes, secs)
    return "{0}s".format(secs)


def format_percent(value):
    return "{0:.2f}%".format(float(value) * 100.0)


def render_bar(fraction, width=38):
    fraction = max(0.0, min(1.0, fraction))
    filled = int(round(fraction * width))
    if filled > width:
        filled = width
    return "[" + ("#" * filled) + ("." * (width - filled)) + "]"


def terminal_width(default=100):
    try:
        return max(default, os.get_terminal_size().columns)
    except OSError:
        return default


def read_json(path):
    if not path or not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def write_json_atomic(path, payload):
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.replace(tmp, path)


def append_jsonl(path, payload):
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False))
        fh.write("\n")


def checkpoint_backup_path(base_path):
    return base_path + ".bak"


def checkpoint_snapshot_dir(base_path):
    return base_path + ".snapshots"


def sidecar_dir(base_path):
    return base_path + ".sessions"


def sidecar_checkpoint_path(base_path, fingerprint):
    parent = sidecar_dir(base_path)
    os.makedirs(parent, exist_ok=True)
    return os.path.join(parent, "checkpoint-{0}.json".format(fingerprint[:12]))


def sidecar_history_path(base_path, fingerprint):
    root, ext = os.path.splitext(base_path)
    if not ext:
        ext = ".ndjson"
    parent = sidecar_dir(base_path)
    os.makedirs(parent, exist_ok=True)
    return os.path.join(parent, "history-{0}{1}".format(fingerprint[:12], ext))


def checkpoint_job_spec(endpoint, metadata_prefix, set_spec, from_date, until_date, target_records):
    return {
        "endpoint": endpoint,
        "metadata_prefix": metadata_prefix,
        "set_spec": set_spec,
        "from_date": normalize_oai_date(from_date),
        "until_date": normalize_oai_date(until_date),
        "target_records": safe_int(target_records, DEFAULT_TARGET_RECORDS),
    }


def checkpoint_fingerprint(spec):
    blob = json.dumps(spec, sort_keys=True, separators=(",", ":"))
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()


def file_size(path):
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


def sqlite_storage_size(db_path):
    return file_size(db_path) + file_size(db_path + "-wal") + file_size(db_path + "-shm")


def directory_size(path):
    total = 0
    if not path or not os.path.exists(path):
        return 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            fp = os.path.join(root, name)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total


def db_record_counts(conn):
    row = conn.execute(
        """
        SELECT
          COUNT(*) AS total_rows,
          SUM(CASE WHEN deleted = 1 THEN 1 ELSE 0 END) AS deleted_rows
        FROM records
        """
    ).fetchone()
    total_rows = safe_int(row[0], 0)
    deleted_rows = safe_int(row[1], 0)
    return total_rows, deleted_rows


def clear_screen():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()


def parse_oai_error(root):
    err = root.find("oai:error", NS)
    if err is None:
        return None
    code = err.attrib.get("code")
    msg = clean_text(err.text) or "unknown OAI error"
    return "{0}: {1}".format(code or "error", msg)


def parse_record(record_el):
    header = record_el.find("oai:header", NS)
    if header is None:
        raise ValueError("record missing header")

    oai_identifier = clean_text(header.findtext("oai:identifier", default="", namespaces=NS)) or ""
    arxiv_id = arxiv_id_from_oai_identifier(oai_identifier)
    datestamp = clean_text(header.findtext("oai:datestamp", default=None, namespaces=NS))
    deleted = header.attrib.get("status") == "deleted"

    set_specs = []
    for el in header.findall("oai:setSpec", NS):
        value = clean_text(el.text)
        if value:
            set_specs.append(value)

    doc = {
        "id": arxiv_id,
        "oai_identifier": oai_identifier,
        "oai_datestamp": datestamp,
        "deleted": deleted,
        "set_specs": set_specs,
        "title": None,
        "abstract": None,
        "authors": [],
        "categories": [],
        "primary_category": None,
        "published": None,
        "updated": None,
        "comments": None,
        "journal_ref": None,
        "doi": None,
        "license": None,
        "abs_url": abs_url_for(arxiv_id) if arxiv_id else None,
        "pdf_url": pdf_url_for(arxiv_id) if arxiv_id else None,
    }

    if deleted:
        return doc

    metadata = record_el.find("oai:metadata", NS)
    if metadata is None or len(metadata) == 0:
        return doc

    meta_root = next(iter(metadata))

    for child in meta_root:
        name = local_name(child.tag)
        text = clean_text(child.text)

        if name in ("id", "idref") and text and not doc["id"]:
            doc["id"] = text
            doc["abs_url"] = abs_url_for(text)
            doc["pdf_url"] = pdf_url_for(text)

        elif name == "created":
            doc["published"] = text

        elif name == "updated":
            doc["updated"] = text

        elif name in ("title", "abstract", "comments", "journal-ref", "doi", "license"):
            doc[name.replace("-", "_")] = text

        elif name == "categories":
            doc["categories"] = split_categories(text)

        elif name == "primary_category":
            category = child.attrib.get("term") or text
            doc["primary_category"] = clean_text(category)

        elif name == "authors":
            authors = []
            for author_el in child:
                if local_name(author_el.tag) != "author":
                    continue

                author = {}
                for part in author_el:
                    part_name = local_name(part.tag)
                    if part_name == "affiliation":
                        author.setdefault("affiliations", []).append(clean_text(part.text))
                    else:
                        author[part_name] = clean_text(part.text)

                name_parts = []
                if author.get("forenames"):
                    name_parts.append(author.get("forenames"))
                if author.get("keyname"):
                    name_parts.append(author.get("keyname"))
                author["name"] = " ".join(name_parts) or clean_text(author.get("name"))
                author["affiliations"] = [x for x in author.get("affiliations", []) if x]
                authors.append(author)

            doc["authors"] = authors

        elif name == "version":
            version = {
                "version": child.attrib.get("version"),
                "date": clean_text(child.findtext("date")),
                "size": clean_text(child.findtext("size")),
                "source_type": clean_text(child.findtext("source_type")),
            }
            doc.setdefault("versions", []).append(version)

    if doc.get("primary_category") is None and doc["categories"]:
        doc["primary_category"] = doc["categories"][0]

    return doc


def ensure_db(db_path):
    parent = os.path.dirname(db_path)
    if parent:
        os.makedirs(parent, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(
            """
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS records (
              id TEXT PRIMARY KEY,
              oai_identifier TEXT NOT NULL UNIQUE,
              oai_datestamp TEXT,
              deleted INTEGER NOT NULL DEFAULT 0,
              set_specs_json TEXT NOT NULL,
              title TEXT,
              abstract TEXT,
              authors_json TEXT NOT NULL,
              categories_json TEXT NOT NULL,
              primary_category TEXT,
              published TEXT,
              updated TEXT,
              comments TEXT,
              journal_ref TEXT,
              doi TEXT,
              license TEXT,
              abs_url TEXT,
              pdf_url TEXT,
              raw_json TEXT NOT NULL,
              first_seen_at TEXT NOT NULL,
              last_seen_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS harvest_runs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              started_at TEXT NOT NULL,
              finished_at TEXT,
              endpoint TEXT NOT NULL,
              metadata_prefix TEXT NOT NULL,
              set_spec TEXT,
              from_date TEXT,
              until_date TEXT,
              pages_fetched INTEGER NOT NULL DEFAULT 0,
              records_seen INTEGER NOT NULL DEFAULT 0,
              records_upserted INTEGER NOT NULL DEFAULT 0,
              records_deleted INTEGER NOT NULL DEFAULT 0,
              notes TEXT
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def upsert_record(conn, doc, now):
    payload = {
        "id": doc["id"],
        "oai_identifier": doc["oai_identifier"],
        "oai_datestamp": doc["oai_datestamp"],
        "deleted": 1 if doc["deleted"] else 0,
        "set_specs_json": json.dumps(doc.get("set_specs", []), ensure_ascii=False),
        "title": doc.get("title"),
        "abstract": doc.get("abstract"),
        "authors_json": json.dumps(doc.get("authors", []), ensure_ascii=False),
        "categories_json": json.dumps(doc.get("categories", []), ensure_ascii=False),
        "primary_category": doc.get("primary_category"),
        "published": doc.get("published"),
        "updated": doc.get("updated"),
        "comments": doc.get("comments"),
        "journal_ref": doc.get("journal_ref"),
        "doi": doc.get("doi"),
        "license": doc.get("license"),
        "abs_url": doc.get("abs_url"),
        "pdf_url": doc.get("pdf_url"),
        "raw_json": json.dumps(doc, ensure_ascii=False),
        "now": now,
    }

    conn.execute(
        """
        INSERT INTO records (
          id, oai_identifier, oai_datestamp, deleted, set_specs_json, title, abstract,
          authors_json, categories_json, primary_category, published, updated,
          comments, journal_ref, doi, license, abs_url, pdf_url, raw_json,
          first_seen_at, last_seen_at
        ) VALUES (
          :id, :oai_identifier, :oai_datestamp, :deleted, :set_specs_json, :title, :abstract,
          :authors_json, :categories_json, :primary_category, :published, :updated,
          :comments, :journal_ref, :doi, :license, :abs_url, :pdf_url, :raw_json,
          :now, :now
        )
        ON CONFLICT(id) DO UPDATE SET
          oai_identifier = excluded.oai_identifier,
          oai_datestamp = excluded.oai_datestamp,
          deleted = excluded.deleted,
          set_specs_json = excluded.set_specs_json,
          title = excluded.title,
          abstract = excluded.abstract,
          authors_json = excluded.authors_json,
          categories_json = excluded.categories_json,
          primary_category = excluded.primary_category,
          published = excluded.published,
          updated = excluded.updated,
          comments = excluded.comments,
          journal_ref = excluded.journal_ref,
          doi = excluded.doi,
          license = excluded.license,
          abs_url = excluded.abs_url,
          pdf_url = excluded.pdf_url,
          raw_json = excluded.raw_json,
          last_seen_at = excluded.last_seen_at
        """,
        payload,
    )


def build_list_records_url(endpoint, metadata_prefix, set_spec, from_date, until_date, resumption_token):
    if resumption_token:
        query = {
            "verb": "ListRecords",
            "resumptionToken": resumption_token,
        }
    else:
        query = {
            "verb": "ListRecords",
            "metadataPrefix": metadata_prefix,
        }
        if set_spec:
            query["set"] = set_spec
        if from_date:
            query["from"] = from_date
        if until_date:
            query["until"] = until_date

    return endpoint + "?" + urllib.parse.urlencode(query)


def save_raw_xml(raw_session_dir, page_index, xml_bytes):
    if not raw_session_dir:
        return
    os.makedirs(raw_session_dir, exist_ok=True)
    out_path = os.path.join(raw_session_dir, "page-{0:06d}.xml.gz".format(page_index))
    with gzip.open(out_path, "wb") as fh:
        fh.write(xml_bytes)


class RateLimitedHttpClient(object):
    def __init__(self, min_interval_seconds, user_agent, timeout, max_retries=8):
        self.min_interval_seconds = float(min_interval_seconds)
        self.user_agent = user_agent
        self.timeout = int(timeout)
        self.max_retries = int(max_retries)
        self._last_request_at = 0.0

    def get(self, url):
        attempt = 0

        while True:
            attempt += 1

            delta = time.time() - self._last_request_at
            if delta < self.min_interval_seconds:
                time.sleep(self.min_interval_seconds - delta)

            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": self.user_agent,
                    "Accept": "application/xml,text/xml;q=0.9,*/*;q=0.1",
                },
            )

            started_at = time.time()

            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    body = resp.read()

                ended_at = time.time()
                self._last_request_at = ended_at

                return {
                    "url": url,
                    "xml_bytes": body,
                    "started_at": started_at,
                    "ended_at": ended_at,
                    "elapsed_seconds": ended_at - started_at,
                    "attempt": attempt,
                }

            except Exception as exc:
                ended_at = time.time()
                self._last_request_at = ended_at

                if attempt >= self.max_retries:
                    raise RuntimeError(
                        "request failed after {0} attempts: {1}".format(attempt, exc)
                    )

                backoff = min(180, 5 * attempt)

                print(
                    "WARN: request attempt {0} failed: {1}. retrying in {2}s".format(
                        attempt, exc, backoff
                    ),
                    file=sys.stderr,
                    flush=True,
                )

                time.sleep(backoff)


class ThroughputWindow(object):
    def __init__(self, max_points=240):
        self.points = deque(maxlen=max_points)

    def add(self, ts, value):
        self.points.append((float(ts), int(value)))

    def rate(self):
        if len(self.points) < 2:
            return None
        first_ts, first_value = self.points[0]
        last_ts, last_value = self.points[-1]
        delta_t = last_ts - first_ts
        delta_v = last_value - first_value
        if delta_t <= 0:
            return None
        return float(delta_v) / float(delta_t)


class ProgressView(object):
    def __init__(self, target_records, started_at, initial_unique_records=0):
        self.target_records = int(target_records)
        self.started_at = float(started_at)
        self.initial_unique_records = int(initial_unique_records)
        self.window = ThroughputWindow(max_points=240)

    def snapshot(
        self,
        unique_records,
        processed_this_session,
        db_bytes,
        raw_bytes,
        page_index,
        page_records,
        request_seconds,
        deleted_count,
        mode,
    ):
        now = time.time()
        elapsed = max(0.001, now - self.started_at)

        self.window.add(now, unique_records)

        overall_delta = max(0, int(unique_records) - int(self.initial_unique_records))
        overall_rps = float(overall_delta) / elapsed if elapsed > 0 else None
        window_rps = self.window.rate()
        active_rps = window_rps if window_rps and window_rps > 0 else overall_rps

        remaining = max(0, self.target_records - int(unique_records))
        eta_seconds = (remaining / active_rps) if active_rps and active_rps > 0 else None

        bytes_per_record = (float(db_bytes) / float(unique_records)) if unique_records > 0 else None
        predicted_db_bytes = (bytes_per_record * self.target_records) if bytes_per_record else None
        remaining_db_bytes = (predicted_db_bytes - db_bytes) if predicted_db_bytes else None

        raw_per_page = (float(raw_bytes) / float(page_index)) if page_index > 0 else None
        predicted_raw_bytes = None
        if raw_per_page and page_records > 0:
            estimated_pages = float(self.target_records) / float(page_records)
            predicted_raw_bytes = raw_per_page * estimated_pages

        percent = float(unique_records) / float(self.target_records) if self.target_records else 0.0

        return {
            "now": utc_now(),
            "mode": mode,
            "records_seen": int(unique_records),
            "processed_this_session": int(processed_this_session),
            "deleted_count": int(deleted_count),
            "remaining_records": int(remaining),
            "target_records": int(self.target_records),
            "percent": percent,
            "elapsed_seconds": elapsed,
            "eta_seconds": eta_seconds,
            "overall_rps": overall_rps,
            "window_rps": window_rps,
            "records_per_minute": (active_rps * 60.0) if active_rps else None,
            "records_per_hour": (active_rps * 3600.0) if active_rps else None,
            "db_bytes": int(db_bytes),
            "raw_bytes": int(raw_bytes),
            "bytes_per_record": bytes_per_record,
            "predicted_db_bytes": predicted_db_bytes,
            "remaining_db_bytes": remaining_db_bytes,
            "predicted_raw_bytes": predicted_raw_bytes,
            "page_index": int(page_index),
            "page_records": int(page_records),
            "request_seconds": float(request_seconds),
        }

    def render(self, metrics):
        width = terminal_width(100)
        title = " arXiv OAI Harvester Dashboard "
        side = max(0, (width - len(title)) // 2)

        lines = []
        lines.append("=" * side + title + "=" * side)
        lines.append("time: {0}".format(metrics["now"]))
        lines.append("mode: {0}".format(metrics["mode"]))
        lines.append(
            "progress: {0} {1} / {2}  ({3})".format(
                render_bar(metrics["percent"]),
                format_int(metrics["records_seen"]),
                format_int(metrics["target_records"]),
                format_percent(metrics["percent"]),
            )
        )
        lines.append(
            "remaining: {0} records | pages: {1} | deleted: {2}".format(
                format_int(metrics["remaining_records"]),
                format_int(metrics["page_index"]),
                format_int(metrics["deleted_count"]),
            )
        )
        lines.append(
            "processed this session: {0} records".format(
                format_int(metrics["processed_this_session"])
            )
        )
        lines.append(
            "speed: {0} rec/s window | {1} rec/min | {2} rec/h | request {3}".format(
                format_float(metrics["window_rps"] or 0.0),
                format_float(metrics["records_per_minute"] or 0.0),
                format_float(metrics["records_per_hour"] or 0.0),
                format_duration(metrics["request_seconds"]),
            )
        )
        lines.append(
            "elapsed: {0} | eta: {1}".format(
                format_duration(metrics["elapsed_seconds"]),
                format_duration(metrics["eta_seconds"]),
            )
        )
        lines.append(
            "sqlite: {0} | raw pages: {1} | bytes/record: {2}".format(
                format_bytes(metrics["db_bytes"]),
                format_bytes(metrics["raw_bytes"]),
                format_float(metrics["bytes_per_record"] or 0.0),
            )
        )
        lines.append(
            "projected sqlite final: {0} | remaining sqlite growth: {1}".format(
                format_bytes(metrics["predicted_db_bytes"] or 0),
                format_bytes(metrics["remaining_db_bytes"] or 0),
            )
        )
        if metrics.get("predicted_raw_bytes"):
            lines.append(
                "projected raw xml final: {0}".format(
                    format_bytes(metrics["predicted_raw_bytes"])
                )
            )
        lines.append("last page: {0} records".format(format_int(metrics["page_records"])))
        return "\n".join(lines)


class HistoryWriter(object):
    def __init__(self, path, every_seconds=10.0):
        self.path = path
        self.every_seconds = float(every_seconds)
        self.last_flush = 0.0

    def maybe_write(self, metrics):
        now = time.time()
        if now - self.last_flush < self.every_seconds:
            return
        self.last_flush = now
        append_jsonl(self.path, metrics)


def checkpoint_candidates(base_path):
    candidates = []

    primary = read_json(base_path)
    if primary:
        primary["_source_path"] = base_path
        primary["_source_kind"] = "primary"
        candidates.append(primary)

    backup_path = checkpoint_backup_path(base_path)
    backup = read_json(backup_path)
    if backup:
        backup["_source_path"] = backup_path
        backup["_source_kind"] = "backup"
        candidates.append(backup)

    snapshot_dir = checkpoint_snapshot_dir(base_path)
    if os.path.isdir(snapshot_dir):
        for path in sorted(glob.glob(os.path.join(snapshot_dir, "*.json"))):
            snap = read_json(path)
            if snap:
                snap["_source_path"] = path
                snap["_source_kind"] = "snapshot"
                candidates.append(snap)

    return candidates


def checkpoint_score(cp):
    return (
        safe_int(cp.get("records_seen"), 0),
        safe_int(cp.get("pages_fetched"), 0),
        1 if cp.get("resumption_token") else 0,
        safe_int(cp.get("records_upserted"), 0),
        cp.get("last_saved_at") or "",
    )


def best_checkpoint_for_job(base_path, job_fp):
    matches = []
    for cp in checkpoint_candidates(base_path):
        if cp.get("job_fingerprint") == job_fp:
            matches.append(cp)
    if not matches:
        return None
    matches.sort(key=checkpoint_score, reverse=True)
    return matches[0]


def best_checkpoint_any(base_path):
    all_cps = checkpoint_candidates(base_path)
    if not all_cps:
        return None
    all_cps.sort(key=checkpoint_score, reverse=True)
    return all_cps[0]


def choose_checkpoint_path(base_path, job_fp):
    primary = read_json(base_path)
    if not primary:
        return base_path

    primary_fp = primary.get("job_fingerprint")
    if not primary_fp or primary_fp == job_fp:
        return base_path

    return sidecar_checkpoint_path(base_path, job_fp)


def choose_history_path(base_history_path, using_sidecar, job_fp):
    if not using_sidecar:
        return base_history_path
    return sidecar_history_path(base_history_path, job_fp)


def merge_checkpoint_monotonic(existing, new_cp):
    if not existing:
        return new_cp

    if existing.get("job_fingerprint") != new_cp.get("job_fingerprint"):
        return new_cp

    merged = dict(new_cp)

    existing_records = safe_int(existing.get("records_seen"), 0)
    new_records = safe_int(new_cp.get("records_seen"), 0)

    existing_pages = safe_int(existing.get("pages_fetched"), 0)
    new_pages = safe_int(new_cp.get("pages_fetched"), 0)

    existing_deleted = safe_int(existing.get("records_deleted"), 0)
    new_deleted = safe_int(new_cp.get("records_deleted"), 0)

    progressed = (new_records > existing_records) or (new_pages > existing_pages)

    merged["records_seen"] = max(existing_records, new_records)
    merged["pages_fetched"] = max(existing_pages, new_pages)
    merged["records_deleted"] = max(existing_deleted, new_deleted)
    merged["records_upserted"] = max(
        safe_int(existing.get("records_upserted"), 0),
        safe_int(new_cp.get("records_upserted"), 0),
    )

    existing_started = existing.get("started_at_unix")
    new_started = new_cp.get("started_at_unix")
    if existing_started is not None and new_started is not None:
        merged["started_at_unix"] = min(float(existing_started), float(new_started))
    elif existing_started is not None:
        merged["started_at_unix"] = existing_started

    if not progressed and existing.get("resumption_token") and not new_cp.get("completed"):
        merged["resumption_token"] = existing.get("resumption_token")
        if not merged.get("last_response_date"):
            merged["last_response_date"] = existing.get("last_response_date")
        if not merged.get("last_request_url"):
            merged["last_request_url"] = existing.get("last_request_url")
        if not merged.get("last_request_seconds"):
            merged["last_request_seconds"] = existing.get("last_request_seconds")

    metrics = dict(merged.get("metrics") or {})
    metrics["records_seen"] = merged["records_seen"]
    metrics["deleted_count"] = merged["records_deleted"]
    metrics["page_index"] = merged["pages_fetched"]
    merged["metrics"] = metrics

    return merged


def save_checkpoint_safely(path, checkpoint_out, snapshot_every_pages=25):
    existing = read_json(path)
    merged = merge_checkpoint_monotonic(existing, checkpoint_out)

    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)

    if os.path.exists(path):
        shutil.copy2(path, checkpoint_backup_path(path))

    write_json_atomic(path, merged)

    pages = safe_int(merged.get("pages_fetched"), 0)
    should_snapshot = False
    if pages > 0 and (pages % int(snapshot_every_pages) == 0):
        should_snapshot = True
    if not merged.get("resumption_token"):
        should_snapshot = True
    if merged.get("completed"):
        should_snapshot = True

    if should_snapshot:
        snap_dir = checkpoint_snapshot_dir(path)
        os.makedirs(snap_dir, exist_ok=True)
        snap_name = "{0}-p{1:06d}-r{2:09d}.json".format(
            merged.get("job_fingerprint", "unknown")[:12],
            pages,
            safe_int(merged.get("records_seen"), 0),
        )
        snap_path = os.path.join(snap_dir, snap_name)
        write_json_atomic(snap_path, merged)

    return merged


def update_run_row(conn, run_id, pages_fetched, records_seen, records_upserted, records_deleted, note):
    conn.execute(
        """
        UPDATE harvest_runs
        SET finished_at = ?, pages_fetched = ?, records_seen = ?, records_upserted = ?, records_deleted = ?, notes = ?
        WHERE id = ?
        """,
        (
            utc_now(),
            safe_int(pages_fetched),
            safe_int(records_seen),
            safe_int(records_upserted),
            safe_int(records_deleted),
            note,
            run_id,
        ),
    )
    conn.commit()


def derive_mode(can_resume, db_total_rows, explicit_recovery):
    if can_resume:
        return "resume"
    if explicit_recovery:
        return "recovery"
    if db_total_rows > 0:
        return "recovery"
    return "fresh"


def run_sync(args):
    ensure_db(args.db)

    seed_checkpoint = best_checkpoint_any(args.checkpoint)

    if args.from_checkpoint_response_date and not args.from_date and seed_checkpoint and seed_checkpoint.get("last_response_date"):
        args.from_date = normalize_oai_date(seed_checkpoint.get("last_response_date"))

    args.from_date = normalize_oai_date(args.from_date)
    args.until_date = normalize_oai_date(args.until_date)

    job_spec = checkpoint_job_spec(
        endpoint=args.endpoint,
        metadata_prefix=args.metadata_prefix,
        set_spec=args.set_spec,
        from_date=args.from_date,
        until_date=args.until_date,
        target_records=args.target_records,
    )
    job_fp = checkpoint_fingerprint(job_spec)

    active_checkpoint_path = choose_checkpoint_path(args.checkpoint, job_fp)
    using_sidecar = os.path.abspath(active_checkpoint_path) != os.path.abspath(args.checkpoint)
    active_history_path = choose_history_path(args.history, using_sidecar, job_fp)

    best_cp = best_checkpoint_for_job(args.checkpoint, job_fp)

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA foreign_keys = ON")

    db_total_rows, db_deleted_rows = db_record_counts(conn)

    can_resume = bool(best_cp and best_cp.get("resumption_token") and not args.no_resume)

    mode = derive_mode(
        can_resume=can_resume,
        db_total_rows=db_total_rows,
        explicit_recovery=bool(args.from_date or args.until_date or args.from_checkpoint_response_date or args.no_resume),
    )

    if can_resume:
        page_index = max(safe_int(best_cp.get("pages_fetched"), 0), 0)
        records_seen = max(safe_int(best_cp.get("records_seen"), 0), db_total_rows)
        records_deleted = max(safe_int(best_cp.get("records_deleted"), 0), db_deleted_rows)
        resumption_token = best_cp.get("resumption_token")
        started_at = float(best_cp.get("started_at_unix") or time.time())
        session_id = best_cp.get("session_id") or "{0}-{1}".format(
            datetime.utcnow().strftime("%Y%m%dT%H%M%SZ"),
            job_fp[:8],
        )
    else:
        page_index = 0
        records_seen = db_total_rows
        records_deleted = db_deleted_rows
        resumption_token = None
        started_at = time.time()
        session_id = "{0}-{1}".format(
            datetime.utcnow().strftime("%Y%m%dT%H%M%SZ"),
            job_fp[:8],
        )

    raw_session_dir = os.path.join(args.raw_dir, session_id)
    history = HistoryWriter(active_history_path, every_seconds=args.history_every_seconds)
    client = RateLimitedHttpClient(
        args.min_interval_seconds,
        args.user_agent,
        args.timeout,
        args.max_retries,
    )
    view = ProgressView(
        target_records=args.target_records,
        started_at=started_at,
        initial_unique_records=records_seen,
    )

    if using_sidecar:
        print(
            "INFO: main checkpoint preserved. this run writes sidecar checkpoint: {0}".format(
                active_checkpoint_path
            ),
            file=sys.stderr,
            flush=True,
        )

    if best_cp and best_cp.get("_source_path") and best_cp.get("_source_path") != active_checkpoint_path and not args.no_resume:
        print(
            "INFO: recovered best checkpoint from {0}".format(best_cp.get("_source_path")),
            file=sys.stderr,
            flush=True,
        )

    cur = conn.execute(
        """
        INSERT INTO harvest_runs(started_at, endpoint, metadata_prefix, set_spec, from_date, until_date, notes)
        VALUES(?, ?, ?, ?, ?, ?, ?)
        """,
        (
            utc_now(),
            args.endpoint,
            args.metadata_prefix,
            args.set_spec,
            args.from_date,
            args.until_date,
            mode,
        ),
    )
    run_id = cur.lastrowid
    conn.commit()

    processed_this_session = 0
    last_page_records = 0
    last_request_seconds = 0.0

    try:
        while True:
            url = build_list_records_url(
                endpoint=args.endpoint,
                metadata_prefix=args.metadata_prefix,
                set_spec=args.set_spec,
                from_date=args.from_date,
                until_date=args.until_date,
                resumption_token=resumption_token,
            )

            fetched = client.get(url)
            page_index += 1
            save_raw_xml(raw_session_dir, page_index, fetched["xml_bytes"])
            last_request_seconds = fetched["elapsed_seconds"]

            root = ET.fromstring(fetched["xml_bytes"])
            err = parse_oai_error(root)
            if err:
                raise RuntimeError(err)

            now = utc_now()
            response_date = clean_text(root.findtext("oai:responseDate", default=None, namespaces=NS))
            page_seen = 0
            page_deleted = 0

            for record_el in root.findall(".//oai:record", NS):
                doc = parse_record(record_el)
                upsert_record(conn, doc, now)
                page_seen += 1
                if doc.get("deleted"):
                    page_deleted += 1

            conn.commit()

            processed_this_session += page_seen
            last_page_records = page_seen

            refresh_counts = False
            if mode == "recovery":
                refresh_counts = True
            elif args.refresh_db_count_every_pages > 0 and (page_index % args.refresh_db_count_every_pages == 0):
                refresh_counts = True

            if refresh_counts:
                records_seen, records_deleted = db_record_counts(conn)
            else:
                records_seen += page_seen
                records_deleted += page_deleted

            token_el = root.find(".//oai:resumptionToken", NS)
            resumption_token = clean_text(token_el.text if token_el is not None else None)

            db_bytes = sqlite_storage_size(args.db)
            raw_bytes = directory_size(args.raw_dir)

            metrics = view.snapshot(
                unique_records=records_seen,
                processed_this_session=processed_this_session,
                db_bytes=db_bytes,
                raw_bytes=raw_bytes,
                page_index=page_index,
                page_records=last_page_records,
                request_seconds=last_request_seconds,
                deleted_count=records_deleted,
                mode=mode,
            )
            metrics["last_request_url"] = fetched["url"]
            metrics["last_response_date"] = response_date
            metrics["resumption_token_present"] = bool(resumption_token)
            metrics["checkpoint_path"] = active_checkpoint_path
            metrics["history_path"] = active_history_path
            metrics["raw_session_dir"] = raw_session_dir

            checkpoint_out = {
                "job_spec": job_spec,
                "job_fingerprint": job_fp,
                "endpoint": args.endpoint,
                "metadata_prefix": args.metadata_prefix,
                "set_spec": args.set_spec,
                "from_date": args.from_date,
                "until_date": args.until_date,
                "resumption_token": resumption_token,
                "pages_fetched": page_index,
                "records_seen": records_seen,
                "records_upserted": processed_this_session,
                "records_deleted": records_deleted,
                "last_page_record_count": last_page_records,
                "last_request_seconds": last_request_seconds,
                "last_request_url": fetched["url"],
                "last_response_date": response_date,
                "last_saved_at": utc_now(),
                "started_at_unix": started_at,
                "target_records": args.target_records,
                "mode": mode,
                "session_id": session_id,
                "raw_session_dir": raw_session_dir,
                "history_path": active_history_path,
                "checkpoint_path": active_checkpoint_path,
                "completed": not bool(resumption_token),
                "metrics": metrics,
            }

            saved_cp = save_checkpoint_safely(
                active_checkpoint_path,
                checkpoint_out,
                snapshot_every_pages=args.snapshot_every_pages,
            )

            page_index = max(page_index, safe_int(saved_cp.get("pages_fetched"), page_index))
            records_seen = max(records_seen, safe_int(saved_cp.get("records_seen"), records_seen))
            records_deleted = max(records_deleted, safe_int(saved_cp.get("records_deleted"), records_deleted))
            if saved_cp.get("resumption_token") or saved_cp.get("completed"):
                resumption_token = saved_cp.get("resumption_token")

            history.maybe_write(saved_cp.get("metrics") or metrics)

            clear_screen()
            print(view.render(saved_cp.get("metrics") or metrics))
            print("")
            print("checkpoint: {0}".format(active_checkpoint_path))
            print("history:    {0}".format(active_history_path))
            print("db:         {0}".format(args.db))
            print("raw-dir:    {0}".format(args.raw_dir))
            print("raw-session:{0}".format(raw_session_dir))
            sys.stdout.flush()

            if not resumption_token:
                break

        update_run_row(
            conn,
            run_id,
            pages_fetched=page_index,
            records_seen=records_seen,
            records_upserted=processed_this_session,
            records_deleted=records_deleted,
            note="completed",
        )
        return 0

    except KeyboardInterrupt:
        final_counts, final_deleted = db_record_counts(conn)
        update_run_row(
            conn,
            run_id,
            pages_fetched=page_index,
            records_seen=final_counts,
            records_upserted=processed_this_session,
            records_deleted=final_deleted,
            note="interrupted by user",
        )
        print("STOPPED: interrupted by user", file=sys.stderr)
        return 130

    except Exception as exc:
        final_counts, final_deleted = db_record_counts(conn)
        update_run_row(
            conn,
            run_id,
            pages_fetched=page_index,
            records_seen=final_counts,
            records_upserted=processed_this_session,
            records_deleted=final_deleted,
            note=str(exc),
        )
        print("ERROR: {0}".format(exc), file=sys.stderr)
        return 1

    finally:
        conn.close()


def run_watch(args):
    primary = read_json(args.checkpoint) or {}
    active_checkpoint = primary

    while True:
        active_checkpoint = read_json(args.checkpoint) or active_checkpoint or {}
        metrics = active_checkpoint.get("metrics") or {}

        db_bytes = sqlite_storage_size(args.db)
        raw_bytes = directory_size(args.raw_dir)

        if metrics:
            metrics["db_bytes"] = db_bytes
            metrics["raw_bytes"] = raw_bytes

            clear_screen()
            print("=" * 28 + " arXiv Harvester Watch " + "=" * 28)
            print("time: {0}".format(utc_now()))
            print("mode: {0}".format(metrics.get("mode") or "unknown"))
            print(
                "progress: {0} {1} / {2} ({3})".format(
                    render_bar(metrics.get("percent") or 0.0),
                    format_int(metrics.get("records_seen") or 0),
                    format_int(metrics.get("target_records") or args.target_records),
                    format_percent(metrics.get("percent") or 0.0),
                )
            )
            print(
                "speed: {0} rec/s | {1} rec/min | {2} rec/h".format(
                    format_float(metrics.get("window_rps") or 0.0),
                    format_float(metrics.get("records_per_minute") or 0.0),
                    format_float(metrics.get("records_per_hour") or 0.0),
                )
            )
            print(
                "elapsed: {0} | eta: {1}".format(
                    format_duration(metrics.get("elapsed_seconds")),
                    format_duration(metrics.get("eta_seconds")),
                )
            )
            print(
                "processed this session: {0}".format(
                    format_int(metrics.get("processed_this_session") or 0)
                )
            )
            print(
                "sqlite: {0} | raw: {1}".format(
                    format_bytes(db_bytes),
                    format_bytes(raw_bytes),
                )
            )
            print(
                "projected sqlite final: {0}".format(
                    format_bytes(metrics.get("predicted_db_bytes") or 0)
                )
            )
            print(
                "pages: {0} | deleted: {1}".format(
                    format_int(metrics.get("page_index") or 0),
                    format_int(metrics.get("deleted_count") or 0),
                )
            )
            print("")
            print("checkpoint: {0}".format(active_checkpoint.get("checkpoint_path") or args.checkpoint))
            print("db:         {0}".format(args.db))
            print("raw-dir:    {0}".format(args.raw_dir))
        else:
            clear_screen()
            print("waiting for checkpoint metrics...")
            print("checkpoint: {0}".format(args.checkpoint))

        sys.stdout.flush()
        time.sleep(args.interval)


def run_export(args):
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    parent = os.path.dirname(args.out)
    if parent:
        os.makedirs(parent, exist_ok=True)

    try:
        where = "" if args.include_deleted else "WHERE deleted = 0"
        cursor = conn.execute("SELECT raw_json FROM records {0} ORDER BY id".format(where))
        count = 0

        if args.out.endswith(".gz"):
            with gzip.open(args.out, "wt", encoding="utf-8") as fh:
                for row in cursor:
                    fh.write(row["raw_json"])
                    fh.write("\n")
                    count += 1
        else:
            with open(args.out, "w", encoding="utf-8") as fh:
                for row in cursor:
                    fh.write(row["raw_json"])
                    fh.write("\n")
                    count += 1

        print(json.dumps({"exported": count, "out": args.out}, ensure_ascii=False))
        return 0

    finally:
        conn.close()


def run_stats(args):
    conn = sqlite3.connect(args.db)
    try:
        total = conn.execute("SELECT COUNT(*) FROM records").fetchone()[0]
        live = conn.execute("SELECT COUNT(*) FROM records WHERE deleted = 0").fetchone()[0]
        deleted = conn.execute("SELECT COUNT(*) FROM records WHERE deleted = 1").fetchone()[0]
        latest = conn.execute("SELECT MAX(last_seen_at) FROM records").fetchone()[0]

        print(
            json.dumps(
                {
                    "total_rows": total,
                    "live_rows": live,
                    "deleted_rows": deleted,
                    "latest_seen_at": latest,
                    "db_bytes": sqlite_storage_size(args.db),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    finally:
        conn.close()


def build_parser():
    parser = argparse.ArgumentParser(description="arXiv OAI-PMH dashboard harvester")
    sub = parser.add_subparsers(dest="command")

    sync = sub.add_parser("sync", help="Harvest OAI-PMH records into SQLite with live dashboard")
    sync.add_argument("--db", default="data/arxiv.db")
    sync.add_argument("--checkpoint", default="data/checkpoint.json")
    sync.add_argument("--history", default="data/history.ndjson")
    sync.add_argument("--history-every-seconds", type=float, default=10.0)
    sync.add_argument("--snapshot-every-pages", type=int, default=25)
    sync.add_argument("--raw-dir", default="data/raw")
    sync.add_argument("--endpoint", default=BASE_URL)
    sync.add_argument("--metadata-prefix", default="arXiv", choices=["arXiv", "arXivRaw", "oai_dc"])
    sync.add_argument("--set-spec", default=None)
    sync.add_argument("--from-date", default=None)
    sync.add_argument("--until-date", default=None)
    sync.add_argument("--from-checkpoint-response-date", action="store_true")
    sync.add_argument("--target-records", type=int, default=DEFAULT_TARGET_RECORDS)
    sync.add_argument("--min-interval-seconds", type=float, default=3.1)
    sync.add_argument("--timeout", type=int, default=120)
    sync.add_argument("--max-retries", type=int, default=8)
    sync.add_argument("--refresh-db-count-every-pages", type=int, default=25)
    sync.add_argument("--user-agent", default=DEFAULT_USER_AGENT)
    sync.add_argument("--no-resume", action="store_true")
    sync.set_defaults(func=run_sync)

    watch = sub.add_parser("watch", help="Watch a running harvest from checkpoint metrics")
    watch.add_argument("--checkpoint", default="data/checkpoint.json")
    watch.add_argument("--db", default="data/arxiv.db")
    watch.add_argument("--raw-dir", default="data/raw")
    watch.add_argument("--target-records", type=int, default=DEFAULT_TARGET_RECORDS)
    watch.add_argument("--interval", type=float, default=1.0)
    watch.set_defaults(func=run_watch)

    export = sub.add_parser("export", help="Export SQLite records to NDJSON")
    export.add_argument("--db", default="data/arxiv.db")
    export.add_argument("--out", default="data/arxiv.ndjson.gz")
    export.add_argument("--include-deleted", action="store_true")
    export.set_defaults(func=run_export)

    stats = sub.add_parser("stats", help="Show current database stats")
    stats.add_argument("--db", default="data/arxiv.db")
    stats.set_defaults(func=run_stats)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if not getattr(args, "command", None):
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
