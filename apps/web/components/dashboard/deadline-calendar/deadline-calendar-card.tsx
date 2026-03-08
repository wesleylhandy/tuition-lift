"use client";

/**
 * DeadlineCalendarCard — closed widget card for Deadline Calendar.
 * Wireframe: icon, title "Deadline Calendar", subtitle "Your submission timeline",
 * status pill "Urgent" or "On track", mini calendar + upcoming list.
 */
import { useState } from "react";
import { Calendar } from "lucide-react";
import { SectionShell } from "@/components/dashboard/section-shell";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { WidgetStatusPill } from "@/components/dashboard/widget-status-pill";
import { DeadlineCalendarCompact } from "./deadline-calendar-compact";
import { WIDGET_IDS } from "@/lib/constants/widget-ids";
import type { SectionStatus } from "@/components/dashboard/section-shell";

export interface DeadlineCalendarCardProps {
  sectionStatus: SectionStatus;
  expandButton: React.ReactNode;
}

export function DeadlineCalendarCard({
  sectionStatus,
  expandButton,
}: DeadlineCalendarCardProps) {
  const [hasUrgent, setHasUrgent] = useState(false);

  const statusPill = (
    <WidgetStatusPill variant={hasUrgent ? "urgent" : "active"}>
      {hasUrgent ? "Urgent" : "On track"}
    </WidgetStatusPill>
  );

  return (
    <WidgetCard
      icon={<Calendar size={18} />}
      title={WIDGET_IDS.calendar.label}
      subtitle="Your submission timeline"
      statusPill={statusPill}
      expandButton={expandButton}
      ariaLabel={WIDGET_IDS.calendar.label}
    >
      <SectionShell
        status={sectionStatus}
        skeletonVariant="calendar"
        title={WIDGET_IDS.calendar.label}
      >
        <DeadlineCalendarCompact
          onStatusReady={({ hasUrgent: urgent }) => setHasUrgent(urgent)}
        />
      </SectionShell>
    </WidgetCard>
  );
}
