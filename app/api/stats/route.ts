import { prisma } from "@/lib/db";
import { getEffectiveFlags } from "@/lib/flags";
import { nudgeBeeStatus } from "@/lib/nudgebee";

export async function GET() {
  const [
    events, rsvps, arrivals, batches, gifts, contribs, tasks, approvals,
    users, guests, families, boards, subtickets, matches, photos, embeddings, logs,
  ] = await Promise.all([
    prisma.event.findMany({ include: { invites: { include: { rsvp: true } } } }),
    prisma.rSVP.findMany(),
    prisma.arrival.findMany({ include: { pickupMember: true } }),
    prisma.pickupBatch.findMany({ include: { members: true, messages: true } }),
    prisma.gift.findMany({ include: { contributions: true } }),
    prisma.contribution.findMany(),
    prisma.task.findMany({ include: { updates: true, subtickets: true } }),
    prisma.approval.findMany(),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.guest.count(),
    prisma.family.count(),
    prisma.board.count(),
    prisma.subTicket.groupBy({ by: ["status"], _count: true }),
    prisma.photoMatch.count(),
    prisma.photo.count(),
    prisma.faceEmbedding.count(),
    prisma.eventLog.groupBy({ by: ["kind"], _count: true }),
  ]);
  const perEvent = events.map((e) => {
    let c = 0, t = 0, p = 0;
    for (const inv of e.invites) {
      const s = inv.rsvp?.status ?? "PENDING";
      const h = inv.rsvp?.headcount ?? 0;
      if (s === "CONFIRMED") c += h || 1;
      else if (s === "TENTATIVE") t += h || 1;
      else p += 1;
    }
    return { title: e.title, confirmed: c, tentative: t, pending: p, warn: e.capacityWarnAt, max: e.capacityMax, alert: c + Math.round(t * 0.5) >= e.capacityWarnAt };
  });
  const funded = contribs.reduce((a, c) => a + c.amountPaise, 0);
  const target = gifts.reduce((a, g) => a + g.pricePaise * g.qtyNeeded, 0);
  const spend = tasks.reduce((a, t) => a + t.estimatePaise, 0);
  const spent = tasks.reduce((a, t) => a + (t.actualPaise ?? 0), 0);

  const byStatus = (s: string) => tasks.filter((t) => t.status === s).length;
  const overdue = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "DONE").length;
  const unassigned = tasks.filter((t) => !t.owner).length;
  const batchedArrivalIds = new Set(arrivals.filter((a: any) => a.pickupMember).map((a: any) => a.id));
  const byKind = (k: string) => approvals.filter((a) => a.kind === k && a.status === "PENDING").length;

  const [{ flags, source, flagsmithConnected }, nudgebee] = await Promise.all([
    getEffectiveFlags(),
    Promise.resolve(nudgeBeeStatus()),
  ]);
  const flagsOn = Object.entries(flags).filter(([k, v]) => k !== "inviteVariant" && v === true).length;
  const flagsOff = Object.entries(flags).filter(([k, v]) => k !== "inviteVariant" && v === false).length;

  return Response.json({
    perEvent,
    arrivals: arrivals.length,
    batchedArrivals: batchedArrivalIds.size,
    pendingArrivals: arrivals.length - batchedArrivalIds.size,
    batches: batches.length,
    batchMessages: batches.reduce((a, b) => a + b.messages.length, 0),
    gifts: gifts.length,
    funded,
    target,
    fundedPct: target ? Math.round((funded / target) * 100) : 0,
    contributions: contribs.length,
    anonContribs: contribs.filter((c) => c.anonymous).length,
    spend, spent,
    pendingApprovals: approvals.filter((a) => a.status === "PENDING").length,
    approvalsByKind: { WHATSAPP_BULK: byKind("WHATSAPP_BULK"), EXPENSE_HIGH: byKind("EXPENSE_HIGH"), GIFT_HIGH: byKind("GIFT_HIGH") },
    rsvps: rsvps.length,
    rsvpByStatus: {
      CONFIRMED: rsvps.filter((r) => r.status === "CONFIRMED").length,
      TENTATIVE: rsvps.filter((r) => r.status === "TENTATIVE").length,
      DECLINED: rsvps.filter((r) => r.status === "DECLINED").length,
      PENDING: rsvps.filter((r) => r.status === "PENDING").length,
    },
    users: (users as any[]).reduce((acc: any, u: any) => ({ ...acc, [u.role]: u._count }), {}),
    totalUsers: (users as any[]).reduce((a: number, u: any) => a + u._count, 0),
    guests, families, boards,
    tasks: tasks.length,
    tasksByStatus: { TODO: byStatus("TODO"), DOING: byStatus("DOING"), DONE: byStatus("DONE") },
    tasksHigh: tasks.filter((t) => t.priority === "HIGH").length,
    overdue, unassigned,
    updates: tasks.reduce((a, t) => a + t.updates.length, 0),
    subtickets: (subtickets as any[]).reduce((a: number, s: any) => a + s._count, 0),
    subticketsByStatus: (subtickets as any[]).reduce((acc: any, s: any) => ({ ...acc, [s.status]: s._count }), {}),
    photos, matches, faceOnboarded: embeddings,
    eventLogByKind: (logs as any[]).reduce((acc: any, l: any) => ({ ...acc, [l.kind]: l._count }), {}),
    eventLogTotal: (logs as any[]).reduce((a: number, l: any) => a + l._count, 0),
    flagsmith: { connected: flagsmithConnected, source, flags, flagsOn, flagsOff },
    nudgebee,
    sarvam: { configured: !!process.env.SARVAM_API_KEY, source: process.env.SARVAM_API_KEY ? "sarvam" : "rule-fallback" },
  });
}
