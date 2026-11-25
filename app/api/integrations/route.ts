import { NextResponse } from "next/server";
import { getEffectiveFlags } from "@/lib/flags";
import { nudgeBeeStatus } from "@/lib/nudgebee";

export async function GET() {
  const [{ flags, source, flagsmithConnected }, nudgebee] = await Promise.all([
    getEffectiveFlags(),
    Promise.resolve(nudgeBeeStatus()),
  ]);
  const sarvam = { configured: !!process.env.SARVAM_API_KEY, source: process.env.SARVAM_API_KEY ? "sarvam" : "rule-fallback" };
  return NextResponse.json({
    flagsmith: { connected: flagsmithConnected, source, flags },
    nudgebee,
    sarvam,
  });
}
