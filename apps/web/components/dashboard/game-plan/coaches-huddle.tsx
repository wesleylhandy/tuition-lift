"use client";

/**
 * Coach's Huddle — sidebar with tips, reminders, encouragement (Coach persona).
 * Per contracts/kanban-repository-heatmap.md; T026 [US4].
 * Uses static tips initially; live Coach integration deferred.
 */

const TIPS = [
  "Small steps today beat big plans tomorrow. Pick one task and start.",
  "Deadline in 48 hours? Focus on that first—momentum matters.",
  "You've got this. One application at a time adds up.",
  "Take a 5-minute break if you're stuck. Fresh eyes help.",
  "Celebrate small wins. Finished a draft? That counts.",
  "Stuck on one? Skip it and come back. Progress beats perfection.",
];

function getTipOfTheMoment(): string {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const tip = TIPS[day % TIPS.length];
  return tip != null ? tip : TIPS[0]!;
}

export interface CoachesHuddleProps {
  /** Optional custom tip; when absent, uses rotation. */
  tip?: string | null;
  className?: string;
}

export function CoachesHuddle({ tip, className = "" }: CoachesHuddleProps) {
  const displayTip: string = tip ?? getTipOfTheMoment();

  return (
    <aside
      className={`flex flex-col gap-3 ${className}`}
      aria-label="Coach's Huddle"
    >
      <h3 className="font-heading text-sm font-semibold text-navy">
        Coach&apos;s Huddle
      </h3>
      <p className="text-sm text-muted-foreground">{displayTip}</p>
      <p className="text-xs text-muted-foreground/80">
        Move tasks between columns as you make progress. Your wins add up!
      </p>
    </aside>
  );
}
