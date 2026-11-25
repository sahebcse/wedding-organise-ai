// NudgeBee wiring — server-side only.
// Emits workflow events to NUDGEBEE_WEBHOOK_URL if set, always safe to call.
// Demo never blocks on NudgeBee: local Approval + EventLog are source of truth.
export function nudgeBeeStatus() {
  const url = process.env.NUDGEBEE_WEBHOOK_URL;
  if (!url) return { configured: false, source: "local (no NUDGEBEE_WEBHOOK_URL)" };
  return { configured: true, source: "nudgebee", urlHost: safeHost(url) };
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "custom-webhook";
  }
}

export async function emitNudgeBee(event: string, payload: unknown) {
  const url = process.env.NUDGEBEE_WEBHOOK_URL;
  if (!url) return { delivered: false, reason: "no-webhook" };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        payload,
        // Discord-compatible: Discord webhook shows `content`, most generic
        // NudgeBee workflows accept `text`.
        text: `[WeddingOrganizeAI] ${event}`,
        content: `[WeddingOrganizeAI] ${event}`,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return { delivered: r.ok, status: r.status };
  } catch (e) {
    return { delivered: false, reason: "network-error" };
  }
}
