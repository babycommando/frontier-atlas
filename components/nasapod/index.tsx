import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Apod = {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  date: string;
  media_type?: "image" | "video";
};

export function NasaApodCard() {
  const [data, setData] = useState<Apod | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchApod = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          "https://api.nasa.gov/planetary/apod?api_key=ocJwZnLd35SriETItuFpundKakOXZgIzExwY9kKl",
          {
            signal: controller.signal,
          },
        );

        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || `Request failed with ${res.status}`);
        }

        if (!contentType.includes("application/json")) {
          const message = await res.text();
          throw new Error(message || "NASA API did not return JSON");
        }

        const json = (await res.json()) as Apod;

        if (!json?.title || !json?.url || !json?.explanation) {
          throw new Error("Invalid APOD payload");
        }

        setData(json);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load APOD data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApod();

    return () => controller.abort();
  }, []);

  return (
    <Card className="overflow-hidden border-border/60 bg-card/95">
      <CardHeader>
        <CardTitle className="text-xl">Astronomy Picture of the Day</CardTitle>
        <CardDescription>NASA</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-1">
            {data.media_type === "video" ? (
              <div className="overflow-hidden rounded-md">
                <iframe
                  src={data.url}
                  title={data.title}
                  className="aspect-video w-full"
                  allow="fullscreen"
                />
              </div>
            ) : (
              <img
                src={data.url}
                alt={data.title}
                className="h-auto w-full rounded-md mb-3"
              />
            )}

            <div>
              <h3 className="text-base font-semibold">{data.title}</h3>
              {/* <p className="mt-1 text-xs text-muted-foreground">{data.date}</p> */}
            </div>

            <div>
              <p
                className={`text-sm text-muted-foreground ${
                  expanded ? "" : "line-clamp-4"
                }`}>
                {data.explanation}
              </p>

              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs text-foreground/80 underline transition hover:text-foreground cursor-pointer">
                {expanded ? "show less" : "show more"}
              </button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
