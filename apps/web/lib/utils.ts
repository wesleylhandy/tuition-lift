/**
 * Utility for merging Tailwind CSS classes.
 * Used by shadcn/ui components.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
