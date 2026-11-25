import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStrings, translateMissing, LANGS, STRINGS_EN } from "@/lib/i18n";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") ?? "en";
  if (!(LANGS as readonly { code: string }[]).some((l) => l.code === lang)) {
    return new NextResponse("unsupported lang", { status: 400 });
  }
  // First view of a language: one Sarvam call translates ALL missing keys,
  // cached in DB forever. Later views are free. Falls back to English silently.
  if (url.searchParams.get("auto") === "1" && lang !== "en" && process.env.SARVAM_API_KEY) {
    try {
      const { prisma } = await import("@/lib/db");
      const missing = await prisma.translationCache.count({ where: { lang } });
      if (missing < Object.keys(STRINGS_EN).length) await translateMissing(lang).catch(() => {});
    } catch { /* ignore — English fallback */ }
  }
  const strings = await getStrings(lang);
  let cached = Object.keys(STRINGS_EN).length;
  if (lang !== "en") {
    try {
      const { prisma } = await import("@/lib/db");
      cached = await prisma.translationCache.count({ where: { lang } });
    } catch { cached = 0; }
  }
  return NextResponse.json({ lang, strings, cached, total: Object.keys(STRINGS_EN).length });
}

// Admin: translate missing homepage keys for lang in ONE Sarvam call, then cache.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { lang } = await req.json();
  const res = await translateMissing(String(lang ?? ""));
  return NextResponse.json(res);
}
