import { prisma } from "../lib/db";

const FILES = ["1.jpg", "2.jpg", "3.jpeg", "4.jpg", "5.jpg", "6.jpg", "7.jpg", "saheb1.JPG", "saheb2.JPG", "saheb3.JPG", "saheb4.JPG", "saheb5.JPG"];

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@demo.in" } });
  if (!admin) throw new Error("seed demo users first (npm run db:seed)");
  for (const f of FILES) {
    const url = `/media/wedding-images/${f}`;
    const existing = await prisma.photo.findFirst({ where: { url } });
    if (!existing) {
      await prisma.photo.create({ data: { uploaderId: admin.id, url } });
      console.log("seeded", url);
    } else {
      console.log("exists", url);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
