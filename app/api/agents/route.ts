import { draftProgramAnswer } from "@/lib/openai";
import { safetyReview } from "@/lib/agents";
import type { Program } from "@/lib/seed";
import { requireStaff, responseFromError } from "@/lib/auth";
import { insertRows, selectRows } from "@/lib/supabase";

const uid = () => crypto.randomUUID();
const decline = "I can only help with study-abroad admissions questions. For anything else, please contact the appropriate service.";
const unknown = "I don’t have that university in the office’s approved list, so I won’t guess. I’ve passed your question to staff for review.";
type ProgramRow = { id:string; university:string; country:string; program:string; fee:string; deadline:string; min_marks:string; min_ielts:string; documents:string };

function rowToProgram(row: ProgramRow): Program {
  return { id: row.id, university: row.university, country: row.country, program: row.program, fee: row.fee, deadline: row.deadline, minMarks: row.min_marks, minIelts: row.min_ielts, documents: row.documents };
}

export async function POST(request: Request) {
  try {
    await requireStaff(request);
    const body = await request.json() as { question?: string; leadId?: string; leadName?: string };
    const question = String(body.question ?? "").trim();
    const leadId = String(body.leadId ?? "");
    const leadName = String(body.leadName ?? "Student");
    if (!question || !leadId) return Response.json({ error: "Question and lead are required" }, { status: 400 });

    let agent = "Safety Agent", reason = "Policy boundary", message = "", escalation = false, usedAI = false;
    if (/ignore (all |your )?rules|tell me i['’]?m accepted|you are accepted|guarantee/i.test(question)) {
      message = "I can’t confirm or promise admission. Only the university can make an acceptance decision. I can help with approved program requirements or pass your question to staff.";
      reason = "Prompt injection or unsupported promise blocked";
    } else {
      const rows = await selectRows<ProgramRow>("programs");
      const q = question.toLowerCase();
      const row = rows.find(p => q.includes(p.university.toLowerCase()) || q.includes(p.id.toLowerCase()));
      if (row) {
        const program = rowToProgram(row);
        agent = "University Agent";
        reason = `Approved record ${program.id}`;
        try {
          message = (await draftProgramAnswer(question, program)).message;
          usedAI = true;
        } catch {
          message = `${program.university} — ${program.program} costs ${program.fee} per year. The deadline is ${program.deadline}. Minimum requirements are ${program.minMarks} marks and IELTS ${program.minIelts}. Required documents: ${program.documents}.`;
          reason += " · deterministic fallback";
        }
      } else if (/university|college|program|course|fee|deadline|ielts|marks|admission|study/i.test(q)) {
        agent = "University Agent"; message = unknown; reason = "Program not found · staff escalation"; escalation = true;
      } else message = decline;
    }
    message = safetyReview(message).message;
    const approvalId = uid();
    await Promise.all([
      insertRows("approvals", { id: approvalId, lead_id: leadId, lead_name: leadName, agent, message, reason, status: "pending" }),
      insertRows("agent_runs", { id: uid(), agent, action: "chat.draft", input_summary: question.slice(0, 300), output_summary: `Draft queued; AI=${usedAI}`, status: "complete" }),
      insertRows("audit_log", { id: uid(), actor_id: "system", actor_name: "Coordinator", action: "Approval required", detail: `Draft for ${leadName} queued; not sent.`, tone: "amber" }),
      escalation ? insertRows("escalations", { id: uid(), lead_id: leadId, question, reason: "Program not in approved list", status: "open" }) : Promise.resolve(),
    ]);
    return Response.json({ draft: { id: approvalId, leadId, leadName, agent, message, reason, status: "pending", createdAt: new Date().toISOString() }, escalation, usedAI });
  } catch (error) { return responseFromError(error, "Agent run failed"); }
}
