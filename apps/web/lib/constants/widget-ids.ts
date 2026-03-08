/**
 * Widget ID registry for expandable bento widgets.
 * Used for URL sync (?view=<id>), ExpandableWidget widgetId prop, and validation.
 * Per research.md §4: const registry; add entries for new widgets without URL schema changes.
 */

export const WIDGET_IDS = {
  kanban: { id: 'kanban', label: "Today's Game Plan" },
  repository: { id: 'repository', label: 'Discovery Feed' },
  calendar: { id: 'calendar', label: 'Deadline Calendar' },
} as const;

export type WidgetId = keyof typeof WIDGET_IDS;

/** Valid widget ID strings for URL param validation. */
export const WIDGET_ID_VALUES: readonly string[] = Object.values(WIDGET_IDS).map(
  (w) => w.id
) as readonly string[];

/** T018: Validates view param; unknown → null (no error page per FR-014). */
export function isValidWidgetId(
  value: string | null | undefined
): value is (typeof WIDGET_ID_VALUES)[number] {
  if (value == null) return false;
  return (WIDGET_ID_VALUES as readonly string[]).includes(value);
}
