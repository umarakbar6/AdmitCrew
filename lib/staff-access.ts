export type Staff = { id: string; email: string; name: string; role: "admin" | "counselor" };
type Store = { read(id: string): Promise<Staff | null>; count(): Promise<number>; create(staff: Staff): Promise<unknown>; bootstrapUserId?: string };

// Identity headers must be supplied and sanitized by the Sites gateway.
export async function authorizeStaff(request: Request, roles: Staff["role"][], store: Store): Promise<Staff> {
  const id = request.headers.get("oai-authenticated-user-id")?.trim();
  const email = request.headers.get("oai-authenticated-user-email")?.trim();
  if (!id || !email) throw new Response("Authentication required", { status: 401 });
  let name = request.headers.get("oai-authenticated-user-full-name") || email;
  if (request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { name = decodeURIComponent(name); } catch { name = email; }
  }
  let staff = await store.read(id);
  if (!staff) {
    if (!store.bootstrapUserId || id !== store.bootstrapUserId || await store.count() !== 0) throw new Response("This account is not an AdmitCrew staff member", { status: 403 });
    staff = { id, email, name, role: "admin" };
    await store.create(staff);
  }
  if (!roles.includes(staff.role)) throw new Response("Administrator access required", { status: 403 });
  return staff;
}
