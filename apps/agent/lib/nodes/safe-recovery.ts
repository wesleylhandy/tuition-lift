/**
 * SafeRecovery node: Coach persona notifies user of error; transitions to END.
 * T029: Full implementation with notification.
 * Placeholder until T029.
 * @see data-model.md, plan.md
 */
import type { TuitionLiftStateType } from "../state.js";

export async function safeRecoveryPlaceholder(
  state: TuitionLiftStateType
): Promise<Partial<TuitionLiftStateType>> {
  return { last_active_node: "SafeRecovery" };
}
