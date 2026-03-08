"use client";

/**
 * WidgetCard — presentational card shell for closed dashboard widgets.
 * Wireframe: rounded card, header (icon, title, subtitle, status pill, expand button), content, optional CTA.
 */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WidgetCardProps {
  /** Left-side icon in header */
  icon?: ReactNode;
  /** Main title */
  title: string;
  /** Subtitle below title */
  subtitle?: string;
  /** Status pill (e.g., "3 active") */
  statusPill?: ReactNode;
  /** Expand button (injected by ExpandableWidget) */
  expandButton: ReactNode;
  /** Card body content */
  children: ReactNode;
  /** Optional footer CTA, e.g. "View Full Kanban Board >" */
  expandCta?: ReactNode;
  /** Optional CTA click handler (when expandCta is a button) */
  onExpandCtaClick?: () => void;
  /** Additional header actions between status and expand */
  headerActions?: ReactNode;
  className?: string;
  /** aria-label for the card section */
  ariaLabel?: string;
}

export function WidgetCard({
  icon,
  title,
  subtitle,
  statusPill,
  expandButton,
  children,
  expandCta,
  onExpandCtaClick,
  headerActions,
  className,
  ariaLabel,
}: WidgetCardProps) {
  return (
    <section
      role="region"
      aria-label={ariaLabel ?? title}
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card shadow-sm",
        className
      )}
    >
      <header className="flex min-h-[44px] shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-hidden
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">
                {title}
              </h2>
              {statusPill}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          {expandButton}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

      {expandCta && (
        <footer className="shrink-0 border-t border-border px-4 py-3">
          {onExpandCtaClick ? (
            <button
              type="button"
              onClick={onExpandCtaClick}
              className="text-sm font-medium text-electric-mint hover:underline focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 focus:ring-offset-background rounded"
            >
              {expandCta}
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">{expandCta}</span>
          )}
        </footer>
      )}
    </section>
  );
}
