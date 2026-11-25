import { prisma } from "@/lib/db";
import InviteHome from "@/components/invite/InviteHome";

export default async function WeddingHome({ params }: { params: { weddingSlug: string } }) {
  let wedding = null;
  let events: { id: string; title: string; venue: string; startsAt: string; key: string }[] = [];
  try {
    wedding = await prisma.wedding.findUnique({ where: { slug: params.weddingSlug } });
    if (wedding) {
      const evs = await prisma.event.findMany({ where: { weddingId: wedding.id }, orderBy: { startsAt: "asc" } });
      events = evs.map((e) => ({ id: e.id, title: e.title, venue: e.venue, startsAt: e.startsAt.toISOString(), key: e.key }));
    }
  } catch { /* fall through to defaults */ }

  return (
    <InviteHome
      wedding={{
        coupleNames: wedding?.coupleNames ?? "Aarav weds Diya",
        story: wedding?.story ?? "Two families, five celebrations, one home link. Join us across Haldi, Mehendi, Sangeet, Wedding and Reception.",
        slug: params.weddingSlug,
      }}
      events={
        events.length
          ? events
          : [
              { id: "1", title: "Haldi", venue: "Home Courtyard", startsAt: new Date(Date.now() + 86400000).toISOString(), key: "HALDI" },
              { id: "2", title: "Mehendi", venue: "Terrace", startsAt: new Date(Date.now() + 2 * 86400000).toISOString(), key: "MEHENDI" },
              { id: "3", title: "Sangeet", venue: "Grand Hall", startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), key: "SANGEET" },
              { id: "4", title: "Wedding", venue: "Temple Lawns", startsAt: new Date(Date.now() + 4 * 86400000).toISOString(), key: "WEDDING" },
              { id: "5", title: "Reception", venue: "Palace Ground", startsAt: new Date(Date.now() + 5 * 86400000).toISOString(), key: "RECEPTION" },
            ]
      }
    />
  );
}
