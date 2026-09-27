import { NextResponse, type NextRequest } from "next/server";

const AUTOMATION_ROUTES = new Set([
  "/api/jobs/reminders",
  "/api/jobs/events",
  "/api/operations",
]);

const PUBLIC_ROUTES = new Set([
  "/favicon.svg",
  "/signin-with-chatgpt",
  "/signout-with-chatgpt",
  "/callback",
]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // These are the only routes exposed to n8n. Their handlers still require
  // the constant-time bearer-token check before touching application data.
  if (AUTOMATION_ROUTES.has(pathname)) return NextResponse.next();
  if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/_next/")) return NextResponse.next();

  const signedIn = Boolean(
    request.headers.get("oai-authenticated-user-id") &&
    request.headers.get("oai-authenticated-user-email"),
  );
  if (signedIn) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const returnTo = `${pathname}${search}`;
  const signIn = new URL("/signin-with-chatgpt", request.url);
  signIn.searchParams.set("return_to", returnTo.startsWith("//") ? "/" : returnTo);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
