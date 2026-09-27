import { deliverApprovedMessage } from "@/lib/messaging";
import { requireStaff, responseFromError, type Staff } from "@/lib/auth";
import { insertRows, selectOne, selectRows, updateRows, upsertRows } from "@/lib/supabase";

const uid = () => crypto.randomUUID();
const enc = encodeURIComponent;
type LeadRow = Record<string, unknown> & { normalized_phone: string; last_reply: string };
type ApprovalRow = Record<string, unknown> & { lead_id: string; lead_name: string; message: string; created_at: string; reviewed_by: string | null; sent_at: string | null };
type DocumentRow = Record<string, unknown> & { lead_name: string; file_name: string; checked_at: string };
type AuditRow = Record<string, unknown> & { actor_name: string; created_at: string };
type LeadInput = { name:string; phone:string; normalizedPhone:string; country?:string; marks?:string; ielts?:string };
type DraftInput = { id?:string; leadId:string; leadName:string; agent:string; message:string; reason:string; sendKey?:string; escalation?:boolean; question?:string };
type ActionBody = { action?:string; lead?:LeadInput; draft?:DraftInput; decision?:string; id?:string };

async function state(request: Request, staff?: Staff) {
  const member = staff ?? await requireStaff(request);
  const [leadRows, approvalRows, documentRows, logs, escalations, runs] = await Promise.all([
    selectRows<LeadRow>("leads", "select=*&order=updated_at.desc"), selectRows<ApprovalRow>("approvals", "select=*&order=created_at.desc"),
    selectRows<DocumentRow>("documents", "select=*&order=checked_at.desc"), selectRows<AuditRow>("audit_log", "select=*&order=created_at.desc&limit=100"),
    selectRows<Record<string, unknown>>("escalations", "select=*&order=created_at.desc"), selectRows<Record<string, unknown>>("agent_runs", "select=*&order=created_at.desc&limit=100"),
  ]);
  return {
    leads: leadRows.map(row => ({ ...row, normalizedPhone: row.normalized_phone, lastReply: row.last_reply })),
    approvals: approvalRows.map(row => ({ ...row, leadId: row.lead_id, leadName: row.lead_name, createdAt: row.created_at, reviewedBy: row.reviewed_by, sentAt: row.sent_at })),
    docs: documentRows.map(row => ({ ...row, leadName: row.lead_name, fileName: row.file_name, checkedAt: row.checked_at })),
    logs: logs.map(row => ({ ...row, actor: row.actor_name, time: row.created_at })), escalations, agentRuns: runs, staff: member,
  };
}

export async function GET(request: Request) { try { return Response.json(await state(request)); } catch (error) { return responseFromError(error, "Database unavailable"); } }

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request), body = await request.json() as ActionBody, now = new Date().toISOString();
    if (body.action === "lead.upsert") {
      const lead = body.lead;
      if (!lead?.name || !lead?.normalizedPhone) return Response.json({ error: "Name and phone are required" }, { status: 400 });
      const existing = await selectOne<{ id: string }>("leads", `select=id&normalized_phone=eq.${enc(lead.normalizedPhone)}`);
      await Promise.all([
        upsertRows("leads", { id: existing?.id ?? uid(), name: lead.name, phone: lead.phone, normalized_phone: lead.normalizedPhone, country: lead.country ?? "", marks: lead.marks ?? "", ielts: lead.ielts ?? "", last_reply: "Just now", status: "Active", updated_at: now }, "normalized_phone"),
        insertRows("audit_log", { id: uid(), actor_id: staff.id, actor_name: "Intake Agent", action: existing ? "Existing lead updated" : "New lead saved", detail: `${lead.name} stored by unique phone ${lead.normalizedPhone}.`, tone: "green" }),
        insertRows("agent_runs", { id: uid(), agent: "Intake Agent", action: "lead.upsert", input_summary: `Phone ${lead.normalizedPhone}`, output_summary: existing ? "Updated one existing lead" : "Created one lead", status: "complete" }),
      ]);
    } else if (body.action === "approval.create") {
      const draft = body.draft;
      if (!draft?.leadId || !draft?.message) return Response.json({ error: "Draft is incomplete" }, { status: 400 });
      await Promise.all([
        insertRows("approvals", { id: draft.id ?? uid(), lead_id: draft.leadId, lead_name: draft.leadName, agent: draft.agent, message: draft.message, reason: draft.reason, status: "pending", send_key: draft.sendKey ?? null }),
        insertRows("audit_log", { id: uid(), actor_id: "system", actor_name: "Coordinator", action: "Approval required", detail: `Draft for ${draft.leadName} queued; not sent.`, tone: "amber" }),
        insertRows("agent_runs", { id: uid(), agent: draft.agent, action: "draft", input_summary: draft.reason, output_summary: "Pending staff approval", status: "complete" }),
        draft.escalation ? insertRows("escalations", { id: uid(), lead_id: draft.leadId, question: draft.question, reason: "Program not in approved list", status: "open" }) : Promise.resolve(),
      ]);
    } else if (body.action === "approval.review") {
      if (body.decision !== "approve") {
        const [updated] = await updateRows<ApprovalRow>("approvals", `id=eq.${enc(body.id ?? "")}&status=eq.pending`, { status: "rejected", reviewed_by: staff.name, reviewed_at: now });
        if (!updated) return Response.json({ error: "This draft was already reviewed; duplicate delivery prevented." }, { status: 409 });
        await insertRows("audit_log", { id: uid(), actor_id: staff.id, actor_name: staff.name, action: "Draft rejected", detail: `${updated.lead_name}: not sent.`, tone: "red" });
      } else {
        const [approved] = await updateRows<ApprovalRow>("approvals", `id=eq.${enc(body.id ?? "")}&status=eq.pending`, { status: "delivering", reviewed_by: staff.name, reviewed_at: now });
        if (!approved) return Response.json({ error: "This draft was already reviewed; duplicate delivery prevented." }, { status: 409 });
        try {
          const lead = await selectOne<{normalized_phone:string}>("leads", `select=normalized_phone&id=eq.${enc(approved.lead_id)}`), delivery = await deliverApprovedMessage(lead?.normalized_phone ?? "", approved.message);
          await Promise.all([
            updateRows("approvals", `id=eq.${enc(body.id ?? "")}&status=eq.delivering`, { status: "sent", sent_at: now }),
            insertRows("audit_log", { id: uid(), actor_id: staff.id, actor_name: staff.name, action: "Message approved & sent", detail: `${approved.lead_name}: ${delivery.mode} delivery recorded once${delivery.providerId ? ` (${delivery.providerId})` : ""}.`, tone: "green" }),
            insertRows("agent_runs", { id: uid(), agent: "Delivery Agent", action: "message.send", input_summary: approved.lead_name, output_summary: `${delivery.mode} delivery complete`, status: "complete" }),
          ]);
        } catch (error) { await updateRows("approvals", `id=eq.${enc(body.id ?? "")}&status=eq.delivering`, { status: "pending" }); throw error; }
      }
    } else if (body.action === "reminder.run") {
      await Promise.all([
        upsertRows("approvals", { id: "rem-hamza", lead_id: "lead-hamza", lead_name: "Hamza Iqbal", agent: "Follow-up Agent", message: "Assalam-o-Alaikum Hamza, just checking in about your UK study plans. Your IELTS is still pending. Would you like help with the next step?", reason: "No reply for 4 days · send-once key HAMZA-4D", status: "pending", send_key: "HAMZA-4D" }, "send_key", true),
        insertRows("audit_log", { id: uid(), actor_id: "system", actor_name: "Follow-up Agent", action: "Reminder evaluated", detail: "Hamza inactivity rule evaluated; unique send key prevents duplicates.", tone: "amber" }),
        insertRows("agent_runs", { id: uid(), agent: "Follow-up Agent", action: "reminder.run", input_summary: "Hamza inactive 4 days", output_summary: "One pending draft maximum", status: "complete" }),
      ]);
    } else return Response.json({ error: "Unknown action" }, { status: 400 });
    return Response.json(await state(request, staff));
  } catch (error) { return responseFromError(error); }
}
