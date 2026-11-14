import { env } from "cloudflare:workers";
import { countRows, insertRows, selectOne } from "@/lib/supabase";
import { authorizeStaff, type Staff } from "@/lib/staff-access";
export type { Staff } from "@/lib/staff-access";

export async function requireStaff(request: Request, roles: Staff["role"][] = ["admin", "counselor"]): Promise<Staff> {
  const settings = env as unknown as Record<string, string | undefined>;
  return authorizeStaff(request, roles, {
    bootstrapUserId: settings.BOOTSTRAP_ADMIN_USER_ID?.trim(),
    read: id => selectOne<Staff>("staff_users", `select=id,email,name,role&id=eq.${encodeURIComponent(id)}`),
    count: () => countRows("staff_users"),
    create: staff => insertRows("staff_users", staff),
  });
}

export function responseFromError(error: unknown, fallback = "Operation failed") {
  if (error instanceof Response) return error;
  return Response.json({ error: fallback }, { status: 500 });
}
