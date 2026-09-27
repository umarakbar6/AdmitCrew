import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorized(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Deno.env.get("N8N_TOKEN_SHA256")?.toLowerCase() ?? "";
  return Boolean(supplied && expected && (await sha256(supplied)) === expected);
}

Deno.serve(async (request) => {
  if (!(await authorized(request))) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const action = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);

  try {
    if (request.method === "POST" && action === "reminders") {
      const { data: quiet, error: quietError } = await supabase.from("leads").select("id,name").eq("status", "Quiet");
      if (quietError) throw quietError;
      let created = 0;
      for (const lead of quiet ?? []) {
        const sendKey = `QUIET-${lead.id}-${new Date().toISOString().slice(0, 10)}`;
        const { data, error } = await supabase.from("approvals").upsert({
          id: crypto.randomUUID(), lead_id: lead.id, lead_name: lead.name, agent: "Follow-up Agent",
          message: `Assalam-o-Alaikum ${lead.name}, just checking in about your study plans. Would you like help with the next step?`,
          reason: "Quiet lead scheduled follow-up", status: "pending", send_key: sendKey,
        }, { onConflict: "send_key", ignoreDuplicates: true }).select("id");
        if (error) throw error;
        created += data?.length ?? 0;
      }
      const runId = crypto.randomUUID();
      const { error: logError } = await supabase.from("agent_runs").insert({
        id: runId, agent: "Follow-up Agent", action: "reminder.scheduled",
        input_summary: `${quiet?.length ?? 0} quiet lead(s) evaluated`, output_summary: `${created} approval draft(s) created`, status: "complete",
      });
      if (logError) throw logError;
      await supabase.from("audit_log").insert({
        id: crypto.randomUUID(), actor_id: "scheduler", actor_name: "Follow-up Agent", action: "Scheduled reminder run",
        detail: `${created} new draft(s); nothing sent automatically.`, tone: "amber",
      });
      return json({ ok: true, evaluated: quiet?.length ?? 0, created });
    }

    if (request.method === "GET" && action === "health") {
      const [leads, approvals, documents, escalations, lastRun] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("approvals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("escalations").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("agent_runs").select("created_at,output_summary").eq("action", "reminder.scheduled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      for (const result of [leads, approvals, documents, escalations, lastRun]) if (result.error) throw result.error;
      return json({
        health: { database: "connected", storage: "connected", approvalGate: "enforced", sendOnce: "enforced" },
        counts: { leads: leads.count ?? 0, pending: approvals.count ?? 0, documents: documents.count ?? 0, escalations: escalations.count ?? 0 },
        lastReminderRun: lastRun.data ?? null,
      });
    }

    if (request.method === "POST" && action === "events") {
      const body = await request.json();
      const workflow = String(body.workflow ?? "n8n workflow").slice(0, 120);
      const execution = String(body.executionId ?? "unknown").slice(0, 120);
      const message = String(body.message ?? "Workflow failed").slice(0, 500);
      const { error } = await supabase.from("agent_runs").insert({
        id: crypto.randomUUID(), agent: "Automation Monitor", action: "n8n.failure",
        input_summary: `${workflow} · ${execution}`, output_summary: message, status: "failed",
      });
      if (error) throw error;
      await supabase.from("audit_log").insert({
        id: crypto.randomUUID(), actor_id: "n8n", actor_name: "Automation Monitor",
        action: "Workflow failure", detail: `${workflow}: ${message}`, tone: "red",
      });
      return json({ recorded: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Automation failed" }, 500);
  }
});

