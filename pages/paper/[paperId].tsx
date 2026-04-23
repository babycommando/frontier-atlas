import Head from "next/head";
import Link from "next/link";
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { DitheringShader } from "@/components/dithering-shader";
import { parseAbstract } from "@/utils/parseAbstract";
import { resolveArxivCategories } from "@/utils/arxiv-categories";

type PaperDetails = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  affiliations: string[];
  tags: string[];
  primaryField: string | null;
  published: string | null;
  updated: string | null;
  absUrl: string | null;
  pdfUrl: string | null;
  journalRef: string | null;
  doi: string | null;
  comment: string | null;
  license: string | null;
};

type PageProps = {
  paper: PaperDetails | null;
  error?: string | null;
};

const FIELD_COLORS: Record<string, string> = {
  "astro-ph": "#1a2d4a",
  "cond-mat": "#1a3320",
  "gr-qc": "#1a3340",
  "hep-ex": "#3d1a1a",
  "hep-lat": "#3d1a1a",
  "hep-ph": "#3d1a1a",
  "hep-th": "#3d1a1a",
  "math-ph": "#2d2d1a",
  nlin: "#2d1a1a",
  "nucl-ex": "#3d1a1a",
  "nucl-th": "#3d1a1a",
  "quant-ph": "#2d1a5c",
  math: "#2d2d1a",
  cs: "#0d2d3d",
  "q-bio": "#1a3d1a",
  stat: "#2d1a3d",
  eess: "#3d2d1a",
  econ: "#3d1a2d",
  "q-fin": "#1a2d1a",
  Unknown: "#2a2a2a",
};

function getBadgeStyle(archiveCode: string): CSSProperties {
  const color = FIELD_COLORS[archiveCode] ?? FIELD_COLORS.Unknown;

  return {
    backgroundColor: color,
    color: "#e8e8e8",
    border: `1px solid ${color}dd`,
  };
}

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function pick(xml: string, tag: string) {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );

  return match ? decodeXml(stripTags(match[1])) : null;
}

function pickAttribute(xml: string, tag: string, attribute: string) {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*\\s${attribute}="([^"]+)"[^>]*\\/?>`, "i"),
  );

  return match ? decodeXml(match[1]) : null;
}

function parseLinkAttributes(raw: string) {
  const attrs: Record<string, string> = {};

  for (const match of raw.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:]*)="([^"]*)"/g)) {
    attrs[match[1]] = decodeXml(match[2]);
  }

  return attrs;
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchPaperById(paperId: string): Promise<PaperDetails | null> {
  const endpoint = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(
    paperId,
  )}`;

  const response = await fetch(endpoint, {
    headers: {
      Accept:
        "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "User-Agent": "FrontierAtlas/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch paper from arXiv");
  }

  const xml = await response.text();
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);

  if (!entryMatch) {
    return null;
  }

  const entry = entryMatch[1];
  const authorBlocks = Array.from(
    entry.matchAll(/<author>([\s\S]*?)<\/author>/gi),
  ).map((match) => match[1]);

  const authors = unique(
    authorBlocks
      .map((block) => pick(block, "name"))
      .filter((value): value is string => Boolean(value)),
  );

  const affiliations = unique(
    authorBlocks
      .map((block) => pick(block, "arxiv:affiliation"))
      .filter((value): value is string => Boolean(value)),
  );

  const tags = unique(
    Array.from(entry.matchAll(/<category[^>]*term="([^"]+)"/gi)).map((match) =>
      decodeXml(match[1]),
    ),
  );

  const linkBlocks = Array.from(entry.matchAll(/<link\s+([^>]+?)\/?>/gi)).map(
    (match) => parseLinkAttributes(match[1]),
  );

  const absUrl =
    linkBlocks.find((link) => link.rel === "alternate" && link.href)?.href ??
    `https://arxiv.org/abs/${paperId}`;

  const pdfUrl =
    linkBlocks.find((link) => link.title === "pdf" && link.href)?.href ??
    `https://arxiv.org/pdf/${paperId}.pdf`;

  const idFromFeed = pick(entry, "id")
    ?.replace("http://arxiv.org/abs/", "")
    ?.replace("https://arxiv.org/abs/", "");

  return {
    id: idFromFeed || paperId,
    title: pick(entry, "title") || paperId,
    abstract: pick(entry, "summary") || "",
    authors,
    affiliations,
    tags,
    primaryField:
      pickAttribute(entry, "arxiv:primary_category", "term") || tags[0] || null,
    published: pick(entry, "published"),
    updated: pick(entry, "updated"),
    absUrl,
    pdfUrl,
    journalRef: pick(entry, "arxiv:journal_ref"),
    doi: pick(entry, "arxiv:doi"),
    comment: pick(entry, "arxiv:comment"),
    license: pickAttribute(entry, "arxiv:license", "href"),
  };
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  context: GetServerSidePropsContext,
) => {
  const rawPaperId = context.params?.paperId;

  if (!rawPaperId || Array.isArray(rawPaperId)) {
    return {
      notFound: true,
    };
  }

  const paperId = decodeURIComponent(rawPaperId).trim();

  try {
    const paper = await fetchPaperById(paperId);

    if (!paper) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        paper,
        error: null,
      },
    };
  } catch (error) {
    return {
      props: {
        paper: null,
        error: error instanceof Error ? error.message : "Failed to load paper",
      },
    };
  }
};

function PdfViewer({
  pdfUrl,
  title,
}: {
  pdfUrl: string | null;
  title: string;
}) {
  if (!pdfUrl) {
    return (
      <div className="flex min-h-[78vh] items-center justify-center rounded-[28px] border border-border/60 bg-card/70 p-8">
        <div className="max-w-md space-y-3 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            PDF not available for this paper.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card/70 p-2">
      <iframe
        key={pdfUrl}
        src={pdfUrl + "#navpanes=0&view=fitH"}
        // src={pdfUrl + "#toolbar=0&navpanes=0&view=fitH"}
        title={title}
        loading="lazy"
        className="block h-[68dvh] min-h-[560px] w-full rounded-[22px] bg-white lg:h-[calc(100dvh-220px)] lg:min-h-[780px]"
      />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

export default function PaperPage({
  paper,
  error,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!paper) {
    return (
      <>
        <Head>
          <title>Paper | Frontier Atlas</title>
        </Head>

        <main className="min-h-screen bg-background">
          <div className="mx-auto px-6 py-6">
            <div className="mb-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to Frontier Atlas
              </Link>
            </div>

            <Card className="border-destructive/30">
              <CardContent className="pt-6 text-sm text-destructive">
                {error || "Paper not found"}
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  const categories = resolveArxivCategories(paper.tags);
  const title = parseAbstract(paper.title);
  const abstract = parseAbstract(paper.abstract);
  const primaryArchiveCode =
    categories[0]?.archiveCode ??
    paper.primaryField?.split(".")[0] ??
    "Unknown";

  return (
    <>
      <Head>
        <title>{title} | Frontier Atlas</title>
        <meta name="description" content={abstract.slice(0, 160)} />
      </Head>

      <main className="min-h-screen bg-background">
        <div className="mx-auto px-6 py-6">
          <header className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex flex-wrap items-center content-center gap-2">
                      <Link href="/" className="hover:opacity-90">
                        <h1 className="mb-1 text-lg leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap">
                          Frontier Atlas
                        </h1>
                      </Link>
                      <p className="text-xs text-muted-foreground">beta 0.1</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The latest scientific research papers at your fingertips.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      An instrument to browse bleeding edge human knowledge with
                      ease.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 text-sm">
                <Link className="hover:underline" href="/about">
                  <p>About</p>
                </Link>
                <Link className="hover:underline" href="/about">
                  <p>How does it work</p>
                </Link>
              </div>
            </div>

            <div className="relative w-full overflow-hidden rounded-[28px]">
              <DitheringShader
                height={220}
                shape="swirl"
                type="random"
                colorBack="#000000"
                colorFront="#252525"
                pxSize={4}
                speed={0.9}
              />

              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center">
                <span className="text-2xl leading-none font-semibold text-white tracking-tighter whitespace-pre-wrap">
                  {paper.title}
                </span>
                {paper.authors.length > 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {paper.authors.join(", ")}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {paper.primaryField ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full"
                      style={getBadgeStyle(primaryArchiveCode)}>
                      {categories[0]?.archiveTitle ?? paper.primaryField}
                    </Badge>
                  ) : null}

                  {categories.slice(0, 6).map((category) => (
                    <Badge
                      key={category.code}
                      variant="secondary"
                      className="rounded-full text-xs"
                      style={getBadgeStyle(category.archiveCode)}
                      title={category.description}>
                      {category.badgeLabel}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to Frontier Atlas
              </Link>

              {paper.absUrl ? (
                <a
                  href={paper.absUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline underline-offset-4">
                  Open arXiv abstract
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}

              {paper.pdfUrl ? (
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline underline-offset-4">
                  Open PDF
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </header>

          <section className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,56%)_minmax(0,44%)] xl:grid-cols-[minmax(0,60%)_minmax(0,40%)] 2xl:grid-cols-[minmax(0,62%)_minmax(0,38%)]">
            <section className="min-w-0">
              <PdfViewer pdfUrl={paper.pdfUrl} title={title} />
            </section>

            <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
              <Card className="border-border/60 bg-card/95">
                <CardHeader className="space-y-4 pb-4">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Paper
                    </p>

                    <CardTitle className="text-2xl leading-tight tracking-tight">
                      {title}
                    </CardTitle>

                    {paper.authors.length > 0 ? (
                      <p className="text-sm leading-6 text-muted-foreground">
                        {paper.authors.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {paper.primaryField ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full"
                        style={getBadgeStyle(primaryArchiveCode)}>
                        {categories[0]?.archiveTitle ?? paper.primaryField}
                      </Badge>
                    ) : null}

                    {categories.slice(0, 6).map((category) => (
                      <Badge
                        key={category.code}
                        variant="secondary"
                        className="rounded-full text-xs"
                        style={getBadgeStyle(category.archiveCode)}
                        title={category.description}>
                        {category.badgeLabel}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-0">
                  <div className="space-y-2">
                    <h2 className="text-sm font-semibold tracking-tight">
                      Abstract
                    </h2>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {abstract}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <MetaRow label="arXiv ID" value={paper.id} />
                    <MetaRow
                      label="Published"
                      value={formatDate(paper.published)}
                    />
                    <MetaRow
                      label="Updated"
                      value={formatDate(paper.updated)}
                    />
                    <MetaRow label="Primary" value={paper.primaryField} />
                    <MetaRow label="Journal" value={paper.journalRef} />
                    <MetaRow label="DOI" value={paper.doi} />
                    <MetaRow label="Comment" value={paper.comment} />
                  </div>

                  {paper.affiliations.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold tracking-tight">
                        Affiliations
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {paper.affiliations.map((affiliation) => (
                          <Badge
                            key={affiliation}
                            variant="outline"
                            className="rounded-full text-xs">
                            {affiliation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {paper.tags.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold tracking-tight">
                        Categories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {paper.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="rounded-full text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold tracking-tight">
                      Links
                    </h3>

                    <div className="flex flex-col gap-2 text-sm">
                      {paper.absUrl ? (
                        <a
                          href={paper.absUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 underline underline-offset-4">
                          arXiv abstract
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}

                      {paper.pdfUrl ? (
                        <a
                          href={paper.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 underline underline-offset-4">
                          Raw PDF
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}

                      {paper.doi ? (
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 underline underline-offset-4">
                          DOI
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}

                      {paper.license ? (
                        <a
                          href={paper.license}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 underline underline-offset-4">
                          License
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
