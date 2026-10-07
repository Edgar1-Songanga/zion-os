import type { AutomationAction, AutomationPlan, AutomationSignal } from "./types.js";

const supportedActions = new Set<AutomationAction>([
  "notification.dispatch",
  "spiritual.reminder",
  "translation.prefetch",
  "analytics.record",
  "workflow.continue",
]);

function key(signal: AutomationSignal, action: AutomationAction): string {
  return `${signal.type}:${signal.subjectId ?? "global"}:${action}`;
}

export class AutomationPolicyEngine {
  plan(signal: AutomationSignal): AutomationPlan {
    const actions: AutomationPlan["actions"] = [];

    if (signal.type === "spiritual.growth.completed") {
      actions.push({
        type: "analytics.record",
        payload: { signal: signal.type, subjectId: signal.subjectId },
        idempotencyKey: key(signal, "analytics.record"),
      });
    }

    if (signal.type === "spiritual.reminder.due") {
      actions.push({
        type: "spiritual.reminder",
        payload: signal.payload,
        idempotencyKey: key(signal, "spiritual.reminder"),
      });
    }

    if (signal.type === "content.published") {
      actions.push({
        type: "translation.prefetch",
        payload: signal.payload,
        idempotencyKey: key(signal, "translation.prefetch"),
      });
    }

    if (signal.type === "workflow.approval.required") {
      return {
        decision: "require_approval",
        reason: "The workflow requires an explicit human approval gate.",
        actions: [],
      };
    }

    return {
      decision: actions.length ? "run" : "ignore",
      reason: actions.length
        ? "A deterministic policy matched the signal."
        : "No registered policy matched the signal.",
      actions: actions.filter((action: AutomationPlan["actions"][number]) => supportedActions.has(action.type)),
    };
  }
}
