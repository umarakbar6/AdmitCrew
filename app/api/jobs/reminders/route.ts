import { env } from "cloudflare:workers";
import { requireAutomation } from "@/lib/automation-auth";

const uid=()=>crypto.randomUUID();
export async function POST(request:Request){
  try{await requireAutomation(request);
    const quiet=await env.DB.prepare("SELECT id,name FROM leads WHERE status='Quiet'").all<{id:string;name:string}>();
    let created=0;
    for(const lead of quiet.results){const key=`QUIET-${lead.id}-${new Date().toISOString().slice(0,10)}`;const result=await env.DB.prepare("INSERT OR IGNORE INTO approvals (id,lead_id,lead_name,agent,message,reason,status,send_key) VALUES (?,?,?,?,?,?,?,?)").bind(uid(),lead.id,lead.name,"Follow-up Agent",`Assalam-o-Alaikum ${lead.name}, just checking in about your study plans. Would you like help with the next step?`,"Quiet lead scheduled follow-up","pending",key).run();created+=result.meta.changes??0}
    await env.DB.batch([env.DB.prepare("INSERT INTO agent_runs (id,agent,action,input_summary,output_summary,status) VALUES (?,?,?,?,?,?)").bind(uid(),"Follow-up Agent","reminder.scheduled",`${quiet.results.length} quiet lead(s) evaluated`,`${created} approval draft(s) created`,"complete"),env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,detail,tone) VALUES (?,?,?,?,?,?)").bind(uid(),"scheduler","Follow-up Agent","Scheduled reminder run",`${created} new draft(s); nothing sent automatically.`,"amber")]);
    return Response.json({ok:true,evaluated:quiet.results.length,created});
  }catch(error){if(error instanceof Response)return error;return Response.json({error:error instanceof Error?error.message:"Reminder job failed"},{status:500})}
}
