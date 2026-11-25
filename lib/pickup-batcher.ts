export type ArrivalInput = { id: string; station: string; venue: string; arrivalAt: string | Date; partySize: number };
export type Batch = { station: string; venue: string; windowStart: Date; windowEnd: Date; memberIds: string[] };

export const PICKUP_POINTS = [
  "Araria Bus Stand",
  "Araria Railway Station",
  "Bagdogra Airport",
  "Darbhanga Airport",
] as const;

export const WEDDING_VENUE = "Araria, Bihar — Wedding Venue";

function norm(s: string) {
  return s.trim().toLowerCase();
}

// Car-pool batching: group by pickup point (station) + 60-min time window,
// pack by vehicle capacity (party-size aware). Admin runs it over guest entries.
export function batchArrivals(
  arrivals: { id: string; station: string; venue: string; arrivalAt: string | Date; partySize: number }[],
  opts: { windowMin?: number; vehicleCapacity?: number } = {}
): Batch[] {
  const windowMin = opts.windowMin ?? Number(process.env.PICKUP_WINDOW_MIN ?? 60);
  const cap = opts.vehicleCapacity ?? 4;
  const sorted = [...arrivals].sort((a, b) => +new Date(a.arrivalAt) - +new Date(b.arrivalAt));
  const byStation: Record<string, typeof sorted> = {};
  for (const a of sorted) {
    const k = norm(a.station) || "other";
    if (!byStation[k]) byStation[k] = [];
    byStation[k].push(a);
  }
  const out: Batch[] = [];
  for (const k of Object.keys(byStation)) {
    const list = byStation[k];
    let cur: Batch | null = null;
    let load = 0;
    for (const a of list) {
      const at = new Date(a.arrivalAt);
      if (!cur || +at - +cur.windowEnd > 0 || load + a.partySize > cap) {
        cur = { station: a.station, venue: a.venue, windowStart: at, windowEnd: new Date(+at + windowMin * 60000), memberIds: [] };
        load = 0;
        out.push(cur);
      }
      cur.memberIds.push(a.id);
      load += a.partySize;
      if (+at > +cur.windowStart) cur.windowEnd = new Date(Math.max(+cur.windowEnd.getTime(), +at));
    }
  }
  return out;
}

export function giftRemaining(pricePaise: number, qty: number, contributed: number) {
  return pricePaise * qty - contributed;
}
