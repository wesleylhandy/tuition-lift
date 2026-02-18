/**
 * Dashboard — Main Control Center (006 Scholarship Inbox & Dashboard).
 * Bento grid composition in T044; layout structure from T004.
 * US1: Match Inbox wired (T018–T020). US2: Game Plan wired (T024–T025).
 */
import { BentoGrid, BentoGridItem } from "@/components/dashboard/bento-grid";
import { MatchInbox } from "@/components/dashboard/match-inbox/match-inbox";
import { GamePlan } from "@/components/dashboard/game-plan/game-plan";
import { ApplicationTracker } from "@/components/dashboard/application-tracker/application-tracker";

export default function DashboardPage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden bg-off-white p-4 sm:p-6 lg:p-8 font-body"
      aria-label="Dashboard"
    >
      <h1 className="sr-only font-heading">Dashboard</h1>
      <BentoGrid>
        <BentoGridItem colSpan={4} rowSpan={2}>
          <MatchInbox />
        </BentoGridItem>
        <BentoGridItem colSpan={2} rowSpan={2}>
          <GamePlan />
        </BentoGridItem>
        <BentoGridItem colSpan={4} rowSpan={2}>
          <ApplicationTracker />
        </BentoGridItem>
      </BentoGrid>
    </main>
  );
}
