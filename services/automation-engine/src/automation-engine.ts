import type { AutomationClock, AutomationJob, AutomationRun } from "./types.js";

const systemClock: AutomationClock = { now: () => new Date() };

export class AutomationEngine {
  constructor(private readonly clock: AutomationClock = systemClock) {}

  shouldRun(job: AutomationJob, now = this.clock.now()): boolean {
    if (!job.enabled) return false;
    if (job.trigger !== "scheduled" || !job.runAt) return false;
    return new Date(job.runAt).getTime() <= now.getTime();
  }

  createRun(job: AutomationJob, idempotencyKey: string): AutomationRun {
    const now = this.clock.now().toISOString();
    return {
      id: crypto.randomUUID(),
      jobId: job.id,
      status: "queued",
      idempotencyKey,
      startedAt: now,
    };
  }

  markRunning(run: AutomationRun): AutomationRun {
    return { ...run, status: "running" };
  }

  complete(run: AutomationRun): AutomationRun {
    return { ...run, status: "succeeded", finishedAt: this.clock.now().toISOString() };
  }

  fail(run: AutomationRun, error: string): AutomationRun {
    return { ...run, status: "failed", error, finishedAt: this.clock.now().toISOString() };
  }
}
