/**
 * Skeleton — loading placeholder component.
 * shadcn/ui pattern: animate-pulse, rounded-md.
 * @see FR-016 (skeletons during initial data load)
 */
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-800", className)}
      {...props}
    />
  );
}

export { Skeleton };
