import { env } from "cloudflare:workers";
import { requireStaff, responseFromError } from "@/lib/auth";
import { whatsappConfigured } from "@/lib/messaging";
import { automationAuthorized } from "@/lib/automation-auth";
import { countRows, deleteRows, insertRows, selectOne, selectRows, storageDelete, supabaseConfigured, upsertRows } from "@/lib/supabase";

const uid = () => crypto.randomUUID();
type LastRun = { created_at: string; output_summary: string };
type OperationBody = { action?: string; id?: unknown; email?: unknown; name?: unknown; role?: unknown; days?: unknown };

export async function GET(request: Request) {
  try {
    const machine = await automationAuthorized(request), staff = machine ? null : await requireStaff(request);
    const [leads, pending, documents, escalations, lastRun] = await Promise.all([
      countRows("leads"), countRows("approvals", "status=eq.pending"), countRows("documents"), countRows("escalations", "status=eq.open"),
      selectOne<LastRun>("agent_runs", "select=created_at,output_summary&action=eq.reminder.scheduled&order=created_at.desc"),
    ]);
    return Response.json({
      staff,
      health: { database: "connected", storage: "connected", approvalGate: "enforced", sendOnce: "enforced" },
      integrations: { supabase: supabaseConfigured(), openai: Boolean(env.OPENAI_API_KEY), openaiStatus: env.OPENAI_STATUS || "unknown", whatsapp: whatsappConfigured(), scheduler: Boolean(env.CRON_SECRET || env.N8N_TOKEN_SHA256) },
      counts: { leads, pending, documents, escalations },
      lastReminderRun: lastRun ? { createdAt: lastRun.created_at, output: lastRun.output_summary } : null,
    });
  } catch (error) { return responseFromError(error, "Health check failed"); }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request, ["admin"]), body = await request.json() as OperationBody;
    if (body.action === "staff.add") {
      const id = String(body.id ?? "").trim(), email = String(body.email ?? "").trim(), name = String(body.name ?? email).trim(), role = body.role === "admin" ? "admin" : "counselor";
      if (!id || !email) return Response.json({ error: "Staff id and email are required" }, { status: 400 });
      await Promise.all([
        upsertRows("staff_users", { id, email, name, role }, "id"),
        insertRows("audit_log", { id: uid(), actor_id: staff.id, actor_name: staff.name, action: "Staff access updated", detail: `${email}: ${role}`, tone: "amber" }),
      ]);
      return Response.json({ ok: true });
    }
    if (body.action === "data.export") {
      const [leads, approvals, documents, logs] = await Promise.all([selectRows("leads"), selectRows("approvals"), selectRows("documents", "select=id,lead_name,file_name,type,status,reason,details,confidence,checked_at"), selectRows("audit_log", "select=*&order=created_at.desc")]);
      await insertRows("audit_log", { id: uid(), actor_id: staff.id, actor_name: staff.name, action: "Data exported", detail: "Administrative JSON backup created.", tone: "blue" });
      return Response.json({ exportedAt: new Date().toISOString(), leads, approvals, documents, auditLog: logs }, { headers: { "content-disposition": `attachment; filename="admitcrew-backup-${new Date().toISOString().slice(0, 10)}.json"` } });
    }
    if (body.action === "privacy.purge") {
      const days = Math.max(30, Math.min(3650, Number(body.days) || 365)), cutoff = new Date(Date.now() - days * 86400000).toISOString();
      const rows = await selectRows<{ id: string; storage_key: string }>("documents", `select=id,storage_key&checked_at=lt.${encodeURIComponent(cutoff)}`);
      await storageDelete("admitcrew-documents", rows.map(row => row.storage_key));
      await Promise.all([
        deleteRows("documents", `checked_at=lt.${encodeURIComponent(cutoff)}`),
        insertRows("audit_log", { id: uid(), actor_id: staff.id, actor_name: staff.name, action: "Retention purge", detail: `${rows.length} document(s) older than ${days} days removed.`, tone: "amber" }),
      ]);
      return Response.json({ ok: true, removed: rows.length, days });
    }
    return Response.json({ error: "Unknown operation" }, { status: 400 });
  } catch (error) { return responseFromError(error); }
}
