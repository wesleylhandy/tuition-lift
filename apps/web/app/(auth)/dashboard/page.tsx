/**
 * Dashboard — Main Control Center (006 Scholarship Inbox & Dashboard).
 * Bento grid composition in T044; layout structure from T004.
 * US1: Match Inbox wired (T018–T020).
 */
import { BentoGrid, BentoGridItem } from "@/components/dashboard/bento-grid";
import { MatchInbox } from "@/components/dashboard/match-inbox/match-inbox";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8" aria-label="Dashboard">
      <h1 className="sr-only">Dashboard</h1>
      <BentoGrid>
        <BentoGridItem colSpan={4} rowSpan={2}>
          <MatchInbox />
        </BentoGridItem>
      </BentoGrid>
    </main>
  );
}
