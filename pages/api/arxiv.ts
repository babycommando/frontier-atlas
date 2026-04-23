import type { NextApiRequest, NextApiResponse } from "next";
import { XMLParser } from "fast-xml-parser";

type Paper = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  tags: string[];
  primaryField: string | null;
  published: string | null;
  updated: string | null;
  absUrl: string | null;
  pdfUrl: string | null;
  affiliations: string[];
  journalRef: string | null;
  doi: string | null;
};

type SortBy = "relevance" | "submittedDate" | "lastUpdatedDate";
type Mode = "latest" | "live" | "search";
type CacheStatus = "fresh" | "miss" | "refreshed" | "stale";

type FeedResult = {
  feedUpdated: string | null;
  totalResults: number;
  papers: Paper[];
};

type CacheValue = {
  key: string;
  fetchedAt: number;
  feedUpdated: string | null;
  totalResults: number;
  papers: Paper[];
};

type CacheEntry = {
  expiresAt: number;
  staleUntil: number;
  value: CacheValue;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

const DEFAULT_QUERY =
  "cat:cs.AI OR cat:cs.LG OR cat:stat.ML OR cat:astro-ph.CO OR cat:astro-ph.GA OR cat:quant-ph OR cat:hep-th OR cat:math.OC OR cat:math.PR OR cat:q-bio.QM OR cat:eess.SP OR cat:econ.EM";

const FRONTIER_MIX_SHARDS = [
  "cat:cs.AI OR cat:cs.LG OR cat:stat.ML OR cat:eess.SP OR cat:econ.EM",
  "cat:astro-ph.CO OR cat:astro-ph.GA OR cat:quant-ph OR cat:hep-th OR cat:math.OC OR cat:math.PR OR cat:q-bio.QM",
];

const LIVE_TTL_MS = 90 * 1000;
const LIVE_STALE_MS = 90 * 1000;

const SEARCH_TTL_MS = 5 * 60 * 1000;
const SEARCH_STALE_MS = 10 * 60 * 1000;

const ARXIV_MIN_INTERVAL_MS = 3200;
const FETCH_TIMEOUT_MS = 15000;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheValue>>();

let arxivQueue: Promise<void> = Promise.resolve();
let nextAllowedAt = 0;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clean(value?: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean).join(" ").trim();
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return clean(
      record["#text"] ??
        record["text"] ??
        record["$text"] ??
        record["__text"] ??
        Object.values(record).find(
          (item) =>
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean",
        ),
    );
  }

  return "";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseQuery(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isDefaultMixQuery(value: string) {
  return normaliseQuery(value) === normaliseQuery(DEFAULT_QUERY);
}

function buildScopedQuery(baseQuery: string, term: string) {
  const cleanTerm = term.trim().replace(/"/g, "");
  if (!cleanTerm) return baseQuery;
  return `(${baseQuery}) AND all:"${cleanTerm}"`;
}

function normalisePaperId(id: string) {
  return clean(id).replace(/v\d+$/, "");
}

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seed: string) {
  let state = hashString(seed) || 1;

  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(values: T[], seed: string) {
  const next = [...values];
  const random = createRng(seed);

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function dedupePapers(papers: Paper[]) {
  const seen = new Set<string>();
  const result: Paper[] = [];

  for (const paper of papers) {
    const key = normalisePaperId(paper.id) || paper.absUrl || paper.title;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(paper);
  }

  return result;
}

function interleavePaperLists(lists: Paper[][]) {
  const merged: Paper[] = [];
  const maxLength = Math.max(...lists.map((list) => list.length), 0);

  for (let index = 0; index < maxLength; index += 1) {
    for (const list of lists) {
      if (list[index]) {
        merged.push(list[index]);
      }
    }
  }

  return dedupePapers(merged);
}

function filterExcludedPapers(papers: Paper[], excludeIds: Set<string>) {
  if (excludeIds.size === 0) {
    return papers;
  }

  return papers.filter((paper) => !excludeIds.has(normalisePaperId(paper.id)));
}

function pickLivePapers(papers: Paper[], limit: number, seed: string) {
  return shuffleWithSeed(papers, seed).slice(0, limit);
}

async function withArxivSlot<T>(task: () => Promise<T>) {
  const run = async () => {
    const waitMs = Math.max(0, nextAllowedAt - Date.now());

    if (waitMs > 0) {
      await sleep(waitMs);
    }

    try {
      return await task();
    } finally {
      nextAllowedAt = Date.now() + ARXIV_MIN_INTERVAL_MS;
    }
  };

  const nextTask = arxivQueue.then(run, run);
  arxivQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );

  return nextTask;
}

async function fetchArxivFeed({
  query,
  start,
  maxResults,
  sortBy,
}: {
  query: string;
  start: number;
  maxResults: number;
  sortBy: SortBy;
}): Promise<FeedResult> {
  const url = new URL("https://export.arxiv.org/api/query");

  url.searchParams.set("search_query", query);
  url.searchParams.set("sortBy", sortBy);
  url.searchParams.set("sortOrder", "descending");
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set("start", String(start));

  return withArxivSlot(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/atom+xml, application/xml, text/xml;q=0.9",
          "User-Agent": "FrontierAtlas/1.0",
        },
        cache: "no-store",
      });

      const body = await response.text();

      if (!response.ok) {
        const error = new Error("arXiv upstream request failed") as Error & {
          status?: number;
          detail?: string;
          upstreamStatus?: number;
          upstreamStatusText?: string;
        };

        error.status = 502;
        error.detail = body.slice(0, 800);
        error.upstreamStatus = response.status;
        error.upstreamStatusText = response.statusText;

        throw error;
      }

      const data = parser.parse(body);
      const feed = data?.feed || {};
      const entries = asArray(feed.entry);

      const papers: Paper[] = entries.map((item: any, index: number) => {
        const authorItems = asArray(item.author);

        const authors = authorItems
          .map((author: any) => clean(author?.name))
          .filter(Boolean);

        const affiliations = authorItems
          .map((author: any) => clean(author?.["arxiv:affiliation"]))
          .filter(Boolean);

        const tags = asArray(item.category)
          .map((category: any) => clean(category?.term))
          .filter(Boolean);

        const links = asArray(item.link);

        const pdfUrl =
          links.find(
            (link: any) =>
              clean(link?.title) === "pdf" ||
              clean(link?.type) === "application/pdf",
          )?.href || null;

        const rawAbsUrl = clean(item?.id);
        const rawId = rawAbsUrl.includes("/abs/")
          ? rawAbsUrl.split("/abs/")[1]
          : rawAbsUrl;

        return {
          id: rawId || `paper-${start + index}`,
          title: clean(item?.title),
          abstract: clean(item?.summary),
          authors,
          tags,
          primaryField:
            clean(item?.["arxiv:primary_category"]?.term) || tags[0] || null,
          published: clean(item?.published) || null,
          updated: clean(item?.updated) || null,
          absUrl: rawAbsUrl || null,
          pdfUrl: clean(pdfUrl) || null,
          affiliations,
          journalRef: clean(item?.["arxiv:journal_ref"]) || null,
          doi: clean(item?.["arxiv:doi"]) || null,
        };
      });

      return {
        feedUpdated: clean(feed?.updated) || null,
        totalResults: Number(feed?.["opensearch:totalResults"] || 0),
        papers,
      };
    } finally {
      clearTimeout(timeout);
    }
  });
}

async function refreshCacheValue(
  key: string,
  ttlMs: number,
  staleMs: number,
  loader: () => Promise<CacheValue>,
) {
  const existing = inflight.get(key);

  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const value = await loader();

    cache.set(key, {
      expiresAt: Date.now() + ttlMs,
      staleUntil: Date.now() + ttlMs + staleMs,
      value,
    });

    return value;
  })();

  inflight.set(key, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

async function getCachedValue(
  key: string,
  ttlMs: number,
  staleMs: number,
  loader: () => Promise<CacheValue>,
  options?: {
    preferFresh?: boolean;
  },
): Promise<{ value: CacheValue; cacheStatus: CacheStatus }> {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return {
      value: cached.value,
      cacheStatus: "fresh",
    };
  }

  if (cached && cached.staleUntil > now && !options?.preferFresh) {
    void refreshCacheValue(key, ttlMs, staleMs, loader);

    return {
      value: cached.value,
      cacheStatus: "stale",
    };
  }

  try {
    const value = await refreshCacheValue(key, ttlMs, staleMs, loader);

    return {
      value,
      cacheStatus: cached ? "refreshed" : "miss",
    };
  } catch {
    if (cached) {
      return {
        value: cached.value,
        cacheStatus: "stale",
      };
    }

    throw new Error("arXiv upstream request failed");
  }
}

async function loadLiveTopicPool(
  query: string,
  pool: number,
): Promise<CacheValue> {
  const result = await fetchArxivFeed({
    query,
    start: 0,
    maxResults: pool,
    sortBy: "submittedDate",
  });

  return {
    key: `live:${query}:pool:${pool}`,
    fetchedAt: Date.now(),
    feedUpdated: result.feedUpdated,
    totalResults: result.totalResults,
    papers: dedupePapers(result.papers),
  };
}

async function loadFrontierMixPool(pool: number): Promise<CacheValue> {
  const perShard = clamp(
    Math.ceil(pool / FRONTIER_MIX_SHARDS.length) + 10,
    16,
    48,
  );
  const shardResults: FeedResult[] = [];

  for (const shardQuery of FRONTIER_MIX_SHARDS) {
    try {
      const result = await fetchArxivFeed({
        query: shardQuery,
        start: 0,
        maxResults: perShard,
        sortBy: "submittedDate",
      });

      shardResults.push(result);
    } catch {
      continue;
    }
  }

  if (shardResults.length === 0) {
    throw new Error("arXiv upstream request failed");
  }

  const merged = interleavePaperLists(shardResults.map((item) => item.papers));

  return {
    key: `live:frontier-mix:pool:${pool}`,
    fetchedAt: Date.now(),
    feedUpdated:
      shardResults
        .map((item) => item.feedUpdated || "")
        .sort()
        .at(-1) || null,
    totalResults: shardResults.reduce(
      (total, item) => total + item.totalResults,
      0,
    ),
    papers: merged.slice(0, Math.max(pool, perShard * shardResults.length)),
  };
}

async function loadSearchPool(
  query: string,
  pool: number,
): Promise<CacheValue> {
  const result = await fetchArxivFeed({
    query,
    start: 0,
    maxResults: pool,
    sortBy: "relevance",
  });

  return {
    key: `search:${query}:pool:${pool}`,
    fetchedAt: Date.now(),
    feedUpdated: result.feedUpdated,
    totalResults: result.totalResults,
    papers: dedupePapers(result.papers),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const baseQuery =
    typeof req.query.query === "string" && req.query.query.trim()
      ? req.query.query.trim()
      : DEFAULT_QUERY;

  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const limitRaw =
    typeof req.query.limit === "string" ? Number(req.query.limit) : 12;
  const limit = clamp(limitRaw || 12, 1, 24);

  const poolRaw =
    typeof req.query.pool === "string" ? Number(req.query.pool) : 72;
  const pool = clamp(poolRaw || 72, 24, 120);

  const sortByRaw =
    typeof req.query.sortBy === "string" ? req.query.sortBy : "";

  const requestedSortBy: SortBy =
    sortByRaw === "relevance" ||
    sortByRaw === "submittedDate" ||
    sortByRaw === "lastUpdatedDate"
      ? sortByRaw
      : search
        ? "relevance"
        : "submittedDate";

  const modeRaw = typeof req.query.mode === "string" ? req.query.mode : "";

  const mode: Mode = search
    ? "search"
    : modeRaw === "latest" || modeRaw === "live" || modeRaw === "search"
      ? modeRaw
      : "live";

  const seed =
    typeof req.query.seed === "string" && req.query.seed.trim()
      ? req.query.seed.trim()
      : `${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const excludeIdsRaw =
    typeof req.query.excludeIds === "string" ? req.query.excludeIds : "";

  const excludeIds = new Set(
    excludeIdsRaw
      .split(",")
      .map((value) => normalisePaperId(value))
      .filter(Boolean),
  );

  const query = buildScopedQuery(baseQuery, search);

  try {
    if (mode === "search") {
      const searchPool = Math.min(pool, 60);
      const cacheKey = `search:${query}:pool:${searchPool}`;

      const cached = await getCachedValue(
        cacheKey,
        SEARCH_TTL_MS,
        SEARCH_STALE_MS,
        () => loadSearchPool(query, searchPool),
      );

      const papers = filterExcludedPapers(
        cached.value.papers,
        excludeIds,
      ).slice(0, limit);

      res.setHeader("Cache-Control", "private, no-store, max-age=0");

      return res.status(200).json({
        query,
        mode,
        sortBy: "relevance",
        limit,
        poolSize: cached.value.papers.length,
        fetchedAt: cached.value.fetchedAt,
        feedUpdated: cached.value.feedUpdated,
        totalResults: cached.value.totalResults,
        cacheStatus: cached.cacheStatus,
        papers,
      });
    }

    if (mode === "latest") {
      const result = await fetchArxivFeed({
        query,
        start: 0,
        maxResults: limit,
        sortBy: requestedSortBy,
      });

      res.setHeader("Cache-Control", "private, no-store, max-age=0");

      return res.status(200).json({
        query,
        mode,
        sortBy: requestedSortBy,
        limit,
        poolSize: result.papers.length,
        fetchedAt: Date.now(),
        feedUpdated: result.feedUpdated,
        totalResults: result.totalResults,
        cacheStatus: "miss",
        papers: result.papers,
      });
    }

    const useFrontierMixStrategy = isDefaultMixQuery(baseQuery);

    const cacheKey = useFrontierMixStrategy
      ? `live:frontier-mix:pool:${pool}`
      : `live:${query}:pool:${pool}`;

    const cached = await getCachedValue(
      cacheKey,
      LIVE_TTL_MS,
      LIVE_STALE_MS,
      () =>
        useFrontierMixStrategy
          ? loadFrontierMixPool(pool)
          : loadLiveTopicPool(query, pool),
      {
        preferFresh: true,
      },
    );

    const unseen = filterExcludedPapers(cached.value.papers, excludeIds);
    const source = unseen.length >= limit ? unseen : cached.value.papers;
    const papers = pickLivePapers(source, limit, seed);

    res.setHeader("Cache-Control", "private, no-store, max-age=0");

    return res.status(200).json({
      query,
      mode,
      sortBy: "submittedDate",
      limit,
      poolSize: cached.value.papers.length,
      fetchedAt: cached.value.fetchedAt,
      feedUpdated: cached.value.feedUpdated,
      totalResults: cached.value.totalResults,
      cacheStatus: cached.cacheStatus,
      papers,
    });
  } catch (error: any) {
    const message =
      error?.name === "AbortError"
        ? "arXiv request timed out"
        : error?.message || "Unknown error";

    const status =
      typeof error?.status === "number"
        ? error.status
        : message.includes("upstream")
          ? 502
          : 500;

    return res.status(status).json({
      error: "Could not fetch or parse arXiv response",
      detail: message,
      upstreamStatus:
        typeof error?.upstreamStatus === "number"
          ? error.upstreamStatus
          : undefined,
      upstreamStatusText:
        typeof error?.upstreamStatusText === "string"
          ? error.upstreamStatusText
          : undefined,
      upstreamDetail:
        typeof error?.detail === "string" ? error.detail : undefined,
    });
  }
}
