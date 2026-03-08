"use client";

/**
 * ExpandableWidgetContext — provides expand/close and isExpanded to expanded overlay content.
 * Allows overlay children (e.g. KanbanBoard, ScholarshipRepository) to close the overlay
 * without prop drilling, and to check expansion state.
 * Per contracts/expandable-widget.md; T006.
 */

import { createContext, useContext } from "react";

export interface ExpandableWidgetContextValue {
  /** Whether the given widget is currently expanded. */
  isExpanded: (id: string) => boolean;
  /** Set view param to expand a widget. */
  expand: (id: string) => void;
  /** Remove view param and return to dashboard. */
  close: () => void;
}

const ExpandableWidgetContext = createContext<ExpandableWidgetContextValue | null>(
  null
);

export function useExpandableWidget(): ExpandableWidgetContextValue {
  const ctx = useContext(ExpandableWidgetContext);
  if (!ctx) {
    throw new Error(
      "useExpandableWidget must be used within ExpandableWidget expanded overlay content"
    );
  }
  return ctx;
}

export { ExpandableWidgetContext };
