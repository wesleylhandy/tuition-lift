"use client";

/**
 * DashboardBento — bento grid with ExpandableWidget wrappers.
 * Closed widgets use wireframe-aligned cards (GamePlanCard, DiscoveryFeedCard, DeadlineCalendarCard).
 * T019: initialView from server ensures ?view=kanban loads expanded directly.
 */

import { BentoGrid, BentoGridItem } from "@/components/dashboard/bento-grid";
import { ViewParamProvider } from "@/components/dashboard/view-param-provider";
import { ExpandableWidget } from "@/components/dashboard/expandable-widget/expandable-widget";
import { GamePlanCard } from "@/components/dashboard/game-plan/game-plan-card";
import { DiscoveryFeedCard } from "@/components/dashboard/match-inbox/discovery-feed-card";
import { DeadlineCalendarCard } from "@/components/dashboard/deadline-calendar/deadline-calendar-card";
import { KanbanBoard } from "@/components/dashboard/game-plan/kanban-board";
import { ScholarshipRepository } from "@/components/dashboard/match-inbox/scholarship-repository";
import { SeverityHeatmap } from "@/components/dashboard/deadline-calendar/severity-heatmap";
import { WIDGET_IDS } from "@/lib/constants/widget-ids";
import type { SectionStatus } from "@/components/dashboard/section-shell";

export interface DashboardBentoProps {
  sectionStatus: SectionStatus;
  /** T019: Initial expanded widget from URL (validated server-side). */
  initialView?: string | null;
}

export function DashboardBento({ sectionStatus, initialView }: DashboardBentoProps) {
  return (
    <ViewParamProvider initialView={initialView}>
      <BentoGrid className="mb-6">
        <BentoGridItem colSpan={4}>
          <ExpandableWidget
            widgetId={WIDGET_IDS.kanban.id}
            title={WIDGET_IDS.kanban.label}
            dashboardContent={(expandButton) => (
              <GamePlanCard
                sectionStatus={sectionStatus}
                expandButton={expandButton}
              />
            )}
            expandedContent={<KanbanBoard />}
          />
        </BentoGridItem>
        <BentoGridItem colSpan={5}>
          <ExpandableWidget
            widgetId={WIDGET_IDS.repository.id}
            title={WIDGET_IDS.repository.label}
            dashboardContent={(expandButton) => (
              <DiscoveryFeedCard
                sectionStatus={sectionStatus}
                expandButton={expandButton}
              />
            )}
            expandedContent={<ScholarshipRepository />}
          />
        </BentoGridItem>
        <BentoGridItem colSpan={3}>
          <ExpandableWidget
            widgetId={WIDGET_IDS.calendar.id}
            title={WIDGET_IDS.calendar.label}
            dashboardContent={(expandButton) => (
              <DeadlineCalendarCard
                sectionStatus={sectionStatus}
                expandButton={expandButton}
              />
            )}
            expandedContent={<SeverityHeatmap />}
          />
        </BentoGridItem>
      </BentoGrid>
    </ViewParamProvider>
  );
}
