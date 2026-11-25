import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
export async function POST(req: Request) {
  const s = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(4) }).safeParse(await req.json());
  if (!s.success) return new NextResponse("invalid", { status: 400 });
  const exists = await prisma.user.findUnique({ where: { email: s.data.email } });
  if (exists) return new NextResponse("email exists", { status: 400 });
  const passwordHash = await bcrypt.hash(s.data.password, 10);
  await prisma.user.create({ data: { name: s.data.name, email: s.data.email, passwordHash, role: "GUEST" } });
  return NextResponse.json({ ok: true });
}
