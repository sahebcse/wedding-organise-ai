import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { batchArrivals } from "@/lib/pickup-batcher";
import { logEvent } from "@/lib/eventlog";
import { authOptions } from "@/lib/auth";
export async function GET() {
  const [arrivals, batches] = await Promise.all([
    prisma.arrival.findMany({ include: { guest: true }, orderBy: { arrivalAt: "asc" } }),
    prisma.pickupBatch.findMany({ include: { members: { include: { arrival: { include: { guest: true } } } }, vehicle: true, messages: true } }),
  ]);
  return NextResponse.json({ arrivals, batches });
}
export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === "run") {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "ADMIN" && role !== "ORGANIZER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const arrivals = await prisma.arrival.findMany();
    const groups = batchArrivals(arrivals.map((a) => ({ id: a.id, station: a.station, venue: a.venue, arrivalAt: a.arrivalAt, partySize: a.partySize })));
    // Stash coordination notes so re-batching never wipes guest communication
    const oldBatches = await prisma.pickupBatch.findMany({ include: { members: true, messages: true } });
    const stash = oldBatches.map((b) => ({
      venue: (b as any).venue,
      station: (b as any).station ?? "",
      arrivalIds: new Set(b.members.map((m) => m.arrivalId)),
      messages: (b.messages ?? []).filter((m: any) => !m.text.startsWith("🚕 NudgeBee:")),
    }));
    await prisma.pickupMember.deleteMany();
    await prisma.pickupBatch.deleteMany();
    let cab = await prisma.vehicle.findFirst({ where: { type: "CAB" } });
    if (!cab) cab = await prisma.vehicle.create({ data: { label: "Cab", capacity: 4, type: "CAB" } });
    let carried = 0;
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    for (const g of groups) {
      const b = await prisma.pickupBatch.create({ data: { station: g.station, venue: g.venue, windowStart: g.windowStart, windowEnd: g.windowEnd, vehicleId: cab.id } });
      for (const aid of g.memberIds) await prisma.pickupMember.create({ data: { batchId: b.id, arrivalId: aid } });
      // carry notes from the old batch with the biggest member overlap (same pickup point)
      let best: (typeof stash)[number] | null = null;
      let bestOverlap = 0;
      for (const s of stash) {
        if (s.station !== g.station || s.messages.length === 0) continue;
        const overlap = g.memberIds.filter((id) => s.arrivalIds.has(id)).length;
        if (overlap > bestOverlap) { bestOverlap = overlap; best = s; }
      }
      if (best && bestOverlap > 0) {
        for (const m of best.messages) {
          await prisma.batchMessage.create({ data: { batchId: b.id, authorId: m.authorId, text: m.text, createdAt: m.createdAt } });
          carried++;
        }
      }
      // NudgeBee agent handles comms: auto-post car-pool instructions per batch
      if (adminUser) {
        await prisma.batchMessage.create({
          data: {
            batchId: b.id, authorId: adminUser.id,
            text: `🚕 NudgeBee: car-pool from ${g.station} at ${g.windowStart.toLocaleString("en-IN")} — ${g.memberIds.length} pickup(s) → ${g.venue}. Meet at arrival gate, share live location here.`,
          },
        }).catch(() => {});
      }
    }
    await logEvent("pickup.batch_created", `${groups.length} pickup batches created (notes carried: ${carried})`, { batches: groups.length }).catch(() => {});
    return NextResponse.json({ batches: groups.length, notesCarried: carried });
  }
  const { guestId, mode, station, arrivalAt, partySize, venue } = await req.json();
  const { zArrivalCreate } = await import("@/lib/validators");
  const s = zArrivalCreate.safeParse({ guestId, mode, station, arrivalAt, partySize: Number(partySize ?? 1), venue, pnrRef: body.pnrRef });
  if (!s.success) return new NextResponse("invalid arrival", { status: 400 });
  const a = await prisma.arrival.create({ data: { guestId: s.data.guestId, mode: s.data.mode, station: s.data.station, arrivalAt: new Date(s.data.arrivalAt), partySize: s.data.partySize, venue: s.data.venue, pnrRef: s.data.pnrRef || undefined } });
  await logEvent("pickup.arrival_added", `Arrival: ${s.data.station} → ${s.data.venue} (${s.data.mode})`, { id: a.id, venue: s.data.venue }).catch(() => {});
  return NextResponse.json(a);
}
