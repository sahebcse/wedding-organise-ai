import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureFamilyForUser } from "@/lib/family";

async function ownFamily(email: string, name: string) {
  return ensureFamilyForUser(email, name);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const name = (session?.user as { name?: string } | undefined)?.name ?? "Guest";
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { zMemberAdd } = await import("@/lib/validators");
  const s = zMemberAdd.safeParse({ name: body?.name });
  if (!s.success) return new NextResponse("name required", { status: 400 });
  const clean = s.data.name;
  const family = await ownFamily(email, name);
  const dup = await prisma.guest.findFirst({ where: { familyId: family.id, fullName: { equals: clean } } });
  if (dup) return new NextResponse("already added", { status: 400 });
  const guest = await prisma.guest.create({ data: { fullName: clean, familyId: family.id, relation: "family" } });
  const events = await prisma.event.findMany();
  for (const e of events) {
    await prisma.eventInvite.create({ data: { guestId: guest.id, eventId: e.id } });
  }
  return NextResponse.json({ id: guest.id, fullName: guest.fullName });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const name = (session?.user as { name?: string } | undefined)?.name ?? "Guest";
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { guestId } = await req.json();
  const family = await ownFamily(email, name);
  const guest = await prisma.guest.findFirst({ where: { id: String(guestId), familyId: family.id } });
  if (!guest) return new NextResponse("not your family member", { status: 403 });
  if (guest.fullName === name) return new NextResponse("cannot remove yourself", { status: 400 });
  try {
    await prisma.guest.delete({ where: { id: guest.id } });
  } catch {
    return new NextResponse("member has gift records", { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
