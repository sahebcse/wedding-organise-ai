import { NextResponse } from "next/server";
import { getSarvamStats } from "@/lib/sarvam";

export async function GET() {
  return NextResponse.json(await getSarvamStats());
}
