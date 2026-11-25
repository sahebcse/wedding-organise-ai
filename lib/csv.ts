// Minimal CSV parser (handles quotes + commas) + guest-row normalization.
export type GuestRow = { fullName: string; family: string; phone: string; relation: string; events: string[] };

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQ = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cur.trim()); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (cur !== "" || row.length > 0) { row.push(cur.trim()); cur = ""; }
      if (row.length && row.some((x) => x !== "")) rows.push(row);
      row = [];
      if (c === "\r" && t[i + 1] === "\n") i++;
    } else cur += c;
  }
  if (cur !== "" || row.length > 0) { row.push(cur.trim()); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ""));
}

const EVENT_ALIASES: [RegExp, string][] = [
  [/haldi/i, "HALDI"],
  [/mehendi|mehndi/i, "MEHENDI"],
  [/sangeet/i, "SANGEET"],
  [/wedding|shaadi|shadi|pheras?|baraat|marriage/i, "WEDDING"],
  [/reception/i, "RECEPTION"],
];

export function normalizeGuestRows(text: string): { rows: GuestRow[]; errors: string[] } {
  const raw = parseCsv(text);
  if (!raw.length) return { rows: [], errors: ["Empty file"] };
  const header = raw[0].map((h) => h.toLowerCase());
  const hasHeader = header.some((h) => /name|family|phone|relation|event/.test(h));
  const data = hasHeader ? raw.slice(1) : raw;
  const idx = (names: string[]) => {
    if (!hasHeader) return -1;
    return header.findIndex((h) => names.some((n) => h.includes(n)));
  };
  const iName = idx(["name"]);
  const iFam = idx(["family"]);
  const iPhone = idx(["phone", "mobile"]);
  const iRel = idx(["relation"]);
  const iEv = idx(["event"]);
  const rows: GuestRow[] = [];
  const errors: string[] = [];
  data.forEach((cols, li) => {
    const get = (i: number, dflt = "") => (i >= 0 ? (cols[i] ?? "").trim() : dflt);
    const fullName = get(iName === -1 ? 0 : iName).slice(0, 60);
    if (!fullName) { errors.push(`Line ${li + 2}: missing name`); return; }
    const family = get(iFam === -1 ? 1 : iFam, "Family").slice(0, 60) || "Family";
    const phone = get(iPhone).slice(0, 20);
    const relation = get(iRel, "relative").slice(0, 40) || "relative";
    const evRaw = get(iEv);
    const events = evRaw
      ? [...new Set(EVENT_ALIASES.filter(([re]) => re.test(evRaw)).map(([, k]) => k))]
      : ["HALDI", "MEHENDI", "SANGEET", "WEDDING", "RECEPTION"];
    rows.push({ fullName, family, phone, relation, events: events.length ? events : ["HALDI", "MEHENDI", "SANGEET", "WEDDING", "RECEPTION"] });
  });
  return { rows: rows.slice(0, 1000), errors };
}
