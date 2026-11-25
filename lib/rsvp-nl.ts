// Hinglish family-RSVP parser: "Papa aur Mummy aayenge, Chacha Chachi nahi
// aayenge, ho sakta hai main na aaun" → per-person status + per-event scope.
export type NlStatus = "CONFIRMED" | "TENTATIVE" | "DECLINED" | "PENDING";
export type NlMember = { name: string; status: NlStatus; events: string[] };

export const ALL_EVENTS = ["HALDI", "MEHENDI", "SANGEET", "WEDDING", "RECEPTION"];

const RELATIONS: [RegExp, string][] = [
  [/\bpapa\b|\bfather\b|\bdad\b/, "Papa"],
  [/\bmummy\b|\bmother\b|\bmom\b|\bmaa\b|\bmma\b/, "Mummy"],
  [/\bchacha\b/, "Chacha"],
  [/\bchachi\b/, "Chachi"],
  [/\btau\b/, "Tau"],
  [/\btai\b/, "Tai"],
  [/\bmama\b/, "Mama"],
  [/\bmami\b/, "Mami"],
  [/\bmausa\b/, "Mausa"],
  [/\bmausi\b/, "Mausi"],
  [/\bbua\b/, "Bua"],
  [/\bfufa\b|\bfufaji\b/, "Fufa"],
  [/\bdada\b|\bdadaji\b/, "Dada"],
  [/\bdadi\b/, "Dadi"],
  [/\bnana\b/, "Nana"],
  [/\bnani\b/, "Nani"],
  [/\bbhai\b|\bbrother\b/, "Bhai"],
  [/\bbhabhi\b/, "Bhabhi"],
  [/\bbehen\b|\bsister\b|\bdidi\b/, "Behen"],
  [/\bjija\b|\bjijaji\b|\bgija\b/, "Jija"],
  [/\bsali\b/, "Sali"],
  [/\bsala\b/, "Sala"],
  [/\bbeta\b|\bson\b/, "Beta"],
  [/\bbeti\b|\bdaughter\b/, "Beti"],
  [/\bbahu\b/, "Bahu"],
  [/\bdamaad\b/, "Damaad"],
  [/\bpota\b|\bpoti\b/, "Pota/Poti"],
  [/\bpatni\b|\bwife\b/, "Wife"],
  [/\bpati\b|\bhusband\b/, "Husband"],
  [/\bsaas\b|\bsasu\b/, "Saas"],
  [/\bsasur\b/, "Sasur"],
  [/\bdost\b|\bfriend\b/, "Dost"],
  [/\bcolleague\b/, "Colleague"],
];

const EVENTS: [RegExp, string][] = [
  [/\bhaldi\b/, "HALDI"],
  [/\bmehendi\b|\bmehndi\b/, "MEHENDI"],
  [/\bsangeet\b/, "SANGEET"],
  [/\bwedding\b|\bshaadi\b|\bshadi\b|\bpheras?\b|\bbaraat\b|\bmarriage\b/, "WEDDING"],
  [/\breception\b/, "RECEPTION"],
];

const TENTATIVE = /(shayad|maybe|tentative|ho\s+sakta|ho\s+sakti|possible|try|koshish|pata\s+nahi|confirm\s+nahi|dekhte|may\s+not|might\s+not|not\s+sure|unsure)/;
const DECLINED = /(nahi|nhi\b|na\s+aa|won't|wont|will\s+not|not\s+coming|cannot|can't|skip|chod|miss|cancel)/;
const CONFIRMED = /(aayenge|aayega|aaungi|aaunga|aayengi|aarahe|aa\s+rahe|coming|will\s+come|confirm|pakka|sure|definitely|yes|zarur|zaroor|honge|hoga)/;
const SELF = /\b(main|mai|mere|mera|meri|myself|\bi\b)/;
const ONLY = /(sirf|only)/;

function chunkStatus(t: string): NlStatus | null {
  if (TENTATIVE.test(t)) return "TENTATIVE";
  if (DECLINED.test(t)) return "DECLINED";
  if (CONFIRMED.test(t)) return "CONFIRMED";
  return null;
}

function chunkEvents(t: string): string[] | null {
  const found = EVENTS.filter(([re]) => re.test(t)).map(([, k]) => k);
  return found.length ? [...new Set(found)] : null;
}

function headcount(t: string): number {
  const m = t.match(/hum\s+(\d+)|we\s+are\s+(\d+)|(\d+)\s*log|total\s+(\d+)|(\d+)\s*(people|persons|members|jan)/);
  if (m) return parseInt(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? "0", 10);
  return 0;
}

export function parseFamilyNL(raw: string, selfName: string): NlMember[] {
  const text = ` ${raw.toLowerCase()} `;
  // Split into clauses, but keep "X aur Y verb" together: split on , ; । ! ? and on aur/and only when both sides carry their own verb is too clever — instead split on punctuation, then on aur/and, and inherit status forward.
  const rawChunks = text.split(/[.;।!?\n]+/).flatMap((c) => c.split(/[,;]+/));
  const chunks = rawChunks.flatMap((c) => c.split(/\s+aur\s+|\s+and\s+|\s+or\s+/)).map((c) => c.trim()).filter(Boolean);

  const statuses = chunks.map(chunkStatus);
  // inherit: chunk without markers takes nearest following marked chunk's status, else preceding
  const resolved: (NlStatus | null)[] = [...statuses];
  for (let i = 0; i < chunks.length; i++) {
    if (resolved[i]) continue;
    let fwd: NlStatus | null = null;
    for (let j = i + 1; j < chunks.length; j++) { if (statuses[j]) { fwd = statuses[j]; break; } }
    if (fwd) { resolved[i] = fwd; continue; }
    for (let j = i - 1; j >= 0; j--) { if (resolved[j]) { resolved[i] = resolved[j]; break; } }
  }

  const byName = new Map<string, NlMember>();
  const put = (name: string, status: NlStatus, events: string[] | null) => {
    const key = name.toLowerCase();
    const ev = events ?? [...ALL_EVENTS];
    const prev = byName.get(key);
    if (prev) { prev.status = status; prev.events = ev; }
    else byName.set(key, { name, status, events: ev });
  };

  const globalOverrides: { events: string[]; status: NlStatus }[] = [];

  chunks.forEach((chunk, i) => {
    const status = resolved[i];
    const isSelf = SELF.test(chunk) && !RELATIONS.some(([re]) => re.test(chunk.replace(SELF, " ")));
    const names = RELATIONS.filter(([re]) => re.test(chunk)).map(([, n]) => n);
    const ev = chunkEvents(chunk);
    const onlyScoped = ONLY.test(chunk);
    void onlyScoped;
    const n = headcount(chunk);

    if (names.length === 0 && !isSelf) {
      if (n > 0) {
        for (let k = 1; k <= Math.min(n, 20); k++) put(`Family Member ${k}`, status ?? "PENDING", ev);
      } else if (ev && status && status !== "PENDING") {
        // "wedding skip karenge" → applies to everyone parsed so far (and later)
        globalOverrides.push({ events: ev, status });
      } else if (status && status !== "PENDING") {
        // "hum aa rahe hain" / lone "nahi aa paunga" → the speaker
        put(selfName, status, ev);
      }
      return;
    }
    const st = status ?? "PENDING";
    if (isSelf) put(selfName, st, ev);
    for (const nm of names) put(nm, st, ev);
  });

  // apply global event overrides (e.g. "reception skip") to every member
  for (const o of globalOverrides) {
    for (const m of byName.values()) {
      if (o.status === "DECLINED") m.events = m.events.filter((e) => !o.events.includes(e));
      // confirmed/tentative event-wide declarations upgrade those events to at least PENDING-included:
      if ((o.status === "CONFIRMED" || o.status === "TENTATIVE") && m.status === "PENDING") {
        m.status = o.status;
        m.events = [...new Set([...m.events, ...o.events])];
      }
    }
  }
  return [...byName.values()];
}
