/**
 * Bento Grid — modular, responsive layout for dashboard Control Center.
 * 12-column base at lg; wireframe: Game Plan 4, Discovery Feed 5, Calendar 3 cols.
 * @see contracts/component-shell.md, FR-011
 */
import type { ReactNode } from "react";

export type BentoGridColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface BentoGridItemProps {
  children: ReactNode;
  /** Column span: 1–12 at lg; responsive at sm/md */
  colSpan?: BentoGridColSpan;
  /** Row span: 1–4; maps to row-span-1..4 */
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

/** Responsive col-span: 1 col default, 2 at sm, 4 at md, N at lg */
const colSpanMap: Record<BentoGridColSpan, string> = {
  1: "col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1",
  2: "col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-2",
  3: "col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3",
  4: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-4",
  5: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-5",
  6: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-6",
  7: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-7",
  8: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-8",
  9: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-9",
  10: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-10",
  11: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-11",
  12: "col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-12",
};

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
/**
 * Responsive Bento grid container.
 * - Mobile: 1 column
 * - sm: 2 columns
 * - md: 4 columns
 * - lg: 12 columns (wireframe-driven)
 */
export function BentoGrid({ children, className = "" }: BentoGridProps) {
  return (
    <div
      className={`grid min-w-0 w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4 lg:grid-cols-12 lg:gap-6 ${className}`}
      role="presentation"
    >
      {children}
    </div>
  );
}
