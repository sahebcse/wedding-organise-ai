import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureFamilyForUser } from "@/lib/family";
import { ALL_EVENTS } from "@/lib/rsvp-nl";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const selfName = (session?.user as { name?: string } | undefined)?.name ?? "Guest";
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { members } = await req.json() as { members: { name: string; status: string; events: string[] }[] };
  if (!Array.isArray(members) || members.length === 0) return new NextResponse("nothing to add", { status: 400 });

  const family = await ensureFamilyForUser(email, selfName);
  const events = await prisma.event.findMany();
  const byKey = Object.fromEntries(events.map((e) => [e.key, e]));
  let created = 0, updated = 0;

  for (const m of members.slice(0, 20)) {
    const clean = String(m.name ?? "").trim().slice(0, 40);
    if (!clean) continue;
    const status = ["CONFIRMED", "TENTATIVE", "DECLINED"].includes(m.status) ? m.status : "PENDING";
    const keys = (Array.isArray(m.events) && m.events.length ? m.events : [...ALL_EVENTS]).filter((k) => byKey[k]);
    let guest = await prisma.guest.findFirst({ where: { familyId: family.id, fullName: { equals: clean } } });
    if (!guest) {
      guest = await prisma.guest.create({ data: { fullName: clean, familyId: family.id, relation: clean === selfName ? "self" : "family" } });
      created++;
    } else updated++;
    for (const e of events) {
      const invite = await prisma.eventInvite.upsert({
        where: { guestId_eventId: { guestId: guest.id, eventId: e.id } },
        create: { guestId: guest.id, eventId: e.id },
        update: {},
      });
      if (keys.includes(e.key)) {
        await prisma.rSVP.upsert({
          where: { eventInviteId: invite.id },
          create: { eventInviteId: invite.id, status, headcount: status === "DECLINED" ? 0 : 1, source: "NL" },
          update: { status, headcount: status === "DECLINED" ? 0 : 1, source: "NL" },
        });
      }
    }
  }
  return NextResponse.json({ created, updated });
}
