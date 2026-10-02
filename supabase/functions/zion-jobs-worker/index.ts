import { withSupabase } from "npm:@supabase/server@1";

type Job = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

async function processJob(job: Job) {
  switch (job.job_type) {
    case "platform.ping":
      return { ok: true, processed_at: new Date().toISOString(), payload: job.payload };
    default:
      throw new Error(`Unsupported job type: ${job.job_type}`);
  }
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });

    const workerId = `edge:${crypto.randomUUID()}`;
    const { data: jobs, error } = await ctx.supabaseAdmin
      .from("zion_jobs")
      .select("id,job_type,payload,attempts,max_attempts")
      .eq("status", "queued")
      .lte("available_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("queue_read_failed", error);
      return Response.json({ error: "queue_read_failed" }, { status: 500 });
    }

    const results = [];
    for (const job of jobs ?? []) {
      const { data: claimed, error: claimError } = await ctx.supabaseAdmin
        .from("zion_jobs")
        .update({ status: "running", attempts: Number(job.attempts ?? 0) + 1, locked_at: new Date().toISOString(), locked_by: workerId })
        .eq("id", job.id)
        .eq("status", "queued")
        .select("id,attempts,max_attempts")
        .maybeSingle();

      if (claimError || !claimed) continue;

      try {
        const result = await processJob(job as Job);
        const { error: completeError } = await ctx.supabaseAdmin
          .from("zion_jobs")
          .update({ status: "completed", result, last_error: null, locked_at: null, locked_by: null })
          .eq("id", job.id)
          .eq("status", "running")
          .eq("locked_by", workerId);

        if (completeError) throw completeError;
        results.push({ id: job.id, status: "completed" });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        const attempts = Number(claimed.attempts ?? 0);
        const exhausted = attempts >= Number(claimed.max_attempts ?? job.max_attempts ?? 3);
        const update = exhausted
          ? { status: "failed", last_error: message.slice(0, 2000), locked_at: null, locked_by: null }
          : { status: "queued", last_error: message.slice(0, 2000), available_at: new Date(Date.now() + Math.min(300000, 1000 * 2 ** attempts)).toISOString(), locked_at: null, locked_by: null };

        await ctx.supabaseAdmin.from("zion_jobs").update(update).eq("id", job.id).eq("status", "running").eq("locked_by", workerId);
        results.push({ id: job.id, status: exhausted ? "failed" : "requeued" });
      }
    }

    return Response.json({ worker_id: workerId, processed: results.length, results });
  }),
};
