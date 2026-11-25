import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { parseFamilyNL } from "@/lib/rsvp-nl";
import { sarvamTranslateHiToEn } from "@/lib/sarvam";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { text } = await req.json();
  const selfName = (session.user as { name?: string } | undefined)?.name ?? "Guest";
  const raw = String(text ?? "");
  // Real Sarvam call when a key is configured; rules always run on top.
  const translated = await sarvamTranslateHiToEn(raw);
  const members = parseFamilyNL(translated ? `${raw} ${translated}` : raw, selfName);
  return NextResponse.json({ members, via: translated ? "sarvam+rules" : "rules" });
}
