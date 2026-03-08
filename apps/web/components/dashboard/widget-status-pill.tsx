"use client";

/**
 * WidgetStatusPill — status indicator for closed widget headers.
 * Wireframe: "3 active", "5 matches", "Urgent" pills.
 */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type WidgetStatusPillVariant =
  | "active"
  | "matches"
  | "urgent"
  | "neutral";

const VARIANT_CLASSES: Record<WidgetStatusPillVariant, string> = {
  active: "bg-electric-mint/20 text-navy border-electric-mint/40",
  matches: "bg-electric-mint/20 text-navy border-electric-mint/40",
  urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
  neutral: "bg-muted text-muted-foreground border-border",
};

export interface WidgetStatusPillProps {
  variant: WidgetStatusPillVariant;
  children: ReactNode;
  className?: string;
}

export function WidgetStatusPill({
  variant,
  children,
  className,
}: WidgetStatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
