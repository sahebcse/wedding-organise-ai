import { NextResponse } from "next/server";
import { parseRsvpSmart } from "@/lib/rsvp-parser";
export async function POST(req: Request) {
  const { text } = await req.json();
  const p = await parseRsvpSmart(String(text ?? ""));
  return NextResponse.json(p);
}
