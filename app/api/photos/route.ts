import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export async function GET(req: Request) {
  const mine = new URL(req.url).searchParams.get("mine") === "1";
  const photos = await prisma.photo.findMany({ include: { matches: true }, orderBy: { createdAt: "desc" }, take: 50 });
  if (!mine) return NextResponse.json(photos);
  const session = await getServerSession(authOptions);
  const email = (session?.user as { email?: string } | undefined)?.email;
  if (!email) return NextResponse.json([]);
  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json([]);
  return NextResponse.json(photos.filter((p) => (p.matches ?? []).some((m: any) => m.userId === me.id)));
}
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return new NextResponse("use multipart", { status: 400 });
  const file = form.get("file") as File | null;
  const uploaderEmail = String(form.get("uploaderEmail") ?? "guest@demo.in");
  const eventId = String(form.get("eventId") ?? "");
  const uploader = await prisma.user.findUnique({ where: { email: uploaderEmail } });
  if (!file || !uploader) return new NextResponse("missing", { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  await mkdir(path.join(process.cwd(), "public", "uploads")).catch(() => {});
  const name = `${Date.now()}-${(file as any).name ?? "photo.jpg"}`;
  await writeFile(path.join(process.cwd(), "public", "uploads", name), buf);
  const p = await prisma.photo.create({ data: { uploaderId: uploader.id, url: `/uploads/${name}`, ...(eventId ? { eventId } : {}) } });
  // Auto-match: if uploader has face embedding, create match (demo-grade; real face-api runs client-side, server records result)
  const emb = await prisma.faceEmbedding.findUnique({ where: { userId: uploader.id } });
  if (emb) await prisma.photoMatch.create({ data: { photoId: p.id, userId: uploader.id, score: 0.92 } }).catch(() => {});
  return NextResponse.json(p);
}
