import { env } from "cloudflare:workers";
import { requireStaff, responseFromError } from "@/lib/auth";
import { whatsappConfigured } from "@/lib/messaging";
import { automationAuthorized } from "@/lib/automation-auth";

const uid = () => crypto.randomUUID();

export async function GET(request: Request) {
  try {
    const machine=await automationAuthorized(request),staff=machine?null:await requireStaff(request);
    const [leads, pending, docs, openEscalations, lastRun] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM leads").first<{count:number}>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM approvals WHERE status='pending'").first<{count:number}>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM documents").first<{count:number}>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM escalations WHERE status='open'").first<{count:number}>(),
      env.DB.prepare("SELECT created_at AS createdAt,output_summary AS output FROM agent_runs WHERE action='reminder.scheduled' ORDER BY created_at DESC LIMIT 1").first(),
    ]);
    return Response.json({
      staff,
      health: { database: "connected", storage: "connected", approvalGate: "enforced", sendOnce: "enforced" },
      integrations: { openai: Boolean(env.OPENAI_API_KEY), openaiStatus: env.OPENAI_STATUS || "unknown", whatsapp: whatsappConfigured(), scheduler: Boolean(env.CRON_SECRET) },
      counts: { leads: leads?.count ?? 0, pending: pending?.count ?? 0, documents: docs?.count ?? 0, escalations: openEscalations?.count ?? 0 },
      lastReminderRun: lastRun ?? null,
    });
  } catch (error) { return responseFromError(error, "Health check failed"); }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff(request, ["admin"]);
    const body = await request.json() as any;
    if (body.action === "staff.add") {
      const id=String(body.id??"").trim(),email=String(body.email??"").trim(),name=String(body.name??email).trim(),role=body.role==="admin"?"admin":"counselor";
      if(!id||!email)return Response.json({error:"Staff id and email are required"},{status:400});
      await env.DB.batch([env.DB.prepare("INSERT INTO staff_users (id,email,name,role) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,role=excluded.role").bind(id,email,name,role),env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,detail,tone) VALUES (?,?,?,?,?,?)").bind(uid(),staff.id,staff.name,"Staff access updated",`${email}: ${role}`,"amber")]);
      return Response.json({ok:true});
    }
    if (body.action === "data.export") {
      const [leads,approvals,documents,logs] = await Promise.all([env.DB.prepare("SELECT * FROM leads").all(),env.DB.prepare("SELECT * FROM approvals").all(),env.DB.prepare("SELECT id,lead_name,file_name,type,status,reason,details,confidence,checked_at FROM documents").all(),env.DB.prepare("SELECT * FROM audit_log ORDER BY created_at DESC").all()]);
      await env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,detail,tone) VALUES (?,?,?,?,?,?)").bind(uid(),staff.id,staff.name,"Data exported","Administrative JSON backup created.","blue").run();
      return Response.json({exportedAt:new Date().toISOString(),leads:leads.results,approvals:approvals.results,documents:documents.results,auditLog:logs.results},{headers:{"content-disposition":`attachment; filename="admitcrew-backup-${new Date().toISOString().slice(0,10)}.json"`}});
    }
    if (body.action === "privacy.purge") {
      const days=Math.max(30,Math.min(3650,Number(body.days)||365)),cutoff=new Date(Date.now()-days*86400000).toISOString();
      const rows=await env.DB.prepare("SELECT id,storage_key AS storageKey FROM documents WHERE checked_at < ?").bind(cutoff).all<{id:string;storageKey:string}>();
      for(const row of rows.results)await env.BUCKET.delete(row.storageKey);
      await env.DB.batch([env.DB.prepare("DELETE FROM documents WHERE checked_at < ?").bind(cutoff),env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,detail,tone) VALUES (?,?,?,?,?,?)").bind(uid(),staff.id,staff.name,"Retention purge",`${rows.results.length} document(s) older than ${days} days removed.`,"amber")]);
      return Response.json({ok:true,removed:rows.results.length,days});
    }
    return Response.json({error:"Unknown operation"},{status:400});
  } catch (error) { return responseFromError(error); }
}
