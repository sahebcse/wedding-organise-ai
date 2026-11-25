import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? "guest@demo.in";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new NextResponse("no user", { status: 404 });
  const emb = await prisma.faceEmbedding.findUnique({ where: { userId: user.id } });
  if (!emb) return new NextResponse("no profile", { status: 404 });
  return NextResponse.json({ vectors: JSON.parse(emb.vectors) });
}
