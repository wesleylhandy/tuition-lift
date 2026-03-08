"use client";

/**
 * GamePlanCard — closed widget card for Today's Game Plan.
 * Wireframe: icon, title "Today's Game Plan", subtitle "The Coach's Top Priorities",
 * status pill "N active", content from GamePlan, CTA "View Full Kanban Board >".
 */
import { useState } from "react";
import { Target } from "lucide-react";
import { SectionShell } from "@/components/dashboard/section-shell";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { WidgetStatusPill } from "@/components/dashboard/widget-status-pill";
import { GamePlan } from "./game-plan";
import { WIDGET_IDS } from "@/lib/constants/widget-ids";
import { useViewParamContext } from "@/components/dashboard/view-param-provider";
import type { SectionStatus } from "@/components/dashboard/section-shell";

export interface GamePlanCardProps {
  sectionStatus: SectionStatus;
  expandButton: React.ReactNode;
}

export function GamePlanCard({
  sectionStatus,
  expandButton,
}: GamePlanCardProps) {
  const { expand } = useViewParamContext();
  const [activeCount, setActiveCount] = useState(0);

  const statusPill =
    activeCount > 0 ? (
      <WidgetStatusPill variant="active">{activeCount} active</WidgetStatusPill>
    ) : null;

  return (
    <WidgetCard
      icon={<Target size={18} />}
      title={WIDGET_IDS.kanban.label}
      subtitle="The Coach's Top Priorities"
      statusPill={statusPill}
      expandButton={expandButton}
      expandCta="View Full Kanban Board >"
      onExpandCtaClick={() => expand(WIDGET_IDS.kanban.id)}
      ariaLabel={WIDGET_IDS.kanban.label}
    >
      <SectionShell
        status={sectionStatus}
        skeletonVariant="list"
        title={WIDGET_IDS.kanban.label}
      >
        <GamePlan
          showDebtLifted={false}
          variant="card"
          onDataReady={({ activeCount: n }) => setActiveCount(n)}
        />
      </SectionShell>
    </WidgetCard>
  );
}
