import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEffectiveFlags, clearFlagCache } from "@/lib/flags";

export async function GET() {
  const { flags, source, flagsmithConnected } = await getEffectiveFlags();
  return NextResponse.json({ ...flags, _meta: { source, flagsmithConnected } });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { key, value } = await req.json();
  if (!key) return new NextResponse("key required", { status: 400 });
  await prisma.flagOverride.upsert({
    where: { key: String(key) },
    create: { key: String(key), value: String(value ?? "") },
    update: { value: String(value ?? "") },
  });
  clearFlagCache();
  return NextResponse.json({ ok: true });
}
