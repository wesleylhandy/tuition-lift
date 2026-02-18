/**
 * Coach's Take — micro-summary explaining ROI and fit for a specific scholarship.
 * Per FR-005; fallback to trustReport when coachTake is null.
 */
export interface CoachesTakeProps {
  /** ROI micro-summary from Coach/Orchestration; fallback when null */
  coachTakeText: string | null | undefined;
  className?: string;
}

export function CoachesTake({
  coachTakeText,
  className = "",
}: CoachesTakeProps) {
  const text = coachTakeText?.trim();
  if (!text) return null;

  return (
    <p
      className={`text-sm text-muted-foreground line-clamp-2 ${className}`}
      title={text}
    >
      {text}
    </p>
  );
}
