import { env } from "cloudflare:workers";
import { insertRows, selectOne } from "@/lib/supabase";

const uid = () => crypto.randomUUID();
type WhatsAppMessage = { from?: unknown; id?: unknown };
type WhatsAppPayload = { entry?: Array<{ changes?: Array<{ value?: { messages?: WhatsAppMessage[] } }> }> };

function equalText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function signatureValid(rawBody: string, signature: string | null) {
  if (!env.META_APP_SECRET || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.META_APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = `sha256=${Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")}`;
  return equalText(expected, signature.toLowerCase());
}

export async function GET(request: Request) {
  const url = new URL(request.url), mode = url.searchParams.get("hub.mode"), token = url.searchParams.get("hub.verify_token"), challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && env.META_VERIFY_TOKEN && token === env.META_VERIFY_TOKEN) return new Response(challenge ?? "", { status: 200 });
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!await signatureValid(rawBody, request.headers.get("x-hub-signature-256"))) return Response.json({ received: false, error: "Invalid signature" }, { status: 401 });
    const payload = JSON.parse(rawBody) as WhatsAppPayload;
    const messages = payload.entry?.flatMap(entry => entry.changes ?? []).flatMap(change => change.value?.messages ?? []) ?? [];
    for (const message of messages) {
      const phone = String(message.from ?? "").replace(/\D/g, "");
      if (!phone) continue;
      const existing = await selectOne<{ id: string; name: string }>("leads", `select=id,name&normalized_phone=eq.${encodeURIComponent(phone)}`);
      const leadId = existing?.id ?? uid(), name = existing?.name ?? `WhatsApp ${phone.slice(-4)}`;
      if (!existing) await insertRows("leads", { id: leadId, name, phone, normalized_phone: phone, country: "", marks: "", ielts: "", last_reply: "Just now", status: "New" });
      await Promise.all([
        insertRows("agent_runs", { id: uid(), agent: "Intake Agent", action: "whatsapp.inbound", input_summary: `Message ${message.id ?? "unknown"} from ${phone}`, output_summary: existing ? "Matched existing lead" : "Created new lead", status: "complete" }),
        insertRows("audit_log", { id: uid(), actor_id: "system", actor_name: "Intake Agent", action: "WhatsApp received", detail: `${name}: inbound message recorded; no automatic reply sent.`, tone: "blue" }),
      ]);
    }
    return Response.json({ received: true });
  } catch { return Response.json({ received: false }, { status: 400 }); }
}
