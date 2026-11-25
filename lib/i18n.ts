// 6-language UI: en, hi, bho (Bhojpuri), kn (Kannada), te (Telugu), mr (Marathi).
// First Sarvam call per (lang,key) is cached in TranslationCache → all later
// loads are free (hardcoded). Batch endpoint translates many keys in ONE call.
import { prisma } from "./db";
import { sarvamTranslateFromEn } from "./sarvam";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "bho", label: "भोजपुरी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

// Core homepage + nav strings. English is the source of truth.
export const STRINGS_EN: Record<string, string> = {
  "nav.invitation": "Invitation",
  "nav.login": "Login",
  "nav.dashboard": "Dashboard",
  "nav.rsvp": "My RSVP",
  "nav.gifts": "Gifts",
  "nav.pickups": "Pickups",
  "nav.photos": "Photos",
  "nav.logout": "Logout",
  "home.badge": "Save the Date",
  "home.titleA": "Aarav",
  "home.titleB": "Diya",
  "home.sub": "Haldi • Mehendi • Sangeet • Wedding • Reception — one link, one RSVP, one pickup, all photos.",
  "home.ctaInvite": "Watch Invitation 💌",
  "home.ctaLogin": "Login",
  "home.ctaSignup": "Create Account",
  "home.where": "Araria, Bihar",
  "home.attending": "Attending the wedding?",
  "home.attendingSub": "Open the animated invitation, then log in to RSVP, coordinate pickup, contribute a gift, and find your photos.",
  "home.statsGuests": "guests",
  "home.statsEvents": "events",
  "home.statsOffline": "offline-ready",
  "lang.label": "Language",
  "invite.saveTheDate": "Save the Date",
  "invite.gettingMarried": "We're Getting Married",
  "invite.openInvite": "Open Invite 💌",
  "invite.eventsTitle": "Wedding Events",
  "invite.gallery": "Gallery",
  "invite.moments": "Moments",
  "invite.blessings": "Blessings & Greetings",
  "invite.blessingsSub": "Share Your Blessings",
  "invite.meetCouple": "Meet",
  "invite.theCouple": "The Couple",
  "invite.rsvpCta": "Create Account & RSVP",
  "invite.myRsvp": "My RSVP (per-event)",
  "invite.browseGifts": "Browse Gifts",
  "invite.myPhotos": "My Photos",
  "invite.loginCta": "Already have an account? Log in →",
  "invite.groom": "Groom",
  "invite.bride": "Bride",
  "invite.fiveCeleb": "Five Celebrations, One Home",
  "invite.rsvpLink": "RSVP →",
  "invite.blessIn": "You're in! Record your attendance for all events in one tap, or fine-tune per event.",
  "invite.blessOut": "Create your account, RSVP to the events you'll attend, coordinate your pickup, and find your photos after the wedding — all from one link.",
  "invite.oneTap": "One-tap RSVP for all 5 events",
  "invite.yesAll": "Yes, attending all 🎉",
  "invite.noWay": "Can't make it",
  "invite.loginBtn": "Login",
  "invite.openDash": "Open Dashboard",
  "invite.madeWith": "Made with ♥ for",
  "invite.backHome": "back to Wedding Organize AI home",
  "invite.swipe": "‹ swipe to explore ›",
  "home.ctaWatch": "Watch Invitation",
};

export async function getStrings(lang: string): Promise<Record<string, string>> {
  if (lang === "en") return { ...STRINGS_EN };
  let cached: Record<string, string> = {};
  try {
    const rows = await prisma.translationCache.findMany({ where: { lang } });
    for (const r of rows) cached[r.key] = r.value;
  } catch { /* table missing — all English */ }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(STRINGS_EN)) out[k] = cached[k] ?? v;
  return out;
}

// Translate missing keys for lang in ONE Sarvam call (joined block), cache each.
export async function translateMissing(lang: string): Promise<{ translated: number; cached: number; failed: boolean }> {
  const keys = Object.keys(STRINGS_EN);
  let cached = 0;
  try {
    cached = await prisma.translationCache.count({ where: { lang } });
  } catch { return { translated: 0, cached: 0, failed: true }; }
  const missing = keys.filter((k) => k);
  let have: Set<string> = new Set();
  try {
    const rows = await prisma.translationCache.findMany({ where: { lang }, select: { key: true } });
    have = new Set(rows.map((r) => r.key));
  } catch { return { translated: 0, cached, failed: true }; }
  const todo = keys.filter((k) => !have.has(k));
  if (todo.length === 0) return { translated: 0, cached, failed: false };
  // Chunk keys so each Sarvam call stays under the char cap. Numbered lines
  // survive translation better than symbols; a mismatched chunk is retried
  // in halves once, then left in English (no credit burn loop).
  const chunks: string[][] = [[]];
  for (const k of todo) {
    const cur = chunks[chunks.length - 1];
    const len = [...cur, k].map((x, i) => `${i + 1}) ${STRINGS_EN[x]}`).join("\n").length;
    if (cur.length > 0 && len > 400) chunks.push([]);
    chunks[chunks.length - 1].push(k);
  }
  async function storeChunk(ch: string[]): Promise<boolean> {
    const tryParse = async (block: string): Promise<string[] | null> => {
      const out = await sarvamTranslateFromEn(block, lang, "i18n");
      if (!out) return null;
      return out.split("\n").map((s) => s.trim()).filter(Boolean);
    };
    // Strategy 1: numbered lines.
    const numbered = ch.map((k, i) => `${i + 1}) ${STRINGS_EN[k]}`).join("\n");
    let lines = await tryParse(numbered);
    if (lines) {
      const vals = lines.map((l) => l.replace(/^\d+[\).:]\s*/, "").trim()).filter(Boolean);
      if (vals.length === ch.length) return await saveVals(ch, vals);
    }
    // Strategy 2: ‖ separator (often survives as ‖ or •).
    const joined = ch.map((k) => STRINGS_EN[k]).join(" ‖ ");
    const out2 = await sarvamTranslateFromEn(joined, lang, "i18n");
    if (out2) {
      const vals = out2.split(/[‖•|]/).map((s) => s.trim().replace(/^\d+[\).:]\s*/, "")).filter(Boolean);
      if (vals.length === ch.length) return await saveVals(ch, vals);
    }
    return false;
  }
  async function saveVals(ch: string[], vals: string[]): Promise<boolean> {
    for (let i = 0; i < ch.length; i++) {
      await prisma.translationCache.upsert({
        where: { lang_key: { lang, key: ch[i] } },
        create: { lang, key: ch[i], value: vals[i] },
        update: { value: vals[i] },
      }).catch(() => {});
    }
    return true;
  }
  let done = 0;
  async function handleChunk(ch: string[], depth: number): Promise<void> {
    if (await storeChunk(ch)) { done += ch.length; return; }
    if (ch.length <= 3) {
      // Short labels get merged by the model in batch — translate one by one
      // (1 call each, one-time, then cached forever).
      for (const k of ch) {
        const one = await sarvamTranslateFromEn(STRINGS_EN[k], lang, "i18n");
        if (one) {
          await prisma.translationCache.upsert({
            where: { lang_key: { lang, key: k } },
            create: { lang, key: k, value: one },
            update: { value: one },
          }).catch(() => {});
          done += 1;
        }
      }
      return;
    }
    if (depth >= 2) return; // give up on this chunk — English fallback, no credit loop
    const mid = Math.ceil(ch.length / 2);
    await handleChunk(ch.slice(0, mid), depth + 1);
    await handleChunk(ch.slice(mid), depth + 1);
  }
  for (const ch of chunks) await handleChunk(ch, 0);
  const failed = done < todo.length;
  return { translated: done, cached, failed };
}
