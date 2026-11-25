import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const session = await getServerSession(authOptions);
  const { userId, role } = await req.json();
  if (!["ADMIN", "ORGANIZER", "GUEST"].includes(String(role))) return new NextResponse("bad role", { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: String(userId) } });
  if (!target) return new NextResponse("not found", { status: 404 });
  if (target.email === session?.user?.email) return new NextResponse("cannot change your own role", { status: 400 });
  await prisma.user.update({ where: { id: target.id }, data: { role: String(role) } });
  return NextResponse.json({ ok: true });
}
