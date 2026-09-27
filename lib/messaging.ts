import { env } from "cloudflare:workers";

export function whatsappConfigured() {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function deliverApprovedMessage(phone: string, message: string) {
  if (!whatsappConfigured()) return { mode: "simulation" as const, providerId: null };
  const response = await fetch(`https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }),
  });
  const payload = await response.json() as any;
  if (!response.ok) throw new Error(payload?.error?.message || `WhatsApp delivery failed (${response.status})`);
  return { mode: "whatsapp" as const, providerId: payload?.messages?.[0]?.id ?? null };
}
