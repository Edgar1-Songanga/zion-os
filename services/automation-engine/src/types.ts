export type AutomationTrigger = "scheduled" | "event" | "manual";

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

export interface AutomationClock {
  now(): Date;
}
