"use client";

/**
 * ScoutFAB — Fixed floating action button for Manual Scout entry.
 * Per contracts/scout-ui-016.md §1.
 * Position: fixed bottom-right; min 44×44px touch target (WCAG 2.1 AA).
 */
import { Plus } from "lucide-react";

export interface ScoutFABProps {
  onClick: () => void;
  disabled?: boolean;
  /** Hidden when not authenticated */
  visible?: boolean;
}

export function ScoutFAB({
  onClick,
  disabled = false,
  visible = true,
}: ScoutFABProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-6 right-6 z-[9999] flex min-h-[44px] items-center gap-2 rounded-full bg-electric-mint px-4 pr-5 py-3 text-navy shadow-lg transition-colors hover:bg-electric-mint/90 focus:outline-none focus:ring-2 focus:ring-electric-mint focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [pointer-events:auto]"
      aria-label="Add scholarship from URL, flyer, or document"
      title="Add scholarship from URL, flyer, or document"
    >
      <Plus className="size-6 shrink-0" aria-hidden />
      <span className="text-sm font-medium">Add Scholarship</span>
    </button>
  );
}
