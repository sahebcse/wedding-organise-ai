import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { zContribute, zGiftCreate } from "@/lib/validators";
import { logEvent } from "@/lib/eventlog";

async function isStaff() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN" || role === "ORGANIZER";
}
export async function GET() {
  const gifts = await prisma.gift.findMany({ include: { contributions: { include: { guest: true } } } });
  return NextResponse.json(gifts.map((g) => {
    const funded = g.contributions.reduce((a, c) => a + c.amountPaise, 0);
    return { ...g, funded, remaining: g.pricePaise * g.qtyNeeded - funded };
  }));
}
export async function POST(req: Request) {
  const body = await req.json();
  // Staff gift curation: POST {action:"create", ...} / {action:"delete", id}
  if (body?.action === "create" || body?.action === "delete") {
    if (!(await isStaff())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (body.action === "delete") {
      const n = await prisma.contribution.count({ where: { giftId: String(body.id) } });
      if (n > 0) return new NextResponse("gift has contributions", { status: 400 });
      await prisma.gift.delete({ where: { id: String(body.id) } });
      await logEvent("gift.removed", `Gift removed`, body);
      return NextResponse.json({ ok: true });
    }
    const s = zGiftCreate.safeParse(body);
    if (!s.success) return new NextResponse("invalid gift", { status: 400 });
    const g = await prisma.gift.create({
      data: { title: s.data.title, pricePaise: s.data.pricePaise, qtyNeeded: s.data.qtyNeeded, imageUrl: s.data.imageUrl || undefined },
    });
    await logEvent("gift.added", `Gift added: ${g.title}`, { id: g.id });
    return NextResponse.json(g);
  }
  const s = zContribute.safeParse({ ...body, amountPaise: Number(body?.amountPaise) });
  if (!s.success) return new NextResponse("invalid amount", { status: 400 });
  const { giftId, amountPaise: amt, anonymous, name } = s.data;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  // Attribute to the contributor's own family member when possible (match by typed name)
  let guest = null;
  if (email) {
    const fam = await prisma.family.findFirst({ where: { ownerEmail: email } });
    if (fam && name) {
      guest = await prisma.guest.findFirst({ where: { familyId: fam.id, fullName: { equals: String(name).trim() } } });
    }
    if (!guest && fam) {
      const selfName = (session?.user as { name?: string } | undefined)?.name;
      if (selfName) guest = await prisma.guest.findFirst({ where: { familyId: fam.id, fullName: selfName } });
    }
  }
  if (!guest) guest = await prisma.guest.findFirst();
  if (!guest) return new NextResponse("no guests yet", { status: 400 });
  const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: { contributions: true } });
  if (!gift) return new NextResponse("gift not found", { status: 404 });
  const funded = gift.contributions.reduce((a: any, c: any) => a + c.amountPaise, 0);
  if (funded + amt > gift.pricePaise * gift.qtyNeeded) return new NextResponse("exceeds target", { status: 400 });
  if (amt > 5000000) {
    await prisma.approval.create({ data: { kind: "GIFT_HIGH", payload: JSON.stringify({ giftId, amt }) } });
    await logEvent("gift.approval_requested", `High-value gift needs approval: ₹${(amt / 100).toLocaleString("en-IN")}`, { giftId, amt });
    return new NextResponse("needs approval", { status: 402 });
  }
  const c = await prisma.contribution.create({ data: { giftId, guestId: guest.id, amountPaise: amt, anonymous: !!anonymous, name: String(name ?? guest.fullName ?? "Guest").slice(0, 60) } });
  return NextResponse.json(c);
}
