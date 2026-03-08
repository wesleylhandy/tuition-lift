"use client";

/**
 * ExpandableWidget — reusable wrapper for bento dashboard sections.
 * Per contracts/expandable-widget.md: widgetId, title, dashboardContent, expandedContent.
 * Dashboard view shows compact content; expanded view shows full-viewport overlay.
 * Uses useViewParam for URL sync (?view=<widgetId>).
 * dashboardContent is a render prop so closed cards can receive the expand button.
 */

import { Maximize2, X } from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ExpandableWidgetContext } from "./expandable-widget-context";
import { useViewParamContext } from "@/components/dashboard/view-param-provider";

export interface ExpandableWidgetProps {
  /** ID for URL param (e.g. kanban, repository, calendar) */
  widgetId: string;
  /** Section title (for expanded overlay header, aria) */
  title: string;
  /** Compact view content; receives expand button to inject into card header */
  dashboardContent: (expandButton: ReactNode) => ReactNode;
  /** Full-viewport overlay content */
  expandedContent: ReactNode;
}

export function ExpandableWidget({
  widgetId,
  title,
  dashboardContent,
  expandedContent,
}: ExpandableWidgetProps) {
  const { isExpanded, expand, close } = useViewParamContext();
  const expanded = isExpanded(widgetId);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasExpandedRef = useRef(false);

  // T009: Focus close button when overlay opens (modal keyboard flow)
  useEffect(() => {
    if (expanded) {
      closeButtonRef.current?.focus();
    }
  }, [expanded]);

  // T007: Escape key closes expanded view (FR-017)
  useEffect(() => {
    if (!expanded) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [expanded, close]);

  // T007: Return focus to expand button when overlay closes (a11y)
  useEffect(() => {
    if (wasExpandedRef.current && !expanded) {
      expandButtonRef.current?.focus();
    }
    wasExpandedRef.current = expanded;
  }, [expanded]);

  const contextValue = useMemo(
    () => ({ isExpanded, expand, close }),
    [isExpanded, expand, close]
  );

  const expandButton = (
    <button
      ref={expandButtonRef}
      type="button"
      onClick={() => expand(widgetId)}
      aria-label={`Expand ${title}`}
      className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
    >
      <Maximize2 aria-hidden size={20} />
    </button>
  );

  return (
    <>
      {dashboardContent(expandButton)}

      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex flex-col bg-off-white dark:bg-zinc-950"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} expanded`}
          >
            <ExpandableWidgetContext.Provider value={contextValue}>
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-off-white dark:bg-zinc-950 px-6 py-4">
                <h2 className="truncate text-lg font-semibold text-foreground">
                  {title}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={close}
                  aria-label="Close and return to dashboard"
                  className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
                >
                  <X aria-hidden size={22} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-auto">{expandedContent}</div>
            </ExpandableWidgetContext.Provider>
          </div>,
          document.body
        )}
    </>
  );
}
