import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { parseRsvpSmart } from "@/lib/rsvp-parser";
import { authOptions } from "@/lib/auth";

async function getRole() {
  const session = await getServerSession(authOptions);
  return { email: session?.user?.email, role: (session?.user as { role?: string } | undefined)?.role };
}

export async function GET() {
  const { role } = await getRole();
  if (role !== "ADMIN" && role !== "ORGANIZER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const events = await prisma.event.findMany({ include: { invites: { include: { guest: true, rsvp: true } } }, orderBy: { startsAt: "asc" } });
  return NextResponse.json(events);
}
export async function POST(req: Request) {
  const { email, role } = await getRole();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const raw = await req.json();
  const { zRsvpSet } = await import("@/lib/validators");
  const s = zRsvpSet.safeParse({ ...raw, headcount: raw.headcount !== undefined ? Number(raw.headcount) : undefined });
  if (!s.success) return new NextResponse("invalid rsvp", { status: 400 });
  const { inviteId, status, headcount, diet } = s.data;
  const inv = await prisma.eventInvite.findUnique({ where: { id: inviteId }, include: { guest: { include: { family: true } }, rsvp: true } });
  if (!inv) return new NextResponse("not found", { status: 404 });
  if (role === "GUEST" && inv.guest.family?.ownerEmail !== email) {
    return NextResponse.json({ error: "not your family" }, { status: 403 });
  }
  if (diet) await prisma.guest.update({ where: { id: inv.guestId }, data: { diet } });
  const hc = status === "DECLINED" ? 0 : (headcount ?? inv.rsvp?.headcount ?? 1);
  const r = await prisma.rSVP.upsert({
    where: { eventInviteId: inviteId },
    create: { eventInviteId: inviteId, status, headcount: hc, source: "PAGE" },
    update: { status, headcount: hc, source: "PAGE" },
  });
  return NextResponse.json(r);
}
