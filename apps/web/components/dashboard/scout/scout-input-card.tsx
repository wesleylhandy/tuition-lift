"use client";

/**
 * ScoutInputCard — Paste URL card for Manual Scout.
 * T009 [US2]: Click expands; input rendered below cards by ScoutEntryPoint.
 * Per contracts/scout-ui-016.md §3.
 */
import { Link2 } from "lucide-react";

export interface ScoutInputCardProps {
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  disabled?: boolean;
}

export function ScoutInputCard({
  expanded,
  onExpandChange,
  disabled = false,
}: ScoutInputCardProps) {
  const handleClick = () => {
    if (disabled) return;
    onExpandChange(true);
  };

  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-sm transition-colors ${
        disabled ? "pointer-events-none opacity-60" : "hover:border-electric-mint/50"
      } ${expanded ? "border-electric-mint/50 ring-1 ring-electric-mint/30" : ""}`}
      aria-label="Paste URL or scholarship name"
      aria-expanded={expanded}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="flex min-h-[44px] w-full items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
        aria-label="Paste URL or scholarship name"
      >
        <span
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-electric-mint/20"
          aria-hidden
        >
          <Link2 className="size-6 text-navy" />
        </span>
        <span className="text-sm font-medium text-foreground">
          Paste URL
        </span>
      </button>
    </div>
  );
}
