import { requireAutomation } from "@/lib/automation-auth";
import { insertRows, selectRows, upsertRows } from "@/lib/supabase";

const uid=()=>crypto.randomUUID();
export async function POST(request:Request){
  try{await requireAutomation(request);
    const quiet=await selectRows<{id:string;name:string}>("leads","select=id,name&status=eq.Quiet");
    let created=0;
    for(const lead of quiet){const key=`QUIET-${lead.id}-${new Date().toISOString().slice(0,10)}`,rows=await upsertRows("approvals",{id:uid(),lead_id:lead.id,lead_name:lead.name,agent:"Follow-up Agent",message:`Assalam-o-Alaikum ${lead.name}, just checking in about your study plans. Would you like help with the next step?`,reason:"Quiet lead scheduled follow-up",status:"pending",send_key:key},"send_key",true);created+=rows.length}
    await Promise.all([insertRows("agent_runs",{id:uid(),agent:"Follow-up Agent",action:"reminder.scheduled",input_summary:`${quiet.length} quiet lead(s) evaluated`,output_summary:`${created} approval draft(s) created`,status:"complete"}),insertRows("audit_log",{id:uid(),actor_id:"scheduler",actor_name:"Follow-up Agent",action:"Scheduled reminder run",detail:`${created} new draft(s); nothing sent automatically.`,tone:"amber"})]);
    return Response.json({ok:true,evaluated:quiet.length,created});
  }catch(error){if(error instanceof Response)return error;return Response.json({error:error instanceof Error?error.message:"Reminder job failed"},{status:500})}
}
