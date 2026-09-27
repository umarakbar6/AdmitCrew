import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
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
  const secret = Deno.env.get("META_APP_SECRET");
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  return equalText(`sha256=${Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("")}`, signature.toLowerCase());
}

Deno.serve(async (request) => {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const valid = url.searchParams.get("hub.mode") === "subscribe" && Deno.env.get("META_VERIFY_TOKEN") && url.searchParams.get("hub.verify_token") === Deno.env.get("META_VERIFY_TOKEN");
    return valid ? new Response(url.searchParams.get("hub.challenge") ?? "") : new Response("Verification failed", { status: 403 });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const rawBody = await request.text();
  if (!await signatureValid(rawBody, request.headers.get("x-hub-signature-256"))) return json({ received: false, error: "Invalid signature" }, 401);
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const payload = JSON.parse(rawBody) as WhatsAppPayload, messages = payload.entry?.flatMap(entry => entry.changes ?? []).flatMap(change => change.value?.messages ?? []) ?? [];
    for (const message of messages) {
      const phone = String(message.from ?? "").replace(/\D/g, "");
      if (!phone) continue;
      const { data: existing, error: findError } = await client.from("leads").select("id,name").eq("normalized_phone", phone).maybeSingle();
      if (findError) throw findError;
      const leadId = existing?.id ?? uid(), name = existing?.name ?? `WhatsApp ${phone.slice(-4)}`;
      if (!existing) { const { error } = await client.from("leads").insert({ id: leadId, name, phone, normalized_phone: phone, last_reply: "Just now", status: "New" }); if (error) throw error; }
      const { error } = await client.from("agent_runs").insert({ id: uid(), agent: "Intake Agent", action: "whatsapp.inbound", input_summary: `Message ${message.id ?? "unknown"} from ${phone}`, output_summary: existing ? "Matched existing lead" : "Created new lead", status: "complete" });
      if (error) throw error;
      await client.from("audit_log").insert({ id: uid(), actor_id: "system", actor_name: "Intake Agent", action: "WhatsApp received", detail: `${name}: inbound message recorded; no automatic reply sent.`, tone: "blue" });
    }
    return json({ received: true });
  } catch (error) { return json({ received: false, error: error instanceof Error ? error.message : "Webhook failed" }, 500); }
});
