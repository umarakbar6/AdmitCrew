import { env } from "cloudflare:workers";

const uid = () => crypto.randomUUID();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode"), token = url.searchParams.get("hub.verify_token"), challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && env.META_VERIFY_TOKEN && token === env.META_VERIFY_TOKEN) return new Response(challenge ?? "", { status: 200 });
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as any;
    const messages = payload?.entry?.flatMap((e:any)=>e.changes??[]).flatMap((c:any)=>c.value?.messages??[]) ?? [];
    for (const message of messages) {
      const phone = String(message.from ?? "").replace(/\D/g, "");
      if (!phone) continue;
      const existing = await env.DB.prepare("SELECT id,name FROM leads WHERE normalized_phone=?").bind(phone).first<{id:string;name:string}>();
      const leadId = existing?.id ?? uid(), name = existing?.name ?? `WhatsApp ${phone.slice(-4)}`;
      if (!existing) await env.DB.prepare("INSERT INTO leads (id,name,phone,normalized_phone,country,marks,ielts,last_reply,status) VALUES (?,?,?,?,?,?,?,?,?)").bind(leadId,name,phone,phone,"","","","Just now","New").run();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO agent_runs (id,agent,action,input_summary,output_summary,status) VALUES (?,?,?,?,?,?)").bind(uid(),"Intake Agent","whatsapp.inbound",`Message ${message.id ?? "unknown"} from ${phone}`,existing?"Matched existing lead":"Created new lead","complete"),
        env.DB.prepare("INSERT INTO audit_log (id,actor_id,actor_name,action,detail,tone) VALUES (?,?,?,?,?,?)").bind(uid(),"system","Intake Agent","WhatsApp received",`${name}: inbound message recorded; no automatic reply sent.`,"blue"),
      ]);
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ received: false }, { status: 400 });
  }
}
