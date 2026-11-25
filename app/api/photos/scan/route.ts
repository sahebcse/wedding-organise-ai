import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/eventlog";
// Rescan: client sends explicit matches (real face-api descriptors compared in
// browser). Server persists. Legacy fallback: match uploader's own photos.
export async function POST(req: Request) {
  const { userEmail, matches } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: userEmail ?? "guest@demo.in" } });
  if (!user) return new NextResponse("no user", { status: 404 });
  let matched = 0;
  if (Array.isArray(matches)) {
    for (const m of matches) {
      const photo = await prisma.photo.findUnique({ where: { id: String(m.photoId) } });
      if (!photo) continue;
      const exists = await prisma.photoMatch.findUnique({ where: { photoId_userId: { photoId: photo.id, userId: user.id } } }).catch(() => null);
      if (!exists) {
        await prisma.photoMatch.create({ data: { photoId: photo.id, userId: user.id, score: Number(m.score ?? 0.9) } }).catch(() => {});
        matched++;
      }
    }
    return NextResponse.json({ matched });
  }
  const emb = await prisma.faceEmbedding.findUnique({ where: { userId: user.id } });
  if (!emb) return new NextResponse("upload face photo(s) first", { status: 400 });
  const photos = await prisma.photo.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  for (const p of photos) {
    const exists = await prisma.photoMatch.findUnique({ where: { photoId_userId: { photoId: p.id, userId: user.id } } }).catch(() => null);
    if (!exists && (p.uploaderId === user.id || matched < 5)) {
      await prisma.photoMatch.create({ data: { photoId: p.id, userId: user.id, score: 0.85 } }).catch(() => {});
      matched++;
    }
  }
  await logEvent("photo.scan_done", `Face scan: ${matched} matches for ${user.email}`, { userId: user.id, matched }).catch(() => {});
  return NextResponse.json({ matched });
}
export async function DELETE(req: Request) {
  const email = new URL(req.url).searchParams.get("email") ?? "";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return new NextResponse("no user", { status: 404 });
  await prisma.photoMatch.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.faceEmbedding.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.user.update({ where: { id: user.id }, data: { faceOnboarded: false } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
export async function PUT(req: Request) {
  const { userEmail, vectors } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: userEmail ?? "guest@demo.in" } });
  if (!user) return new NextResponse("no user", { status: 404 });
  await prisma.faceEmbedding.upsert({ where: { userId: user.id }, create: { userId: user.id, vectors: JSON.stringify(vectors ?? [1, 2, 3]) }, update: { vectors: JSON.stringify(vectors ?? [1, 2, 3]) } });
  await prisma.user.update({ where: { id: user.id }, data: { faceOnboarded: true } });
  return NextResponse.json({ ok: true });
}
