import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC = [
  /^\/$/,
  /^\/login/,
  /^\/signup/,
  /^\/w\//,
  /^\/api\/auth\//,
  /^\/api\/flags/,
  /^\/api\/i18n/,
  /^\/api\/integrations/,
  /^\/_next\//,
  /^\/media\//,
  /^\/music/,
  /^\/icon\.svg/,
  /^\/favicon\.ico/,
];

/* ADMIN + ORGANIZER only (pages and APIs). Everything else needs any login. */
const ADMIN_ORG = [
  /^\/dashboard/,
  /^\/boards/,
  /^\/guests/,
  /^\/users/,
  /^\/settings/,
  /^\/api\/stats/,
  /^\/api\/guests/,
  /^\/api\/boards/,
  /^\/api\/users/,
  /^\/api\/invites\//,
  /^\/api\/events-log/,
  /^\/api\/wedding/,
];
const ADMIN_ONLY_API = [/^\/api\/flags/];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((r) => r.test(path))) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const role = (token as unknown as { role?: string } | null)?.role;
  const isApi = path.startsWith("/api/");

  if (!token) {
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(path)}`, req.url));
  }
  if (ADMIN_ORG.some((r) => r.test(path)) && role !== "ADMIN" && role !== "ORGANIZER") {
    if (isApi) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (ADMIN_ONLY_API.some((r) => r.test(path))) {
    // GET flags is public (clients read effective flags); PUT is admin-only (also enforced in-route)
    if (req.method === "GET" || role === "ADMIN") return NextResponse.next();
    if (isApi) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
