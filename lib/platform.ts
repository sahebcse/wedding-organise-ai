import { FLAG_DEFAULTS } from "./flags";

// Sync fallback (offline / client-safe). Server routes should prefer
// getEffectiveFlags() from lib/flags.ts which merges Flagsmith + DB overrides.
export function effectiveFlags() {
  return {
    ...FLAG_DEFAULTS,
    inviteVariant: process.env.INVITE_VARIANT ?? FLAG_DEFAULTS.inviteVariant,
  };
}

export { getEffectiveFlags } from "./flags";
export { emitNudgeBee, nudgeBeeStatus } from "./nudgebee";

export function waLink(phoneOrEmpty: string, text: string) {
  const base = phoneOrEmpty ? `https://wa.me/${phoneOrEmpty.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
