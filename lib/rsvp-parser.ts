// Rule-based Hinglish RSVP parser (fallback) + Sarvam hook point.
export type ParsedRsvp = { status: "CONFIRMED" | "TENTATIVE" | "DECLINED" | "PENDING"; headcount: number; diet?: string };

export function parseRsvpRule(text: string): ParsedRsvp {
  const t = text.toLowerCase();
  let status: ParsedRsvp["status"] = "PENDING";
  if (/(shayad|maybe|tentative|dekhte|try|koshish|confirm nahi|pata nahi)/.test(t)) status = "TENTATIVE";
  else if (/(nahi|ni aa|skip|cancel|can't|cannot|not coming)/.test(t)) status = "DECLINED";
  else if (/(aayenge|aayega|aaunga|aaungi|coming|confirm|pakka|sure|yes|aan\b|zarur|zaroor)/.test(t)) status = "CONFIRMED";
  let headcount = status === "DECLINED" ? 0 : 1;
  const m = t.match(/hum\s+(\d+)|we\s+are\s+(\d+)|(\d+)\s*log|family\s*of\s*(\d+)/);
  if (m) headcount = parseInt(m[1] ?? m[2] ?? m[3] ?? m[4] ?? "1", 10);
  if (/papa|mummy|parents|both/.test(t) && headcount === 1 && status === "CONFIRMED") headcount = 2;
  let diet: string | undefined;
  if (/jain/.test(t)) diet = "JAIN";
  else if (/veg/.test(t)) diet = "VEG";
  else if (/non-veg|nonveg|chicken|mutton/.test(t)) diet = "NONVEG";
  return { status, headcount, diet };
}

import { sarvamTranslateHiToEn } from "./sarvam";

export async function parseRsvpSmart(text: string): Promise<ParsedRsvp & { via: "sarvam" | "rule" }> {
  // Real Sarvam path: translate Hinglish → English, then run the rule parser on
  // the translation. Deterministic output, AI-powered understanding.
  const rule = parseRsvpRule(text);
  if (!process.env.SARVAM_API_KEY) return { ...rule, via: "rule" };
  try {
    const en = await sarvamTranslateHiToEn(text);
    if (!en) return { ...rule, via: "rule" };
    const smart = parseRsvpRule(`${text} ${en}`);
    return { ...smart, via: "sarvam" };
  } catch {
    return { ...rule, via: "rule" };
  }
}
