import { prisma } from "../lib/db";

async function main() {
  const byName = async (n: string) => (await prisma.guest.findFirst({ where: { fullName: n } }))!;
  const byTitle = async (t: string) => (await prisma.gift.findFirst({ where: { title: t } }))!;
  const dinner = await byTitle("Dinner Set — La Opala");
  const fryer = await byTitle("Air Fryer");
  const honeymoon = await byTitle("Honeymoon Fund");
  const priya = await byName("Priya Sharma");
  const raj = await byName("Raj Verma");
  const meena = await byName("Meena Verma");
  const amit = await byName("Amit Sharma");

  const seed: [typeof dinner, typeof priya, number, boolean, string][] = [
    [dinner, priya, 510000, false, "Priya Sharma"],
    [dinner, amit, 210000, true, "Amit Sharma"],
    [fryer, raj, 1100000, false, "Raj Verma"],
    [honeymoon, meena, 2100000, false, "Meena Verma"],
    [honeymoon, amit, 510000, true, "Amit Sharma"],
  ];
  for (const [gift, guest, amountPaise, anonymous, name] of seed) {
    if (!gift || !guest) continue;
    const exists = await prisma.contribution.findFirst({ where: { giftId: gift.id, amountPaise, anonymous } });
    if (!exists) {
      await prisma.contribution.create({ data: { giftId: gift.id, guestId: guest.id, amountPaise, anonymous, name } });
      console.log("seeded", name, amountPaise, "→", gift.title);
    } else {
      console.log("exists", name, amountPaise);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
