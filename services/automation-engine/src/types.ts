export type AutomationTrigger = "scheduled" | "event" | "manual";

export type AutomationAction =
  | "notification.dispatch"
  | "spiritual.reminder"
  | "translation.prefetch"
  | "analytics.record"
  | "workflow.continue";

export type AutomationDecision = "run" | "defer" | "ignore" | "require_approval";

export interface AutomationJob {
  id: string;
  tenantId: string;
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  runAt?: string;
  eventType?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  idempotencyKey: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface AutomationSignal {
  type: string;
  tenantId: string;
  subjectId?: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface AutomationPlan {
  decision: AutomationDecision;
  reason: string;
  actions: Array<{
    type: AutomationAction;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    availableAt?: string;
  }>;
}

export interface AutomationClock {
  now(): Date;
}
