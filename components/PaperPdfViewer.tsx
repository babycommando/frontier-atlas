import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, FileText } from "lucide-react";

type Props = {
  pdfUrl: string | null;
  title: string;
};

export default function PaperPdfViewer({ pdfUrl, title }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [viewerWidth, setViewerWidth] = useState(900);
  const [ready, setReady] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    setReady(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const next = Math.max(320, Math.floor(element.clientWidth - 32));
      setViewerWidth(Math.min(next, 1200));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const pdfOptions = useMemo(
    () => ({
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
    }),
    [],
  );

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
    <div
      ref={containerRef}
      className="min-h-[78vh] overflow-hidden rounded-[28px] border border-border/60 bg-card/70 p-4">
      {!ready ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[70vh] w-full rounded-[20px]" />
        </div>
      ) : (
        <Document
          file={pdfUrl}
          options={pdfOptions}
          loading={
            <div className="space-y-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-[70vh] w-full rounded-[20px]" />
            </div>
          }
          onLoadSuccess={({ numPages: loadedPages }) => {
            setPdfError("");
            setNumPages(loadedPages);
          }}
          onLoadError={(error) => {
            setPdfError(
              error instanceof Error ? error.message : "Failed to load PDF",
            );
          }}
          error={
            <div className="flex min-h-[70vh] items-center justify-center rounded-[20px] border border-destructive/30 bg-card/60 p-6 text-sm text-destructive">
              {pdfError || "Failed to render PDF"}
            </div>
          }>
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {numPages > 0 ? `${numPages} pages` : "Loading PDF"}
            </p>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium underline underline-offset-4">
              Open raw PDF
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-4">
            {Array.from({ length: numPages }, (_, index) => (
              <div
                key={`${title}-page-${index + 1}`}
                className="overflow-hidden rounded-[18px] border border-border/60 bg-white shadow-sm">
                <Page
                  pageNumber={index + 1}
                  width={viewerWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={
                    <div className="p-6">
                      <Skeleton className="h-[40vh] w-full rounded-[16px]" />
                    </div>
                  }
                />
              </div>
            ))}
          </div>
        </Document>
      )}
    </div>
  );
}
