import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
};

const presets = [
  {
    label: "AI",
    query: "cat:cs.AI OR cat:cs.LG OR cat:stat.ML",
  },
  {
    label: "Math",
    query: "cat:math.OC OR cat:math.PR OR cat:math.NA",
  },
  {
    label: "Physics",
    query: "cat:physics.app-ph OR cat:quant-ph OR cat:hep-th",
  },
  {
    label: "Mixed",
    query:
      "cat:cs.AI OR cat:cs.LG OR cat:stat.ML OR cat:math.OC OR cat:physics.app-ph OR cat:q-bio.QM",
  },
];

export default function HomePage() {
  const [query, setQuery] = useState(presets[3].query);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextQuery = query) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/arxiv?query=${encodeURIComponent(nextQuery)}&limit=12`,
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load papers");
      }

      setPapers(data.papers || []);
    } catch (err) {
      setPapers([]);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="flex items-center justify-center h-24 ">
        <h1 className="text-4xl md:text-xl text-yellow-500 font-semibold tracking-tight text-foreground ">
          Frontier Atlas
        </h1>
      </div>
      <div className="mx-auto max-w-7xl px-6 ">
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          <div className="absolute inset-0 " />{" "}
          <div className="relative p-8 md:p-10">
            {/* <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">arXiv</Badge>
              <Badge variant="outline">Pages Router</Badge>
              <Badge variant="outline">shadcn preset</Badge>
            </div> */}

            <div className="max-w-3xl">
              <h1 className="text-4xl text-yellow-500 font-semibold tracking-tight text-foreground md:text-5xl">
                Discover fresh research papers
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Browse recent papers across major fields with a small homepage
                that uses your Next.js API route and renders shadcn theme tokens
                properly.
              </p>
            </div>

            {/* <form
              onSubmit={(e) => {
                e.preventDefault();
                load();
              }}
              className="mt-8 flex flex-col gap-3 md:flex-row">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="cat:cs.AI OR cat:cs.LG OR cat:stat.ML"
                className="h-11 bg-background/80"
              />
              <Button type="submit" className="h-11 px-6">
                Search
              </Button>
            </form> */}

            <div className="mt-4 flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(preset.query);
                    load(preset.query);
                  }}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <Card className="mt-6 border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="rounded-2xl border-border/60">
                  <CardHeader className="space-y-3">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-4/5" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : papers.map((paper) => (
                <Card
                  key={paper.id}
                  className="rounded-2xl border-border/60 bg-card/95 transition hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {paper.primaryField ? (
                        <Badge>{paper.primaryField}</Badge>
                      ) : null}
                      {paper.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <CardTitle className="text-xl leading-snug text-balance">
                        {paper.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {paper.authors.join(", ")}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="line-clamp-4 text-md leading-6 text-muted-foreground">
                      {paper.abstract}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {paper.published
                          ? new Date(paper.published).toLocaleDateString()
                          : "No date"}
                      </span>

                      <div className="flex gap-3">
                        {paper.absUrl ? (
                          <a
                            href={paper.absUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-foreground underline underline-offset-4">
                            Abstract
                          </a>
                        ) : null}
                        {paper.pdfUrl ? (
                          <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-foreground underline underline-offset-4">
                            PDF
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </section>
      </div>
    </main>
  );
}
