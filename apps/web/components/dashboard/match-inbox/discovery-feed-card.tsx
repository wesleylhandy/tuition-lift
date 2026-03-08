"use client";

/**
 * DiscoveryFeedCard — closed widget card for Discovery Feed.
 * Wireframe: icon, title "Discovery Feed", subtitle "AI-matched scholarships for you",
 * status pill "N matches", scrollable match cards.
 */
import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { SectionShell } from "@/components/dashboard/section-shell";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { WidgetStatusPill } from "@/components/dashboard/widget-status-pill";
import { MatchInbox } from "./match-inbox";
import { WIDGET_IDS } from "@/lib/constants/widget-ids";
import type { SectionStatus } from "@/components/dashboard/section-shell";

export interface DiscoveryFeedCardProps {
  sectionStatus: SectionStatus;
  expandButton: React.ReactNode;
}

export function DiscoveryFeedCard({
  sectionStatus,
  expandButton,
}: DiscoveryFeedCardProps) {
  const [matchCount, setMatchCount] = useState(0);

  const statusPill =
    matchCount > 0 ? (
      <WidgetStatusPill variant="matches">{matchCount} matches</WidgetStatusPill>
    ) : null;

  return (
    <WidgetCard
      icon={<GraduationCap size={18} />}
      title={WIDGET_IDS.repository.label}
      subtitle="AI-matched scholarships for you"
      statusPill={statusPill}
      expandButton={expandButton}
      ariaLabel={WIDGET_IDS.repository.label}
    >
      <div className="max-h-[380px] min-h-0 overflow-y-auto">
        <SectionShell
          status={sectionStatus}
          skeletonVariant="card"
          title={WIDGET_IDS.repository.label}
        >
          <MatchInbox
            variant="card"
            onMatchCountReady={setMatchCount}
          />
        </SectionShell>
      </div>
    </WidgetCard>
  );
}
