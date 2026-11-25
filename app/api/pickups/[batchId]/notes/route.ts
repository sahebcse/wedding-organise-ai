import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: { batchId: string } }) {
  const b = await prisma.pickupBatch.findUnique({ where: { id: params.batchId }, include: { members: { include: { arrival: { include: { guest: true } } } }, vehicle: true, messages: { include: { author: true }, orderBy: { createdAt: "asc" } } } });
  return NextResponse.json(b);
}
export async function POST(req: Request, { params }: { params: { batchId: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const author = await prisma.user.findUnique({ where: { email } });
  if (!author) return new NextResponse("no user", { status: 404 });
  const { text } = await req.json();
  if (!String(text ?? "").trim()) return new NextResponse("empty", { status: 400 });
  const m = await prisma.batchMessage.create({ data: { batchId: params.batchId, authorId: author.id, text: String(text).slice(0, 500) } });
  return NextResponse.json(m);
}
