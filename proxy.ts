import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set(["/favicon.svg"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/_next/")) return NextResponse.next();

  // Private Sites deployments always provide the verified email header, while
  // the opaque user-id header is not guaranteed to be present.
  const signedIn = Boolean(request.headers.get("oai-authenticated-user-email"));
  if (signedIn) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  return new NextResponse("Authentication required", { status: 401 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
