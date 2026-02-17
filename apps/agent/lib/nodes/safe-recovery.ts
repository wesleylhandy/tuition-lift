/**
 * SafeRecovery node: Coach persona notifies user of error; transitions to END.
 * T029: Full implementation with notification.
 * Placeholder until T029.
 * @see data-model.md, plan.md
 */
import type { TuitionLiftStateType } from "../state";

export async function safeRecoveryPlaceholder(
  state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType>> {
  void state; // Placeholder; T029 will use state for Coach notification
  return { last_active_node: "SafeRecovery" };
}
