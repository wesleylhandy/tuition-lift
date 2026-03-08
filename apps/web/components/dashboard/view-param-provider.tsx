"use client";

/**
 * ViewParamProvider — single source of truth for expanded widget state.
 * Each ExpandableWidget was calling useViewParam independently (3 separate states);
 * they never synced. Lifting to a provider ensures one shared state.
 * T019: initialView from server avoids hydration flash for shared links.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useViewParam, type UseViewParamReturn } from "@/lib/hooks/use-view-param";

const ViewParamContext = createContext<UseViewParamReturn | null>(null);

export interface ViewParamProviderProps {
  children: ReactNode;
  /** T019: Initial view from server (validated); avoids flash when loading ?view=kanban directly. */
  initialView?: string | null;
}

export function ViewParamProvider({ children, initialView }: ViewParamProviderProps) {
  const value = useViewParam(initialView);
  return (
    <ViewParamContext.Provider value={value}>
      {children}
    </ViewParamContext.Provider>
  );
}

export function useViewParamContext(): UseViewParamReturn {
  const ctx = useContext(ViewParamContext);
  if (!ctx) {
    throw new Error("useViewParamContext must be used within ViewParamProvider");
  }
  return ctx;
}
