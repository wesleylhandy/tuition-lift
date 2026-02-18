/**
 * Bento Grid — modular, responsive layout for dashboard Control Center.
 * Tailwind grid utilities with col-span, row-span for flexible block composition.
 * @see FR-018, SC-008 (320px+ viewports, no horizontal scroll)
 */
import type { ReactNode } from "react";

export interface BentoGridItemProps {
  children: ReactNode;
  /** Column span: 1–4 on desktop; maps to col-span-1..4 */
  colSpan?: 1 | 2 | 3 | 4;
  /** Row span: 1–4; maps to row-span-1..4 */
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

const colSpanMap = {
  1: "col-span-1",
  2: "col-span-1 sm:col-span-2",
  3: "col-span-1 sm:col-span-2 lg:col-span-3",
  4: "col-span-1 sm:col-span-2 lg:col-span-4",
} as const;

const rowSpanMap = {
  1: "row-span-1",
  2: "row-span-2",
  3: "row-span-3",
  4: "row-span-4",
} as const;

export function BentoGridItem({
  children,
  colSpan = 1,
  rowSpan = 1,
  className = "",
}: BentoGridItemProps) {
  return (
    <div
      className={`${colSpanMap[colSpan]} ${rowSpanMap[rowSpan]} min-w-0 ${className}`}
    >
      {children}
    </div>
  );
}

export interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Responsive Bento grid container.
 * - Mobile (320px+): 1 column
 * - Tablet (sm): 2 columns
 * - Desktop (lg): 4 columns
 * Children use BentoGridItem for col-span/row-span control.
 */
export function BentoGrid({ children, className = "" }: BentoGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full max-w-full min-w-0 ${className}`}
      role="presentation"
    >
      {children}
    </div>
  );
}
