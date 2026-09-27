import { env } from "cloudflare:workers";

type JsonRow = Record<string, unknown>;

function configuration() {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return { url, key };
}

async function request<T>(path: string, init: RequestInit = {}, prefer?: string): Promise<T> {
  const { url, key } = configuration();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("authorization", `Bearer ${key}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (prefer) headers.set("prefer", prefer);
  const response = await fetch(`${url}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${body.slice(0, 300)}`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function supabaseConfigured() {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY));
}

export async function selectRows<T = JsonRow>(table: string, query = "select=*") {
  return request<T[]>(`/rest/v1/${table}?${query}`);
}

export async function selectOne<T = JsonRow>(table: string, query = "select=*") {
  const rows = await selectRows<T>(table, `${query}&limit=1`);
  return rows[0] ?? null;
}

export async function countRows(table: string, query = "") {
  const { url, key } = configuration();
  const response = await fetch(`${url}/rest/v1/${table}?select=id${query ? `&${query}` : ""}`, {
    method: "HEAD",
    headers: { apikey: key, authorization: `Bearer ${key}`, prefer: "count=exact" },
  });
  if (!response.ok) throw new Error(`Supabase count failed (${response.status})`);
  const range = response.headers.get("content-range") ?? "*/0";
  return Number(range.split("/")[1] ?? 0);
}

export async function insertRows<T = JsonRow>(table: string, rows: JsonRow | JsonRow[]) {
  return request<T[]>(`/rest/v1/${table}`, { method: "POST", body: JSON.stringify(rows) }, "return=representation");
}

export async function upsertRows<T = JsonRow>(table: string, rows: JsonRow | JsonRow[], onConflict: string, ignoreDuplicates = false) {
  const resolution = ignoreDuplicates ? "ignore-duplicates" : "merge-duplicates";
  return request<T[]>(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, { method: "POST", body: JSON.stringify(rows) }, `resolution=${resolution},return=representation`);
}

export async function updateRows<T = JsonRow>(table: string, query: string, values: JsonRow) {
  return request<T[]>(`/rest/v1/${table}?${query}`, { method: "PATCH", body: JSON.stringify(values) }, "return=representation");
}

export async function deleteRows<T = JsonRow>(table: string, query: string) {
  return request<T[]>(`/rest/v1/${table}?${query}`, { method: "DELETE" }, "return=representation");
}

export async function storagePut(bucket: string, key: string, bytes: ArrayBuffer, contentType: string) {
  const { url, key: secret } = configuration();
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { apikey: secret, authorization: `Bearer ${secret}`, "content-type": contentType, "x-upsert": "false" },
    body: bytes,
  });
  if (!response.ok) throw new Error(`Supabase storage upload failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
}

export async function storageDelete(bucket: string, keys: string[]) {
  if (!keys.length) return;
  await request(`/storage/v1/object/${bucket}`, { method: "DELETE", body: JSON.stringify({ prefixes: keys }) });
}
