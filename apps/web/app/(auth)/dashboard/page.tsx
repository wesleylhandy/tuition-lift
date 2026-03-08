/**
 * Dashboard — Premium Academic shell (010 Bento Shell).
 * GlobalHeader, WelcomeAreaShell, BentoGrid (Game Plan, Discovery Feed, Deadline Calendar), StatsRowShell.
 * All sections show loading skeletons per US1; ReconnectionIndicator omitted for 010.
 * T016: Bento uses useViewParam for expand/collapse; T019: initialView for shareable links.
 */
import { GlobalHeader } from "@/components/dashboard/global-header";
import { WelcomeAreaShell } from "@/components/dashboard/welcome-area-shell";
import { StatsRowShell } from "@/components/dashboard/stats-row-shell";
import { DashboardBento } from "@/components/dashboard/dashboard-bento";
import { isValidWidgetId } from "@/lib/constants/widget-ids";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sectionStatus = "content" as const;
  const params = await searchParams;
  const initialView = isValidWidgetId(params.view) ? params.view : null;

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-off-white font-body">
      <GlobalHeader />
      <main
        className="p-4 sm:p-6 lg:p-8"
        aria-label="Dashboard"
      >
        <h1 className="sr-only font-heading">Dashboard</h1>

        <section className="mb-6">
          <WelcomeAreaShell status={sectionStatus} />
        </section>

        <DashboardBento sectionStatus={sectionStatus} initialView={initialView} />

        <StatsRowShell status={sectionStatus} />
      </main>
    </div>
  );
}
