// Sarvam AI helpers. Everything here is defensive: any missing key, network
// error, or unexpected shape returns null and the caller falls back to rules.
// That keeps the hackathon demo (no keys on judges' laptops) fully working.
//
// Credit discipline (100-credit budget): rule-first, Sarvam only on button
// click, 500-char cap, exact-text memo + DB TranslationCache so the first
// Sarvam call per string is also the last. Usage is logged per feature for
// the dashboard judge view.
import { prisma } from "./db";

const CHAR_CAP = 500;
const memo = new Map<string, string>();

export const SARVAM_TARGETS: Record<string, string[]> = {
  hi: ["hi-IN"],
  bho: ["bho-IN", "hi-IN"], // Bhojpuri: try native, fall back to Hindi base
  kn: ["kn-IN"],
  te: ["te-IN"],
  mr: ["mr-IN"],
  en: ["en-IN"],
};

export async function logSarvamUsage(feature: string, chars: number) {
  try {
    await prisma.sarvamUsage.create({ data: { feature, chars } });
  } catch { /* DB missing — ignore */ }
}

async function callTranslate(input: string, target: string): Promise<string | null> {
  const key = process.env.SARVAM_API_KEY;
  if (!key || !input.trim()) return null;
  const text = input.slice(0, CHAR_CAP);
  const memoKey = `${target}::${text}`;
  if (memo.has(memoKey)) return memo.get(memoKey)!;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": key },
      body: JSON.stringify({
        input: text,
        source_language_code: "auto",
        target_language_code: target,
        model: "mayura:v1",
        mode: "formal",
        enable_preprocessing: true,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = await r.json();
    const out = j?.translated_text ?? j?.output ?? null;
    if (typeof out !== "string" || !out.trim()) return null;
    memo.set(memoKey, out.trim());
    return out.trim();
  } catch {
    return null;
  }
}

export async function sarvamTranslateHiToEn(text: string): Promise<string | null> {
  const out = await callTranslate(text, "en-IN");
  if (out) void logSarvamUsage("rsvp-parse", text.slice(0, CHAR_CAP).length);
  return out;
}

// Translate English UI text into lang (hi/bho/kn/te/mr). Tries Sarvam target
// codes in order; logs one usage row per successful Sarvam call.
export async function sarvamTranslateFromEn(text: string, lang: string, feature = "i18n"): Promise<string | null> {
  if (!text.trim() || lang === "en") return text;
  const memoKey = `${lang}::${text}`;
  if (memo.has(memoKey)) return memo.get(memoKey)!;
  const targets = SARVAM_TARGETS[lang] ?? [lang];
  for (const t of targets) {
    const out = await callTranslate(text, t);
    if (out) {
      memo.set(memoKey, out);
      void logSarvamUsage(feature, text.slice(0, CHAR_CAP).length);
      return out;
    }
  }
  return null;
}

export async function getSarvamStats() {
  const total = Number(process.env.SARVAM_CREDIT_TOTAL ?? 100);
  let byFeature: Record<string, { calls: number; chars: number }> = {};
  let calls = 0;
  let chars = 0;
  try {
    const rows = await prisma.sarvamUsage.groupBy({ by: ["feature"], _count: true, _sum: { chars: true } });
    for (const r of rows) {
      byFeature[r.feature] = { calls: r._count, chars: (r._sum as any)?.chars ?? 0 };
      calls += r._count;
      chars += (r._sum as any)?.chars ?? 0;
    }
  } catch { /* table missing — zeros */ }
  // Judge-transparent estimate: Sarvam bills per characters, not per call.
  // Roughly 1 credit per 1K chars translated (a homepage language ≈ 2 credits).
  const used = Math.ceil(chars / 1000);
  return { total, used, leftover: Math.max(0, total - used), calls, chars, byFeature };
}
