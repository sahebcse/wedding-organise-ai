import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeGuestRows } from "@/lib/csv";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN" && role !== "ORGANIZER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { text } = await req.json();
  const { rows, errors } = normalizeGuestRows(String(text ?? ""));
  if (!rows.length) return new NextResponse(errors[0] ?? "no rows", { status: 400 });
  const events = await prisma.event.findMany();
  const byTitle = new Map(events.map((e) => [e.title.toLowerCase(), e]));
  const byKey = new Map(events.map((e) => [e.key, e]));
  let families = 0, guests = 0;
  for (const r of rows) {
    let family = await prisma.family.findFirst({ where: { name: r.family } });
    if (!family) {
      family = await prisma.family.create({ data: { name: r.family, phone: r.phone || undefined } });
      families++;
    }
    const dupe = await prisma.guest.findFirst({ where: { familyId: family.id, fullName: { equals: r.fullName } } });
    if (dupe) continue;
    const guest = await prisma.guest.create({ data: { fullName: r.fullName, familyId: family.id, phone: r.phone || undefined, relation: r.relation } });
    guests++;
    for (const key of r.events) {
      const ev = byKey.get(key) ?? byTitle.get(key.toLowerCase());
      if (ev) await prisma.eventInvite.create({ data: { guestId: guest.id, eventId: ev.id } });
    }
  }
  return NextResponse.json({ families, guests, skippedLines: errors });
}
