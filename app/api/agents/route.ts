import { env } from "cloudflare:workers";
import { draftProgramAnswer } from "@/lib/openai";
import { safetyReview } from "@/lib/agents";
import type { Program } from "@/lib/seed";
import { requireStaff, responseFromError } from "@/lib/auth";

const uid = () => crypto.randomUUID();
const decline = "I can only help with study-abroad admissions questions. For anything else, please contact the appropriate service.";
const unknown = "I don’t have that university in the office’s approved list, so I won’t guess. I’ve passed your question to staff for review.";

function rowToProgram(row: any): Program {
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
      const rows = await env.DB.prepare("SELECT * FROM programs").all<any>();
      const q = question.toLowerCase();
      const row = rows.results.find((p: any) => q.includes(String(p.university).toLowerCase()) || q.includes(String(p.id).toLowerCase()));
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
    const statements = [
      env.DB.prepare("INSERT INTO approvals (id,lead_id,lead_name,agent,message,reason,status) VALUES (?,?,?,?,?,?,?)").bind(approvalId, leadId, leadName, agent, message, reason, "pending"),
      env.DB.prepare("INSERT INTO agent_runs (id,agent,action,input_summary,output_summary,status) VALUES (?,?,?,?,?,?)").bind(uid(), agent, "chat.draft", question.slice(0, 300), `Draft queued; AI=${usedAI}`, "complete"),
      env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,detail,tone) VALUES (?,?,?,?,?,?)").bind(uid(), "system", "Coordinator", "Approval required", `Draft for ${leadName} queued; not sent.`, "amber"),
    ];
    if (escalation) statements.push(env.DB.prepare("INSERT INTO escalations (id,lead_id,question,reason,status) VALUES (?,?,?,?,?)").bind(uid(), leadId, question, "Program not in approved list", "open"));
    await env.DB.batch(statements);
    return Response.json({ draft: { id: approvalId, leadId, leadName, agent, message, reason, status: "pending", createdAt: new Date().toISOString() }, escalation, usedAI });
  } catch (error) { return responseFromError(error, "Agent run failed"); }
}
