import type { Program } from "./seed";
import { env } from "cloudflare:workers";

type JsonSchema = Record<string, unknown>;

function apiKey() {
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("The AI service returned no text output");
}

export async function structuredResponse<T>(instructions: string, input: any[], name: string, schema: JsonSchema): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      store: false,
      instructions,
      input: [{ role: "user", content: input }],
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  return JSON.parse(outputText(await response.json())) as T;
}

export async function draftProgramAnswer(question: string, program: Program) {
  return structuredResponse<{ message: string }>(
    "You are AdmitCrew's University Agent. Answer only from the supplied approved record. Preserve every fee, date, score and document exactly. Never imply admission, eligibility, a visa outcome, or a guarantee. Be concise and friendly.",
    [{ type: "input_text", text: `Student question: ${question}\nApproved record: ${JSON.stringify(program)}` }],
    "program_answer",
    { type: "object", additionalProperties: false, properties: { message: { type: "string" } }, required: ["message"] },
  );
}

export async function inspectDocument(file: File, leadName: string, bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  const base64 = btoa(binary);
  const content = file.type === "application/pdf"
    ? [{ type: "input_text", text: `Lead name: ${leadName}. This is synthetic test data only. Extract the document type, printed name, expiry date or score/marks, then compare its name with the lead.` }, { type: "input_file", filename: file.name, file_data: `data:application/pdf;base64,${base64}` }]
    : [{ type: "input_text", text: `Lead name: ${leadName}. This is synthetic test data only. Extract the document type, printed name, expiry date or score/marks, then compare its name with the lead.` }, { type: "input_image", image_url: `data:${file.type};base64,${base64}`, detail: "high" }];
  return structuredResponse<{ type: string; status: "OK" | "Problem"; reason: string; details: string; confidence: number }>(
    "You are AdmitCrew's Document Agent. Review only the attached fake training document. A passport is a Problem if expired as of 27 September 2026. Any printed-name mismatch is a Problem. Otherwise mark OK. Do not authenticate a document or make an admissions decision.",
    content,
    "document_review",
    { type: "object", additionalProperties: false, properties: { type: { type: "string" }, status: { type: "string", enum: ["OK", "Problem"] }, reason: { type: "string" }, details: { type: "string" }, confidence: { type: "integer", minimum: 0, maximum: 100 } }, required: ["type", "status", "reason", "details", "confidence"] },
  );
}
