import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { emitNudgeBee } from "@/lib/platform";
export async function POST(req: Request) {
  const { message } = await req.json();
  const guests = await prisma.guest.findMany({ take: 50 });
  const approval = await prisma.approval.create({ data: { kind: "WHATSAPP_BULK", payload: JSON.stringify({ message, count: guests.length }) } });
  await emitNudgeBee("whatsapp.bulk.requested", { approvalId: approval.id, count: guests.length });
  const links = guests.slice(0, 10).map((g) => ({ guest: g.fullName, link: `https://wa.me/?text=${encodeURIComponent(`${message} — ${g.fullName}, RSVP: http://localhost:3000/w/aarav-diya`)}` }));
  return NextResponse.json({ approvalId: approval.id, links, note: "Approve in Boards queue to mark sent (demo). NudgeBee webhook fired if configured." });
}
export async function GET() {
  const approvals = await prisma.approval.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  return NextResponse.json(approvals);
}
