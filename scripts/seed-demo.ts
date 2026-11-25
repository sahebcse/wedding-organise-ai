import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
  // NOTE: photos + gifts are curated content — preserved across re-seeds so the
  // gallery and registry survive `npm run db:seed`. Full reset = delete dev.db.
  await prisma.photoMatch.deleteMany(); await prisma.photo.deleteMany();
  await prisma.faceEmbedding.deleteMany(); await prisma.batchMessage.deleteMany();
  await prisma.pickupMember.deleteMany(); await prisma.pickupBatch.deleteMany();
  await prisma.arrival.deleteMany(); await prisma.contribution.deleteMany();
  await prisma.subTicket.deleteMany(); await prisma.taskUpdate.deleteMany(); await prisma.task.deleteMany();
  await prisma.board.deleteMany(); await prisma.approval.deleteMany();
  await prisma.eventLog.deleteMany();
  await prisma.rSVP.deleteMany(); await prisma.eventInvite.deleteMany();
  await prisma.event.deleteMany(); await prisma.wedding.deleteMany();
  await prisma.guest.deleteMany(); await prisma.family.deleteMany();
  await prisma.vehicle.deleteMany(); await prisma.user.deleteMany();

  const admin = await prisma.user.create({ data: { name: "Admin", email: "admin@demo.in", passwordHash: await bcrypt.hash("admin123", 10), role: "ADMIN" } });
  // 6 organisers (demo crew) — all password org123
  const organisers = [
    { name: "Organizer", email: "organizer@demo.in" },
    { name: "Priya Planner", email: "priya.org@demo.in" },
    { name: "Rahul Logistics", email: "rahul.org@demo.in" },
    { name: "Sneha Decor", email: "sneha.org@demo.in" },
    { name: "Vikram Food", email: "vikram.org@demo.in" },
    { name: "Anita Rituals", email: "anita.org@demo.in" },
  ];
  for (const o of organisers) {
    await prisma.user.create({ data: { name: o.name, email: o.email, passwordHash: await bcrypt.hash("org123", 10), role: "ORGANIZER" } });
  }
  // 5 guests / normal users — all password guest123
  const demoGuests = [
    { name: "Guest", email: "guest@demo.in" },
    { name: "Aarav Guest", email: "aarav.guest@demo.in" },
    { name: "Diya Guest", email: "diya.guest@demo.in" },
    { name: "Karan Guest", email: "karan.guest@demo.in" },
    { name: "Meera Guest", email: "meera.guest@demo.in" },
  ];
  let guestUser = null;
  for (const g of demoGuests) {
    const u = await prisma.user.create({ data: { name: g.name, email: g.email, passwordHash: await bcrypt.hash("guest123", 10), role: "GUEST" } });
    if (!guestUser) guestUser = u;
  }

  const wedding = await prisma.wedding.create({ data: { slug: "aarav-diya", coupleNames: "Aarav weds Diya", story: "Araria, Bihar wedding — five celebrations, one home link. Venue: Araria, Bihar." } });
  const evData = [
    { key: "HALDI" as const, title: "Haldi", venue: "Araria, Bihar — Home Courtyard", capacityWarnAt: 80, capacityMax: 120 },
    { key: "MEHENDI" as const, title: "Mehendi", venue: "Araria, Bihar — Terrace", capacityWarnAt: 120, capacityMax: 180 },
    { key: "SANGEET" as const, title: "Sangeet", venue: "Araria, Bihar — Grand Hall", capacityWarnAt: 200, capacityMax: 250 },
    { key: "WEDDING" as const, title: "Wedding", venue: "Araria, Bihar — Wedding Venue", capacityWarnAt: 150, capacityMax: 200 },
    { key: "RECEPTION" as const, title: "Reception", venue: "Araria, Bihar — Palace Ground", capacityWarnAt: 600, capacityMax: 800 },
  ];
  const events = [];
  for (let i = 0; i < evData.length; i++) {
    events.push(await prisma.event.create({ data: { ...evData[i], weddingId: wedding.id, startsAt: new Date(Date.now() + (i + 1) * 86400000) } }));
  }
  const families = [];
  for (const [n, city] of [["Sharma", "Delhi"], ["Verma", "Jaipur"], ["Iyer", "Chennai"]]) {
    families.push(await prisma.family.create({ data: { name: n as string, city: city as string } }));
  }
  const names = ["Ramesh Sharma", "Sunita Sharma", "Amit Sharma", "Priya Sharma", "Raj Verma", "Meena Verma", "Karan Verma", "Anita Verma", "Suresh Iyer", "Lakshmi Iyer", "Divya Iyer", "Karthik Iyer"];
  const guests = [];
  for (let i = 0; i < names.length; i++) {
    guests.push(await prisma.guest.create({ data: { fullName: names[i], familyId: families[i % 3].id, relation: "relative", diet: i % 4 === 0 ? "JAIN" : "VEG" } }));
  }
  for (const g of guests) for (const e of events) await prisma.eventInvite.create({ data: { guestId: g.id, eventId: e.id } });
  // Seed some RSVPs: Sangeet near capacity to trigger alert
  const sangeet = events.find((e) => e.key === "SANGEET")!;
  const invs = await prisma.eventInvite.findMany({ where: { eventId: sangeet.id }, take: 10 });
  for (let i = 0; i < invs.length; i++) {
    await prisma.rSVP.create({ data: { eventInviteId: invs[i].id, status: i < 7 ? "CONFIRMED" : "TENTATIVE", headcount: 2, source: "SEED" } });
  }
  await prisma.vehicle.createMany({ data: [{ label: "Swift Cab 1", capacity: 4, type: "CAB" }, { label: "Tempo 12-seater", capacity: 12, type: "TEMPO" }] });
  const modes = ["BUS", "TRAIN", "PLANE", "PLANE", "BUS", "TRAIN", "PLANE", "PLANE"] as const;
  const stations = ["Araria Bus Stand", "Araria Railway Station", "Bagdogra Airport", "Darbhanga Airport", "Araria Bus Stand", "Araria Railway Station", "Bagdogra Airport", "Araria Railway Station"];
  const VENUE = "Araria, Bihar — Wedding Venue";
  for (let i = 0; i < 8; i++) {
    await prisma.arrival.create({ data: { guestId: guests[i].id, mode: modes[i], station: stations[i], arrivalAt: new Date(Date.now() + (i < 4 ? 2 : 5) * 3600000 + i * 600000), partySize: 1 + (i % 3), venue: VENUE, pnrRef: `PNR00${i}` } });
  }
  if ((await prisma.gift.count()) === 0) {
    await prisma.gift.createMany({ data: [
      { title: "Dinner Set — La Opala", pricePaise: 899900, qtyNeeded: 1 },
      { title: "Air Fryer", pricePaise: 1299900, qtyNeeded: 1 },
      { title: "Honeymoon Fund", pricePaise: 5000000, qtyNeeded: 1 },
    ] });
  }
  if ((await prisma.board.count()) === 0) {
    const mk = async (title: string, category: string) => prisma.board.create({ data: { title, category } });
    const food = await mk("Food & Catering", "FOOD");
    const trans = await mk("Transport & Pickups", "TRANSPORT");
    const decor = await mk("Decor & Stage", "DECOR");
    const vendor = await mk("Vendors & Payments", "VENDOR");
    const ritual = await mk("Rituals & Pundit", "RITUAL");
    const misc = await mk("Guest Helpdesk", "MISC");
    const tracker = await mk("Wedding Tracker — 8 Must-Do", "MISC");
    const seedTasks: Array<{ boardId: string; title: string; owner: string; status: string; estimatePaise: number; priority: "HIGH" | "MEDIUM" | "LOW"; dueInDays: number | null }> = [
      { boardId: food.id, title: "Finalize Sangeet menu (Jain counter)", owner: "Vikram Food", status: "DOING", estimatePaise: 25000000, priority: "HIGH", dueInDays: 2 },
      { boardId: food.id, title: "Confirm caterer tasting", owner: "Vikram Food", status: "TODO", estimatePaise: 5000000, priority: "MEDIUM", dueInDays: 4 },
      { boardId: food.id, title: "Sweets boxes for return gifts (400)", owner: "Priya Planner", status: "TODO", estimatePaise: 12000000, priority: "MEDIUM", dueInDays: 6 },
      { boardId: trans.id, title: "Book 2 tempo travellers", owner: "Rahul Logistics", status: "TODO", estimatePaise: 8000000, priority: "HIGH", dueInDays: 3 },
      { boardId: trans.id, title: "Airport pickup roster (8 arrivals)", owner: "Rahul Logistics", status: "DOING", estimatePaise: 2000000, priority: "HIGH", dueInDays: 1 },
      { boardId: trans.id, title: "Driver night-halt rooms confirm", owner: "Organizer", status: "TODO", estimatePaise: 1500000, priority: "LOW", dueInDays: 5 },
      { boardId: decor.id, title: "Stage flowers — marigold + roses", owner: "Sneha Decor", status: "TODO", estimatePaise: 9500000, priority: "HIGH", dueInDays: 4 },
      { boardId: decor.id, title: "Entry gate + photo booth", owner: "Sneha Decor", status: "TODO", estimatePaise: 7000000, priority: "MEDIUM", dueInDays: 5 },
      { boardId: vendor.id, title: "Photographer advance 50%", owner: "Priya Planner", status: "DONE", estimatePaise: 6000000, priority: "MEDIUM", dueInDays: -2 },
      { boardId: vendor.id, title: "DJ + sangeet sound check", owner: "Anita Rituals", status: "TODO", estimatePaise: 4000000, priority: "LOW", dueInDays: 3 },
      { boardId: ritual.id, title: "Pundit + muhurat print", owner: "Anita Rituals", status: "DOING", estimatePaise: 1100000, priority: "HIGH", dueInDays: 1 },
      { boardId: ritual.id, title: "Haldi kits for 5 homes", owner: "Anita Rituals", status: "TODO", estimatePaise: 2500000, priority: "MEDIUM", dueInDays: 2 },
      { boardId: misc.id, title: "WhatsApp helpdesk number live", owner: "Organizer", status: "DONE", estimatePaise: 0, priority: "LOW", dueInDays: -1 },
      { boardId: misc.id, title: "Lost & found desk roster", owner: "Priya Planner", status: "TODO", estimatePaise: 500000, priority: "LOW", dueInDays: 7 },
      // 8 wedding-tracker tickets — one per organiser + admin, all visible to all staff
      { boardId: tracker.id, title: "[Tracker] Lock Sangeet headcount (cap 250)", owner: "Admin", status: "DOING", estimatePaise: 0, priority: "HIGH", dueInDays: 2 },
      { boardId: tracker.id, title: "[Tracker] Caterer final payment + tasting signoff", owner: "Vikram Food", status: "DOING", estimatePaise: 25000000, priority: "HIGH", dueInDays: 2 },
      { boardId: tracker.id, title: "[Tracker] Tempo + cab roster + driver rooms", owner: "Rahul Logistics", status: "TODO", estimatePaise: 9500000, priority: "HIGH", dueInDays: 3 },
      { boardId: tracker.id, title: "[Tracker] Stage + entry decor signoff", owner: "Sneha Decor", status: "TODO", estimatePaise: 16500000, priority: "HIGH", dueInDays: 4 },
      { boardId: tracker.id, title: "[Tracker] Photo + DJ advances paid", owner: "Priya Planner", status: "TODO", estimatePaise: 10000000, priority: "MEDIUM", dueInDays: 3 },
      { boardId: tracker.id, title: "[Tracker] Pundit + muhurat + Haldi kits", owner: "Anita Rituals", status: "DOING", estimatePaise: 3600000, priority: "HIGH", dueInDays: 1 },
      { boardId: tracker.id, title: "[Tracker] Bulk WhatsApp invites + RSVP chase", owner: "Organizer", status: "TODO", estimatePaise: 0, priority: "MEDIUM", dueInDays: 2 },
      { boardId: tracker.id, title: "[Tracker] Return gifts + sweets boxes (400)", owner: "Admin", status: "TODO", estimatePaise: 12000000, priority: "MEDIUM", dueInDays: 6 },
    ];
    const created = [];
    for (const t of seedTasks) {
      created.push(await prisma.task.create({
        data: {
          boardId: t.boardId, title: t.title, owner: t.owner, status: t.status,
          estimatePaise: t.estimatePaise, priority: t.priority,
          dueAt: t.dueInDays === null ? null : new Date(Date.now() + t.dueInDays * 86400000),
        },
      }));
    }
    // dependency demo: tasting blocked by menu
    const menu = created.find((t) => t.title.includes("Sangeet menu"))!;
    const tasting = created.find((t) => t.title.includes("tasting"))!;
    await prisma.task.update({ where: { id: tasting.id }, data: { dependsOn: menu.id } });
    // updates demo (share-update thread)
    await prisma.taskUpdate.createMany({ data: [
      { taskId: menu.id, author: "Vikram Food", text: "Caterer sent 3 Jain options — tasting tomorrow 4pm." },
      { taskId: created.find((t) => t.title.includes("pickup roster"))!.id, author: "Rahul Logistics", text: "8 arrivals grouped into 3 batches, Tempo on standby." },
      { taskId: created.find((t) => t.title.includes("advance"))!.id, author: "Priya Planner", text: "Advance paid, receipt in drive. Balance on wedding day." },
    ] });
    // subtickets demo (Jira story → sub-tasks with own status/owner)
    const subSeeds: Array<{ match: string; subs: Array<{ title: string; owner: string; status: string }> }> = [
      { match: "Lock Sangeet headcount", subs: [
        { title: "Pull RSVP matrix confirmed count", owner: "Admin", status: "DONE" },
        { title: "Call 12 pending families", owner: "Organizer", status: "DOING" },
        { title: "Lock caterer guarantee number", owner: "Admin", status: "TODO" },
      ] },
      { match: "Caterer final payment", subs: [
        { title: "Tasting signoff sheet", owner: "Vikram Food", status: "DOING" },
        { title: "Jain counter separate billing", owner: "Vikram Food", status: "TODO" },
        { title: "Advance receipt filed", owner: "Priya Planner", status: "DONE" },
      ] },
      { match: "Tempo + cab roster", subs: [
        { title: "8 arrivals → 3 batches verified", owner: "Rahul Logistics", status: "DONE" },
        { title: "Driver night-halt confirm", owner: "Rahul Logistics", status: "TODO" },
        { title: "Share pickup wa.me links", owner: "Organizer", status: "TODO" },
      ] },
      { match: "Stage + entry decor", subs: [
        { title: "Marigold order 200 strings", owner: "Sneha Decor", status: "TODO" },
        { title: "Photo booth props list", owner: "Sneha Decor", status: "TODO" },
      ] },
      { match: "Pundit + muhurat", subs: [
        { title: "Muhurat print shared on WhatsApp", owner: "Anita Rituals", status: "DONE" },
        { title: "Haldi kits packed (5 homes)", owner: "Anita Rituals", status: "DOING" },
      ] },
    ];
    for (const s of subSeeds) {
      const parent = created.find((t) => t.title.includes(s.match));
      if (!parent) continue;
      for (const sub of s.subs) {
        await prisma.subTicket.create({ data: { taskId: parent.id, title: sub.title, owner: sub.owner, status: sub.status } });
      }
    }
  }
  console.log("Seed done:", { admin: admin.email, guest: guestUser!.email });
}
main().catch((e) => { console.error(e); process.exit(1); });
