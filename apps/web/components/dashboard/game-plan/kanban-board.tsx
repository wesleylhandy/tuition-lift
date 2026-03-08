"use client";

/**
 * KanbanBoard — expanded view for Today's Game Plan.
 * To Do, In Progress, Done columns; task cards with title, description, deadline, urgency.
 * DnD via @dnd-kit; keyboard support; Coach's Huddle sidebar; optimistic updates.
 * Per contracts/kanban-repository-heatmap.md; T023–T029 [US4].
 */

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CoachesHuddle } from "./coaches-huddle";
import { updateTaskStatus, type KanbanStatus } from "@/lib/actions/update-task-status";

const COLUMNS: { id: KanbanStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

type Urgency = "critical" | "warning" | "safe";

export interface KanbanTask {
  id: string;
  applicationId: string;
  title: string;
  description: string | null;
  status: KanbanStatus;
  deadline: string | null;
  urgency: Urgency;
  coachState: string;
}

interface TrackerApplication {
  applicationId: string;
  scholarshipTitle: string;
  coachState: string;
  deadline: string | null;
}

interface BucketsResponse {
  buckets: Record<string, TrackerApplication[]>;
}

function computeUrgency(deadline: string | null): Urgency {
  if (!deadline) return "safe";
  const d = new Date(deadline);
  const now = new Date();
  const hoursLeft = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursLeft < 48) return "critical";
  if (hoursLeft < 7 * 24) return "warning";
  return "safe";
}

function bucketsToTasks(buckets: BucketsResponse["buckets"]): KanbanTask[] {
  const tasks: KanbanTask[] = [];
  const todoBuckets = ["Tracked", "Drafting", "Review"];
  const inProgressBuckets = ["Submitted", "Outcome Pending"];
  const doneBuckets = ["Won", "Lost"];

  for (const bucket of todoBuckets) {
    for (const app of buckets[bucket] ?? []) {
      tasks.push({
        id: app.applicationId,
        applicationId: app.applicationId,
        title: app.scholarshipTitle,
        description: null,
        status: "todo",
        deadline: app.deadline,
        urgency: computeUrgency(app.deadline),
        coachState: app.coachState,
      });
    }
  }
  for (const bucket of inProgressBuckets) {
    for (const app of buckets[bucket] ?? []) {
      tasks.push({
        id: app.applicationId,
        applicationId: app.applicationId,
        title: app.scholarshipTitle,
        description: null,
        status: "in_progress",
        deadline: app.deadline,
        urgency: computeUrgency(app.deadline),
        coachState: app.coachState,
      });
    }
  }
  for (const bucket of doneBuckets) {
    for (const app of buckets[bucket] ?? []) {
      tasks.push({
        id: app.applicationId,
        applicationId: app.applicationId,
        title: app.scholarshipTitle,
        description: null,
        status: "done",
        deadline: app.deadline,
        urgency: computeUrgency(app.deadline),
        coachState: app.coachState,
      });
    }
  }
  return tasks;
}

const URGENCY_CLASSES: Record<Urgency, string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  safe: "border-l-green-500",
};

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  try {
    return new Date(deadline).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return deadline;
  }
}

function KanbanTaskCard({
  task,
  isOverlay,
}: {
  task: KanbanTask;
  isOverlay?: boolean;
}) {
  const urgencyClass = URGENCY_CLASSES[task.urgency];
  const deadlineStr = formatDeadline(task.deadline);

  return (
    <div
      className={`rounded-md border border-border bg-background px-3 py-2 text-sm transition-shadow ${
        isOverlay ? "shadow-lg" : ""
      }`}
    >
      <div className={`border-l-4 pl-2 ${urgencyClass}`}>
        <p className="font-medium text-foreground">{task.title}</p>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 text-muted-foreground">
            {task.description}
          </p>
        )}
        {deadlineStr && (
          <p className="mt-1 text-xs text-muted-foreground">
            Due {deadlineStr}
          </p>
        )}
      </div>
    </div>
  );
}

function MoveToMenu({
  task,
  onMove,
  disabled,
}: {
  task: KanbanTask;
  onMove: (status: KanbanStatus) => void;
  disabled?: boolean;
}) {
  const targets = COLUMNS.filter((c) => c.id !== task.status);
  if (targets.length === 0) return null;

  return (
    <details className="group peer">
      <summary
        className="flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-navy [&::-webkit-details-marker]:hidden"
        aria-label="Move task to another column"
      >
        <span aria-hidden>⋯</span>
      </summary>
      <div className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-md border border-border bg-background py-1 shadow-md">
        {targets.map((col) => (
          <button
            key={col.id}
            type="button"
            disabled={disabled}
            onClick={() => onMove(col.id)}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none disabled:opacity-50"
          >
            Move to {col.label}
          </button>
        ))}
      </div>
    </details>
  );
}

interface SortableTaskCardProps {
  task: KanbanTask;
  onMoveRequest: (task: KanbanTask, status: KanbanStatus) => void;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  setNodeRef: ReturnType<typeof useSortable>["setNodeRef"];
  transform: ReturnType<typeof useSortable>["transform"];
  transition: ReturnType<typeof useSortable>["transition"];
}

function SortableTaskCard({
  task,
  onMoveRequest,
  listeners,
  attributes,
  setNodeRef,
  transform,
  transition,
}: SortableTaskCardProps) {
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1"
    >
      <div className="min-w-0 flex-1" {...attributes} {...listeners}>
        <KanbanTaskCard task={task} />
      </div>
      <div className="relative shrink-0">
        <MoveToMenu
          task={task}
          onMove={(status) => onMoveRequest(task, status)}
        />
      </div>
    </div>
  );
}

function DroppableColumn({
  columnId,
  label,
  taskIds,
  tasks,
  emptyMessage,
  onMoveRequest,
}: {
  columnId: KanbanStatus;
  label: string;
  taskIds: string[];
  tasks: Map<string, KanbanTask>;
  emptyMessage: string;
  onMoveRequest: (task: KanbanTask, status: KanbanStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] flex-1 flex-col rounded-lg border border-border bg-muted/20 transition-colors ${
        isOver ? "bg-muted/40 ring-2 ring-electric-mint/50" : ""
      }`}
      aria-label={`${label} column`}
    >
      <h3 className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
        {label}
      </h3>
      <SortableContext
        items={taskIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2 p-3 min-h-[120px]">
          {taskIds.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            taskIds.map((id) => {
              const task = tasks.get(id);
              if (!task) return null;
              return (
                <SortableTaskItem
                  key={id}
                  task={task}
                  onMoveRequest={onMoveRequest}
                />
              );
            })
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskItem({
  task,
  onMoveRequest,
}: {
  task: KanbanTask;
  onMoveRequest: (task: KanbanTask, status: KanbanStatus) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  return (
    <SortableTaskCard
      task={task}
      onMoveRequest={onMoveRequest}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
    />
  );
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/applications", {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) setError("Sign in required");
        else setError("Failed to load tasks");
        return;
      }
      const json = (await res.json()) as BucketsResponse;
      setTasks(bucketsToTasks(json.buckets));
    } catch {
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksByColumn = tasks.reduce(
    (acc, t) => {
      if (!acc[t.status]) acc[t.status] = [];
      acc[t.status].push(t);
      return acc;
    },
    {} as Record<KanbanStatus, KanbanTask[]>
  );

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const activeTask = activeId ? taskMap.get(activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const performMove = useCallback(
    async (task: KanbanTask, targetColumn: KanbanStatus) => {
      if (targetColumn === task.status) return;

      setMoveError(null);
      const prevTasks = [...tasks];
      setTasks((prev) => {
        const next = [...prev];
        const idx = next.findIndex((t) => t.id === task.id);
        if (idx === -1) return prev;
        const current = next[idx]!;
        next[idx] = { ...current, status: targetColumn };
        return next;
      });

      const result = await updateTaskStatus(task.applicationId, targetColumn);

      if (
        result.success &&
        "requiresConfirmation" in result &&
        result.requiresConfirmation
      ) {
        setTasks(prevTasks);
        setMoveError(result.message ?? "Confirmation required");
        return;
      }

      if (!result.success) {
        setTasks(prevTasks);
        setMoveError(result.error ?? "Failed to save");
      }
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      const activeTask = taskMap.get(activeId);
      if (!activeTask) return;

      const columnIds = COLUMNS.map((c) => c.id);
      let targetColumn: KanbanStatus | null = null;
      if (columnIds.includes(overId as KanbanStatus)) {
        targetColumn = overId as KanbanStatus;
      } else {
        const overTask = taskMap.get(overId);
        if (overTask) targetColumn = overTask.status;
      }

      if (!targetColumn || targetColumn === activeTask.status) return;

      performMove(activeTask, targetColumn);
    },
    [taskMap, performMove]
  );

  if (loading && tasks.length === 0) {
    return (
      <div className="flex h-full min-h-0 gap-4 overflow-x-auto p-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex min-w-[260px] flex-1 animate-pulse flex-col rounded-lg border border-border bg-muted/20"
          >
            <div className="h-10 border-b border-border" />
            <div className="flex-1 space-y-2 p-3">
              <div className="h-16 rounded bg-muted/50" />
              <div className="h-16 rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:flex-row">
      <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              taskIds={(tasksByColumn[col.id] ?? []).map((t) => t.id)}
              tasks={taskMap}
              emptyMessage={col.id === "todo" ? "No tasks" : "Drag tasks here"}
              onMoveRequest={performMove}
            />
          ))}

          <DragOverlay>
            {activeTask ? <KanbanTaskCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <aside className="w-full shrink-0 border-t border-border pt-4 md:w-64 md:border-t-0 md:border-l md:pl-4 md:pt-0">
        <CoachesHuddle />
      </aside>

      {moveError && (
        <div
          className="fixed bottom-4 left-4 right-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive md:left-auto md:right-4 md:max-w-sm"
          role="alert"
        >
          {moveError}
          <button
            type="button"
            onClick={() => setMoveError(null)}
            className="ml-2 font-medium underline focus:outline-none focus:ring-2 focus:ring-electric-mint"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
