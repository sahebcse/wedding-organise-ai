import { prisma } from "./db";

export async function ensureFamilyForUser(email: string, name: string) {
  let family = await prisma.family.findFirst({ where: { ownerEmail: email } });
  if (!family) {
    family = await prisma.family.create({ data: { name: `${name}'s Family`, ownerEmail: email } });
  }
  let self = await prisma.guest.findFirst({ where: { familyId: family.id, fullName: name } });
  if (!self) {
    self = await prisma.guest.create({ data: { fullName: name, familyId: family.id, relation: "self" } });
  }
  const events = await prisma.event.findMany({ orderBy: { startsAt: "asc" } });
  for (const e of events) {
    await prisma.eventInvite.upsert({
      where: { guestId_eventId: { guestId: self.id, eventId: e.id } },
      create: { guestId: self.id, eventId: e.id },
      update: {},
    });
    // ensure every family member has invites for new events too
    const members = await prisma.guest.findMany({ where: { familyId: family.id } });
    for (const gm of members) {
      await prisma.eventInvite.upsert({
        where: { guestId_eventId: { guestId: gm.id, eventId: e.id } },
        create: { guestId: gm.id, eventId: e.id },
        update: {},
      });
    }
  }
  return family;
}

export async function getMine(email: string, name: string) {
  const family = await ensureFamilyForUser(email, name);
  const events = await prisma.event.findMany({ orderBy: { startsAt: "asc" } });
  const members = await prisma.guest.findMany({
    where: { familyId: family.id },
    include: { invites: { include: { rsvp: true } } },
    orderBy: { fullName: "asc" },
  });
  return {
    family: { id: family.id, name: family.name },
    events: events.map((e) => ({ id: e.id, key: e.key, title: e.title, venue: e.venue })),
    members: members.map((g) => ({
      id: g.id,
      fullName: g.fullName,
      diet: g.diet,
      invites: g.invites.map((inv) => ({ id: inv.id, eventId: inv.eventId, status: inv.rsvp?.status ?? "PENDING", headcount: inv.rsvp?.headcount ?? 0 })),
    })),
  };
}
