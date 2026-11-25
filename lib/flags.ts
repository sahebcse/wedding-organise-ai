// Flagsmith wiring — server-side only.
// Priority: 1) DB overrides (Settings kill-switches, always win)
//           2) Flagsmith remote (if FLAGSMITH_ENV_KEY set)
//           3) Local defaults (offline judges, no key)
// Never throws — demo must work with no key / no network.
import { prisma } from "./db";

export const FLAG_DEFAULTS: Record<string, string | boolean> = {
  "rsvp-ai-parse": true,
  "pickup-batcher": true,
  "group-gifting": true,
  "expense-dashboard": true,
  "music-autoplay": false,
  "whatsapp-send": true,
  "face-search": true,
  inviteVariant: "traditional",
};

// short in-memory cache so we don't hit Flagsmith on every /api/flags call
let cache: { at: number; flags: Record<string, string | boolean> } | null = null;
const CACHE_TTL_MS = 30_000;

async function fetchRemoteFlags(): Promise<{ flags: Record<string, string | boolean>; connected: boolean }> {
  const envKey = process.env.FLAGSMITH_ENV_KEY;
  if (!envKey) return { flags: {}, connected: false };
  try {
    // Use Flagsmith Edge REST directly — no SDK init race, works in serverless.
    // Docs: GET https://edge.api.flagsmith.com/api/v1/flags/ with X-Environment-Key
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch("https://edge.api.flagsmith.com/api/v1/flags/", {
      headers: { "X-Environment-Key": envKey },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return { flags: {}, connected: false };
    const list = (await r.json()) as Array<{ feature: { name: string }; enabled: boolean; feature_state_value: string | boolean | number | null }>;
    const flags: Record<string, string | boolean> = {};
    for (const f of list ?? []) {
      const name = f?.feature?.name;
      if (!name) continue;
      // Boolean flags use `enabled`. String/variant flags (e.g. inviteVariant) use feature_state_value.
      // Flagsmith lowercases IDs (inviteVariant -> invitevariant) — handle all cases.
      const lower = name.toLowerCase();
      if (lower === "invitevariant" || lower === "invite-variant") {
        const v = f.feature_state_value;
        flags["inviteVariant"] = typeof v === "string" && v && v !== "Enter a value..." ? v.toLowerCase() : f.enabled ? "modern" : "traditional";
      } else {
        flags[lower] = f.enabled;
      }
    }
    return { flags, connected: true };
  } catch {
    return { flags: {}, connected: false };
  }
}

export async function getEffectiveFlags() {
  const now = Date.now();
  let remote: Record<string, string | boolean> = {};
  let connected = false;

  if (cache && now - cache.at < CACHE_TTL_MS) {
    remote = cache.flags;
    connected = Object.keys(remote).length > 0;
  } else {
    const res = await fetchRemoteFlags();
    remote = res.flags;
    connected = res.connected;
    cache = { at: now, flags: remote };
  }

  const merged: Record<string, string | boolean> = {
    ...FLAG_DEFAULTS,
    ...remote,
  };

  // DB overrides always win (Settings page kill-switches for live demo)
  try {
    const overrides = await prisma.flagOverride.findMany();
    for (const o of overrides) {
      if (o.value === "true") merged[o.key] = true;
      else if (o.value === "false") merged[o.key] = false;
      else merged[o.key] = o.value;
    }
  } catch {
    // DB missing (fresh clone before db push) — ignore, use merged
  }

  const source = !process.env.FLAGSMITH_ENV_KEY
    ? "local (no FLAGSMITH_ENV_KEY)"
    : connected
      ? "flagsmith"
      : "local (flagsmith unreachable, fallback)";

  return { flags: merged, source, flagsmithConnected: connected };
}

export function clearFlagCache() {
  cache = null;
}
