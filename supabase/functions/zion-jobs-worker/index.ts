import { withSupabase } from "npm:@supabase/server@1";

type Job = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};

async function hashText(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function translateText(apiKey: string, model: string, source: string, target: string, text: string, contentType: string) {
  const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: `Translate ZION OS content from ${source} to ${target}. Preserve placeholders, URLs, Bible references, names and markup tokens. Do not invent facts or doctrine. Content type: ${contentType}. Return only the translation.` },
        { role: "user", content: text },
      ],
    }),
  });
  const raw = await response.text();
  let payload: any = null;
  try { payload = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error(`translation_provider_http_${response.status}`);
  const textResult = payload?.choices?.[0]?.message?.content;
  if (typeof textResult !== "string" || !textResult.trim()) throw new Error("translation_provider_empty");
  return textResult.trim();
}

async function processJob(job: Job, supabaseAdmin: any) {
  switch (job.job_type) {
    case "platform.ping":
      return { ok: true, processed_at: new Date().toISOString(), payload: job.payload };

    case "automation.evaluate_event": {
      const eventId = String(job.payload.event_id ?? "");
      if (!eventId) throw new Error("automation_event_id_required");
      const { data: event, error } = await supabaseAdmin.from("zion_domain_events")
        .select("id,event_type,actor_user_id,payload").eq("id", eventId).maybeSingle();
      if (error) throw error;
      if (!event) throw new Error("domain_event_not_found");

      const { data: rules, error: rulesError } = await supabaseAdmin.from("zion_automation_rules")
        .select("id,event_type,action_type,enabled,priority,conditions,action_payload,approval_required")
        .eq("event_type", event.event_type).eq("enabled", true).order("priority", { ascending: true });
      if (rulesError) throw rulesError;

      const queued = [];
      for (const rule of rules ?? []) {
        const matches = Object.entries(rule.conditions ?? {}).every(([key, expected]) =>
          JSON.stringify((event.payload ?? {})[key]) === JSON.stringify(expected)
        );
        if (!matches || rule.approval_required) continue;

        const idempotencyKey = `automation:${event.id}:${rule.id}`;
        const { data: existing } = await supabaseAdmin.from("zion_jobs")
          .select("id,status").eq("idempotency_key", idempotencyKey).maybeSingle();
        if (existing) { queued.push({ rule_id: rule.id, status: "already_queued" }); continue; }

        const { data: child, error: childError } = await supabaseAdmin.from("zion_jobs").insert({
          job_type: rule.action_type,
          payload: { event_id: event.id, event_type: event.event_type, actor_user_id: event.actor_user_id, event_payload: event.payload, ...rule.action_payload },
          idempotency_key: idempotencyKey,
          created_by: event.actor_user_id,
        }).select("id").single();
        if (childError) throw childError;
        queued.push({ rule_id: rule.id, job_id: child.id });
      }

      await supabaseAdmin.from("zion_domain_events")
        .update({ status: "processed", processed_at: new Date().toISOString(), last_error: null }).eq("id", event.id);
      return { event_id: event.id, queued };
    }

    case "analytics.record": {
      const { error } = await supabaseAdmin.from("zion_analytics_events").insert({
        event_name: String(job.payload.event_type ?? "automation.action"),
        actor_user_id: typeof job.payload.actor_user_id === "string" ? job.payload.actor_user_id : null,
        entity_type: typeof job.payload.entity_type === "string" ? job.payload.entity_type : null,
        entity_id: typeof job.payload.entity_id === "string" ? job.payload.entity_id : null,
        properties: job.payload.event_payload ?? job.payload,
      });
      if (error) throw error;
      return { recorded: true };
    }

    case "notification.dispatch":
    case "spiritual.reminder": {
      const userId = String(job.payload.user_id ?? job.payload.actor_user_id ?? "");
      if (!userId) throw new Error("notification_user_id_required");
      const { data, error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: String(job.payload.type ?? job.job_type),
        title: String(job.payload.title ?? "ZION OS"),
        body: String(job.payload.body ?? "Há uma nova atualização para si."),
        channel: String(job.payload.channel ?? "in_app"),
        priority: String(job.payload.priority ?? "normal"),
        data: job.payload.data ?? {},
      }).select("id").single();
      if (error) throw error;
      return { notification_id: data.id };
    }

    case "translation.prefetch": {
      const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
      const model = Deno.env.get("TRANSLATION_MODEL");
      if (!apiKey || !model) throw new Error("translation_provider_not_configured");
      const source = String(job.payload.source_locale ?? "pt-AO");
      const targets = Array.isArray(job.payload.target_locales) ? job.payload.target_locales.map(String) : [];
      const text = String(job.payload.text ?? "");
      const contentType = String(job.payload.content_type ?? "dynamic");
      if (!text || !targets.length) throw new Error("translation_payload_incomplete");
      const sourceHash = await hashText(text);
      const translated = [];
      for (const target of targets) {
        if (target === source) continue;
        const result = await translateText(apiKey, model, source, target, text, contentType);
        const { error } = await supabaseAdmin.from("zion_translation_cache").upsert({
          source_locale: source, target_locale: target, content_type: contentType,
          source_hash: sourceHash, source_text: text, translated_text: result,
          provider: "vercel-ai-gateway",
        }, { onConflict: "source_locale,target_locale,content_type,source_hash" });
        if (error) throw error;
        translated.push(target);
      }
      return { source_locale: source, translated };
    }

    case "workflow.continue":
      return { status: "awaiting_workflow_handler", payload: job.payload };

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
        .update({
          status: "running",
          attempts: Number(job.attempts ?? 0) + 1,
          locked_at: new Date().toISOString(),
          locked_by: workerId,
        })
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
          : {
              status: "queued",
              last_error: message.slice(0, 2000),
              available_at: new Date(Date.now() + Math.min(300000, 1000 * 2 ** attempts)).toISOString(),
              locked_at: null,
              locked_by: null,
            };

        await ctx.supabaseAdmin
          .from("zion_jobs")
          .update(update)
          .eq("id", job.id)
          .eq("status", "running")
          .eq("locked_by", workerId);
        results.push({ id: job.id, status: exhausted ? "failed" : "requeued" });
      }
    }

    return Response.json({ worker_id: workerId, processed: results.length, results });
  }),
};
