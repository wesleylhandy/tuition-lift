"use client";

/**
 * ScoutVerificationView — Side-by-side layout: document preview (left) + form (right).
 * T014 [US3], T015 [US3]: Per contracts/scout-ui-016.md §4.
 * T024 [US5]: Desktop (≥640px) grid cols 2; Mobile (≤640px) stack vertically (document top, form below).
 */
import { useEffect, useState } from "react";
import { ScoutVerificationForm } from "./scout-verification-form";
import type { ScoutVerificationFormProps } from "./scout-verification-form";

export type ScoutSourcePreview =
  | { type: "file"; blobUrl: string; fileName: string }
  | { type: "url"; url: string }
  | null;

export interface ScoutVerificationViewProps {
  /** Left panel: document/image preview or fallback */
  sourcePreview: ScoutSourcePreview;
  /** Right panel: verification form */
  formProps: ScoutVerificationFormProps;
}

function DocumentPreview({ sourcePreview }: { sourcePreview: ScoutSourcePreview }) {
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    setPreviewError(false);
  }, [sourcePreview]);

  if (!sourcePreview) {
    return (
      <div
        className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground"
        aria-label="No document preview"
      >
        <p>No source document</p>
      </div>
    );
  }

  if (sourcePreview.type === "url") {
    return (
      <div className="flex min-h-[200px] flex-col overflow-hidden rounded-lg border border-muted-foreground/40 bg-muted/10">
        <iframe
          src={sourcePreview.url}
          title="Document preview"
          className="min-h-[200px] flex-1 border-0"
          sandbox="allow-same-origin"
        />
        <a
          href={sourcePreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-t border-muted-foreground/20 p-2 text-center text-xs text-muted-foreground underline"
        >
          Open in new tab
        </a>
      </div>
    );
  }

  if (sourcePreview.type === "file") {
    const { blobUrl, fileName } = sourcePreview;
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    const isImage =
      /\.(png|jpe?g|webp|gif)$/i.test(fileName) ||
      blobUrl.startsWith("data:image/");

    if (previewError || (!isPdf && !isImage)) {
      return (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-muted-foreground/40 bg-muted/20 p-6 text-center text-sm"
          aria-label="File preview unavailable"
        >
          <p className="font-medium text-muted-foreground">{fileName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Preview unavailable
          </p>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="flex min-h-[200px] flex-col overflow-hidden rounded-lg border border-muted-foreground/40 bg-muted/10">
          <iframe
            src={blobUrl}
            title={`PDF preview: ${fileName}`}
            className="min-h-[200px] flex-1 border-0"
            onError={() => setPreviewError(true)}
          />
          <p className="border-t border-muted-foreground/20 p-2 text-center text-xs text-muted-foreground">
            {fileName}
          </p>
        </div>
      );
    }

    return (
      <div className="flex min-h-[200px] flex-col overflow-hidden rounded-lg border border-muted-foreground/40 bg-muted/10">
        <img
          src={blobUrl}
          alt={`Preview: ${fileName}`}
          className="max-h-[400px] w-full object-contain"
          onError={() => setPreviewError(true)}
        />
        <p className="border-t border-muted-foreground/20 p-2 text-center text-xs text-muted-foreground">
          {fileName}
        </p>
      </div>
    );
  }

  return null;
}

export function ScoutVerificationView({
  sourcePreview,
  formProps,
}: ScoutVerificationViewProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      aria-label="Verify scholarship details"
    >
      <aside
        className="flex flex-col"
        aria-label="Document preview"
      >
        <DocumentPreview sourcePreview={sourcePreview} />
      </aside>
      <div className="flex flex-col">
        <ScoutVerificationForm {...formProps} />
      </div>
    </div>
  );
}
