"use client";

/**
 * Top Three Tasks — displays up to 3 applications ordered by momentum_score.
 * Per FR-006; T021 [US2].
 */
export interface TopThreeTask {
  applicationId: string;
  scholarshipTitle: string;
  momentumScore: number;
  deadline: string | null;
  coachState: string;
  suggestion: string;
}

export interface TopThreeTasksProps {
  tasks: TopThreeTask[];
  className?: string;
}

function formatDeadline(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  try {
    const d = new Date(deadline);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return deadline;
  }
}

export function TopThreeTasks({ tasks, className = "" }: TopThreeTasksProps) {
  if (tasks.length === 0) return null;

  return (
    <ul
      className={`grid gap-3 ${className}`}
      role="list"
      aria-label="Top 3 tasks"
    >
      {tasks.map((task, i) => {
        const deadlineStr = formatDeadline(task.deadline);
        return (
          <li
            key={task.applicationId}
            className="rounded-lg border bg-card p-3 shadow-sm"
            role="listitem"
          >
            <div className="flex items-start gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-electric-mint/20 font-heading text-sm font-semibold text-navy"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {task.scholarshipTitle}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {task.suggestion}
                </p>
                {deadlineStr && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due {deadlineStr}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
