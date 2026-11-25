import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { zWeddingUpdate, zEventUpdate } from "@/lib/validators";

export async function GET() {
  const w = await prisma.wedding.findFirst({ include: { events: { orderBy: { startsAt: "asc" } } } });
  return NextResponse.json(w);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json();
  const w = await prisma.wedding.findFirst();
  if (!w) return new NextResponse("no wedding", { status: 404 });
  if (body.wedding) {
    const s = zWeddingUpdate.safeParse(body.wedding);
    if (!s.success) return new NextResponse("invalid wedding", { status: 400 });
    await prisma.wedding.update({ where: { id: w.id }, data: { ...(s.data.coupleNames ? { coupleNames: s.data.coupleNames } : {}), ...(s.data.story !== undefined ? { story: s.data.story } : {}) } });
  }
  if (Array.isArray(body.events)) {
    for (const e of body.events) {
      if (!e?.id) continue;
      const s = zEventUpdate.safeParse(e);
      if (!s.success) continue;
      await prisma.event.update({
        where: { id: String(e.id) },
        data: {
          ...(s.data.title ? { title: s.data.title } : {}),
          ...(s.data.venue ? { venue: s.data.venue } : {}),
          ...(s.data.startsAt ? { startsAt: new Date(s.data.startsAt) } : {}),
        },
      }).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
