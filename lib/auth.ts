import { countRows, insertRows, selectOne } from "@/lib/supabase";

export type Staff = { id: string; email: string; name: string; role: "admin" | "counselor" };

function decodeName(request: Request) {
  const raw = request.headers.get("oai-authenticated-user-full-name");
  if (!raw) return null;
  try { return request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8" ? decodeURIComponent(raw) : raw; }
  catch { return null; }
}

export async function requireStaff(request: Request, roles: Staff["role"][] = ["admin", "counselor"]): Promise<Staff> {
  const url = new URL(request.url), local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  const email = request.headers.get("oai-authenticated-user-email") || (local ? "demo@local.test" : "");
  const id = request.headers.get("oai-authenticated-user-id") || email || (local ? "local-demo-staff" : "");
  const name = decodeName(request) || email || "Staff member";
  if (!id || !email) throw new Response("Authentication required", { status: 401 });

  let staff = await selectOne<Staff>("staff_users", `select=id,email,name,role&id=eq.${encodeURIComponent(id)}`);
  if (!staff) {
    const existing = await countRows("staff_users");
    if (existing === 0) {
      await insertRows("staff_users", { id, email, name, role: "admin" });
      staff = { id, email, name, role: "admin" };
    } else throw new Response("This account is not an AdmitCrew staff member", { status: 403 });
  }
  if (!roles.includes(staff.role)) throw new Response("Administrator access required", { status: 403 });
  return staff;
}

export function responseFromError(error: unknown, fallback = "Operation failed") {
  if (error instanceof Response) return error;
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}
