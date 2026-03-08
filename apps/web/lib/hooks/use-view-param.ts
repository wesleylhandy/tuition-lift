"use client";

/**
 * useViewParam — URL-synced expanded widget state.
 * Per contracts/expandable-widget.md: expandedWidgetId, isExpanded, expand, close.
 * Uses ?view=<widgetId>; invalid/unknown values → null (dashboard).
 *
 * Uses history.pushState/replaceState instead of router.push/replace to avoid
 * Next.js navigation remounting the tree and resetting state before overlay renders.
 * State synced from URL on mount and popstate (back/forward, shared links).
 */

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { isValidWidgetId } from "@/lib/constants/widget-ids";

function getViewFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("view");
  return isValidWidgetId(raw) ? raw : null;
}

export interface UseViewParamReturn {
  /** Current view param value; null if absent or invalid. */
  expandedWidgetId: string | null;
  /** Whether the given widget is currently expanded. */
  isExpanded: (id: string) => boolean;
  /** Set view param (router.push) to expand a widget. */
  expand: (id: string) => void;
  /** Remove view param (router.replace) to close and return to dashboard. */
  close: () => void;
}

/** Initial view from server (T019); avoids hydration flash for shared links. */
export function useViewParam(initialFromServer?: string | null): UseViewParamReturn {
  const pathname = usePathname();

  // T019: Server-injected initial view when loading ?view=kanban directly; else sync from URL on mount
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(() => {
    if (initialFromServer !== undefined) return initialFromServer;
    return typeof window !== "undefined" ? getViewFromUrl() : null;
  });

  // Sync from URL on mount (client-only; reconciles any mismatch)
  useEffect(() => {
    setExpandedWidgetId(getViewFromUrl());
  }, []);

  useEffect(() => {
    function handlePopState() {
      setExpandedWidgetId(getViewFromUrl());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const isExpanded = useCallback(
    (id: string) => expandedWidgetId === id,
    [expandedWidgetId]
  );

  const expand = useCallback(
    (id: string) => {
      if (!isValidWidgetId(id)) return;
      flushSync(() => setExpandedWidgetId(id));
      const search = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      search.set("view", id);
      const url = `${pathname}?${search.toString()}`;
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", url);
      }
    },
    [pathname]
  );

  const close = useCallback(() => {
    flushSync(() => setExpandedWidgetId(null));
    const search = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    search.delete("view");
    const query = search.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", url);
    }
  }, [pathname]);

  return {
    expandedWidgetId,
    isExpanded,
    expand,
    close,
  };
}
