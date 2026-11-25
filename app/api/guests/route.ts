import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
export async function GET() {
  const guests = await prisma.guest.findMany({ include: { family: true, invites: { include: { event: true, rsvp: true } } }, take: 200 });
  return NextResponse.json(guests);
}
