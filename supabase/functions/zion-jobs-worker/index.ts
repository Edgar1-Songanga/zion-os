import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Job = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function processJob(job: Job) {
  switch (job.job_type) {
    case "platform.ping":
      return { ok: true, processed_at: new Date().toISOString(), payload: job.payload };
    default:
      throw new Error(`Unsupported job type: ${job.job_type}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "content-type": "application/json" } });
  }

  const workerId = `edge:${crypto.randomUUID()}`;
  const { data: jobs, error } = await supabase
    .from("zion_jobs")
    .select("id,job_type,payload,attempts,max_attempts")
    .eq("status", "queued")
    .lte("available_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("queue_read_failed", error);
    return new Response(JSON.stringify({ error: "queue_read_failed" }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const results = [];
  for (const job of jobs ?? []) {
    const { data: claimed, error: claimError } = await supabase
      .from("zion_jobs")
      .update({ status: "running", attempts: Number(job.attempts ?? 0) + 1, locked_at: new Date().toISOString(), locked_by: workerId })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id,attempts,max_attempts")
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      const result = await processJob(job as Job);
      const { error: completeError } = await supabase
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

      await supabase.from("zion_jobs").update(update).eq("id", job.id).eq("status", "running").eq("locked_by", workerId);
      results.push({ id: job.id, status: exhausted ? "failed" : "requeued" });
    }
  }

  return new Response(JSON.stringify({ worker_id: workerId, processed: results.length, results }), { status: 200, headers: { "content-type": "application/json" } });
});
