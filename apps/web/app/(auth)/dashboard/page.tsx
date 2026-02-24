/**
 * Dashboard — Premium Academic shell (010 Bento Shell).
 * GlobalHeader, WelcomeAreaShell, BentoGrid (Game Plan, Discovery Feed, Deadline Calendar), StatsRowShell.
 * All sections show loading skeletons per US1; ReconnectionIndicator omitted for 010.
 */
import { GlobalHeader } from "@/components/dashboard/global-header";
import { WelcomeAreaShell } from "@/components/dashboard/welcome-area-shell";
import { StatsRowShell } from "@/components/dashboard/stats-row-shell";
import { DeadlineCalendarShell } from "@/components/dashboard/deadline-calendar-shell";
import { BentoGrid, BentoGridItem } from "@/components/dashboard/bento-grid";
import { SectionShell } from "@/components/dashboard/section-shell";
import { GamePlan } from "@/components/dashboard/game-plan/game-plan";
import { MatchInbox } from "@/components/dashboard/match-inbox/match-inbox";

export default function DashboardPage() {
  const sectionStatus = "loading" as const;

  return (
    <div className="min-h-screen bg-off-white font-body">
      <GlobalHeader />
      <main
        className="p-4 sm:p-6 lg:p-8"
        aria-label="Dashboard"
      >
        <h1 className="sr-only font-heading">Dashboard</h1>

        <section className="mb-6">
          <WelcomeAreaShell status={sectionStatus} />
        </section>

        <BentoGrid className="mb-6">
          <BentoGridItem colSpan={4}>
            <SectionShell
              status={sectionStatus}
              skeletonVariant="list"
              title="Today's Game Plan"
            >
              <GamePlan showDebtLifted={false} />
            </SectionShell>
          </BentoGridItem>
          <BentoGridItem colSpan={5}>
            <SectionShell
              status={sectionStatus}
              skeletonVariant="card"
              title="Discovery Feed"
            >
              <MatchInbox />
            </SectionShell>
          </BentoGridItem>
          <BentoGridItem colSpan={3}>
            <DeadlineCalendarShell status={sectionStatus} />
          </BentoGridItem>
        </BentoGrid>

        <StatsRowShell status={sectionStatus} />
      </main>
    </div>
  );
}
